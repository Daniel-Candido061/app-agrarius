# Plano de migracao para CRM multiempresa

## Diagnostico do schema atual

O projeto ja saiu do modo "single user puro" e entrou em um estagio "multiusuario por autoria/responsabilidade", mas ainda nao possui tenancy por empresa.

### Tabelas com dependencia direta de usuario

DDL presente no repositorio:

- `public.perfis_usuario`
  - PK `id uuid references auth.users(id)`
  - campos de perfil: `nome_exibicao`, `email`, `papel`, `ativo`
- `public.propostas`
  - `criado_por`, `atualizado_por`, `responsavel_id`
- `public.servicos`
  - `criado_por`, `atualizado_por`, `responsavel_id`
- `public.tarefas`
  - `criado_por`, `atualizado_por`, `responsavel_id`
- `public.servico_pendencias`
  - `criado_por`, `atualizado_por`, `responsavel_id`
- `public.servico_documentos`
  - `criado_por`, `atualizado_por`
- `public.servico_eventos`
  - `criado_por`
- `public.financeiro`
  - `criado_por`, `atualizado_por`, `responsavel_id`

Tabelas inferidas pelo app, mas sem DDL completo no repositorio:

- `public.clientes`
  - hoje o app usa `id`, `nome`, `telefone`, `email`, `cidade`, `status`, `created_at`
  - ainda nao ha evidencias no repo de `organization_id`
- `public.servicos`
  - relaciona `cliente_id`
- `public.financeiro`
  - relaciona `servico_id`

Tabelas derivadas do modulo de servicos que tambem precisam de tenancy:

- `public.servico_etapas`
- `public.servico_pendencias`
- `public.servico_eventos`
- `public.servico_documentos`

### Como o frontend funciona hoje

- A autenticacao usa `auth.getUser(accessToken)` em [lib/auth.ts](/abs/path/c:/Users/danie/app-agrarius/lib/auth.ts:1).
- O frontend usa `currentUserId` para autoria e responsabilidade em inserts e updates.
- Os `selects` do app nao filtram explicitamente por `user_id`; eles assumem que o banco vai devolver apenas o que o usuario pode ver.
- Hoje nao ha migracoes de RLS para as tabelas de negocio no repositorio.

### Risco critico encontrado

Os documentos do bucket `servico-documentos` estao com politicas publicas amplas em [supabase/servico-documentos.sql](/abs/path/c:/Users/danie/app-agrarius/supabase/servico-documentos.sql:1). Mesmo com RLS em tabelas relacionais, isso nao protege anexos em um SaaS multiempresa.

## Arquitetura alvo recomendada

### Tabelas novas

- `public.organizations`
  - `id uuid`
  - `name text`
  - `created_at`
  - `updated_at`
  - `created_by`
- `public.organization_members`
  - `id uuid`
  - `organization_id`
  - `user_id`
  - `role`
  - `status`
  - `invited_by`
  - `created_at`
  - `updated_at`

### Tabela de perfis

Para evitar quebrar o app agora, a recomendacao e evoluir `public.perfis_usuario` em vez de renomea-la imediatamente para `profiles`.

Ajustes propostos:

- manter `perfis_usuario.id = auth.users.id`
- adicionar `default_organization_id`
- usar `organization_members` como fonte real de associacao usuario <-> empresa

## Tabelas que devem receber `organization_id`

Implementacao imediata:

- `clientes`
- `servicos`
- `propostas`
- `tarefas`
- `financeiro`
- `servico_etapas`
- `servico_pendencias`
- `servico_eventos`
- `servico_documentos`

Padrao futuro para novas tabelas ainda nao presentes no repo:

- `categories`
- `pipelines`
- `stages`
- `deals`

## Estrategia de migracao segura

### Fase 1

Criar `organizations`, `organization_members`, funcoes auxiliares e `default_organization_id` em `perfis_usuario`.

### Fase 2

Adicionar `organization_id` e indices nas tabelas de negocio sem tornar `not null` imediatamente.

### Fase 3

Fazer backfill.

Recomendacao para este projeto:

- criar uma organizacao legada unica
- associar todos os usuarios ativos atuais a essa organizacao
- preencher `organization_id` em todos os registros existentes

Isso e o caminho mais seguro porque o produto atual parece operar como uma unica empresa interna compartilhando a mesma base.

Se o banco atual ja tiver empresas independentes misturadas na mesma base, nao rode o backfill automatico sem antes montar uma tabela de mapeamento legado por empresa.

### Fase 4

- validar FKs compostas por `organization_id`
- marcar `organization_id` como `not null`
- habilitar RLS em todas as tabelas
- trocar storage de documentos para bucket privado com prefixo por organizacao

## Fluxo inicial simples recomendado

1. Usuario cria conta e entra no sistema.
2. Se nao possuir organizacao ativa, o frontend chama `rpc.bootstrap_organization(nome_empresa)`.
3. A funcao cria a empresa.
4. A funcao cria o membership do usuario com role `admin`.
5. `perfis_usuario.default_organization_id` passa a apontar para a empresa criada.
6. Todos os inserts seguintes passam a enviar `organization_id`.
7. Convites entram depois, usando `organization_members` e uma tabela ou fluxo de convite dedicado.

## Ajustes necessarios no frontend

### Contexto de organizacao

Criar um carregamento central do contexto atual:

- `currentUserId`
- `currentOrganizationId`
- `currentOrganizationRole`

Esse contexto deve ser usado em todas as telas que hoje so conhecem `currentUserId`.

### Inserts e updates

Hoje o app grava autoria, por exemplo em:

- [app/servicos/servicos-view.tsx](/abs/path/c:/Users/danie/app-agrarius/app/servicos/servicos-view.tsx:680)
- [app/tarefas/tarefas-view.tsx](/abs/path/c:/Users/danie/app-agrarius/app/tarefas/tarefas-view.tsx:498)
- [app/financeiro/financeiro-view.tsx](/abs/path/c:/Users/danie/app-agrarius/app/financeiro/financeiro-view.tsx:753)
- [app/comercial/comercial-view.tsx](/abs/path/c:/Users/danie/app-agrarius/app/comercial/comercial-view.tsx:716)

Esses payloads devem passar a incluir:

- `organization_id: currentOrganizationId`
- `criado_por: currentUserId`
- `atualizado_por: currentUserId`
- `responsavel_id` apenas como responsabilidade, nunca como fronteira de seguranca

### Queries

Os `selects` do app podem continuar simples se o RLS estiver correto.

Mesmo assim, por clareza e depuracao, vale adicionar `.eq("organization_id", currentOrganizationId)` nas telas de lista principais:

- `clientes`
- `servicos`
- `financeiro`
- `propostas`
- `tarefas`

### Perfis e usuarios

`getUserOptions()` e `getUserDisplayMap()` em [lib/user-profiles.ts](/abs/path/c:/Users/danie/app-agrarius/lib/user-profiles.ts:1) precisam parar de listar perfis globais e passar a listar apenas perfis que compartilham organizacao com o usuario autenticado.

### Dashboard e views

O dashboard usa:

- `vw_metricas_servicos_por_tipo`
- `vw_conversao_comercial`

Essas views devem ser recriadas com `security_invoker = true`, para respeitar RLS das tabelas base.

### Storage de documentos

Hoje a tela usa `getPublicUrl()` em [app/servicos/[id]/service-documents-section.tsx](/abs/path/c:/Users/danie/app-agrarius/app/servicos/[id]/service-documents-section.tsx:61).

Para SaaS multiempresa:

- bucket deve ficar privado
- o caminho do arquivo deve comecar por `organization_id`
- o frontend deve usar `createSignedUrl()` ou `download()`

Formato recomendado de path:

`<organization_id>/servicos/<service_id>/<timestamp>-<arquivo>`

## Ordem de execucao recomendada

1. Rodar `01-organizations-up.sql`
2. Rodar `02-add-organization-columns-up.sql`
3. Rodar `03-backfill-single-organization-up.sql`
4. Ajustar frontend para sempre enviar `organization_id`
5. Rodar `04-rls-and-storage-up.sql`

## Observacao sobre reversao

Os arquivos `*-down.sql` incluidos aqui sao reversiveis do ponto de vista estrutural, mas rollback apos uso real pode causar perda de informacao em colunas novas como `organization_id`.

Use rollback apenas antes do cutover definitivo ou em ambiente de homologacao.

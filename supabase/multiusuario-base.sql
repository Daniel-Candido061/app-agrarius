create table if not exists public.perfis_usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_exibicao text,
  email text,
  papel text,
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists perfis_usuario_ativo_idx
  on public.perfis_usuario(ativo);

create index if not exists perfis_usuario_nome_exibicao_idx
  on public.perfis_usuario(nome_exibicao);

alter table public.propostas
  add column if not exists criado_por uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null,
  add column if not exists responsavel_id uuid references auth.users(id) on delete set null;

create index if not exists propostas_criado_por_idx on public.propostas(criado_por);
create index if not exists propostas_atualizado_por_idx on public.propostas(atualizado_por);
create index if not exists propostas_responsavel_id_idx on public.propostas(responsavel_id);

alter table public.servicos
  add column if not exists criado_por uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null,
  add column if not exists responsavel_id uuid references auth.users(id) on delete set null;

create index if not exists servicos_criado_por_idx on public.servicos(criado_por);
create index if not exists servicos_atualizado_por_idx on public.servicos(atualizado_por);
create index if not exists servicos_responsavel_id_idx on public.servicos(responsavel_id);

alter table public.tarefas
  add column if not exists criado_por uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null,
  add column if not exists responsavel_id uuid references auth.users(id) on delete set null;

create index if not exists tarefas_criado_por_idx on public.tarefas(criado_por);
create index if not exists tarefas_atualizado_por_idx on public.tarefas(atualizado_por);
create index if not exists tarefas_responsavel_id_idx on public.tarefas(responsavel_id);

alter table public.servico_pendencias
  add column if not exists criado_por uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null,
  add column if not exists responsavel_id uuid references auth.users(id) on delete set null;

create index if not exists servico_pendencias_criado_por_idx on public.servico_pendencias(criado_por);
create index if not exists servico_pendencias_atualizado_por_idx on public.servico_pendencias(atualizado_por);
create index if not exists servico_pendencias_responsavel_id_idx on public.servico_pendencias(responsavel_id);

alter table public.servico_documentos
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null;

create index if not exists servico_documentos_criado_por_idx
  on public.servico_documentos(criado_por);

create index if not exists servico_documentos_atualizado_por_idx
  on public.servico_documentos(atualizado_por);

alter table public.financeiro
  add column if not exists criado_por uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null,
  add column if not exists responsavel_id uuid references auth.users(id) on delete set null;

create index if not exists financeiro_criado_por_idx on public.financeiro(criado_por);
create index if not exists financeiro_atualizado_por_idx on public.financeiro(atualizado_por);
create index if not exists financeiro_responsavel_id_idx on public.financeiro(responsavel_id);

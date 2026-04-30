begin;

alter table public.clientes
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists criado_por uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null,
  add column if not exists responsavel_id uuid references auth.users(id) on delete set null;

alter table public.servicos
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

alter table public.propostas
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

alter table public.tarefas
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

alter table public.financeiro
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

alter table public.servico_etapas
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists criado_por uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null;

alter table public.servico_pendencias
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

alter table public.servico_eventos
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null;

alter table public.servico_documentos
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

create index if not exists clientes_organization_id_idx on public.clientes(organization_id);
create index if not exists servicos_organization_id_idx on public.servicos(organization_id);
create index if not exists propostas_organization_id_idx on public.propostas(organization_id);
create index if not exists tarefas_organization_id_idx on public.tarefas(organization_id);
create index if not exists financeiro_organization_id_idx on public.financeiro(organization_id);
create index if not exists servico_etapas_organization_id_idx on public.servico_etapas(organization_id);
create index if not exists servico_pendencias_organization_id_idx on public.servico_pendencias(organization_id);
create index if not exists servico_eventos_organization_id_idx on public.servico_eventos(organization_id);
create index if not exists servico_documentos_organization_id_idx on public.servico_documentos(organization_id);

create unique index if not exists clientes_org_id_uidx on public.clientes(organization_id, id);
create unique index if not exists servicos_org_id_uidx on public.servicos(organization_id, id);
create unique index if not exists propostas_org_id_uidx on public.propostas(organization_id, id);
create unique index if not exists tarefas_org_id_uidx on public.tarefas(organization_id, id);
create unique index if not exists financeiro_org_id_uidx on public.financeiro(organization_id, id);
create unique index if not exists servico_etapas_org_id_uidx on public.servico_etapas(organization_id, id);
create unique index if not exists servico_pendencias_org_id_uidx on public.servico_pendencias(organization_id, id);
create unique index if not exists servico_eventos_org_id_uidx on public.servico_eventos(organization_id, id);
create unique index if not exists servico_documentos_org_id_uidx on public.servico_documentos(organization_id, id);

alter table public.servicos
  drop constraint if exists servicos_cliente_same_organization_fkey;
alter table public.servicos
  add constraint servicos_cliente_same_organization_fkey
  foreign key (organization_id, cliente_id)
  references public.clientes(organization_id, id)
  on delete set null
  not valid;

alter table public.propostas
  drop constraint if exists propostas_cliente_same_organization_fkey;
alter table public.propostas
  add constraint propostas_cliente_same_organization_fkey
  foreign key (organization_id, cliente_id)
  references public.clientes(organization_id, id)
  on delete set null
  not valid;

alter table public.propostas
  drop constraint if exists propostas_servico_same_organization_fkey;
alter table public.propostas
  add constraint propostas_servico_same_organization_fkey
  foreign key (organization_id, servico_id)
  references public.servicos(organization_id, id)
  on delete set null
  not valid;

alter table public.tarefas
  drop constraint if exists tarefas_servico_same_organization_fkey;
alter table public.tarefas
  add constraint tarefas_servico_same_organization_fkey
  foreign key (organization_id, servico_id)
  references public.servicos(organization_id, id)
  on delete set null
  not valid;

alter table public.financeiro
  drop constraint if exists financeiro_servico_same_organization_fkey;
alter table public.financeiro
  add constraint financeiro_servico_same_organization_fkey
  foreign key (organization_id, servico_id)
  references public.servicos(organization_id, id)
  on delete set null
  not valid;

alter table public.servico_etapas
  drop constraint if exists servico_etapas_servico_same_organization_fkey;
alter table public.servico_etapas
  add constraint servico_etapas_servico_same_organization_fkey
  foreign key (organization_id, servico_id)
  references public.servicos(organization_id, id)
  on delete cascade
  not valid;

alter table public.servico_pendencias
  drop constraint if exists servico_pendencias_servico_same_organization_fkey;
alter table public.servico_pendencias
  add constraint servico_pendencias_servico_same_organization_fkey
  foreign key (organization_id, servico_id)
  references public.servicos(organization_id, id)
  on delete cascade
  not valid;

alter table public.servico_eventos
  drop constraint if exists servico_eventos_servico_same_organization_fkey;
alter table public.servico_eventos
  add constraint servico_eventos_servico_same_organization_fkey
  foreign key (organization_id, servico_id)
  references public.servicos(organization_id, id)
  on delete cascade
  not valid;

alter table public.servico_documentos
  drop constraint if exists servico_documentos_servico_same_organization_fkey;
alter table public.servico_documentos
  add constraint servico_documentos_servico_same_organization_fkey
  foreign key (organization_id, servico_id)
  references public.servicos(organization_id, id)
  on delete cascade
  not valid;

commit;

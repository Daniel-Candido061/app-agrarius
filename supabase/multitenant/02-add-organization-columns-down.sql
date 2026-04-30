begin;

alter table public.servico_documentos
  drop constraint if exists servico_documentos_servico_same_organization_fkey;
alter table public.servico_eventos
  drop constraint if exists servico_eventos_servico_same_organization_fkey;
alter table public.servico_pendencias
  drop constraint if exists servico_pendencias_servico_same_organization_fkey;
alter table public.servico_etapas
  drop constraint if exists servico_etapas_servico_same_organization_fkey;
alter table public.financeiro
  drop constraint if exists financeiro_servico_same_organization_fkey;
alter table public.tarefas
  drop constraint if exists tarefas_servico_same_organization_fkey;
alter table public.propostas
  drop constraint if exists propostas_servico_same_organization_fkey;
alter table public.propostas
  drop constraint if exists propostas_cliente_same_organization_fkey;
alter table public.servicos
  drop constraint if exists servicos_cliente_same_organization_fkey;

drop index if exists public.servico_documentos_org_id_uidx;
drop index if exists public.servico_eventos_org_id_uidx;
drop index if exists public.servico_pendencias_org_id_uidx;
drop index if exists public.servico_etapas_org_id_uidx;
drop index if exists public.financeiro_org_id_uidx;
drop index if exists public.tarefas_org_id_uidx;
drop index if exists public.propostas_org_id_uidx;
drop index if exists public.servicos_org_id_uidx;
drop index if exists public.clientes_org_id_uidx;

drop index if exists public.servico_documentos_organization_id_idx;
drop index if exists public.servico_eventos_organization_id_idx;
drop index if exists public.servico_pendencias_organization_id_idx;
drop index if exists public.servico_etapas_organization_id_idx;
drop index if exists public.financeiro_organization_id_idx;
drop index if exists public.tarefas_organization_id_idx;
drop index if exists public.propostas_organization_id_idx;
drop index if exists public.servicos_organization_id_idx;
drop index if exists public.clientes_organization_id_idx;

alter table public.servico_documentos
  drop column if exists organization_id;

alter table public.servico_eventos
  drop column if exists atualizado_por,
  drop column if exists organization_id;

alter table public.servico_pendencias
  drop column if exists organization_id;

alter table public.servico_etapas
  drop column if exists atualizado_por,
  drop column if exists criado_por,
  drop column if exists organization_id;

alter table public.financeiro
  drop column if exists organization_id;

alter table public.tarefas
  drop column if exists organization_id;

alter table public.propostas
  drop column if exists organization_id;

alter table public.servicos
  drop column if exists organization_id;

alter table public.clientes
  drop column if exists responsavel_id,
  drop column if exists atualizado_por,
  drop column if exists criado_por,
  drop column if exists organization_id;

commit;

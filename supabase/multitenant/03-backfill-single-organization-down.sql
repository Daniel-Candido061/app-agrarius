begin;

alter table public.servico_documentos alter column organization_id drop not null;
alter table public.servico_eventos alter column organization_id drop not null;
alter table public.servico_pendencias alter column organization_id drop not null;
alter table public.servico_etapas alter column organization_id drop not null;
alter table public.financeiro alter column organization_id drop not null;
alter table public.tarefas alter column organization_id drop not null;
alter table public.propostas alter column organization_id drop not null;
alter table public.servicos alter column organization_id drop not null;
alter table public.clientes alter column organization_id drop not null;

update public.perfis_usuario
set default_organization_id = null
where default_organization_id in (
  select id
  from public.organizations
  where lower(name) = 'organizacao migrada'
);

delete from public.organization_members
where organization_id in (
  select id
  from public.organizations
  where lower(name) = 'organizacao migrada'
);

update public.servico_documentos set organization_id = null;
update public.servico_eventos set organization_id = null;
update public.servico_pendencias set organization_id = null;
update public.servico_etapas set organization_id = null;
update public.financeiro set organization_id = null;
update public.tarefas set organization_id = null;
update public.propostas set organization_id = null;
update public.servicos set organization_id = null;
update public.clientes set organization_id = null;

delete from public.organizations
where lower(name) = 'organizacao migrada';

commit;

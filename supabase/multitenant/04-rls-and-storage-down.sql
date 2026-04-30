begin;

drop policy if exists servico_documentos_org_delete on storage.objects;
drop policy if exists servico_documentos_org_update on storage.objects;
drop policy if exists servico_documentos_org_insert on storage.objects;
drop policy if exists servico_documentos_org_select on storage.objects;

create policy servico_documentos_public_read on storage.objects
  for select using (bucket_id = 'servico-documentos');
create policy servico_documentos_public_insert on storage.objects
  for insert with check (bucket_id = 'servico-documentos');
create policy servico_documentos_public_update on storage.objects
  for update using (bucket_id = 'servico-documentos')
  with check (bucket_id = 'servico-documentos');
create policy servico_documentos_public_delete on storage.objects
  for delete using (bucket_id = 'servico-documentos');

update storage.buckets
set public = true
where id = 'servico-documentos';

drop policy if exists servico_documentos_delete on public.servico_documentos;
drop policy if exists servico_documentos_update on public.servico_documentos;
drop policy if exists servico_documentos_insert on public.servico_documentos;
drop policy if exists servico_documentos_select on public.servico_documentos;
drop policy if exists servico_eventos_delete on public.servico_eventos;
drop policy if exists servico_eventos_update on public.servico_eventos;
drop policy if exists servico_eventos_insert on public.servico_eventos;
drop policy if exists servico_eventos_select on public.servico_eventos;
drop policy if exists servico_pendencias_delete on public.servico_pendencias;
drop policy if exists servico_pendencias_update on public.servico_pendencias;
drop policy if exists servico_pendencias_insert on public.servico_pendencias;
drop policy if exists servico_pendencias_select on public.servico_pendencias;
drop policy if exists servico_etapas_delete on public.servico_etapas;
drop policy if exists servico_etapas_update on public.servico_etapas;
drop policy if exists servico_etapas_insert on public.servico_etapas;
drop policy if exists servico_etapas_select on public.servico_etapas;
drop policy if exists financeiro_delete on public.financeiro;
drop policy if exists financeiro_update on public.financeiro;
drop policy if exists financeiro_insert on public.financeiro;
drop policy if exists financeiro_select on public.financeiro;
drop policy if exists tarefas_delete on public.tarefas;
drop policy if exists tarefas_update on public.tarefas;
drop policy if exists tarefas_insert on public.tarefas;
drop policy if exists tarefas_select on public.tarefas;
drop policy if exists propostas_delete on public.propostas;
drop policy if exists propostas_update on public.propostas;
drop policy if exists propostas_insert on public.propostas;
drop policy if exists propostas_select on public.propostas;
drop policy if exists servicos_delete on public.servicos;
drop policy if exists servicos_update on public.servicos;
drop policy if exists servicos_insert on public.servicos;
drop policy if exists servicos_select on public.servicos;
drop policy if exists clientes_delete on public.clientes;
drop policy if exists clientes_update on public.clientes;
drop policy if exists clientes_insert on public.clientes;
drop policy if exists clientes_select on public.clientes;
drop policy if exists perfis_usuario_update on public.perfis_usuario;
drop policy if exists perfis_usuario_insert on public.perfis_usuario;
drop policy if exists perfis_usuario_select on public.perfis_usuario;
drop policy if exists organization_members_delete on public.organization_members;
drop policy if exists organization_members_update on public.organization_members;
drop policy if exists organization_members_insert on public.organization_members;
drop policy if exists organization_members_select on public.organization_members;
drop policy if exists organizations_update on public.organizations;
drop policy if exists organizations_insert on public.organizations;
drop policy if exists organizations_select on public.organizations;

alter table public.servico_documentos disable row level security;
alter table public.servico_eventos disable row level security;
alter table public.servico_pendencias disable row level security;
alter table public.servico_etapas disable row level security;
alter table public.financeiro disable row level security;
alter table public.tarefas disable row level security;
alter table public.propostas disable row level security;
alter table public.servicos disable row level security;
alter table public.clientes disable row level security;
alter table public.perfis_usuario disable row level security;
alter table public.organization_members disable row level security;
alter table public.organizations disable row level security;

commit;

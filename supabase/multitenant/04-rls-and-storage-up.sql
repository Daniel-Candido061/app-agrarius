begin;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.perfis_usuario enable row level security;
alter table public.clientes enable row level security;
alter table public.servicos enable row level security;
alter table public.propostas enable row level security;
alter table public.tarefas enable row level security;
alter table public.financeiro enable row level security;
alter table public.servico_etapas enable row level security;
alter table public.servico_pendencias enable row level security;
alter table public.servico_eventos enable row level security;
alter table public.servico_documentos enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select using (public.is_organization_member(id));
drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
  for insert to authenticated
  with check (auth.uid() is not null);
drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update to authenticated
  using (public.is_organization_admin(id))
  with check (public.is_organization_admin(id));

drop policy if exists organization_members_select on public.organization_members;
create policy organization_members_select on public.organization_members
  for select using (public.is_organization_member(organization_id));
drop policy if exists organization_members_insert on public.organization_members;
create policy organization_members_insert on public.organization_members
  for insert to authenticated
  with check (public.is_organization_admin(organization_id));
drop policy if exists organization_members_update on public.organization_members;
create policy organization_members_update on public.organization_members
  for update to authenticated
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));
drop policy if exists organization_members_delete on public.organization_members;
create policy organization_members_delete on public.organization_members
  for delete to authenticated
  using (public.is_organization_admin(organization_id));

drop policy if exists perfis_usuario_select on public.perfis_usuario;
create policy perfis_usuario_select on public.perfis_usuario
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.organization_members as current_member
      join public.organization_members as target_member
        on target_member.organization_id = current_member.organization_id
      where current_member.user_id = auth.uid()
        and current_member.status = 'active'
        and target_member.user_id = perfis_usuario.id
        and target_member.status = 'active'
    )
  );
drop policy if exists perfis_usuario_insert on public.perfis_usuario;
create policy perfis_usuario_insert on public.perfis_usuario
  for insert to authenticated
  with check (id = auth.uid());
drop policy if exists perfis_usuario_update on public.perfis_usuario;
create policy perfis_usuario_update on public.perfis_usuario
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes for select using (public.is_organization_member(organization_id));
drop policy if exists clientes_insert on public.clientes;
create policy clientes_insert on public.clientes for insert to authenticated with check (public.is_organization_member(organization_id));
drop policy if exists clientes_update on public.clientes;
create policy clientes_update on public.clientes for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
drop policy if exists clientes_delete on public.clientes;
create policy clientes_delete on public.clientes for delete to authenticated using (public.is_organization_member(organization_id));

drop policy if exists servicos_select on public.servicos;
create policy servicos_select on public.servicos for select using (public.is_organization_member(organization_id));
drop policy if exists servicos_insert on public.servicos;
create policy servicos_insert on public.servicos for insert to authenticated with check (public.is_organization_member(organization_id));
drop policy if exists servicos_update on public.servicos;
create policy servicos_update on public.servicos for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
drop policy if exists servicos_delete on public.servicos;
create policy servicos_delete on public.servicos for delete to authenticated using (public.is_organization_member(organization_id));

drop policy if exists propostas_select on public.propostas;
create policy propostas_select on public.propostas for select using (public.is_organization_member(organization_id));
drop policy if exists propostas_insert on public.propostas;
create policy propostas_insert on public.propostas for insert to authenticated with check (public.is_organization_member(organization_id));
drop policy if exists propostas_update on public.propostas;
create policy propostas_update on public.propostas for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
drop policy if exists propostas_delete on public.propostas;
create policy propostas_delete on public.propostas for delete to authenticated using (public.is_organization_member(organization_id));

drop policy if exists tarefas_select on public.tarefas;
create policy tarefas_select on public.tarefas for select using (public.is_organization_member(organization_id));
drop policy if exists tarefas_insert on public.tarefas;
create policy tarefas_insert on public.tarefas for insert to authenticated with check (public.is_organization_member(organization_id));
drop policy if exists tarefas_update on public.tarefas;
create policy tarefas_update on public.tarefas for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
drop policy if exists tarefas_delete on public.tarefas;
create policy tarefas_delete on public.tarefas for delete to authenticated using (public.is_organization_member(organization_id));

drop policy if exists financeiro_select on public.financeiro;
create policy financeiro_select on public.financeiro for select using (public.is_organization_member(organization_id));
drop policy if exists financeiro_insert on public.financeiro;
create policy financeiro_insert on public.financeiro for insert to authenticated with check (public.is_organization_member(organization_id));
drop policy if exists financeiro_update on public.financeiro;
create policy financeiro_update on public.financeiro for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
drop policy if exists financeiro_delete on public.financeiro;
create policy financeiro_delete on public.financeiro for delete to authenticated using (public.is_organization_member(organization_id));

drop policy if exists servico_etapas_select on public.servico_etapas;
create policy servico_etapas_select on public.servico_etapas for select using (public.is_organization_member(organization_id));
drop policy if exists servico_etapas_insert on public.servico_etapas;
create policy servico_etapas_insert on public.servico_etapas for insert to authenticated with check (public.is_organization_member(organization_id));
drop policy if exists servico_etapas_update on public.servico_etapas;
create policy servico_etapas_update on public.servico_etapas for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
drop policy if exists servico_etapas_delete on public.servico_etapas;
create policy servico_etapas_delete on public.servico_etapas for delete to authenticated using (public.is_organization_member(organization_id));

drop policy if exists servico_pendencias_select on public.servico_pendencias;
create policy servico_pendencias_select on public.servico_pendencias for select using (public.is_organization_member(organization_id));
drop policy if exists servico_pendencias_insert on public.servico_pendencias;
create policy servico_pendencias_insert on public.servico_pendencias for insert to authenticated with check (public.is_organization_member(organization_id));
drop policy if exists servico_pendencias_update on public.servico_pendencias;
create policy servico_pendencias_update on public.servico_pendencias for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
drop policy if exists servico_pendencias_delete on public.servico_pendencias;
create policy servico_pendencias_delete on public.servico_pendencias for delete to authenticated using (public.is_organization_member(organization_id));

drop policy if exists servico_eventos_select on public.servico_eventos;
create policy servico_eventos_select on public.servico_eventos for select using (public.is_organization_member(organization_id));
drop policy if exists servico_eventos_insert on public.servico_eventos;
create policy servico_eventos_insert on public.servico_eventos for insert to authenticated with check (public.is_organization_member(organization_id));
drop policy if exists servico_eventos_update on public.servico_eventos;
create policy servico_eventos_update on public.servico_eventos for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
drop policy if exists servico_eventos_delete on public.servico_eventos;
create policy servico_eventos_delete on public.servico_eventos for delete to authenticated using (public.is_organization_member(organization_id));

drop policy if exists servico_documentos_select on public.servico_documentos;
create policy servico_documentos_select on public.servico_documentos for select using (public.is_organization_member(organization_id));
drop policy if exists servico_documentos_insert on public.servico_documentos;
create policy servico_documentos_insert on public.servico_documentos for insert to authenticated with check (public.is_organization_member(organization_id));
drop policy if exists servico_documentos_update on public.servico_documentos;
create policy servico_documentos_update on public.servico_documentos for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
drop policy if exists servico_documentos_delete on public.servico_documentos;
create policy servico_documentos_delete on public.servico_documentos for delete to authenticated using (public.is_organization_member(organization_id));

create or replace view public.vw_metricas_servicos_por_tipo
with (security_invoker = true) as
with conclusoes as (
  select servico_id, min(created_at) as data_conclusao_evento
  from public.servico_eventos
  where lower(coalesce(titulo, '')) = 'status atualizado'
    and (
      lower(coalesce(descricao, '')) like '%status alterado para concluido%'
      or lower(coalesce(descricao, '')) like '%status alterado para concluído%'
      or lower(coalesce(descricao, '')) like '%status alterado para entregue%'
    )
  group by servico_id
),
financeiro_por_servico as (
  select
    servico_id,
    sum(case when lower(trim(coalesce(tipo, ''))) = 'receita' and lower(trim(coalesce(status, ''))) = 'recebido' then coalesce(valor, 0) else 0 end)::numeric(14, 2) as receita_recebida,
    sum(case when lower(trim(coalesce(tipo, ''))) = 'despesa' and lower(trim(coalesce(status, ''))) = 'pago' then coalesce(valor, 0) else 0 end)::numeric(14, 2) as despesa_paga
  from public.financeiro
  where servico_id is not null
  group by servico_id
),
servicos_base as (
  select
    s.id,
    nullif(trim(s.tipo_servico), '') as tipo_servico,
    coalesce((s.data_entrada::timestamp at time zone 'UTC'), s.created_at) as data_entrada,
    c.data_conclusao_evento as data_conclusao,
    coalesce(s.valor, 0)::numeric(14, 2) as valor_contratado,
    coalesce(f.receita_recebida, 0)::numeric(14, 2) as receita_recebida,
    coalesce(f.despesa_paga, 0)::numeric(14, 2) as despesa_paga,
    lower(trim(coalesce(s.status, ''))) as status_normalizado
  from public.servicos as s
  left join conclusoes as c on c.servico_id = s.id
  left join financeiro_por_servico as f on f.servico_id = s.id
  where nullif(trim(s.tipo_servico), '') is not null
),
servicos_concluidos as (
  select
    *,
    case when data_conclusao is not null and data_entrada is not null and data_conclusao >= data_entrada then extract(epoch from (data_conclusao - data_entrada)) / 86400.0 else null end as tempo_execucao_dias,
    case when receita_recebida > 0 then (receita_recebida - despesa_paga) / receita_recebida else null end as margem_percentual
  from servicos_base
  where status_normalizado in ('concluido', 'concluído', 'entregue')
)
select
  tipo_servico,
  count(*)::integer as quantidade_servicos_concluidos,
  count(*) filter (where tempo_execucao_dias is not null)::integer as servicos_com_tempo_calculavel,
  round(avg(tempo_execucao_dias)::numeric, 1) as tempo_medio_dias,
  round(avg(valor_contratado)::numeric, 2) as ticket_medio,
  count(*) filter (where margem_percentual is not null)::integer as servicos_com_margem_calculavel,
  round(avg(margem_percentual)::numeric, 4) as margem_media,
  round(avg(receita_recebida)::numeric, 2) as receita_media_recebida,
  round(avg(despesa_paga)::numeric, 2) as despesa_media_paga
from servicos_concluidos
group by tipo_servico
order by quantidade_servicos_concluidos desc, tipo_servico asc;

create or replace view public.vw_conversao_comercial
with (security_invoker = true) as
with propostas_base as (
  select
    id,
    created_at,
    nullif(trim(tipo_servico), '') as tipo_servico,
    nullif(trim(origem), '') as origem,
    lower(trim(coalesce(status, ''))) as status_normalizado
  from public.propostas
),
dimensoes as (
  select 'tipo_servico'::text as dimensao, coalesce(tipo_servico, 'Nao informado') as agrupador, id, created_at, status_normalizado
  from propostas_base
  union all
  select 'origem'::text as dimensao, coalesce(origem, 'Nao informada') as agrupador, id, created_at, status_normalizado
  from propostas_base
)
select
  dimensao,
  agrupador,
  count(*)::integer as total_propostas,
  count(*) filter (where status_normalizado = 'ganho')::integer as propostas_ganhas,
  round((count(*) filter (where status_normalizado = 'ganho'))::numeric / nullif(count(*), 0), 4) as taxa_conversao
from dimensoes
group by dimensao, agrupador
order by dimensao asc, total_propostas desc, agrupador asc;

update storage.buckets
set public = false
where id = 'servico-documentos';

drop policy if exists servico_documentos_public_read on storage.objects;
drop policy if exists servico_documentos_public_insert on storage.objects;
drop policy if exists servico_documentos_public_update on storage.objects;
drop policy if exists servico_documentos_public_delete on storage.objects;

drop policy if exists servico_documentos_org_select on storage.objects;
create policy servico_documentos_org_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'servico-documentos'
    and exists (
      select 1
      from public.organization_members as om
      where om.user_id = auth.uid()
        and om.status = 'active'
        and om.organization_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists servico_documentos_org_insert on storage.objects;
create policy servico_documentos_org_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'servico-documentos'
    and exists (
      select 1
      from public.organization_members as om
      where om.user_id = auth.uid()
        and om.status = 'active'
        and om.organization_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists servico_documentos_org_update on storage.objects;
create policy servico_documentos_org_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'servico-documentos'
    and exists (
      select 1
      from public.organization_members as om
      where om.user_id = auth.uid()
        and om.status = 'active'
        and om.organization_id::text = (storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id = 'servico-documentos'
    and exists (
      select 1
      from public.organization_members as om
      where om.user_id = auth.uid()
        and om.status = 'active'
        and om.organization_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists servico_documentos_org_delete on storage.objects;
create policy servico_documentos_org_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'servico-documentos'
    and exists (
      select 1
      from public.organization_members as om
      where om.user_id = auth.uid()
        and om.status = 'active'
        and om.organization_id::text = (storage.foldername(name))[1]
    )
  );

commit;

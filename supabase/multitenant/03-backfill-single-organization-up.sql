begin;

do $$
declare
  seed_organization_id uuid;
  seed_owner_id uuid;
begin
  select p.id
  into seed_owner_id
  from public.perfis_usuario as p
  where coalesce(p.ativo, true) = true
  order by p.created_at asc nulls last, p.id asc
  limit 1;

  select p.default_organization_id
  into seed_organization_id
  from public.perfis_usuario as p
  where p.id = seed_owner_id
    and p.default_organization_id is not null
  limit 1;

  if seed_organization_id is null then
    insert into public.organizations (name, created_by)
    values ('Organizacao migrada', seed_owner_id)
    on conflict (name) do update
      set updated_at = timezone('utc', now())
    returning id into seed_organization_id;
  end if;

  with ordered_users as (
    select
      p.id as user_id,
      row_number() over (
        order by p.created_at asc nulls last, p.id asc
      ) as position
    from public.perfis_usuario as p
    where coalesce(p.ativo, true) = true
  )
  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_by
  )
  select
    seed_organization_id,
    ou.user_id,
    case when ou.position = 1 then 'admin' else 'membro' end,
    'active',
    seed_owner_id
  from ordered_users as ou
  on conflict (organization_id, user_id) do update
    set status = excluded.status;

  update public.perfis_usuario
  set
    default_organization_id = coalesce(default_organization_id, seed_organization_id),
    updated_at = timezone('utc', now())
  where coalesce(ativo, true) = true;

  update public.clientes
  set
    organization_id = coalesce(organization_id, seed_organization_id),
    criado_por = coalesce(criado_por, seed_owner_id),
    atualizado_por = coalesce(atualizado_por, criado_por, seed_owner_id),
    responsavel_id = coalesce(responsavel_id, criado_por, atualizado_por, seed_owner_id)
  where organization_id is null;

  update public.servicos as s
  set organization_id = coalesce(s.organization_id, c.organization_id, seed_organization_id)
  from public.clientes as c
  where s.organization_id is null
    and s.cliente_id = c.id;

  update public.servicos
  set organization_id = seed_organization_id
  where organization_id is null;

  update public.propostas as p
  set organization_id = coalesce(
    p.organization_id,
    s.organization_id,
    c.organization_id,
    seed_organization_id
  )
  from public.servicos as s,
       public.clientes as c
  where p.organization_id is null
    and p.servico_id = s.id
    and c.id = p.cliente_id;

  update public.propostas as p
  set organization_id = coalesce(
    p.organization_id,
    c.organization_id,
    seed_organization_id
  )
  from public.clientes as c
  where p.organization_id is null
    and p.cliente_id = c.id;

  update public.propostas
  set organization_id = seed_organization_id
  where organization_id is null;

  update public.tarefas as t
  set organization_id = coalesce(t.organization_id, s.organization_id, seed_organization_id)
  from public.servicos as s
  where t.organization_id is null
    and t.servico_id = s.id;

  update public.tarefas
  set organization_id = seed_organization_id
  where organization_id is null;

  update public.financeiro as f
  set organization_id = coalesce(f.organization_id, s.organization_id, seed_organization_id)
  from public.servicos as s
  where f.organization_id is null
    and f.servico_id = s.id;

  update public.financeiro
  set organization_id = seed_organization_id
  where organization_id is null;

  update public.servico_etapas as se
  set organization_id = coalesce(se.organization_id, s.organization_id, seed_organization_id)
  from public.servicos as s
  where se.organization_id is null
    and se.servico_id = s.id;

  update public.servico_pendencias as sp
  set organization_id = coalesce(sp.organization_id, s.organization_id, seed_organization_id)
  from public.servicos as s
  where sp.organization_id is null
    and sp.servico_id = s.id;

  update public.servico_eventos as se
  set organization_id = coalesce(se.organization_id, s.organization_id, seed_organization_id)
  from public.servicos as s
  where se.organization_id is null
    and se.servico_id = s.id;

  update public.servico_documentos as sd
  set organization_id = coalesce(sd.organization_id, s.organization_id, seed_organization_id)
  from public.servicos as s
  where sd.organization_id is null
    and sd.servico_id = s.id;
end $$;

alter table public.clientes alter column organization_id set not null;
alter table public.servicos alter column organization_id set not null;
alter table public.propostas alter column organization_id set not null;
alter table public.tarefas alter column organization_id set not null;
alter table public.financeiro alter column organization_id set not null;
alter table public.servico_etapas alter column organization_id set not null;
alter table public.servico_pendencias alter column organization_id set not null;
alter table public.servico_eventos alter column organization_id set not null;
alter table public.servico_documentos alter column organization_id set not null;

alter table public.servicos validate constraint servicos_cliente_same_organization_fkey;
alter table public.propostas validate constraint propostas_cliente_same_organization_fkey;
alter table public.propostas validate constraint propostas_servico_same_organization_fkey;
alter table public.tarefas validate constraint tarefas_servico_same_organization_fkey;
alter table public.financeiro validate constraint financeiro_servico_same_organization_fkey;
alter table public.servico_etapas validate constraint servico_etapas_servico_same_organization_fkey;
alter table public.servico_pendencias validate constraint servico_pendencias_servico_same_organization_fkey;
alter table public.servico_eventos validate constraint servico_eventos_servico_same_organization_fkey;
alter table public.servico_documentos validate constraint servico_documentos_servico_same_organization_fkey;

commit;

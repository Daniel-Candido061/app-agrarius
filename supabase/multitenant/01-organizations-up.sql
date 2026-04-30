begin;

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists organizations_created_at_idx
  on public.organizations(created_at desc);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'membro' check (role in ('admin', 'gestor', 'membro')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id);

create index if not exists organization_members_org_role_idx
  on public.organization_members(organization_id, role);

alter table public.perfis_usuario
  add column if not exists default_organization_id uuid references public.organizations(id) on delete set null;

create index if not exists perfis_usuario_default_organization_id_idx
  on public.perfis_usuario(default_organization_id);

create or replace function public.current_user_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select om.organization_id
  from public.organization_members as om
  where om.user_id = auth.uid()
    and om.status = 'active'
$$;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members as om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  )
$$;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members as om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role = 'admin'
  )
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.default_organization_id
      from public.perfis_usuario as p
      where p.id = auth.uid()
    ),
    (
      select om.organization_id
      from public.organization_members as om
      where om.user_id = auth.uid()
        and om.status = 'active'
      order by om.created_at asc
      limit 1
    )
  )
$$;

create or replace function public.bootstrap_organization(organization_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  created_organization public.organizations;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  normalized_name := nullif(trim(organization_name), '');

  if normalized_name is null then
    raise exception 'organization_name_required';
  end if;

  if exists (
    select 1
    from public.organization_members as om
    where om.user_id = auth.uid()
      and om.status = 'active'
  ) then
    raise exception 'user_already_belongs_to_an_organization';
  end if;

  insert into public.organizations (name, created_by)
  values (normalized_name, auth.uid())
  returning * into created_organization;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_by
  )
  values (
    created_organization.id,
    auth.uid(),
    'admin',
    'active',
    auth.uid()
  );

  insert into public.perfis_usuario (id, updated_at, default_organization_id)
  values (auth.uid(), timezone('utc', now()), created_organization.id)
  on conflict (id) do update
    set default_organization_id = excluded.default_organization_id,
        updated_at = timezone('utc', now());

  return created_organization;
end;
$$;

grant execute on function public.current_user_organization_ids() to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.bootstrap_organization(text) to authenticated;

commit;

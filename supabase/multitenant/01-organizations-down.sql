begin;

revoke execute on function public.bootstrap_organization(text) from authenticated;
revoke execute on function public.current_organization_id() from authenticated;
revoke execute on function public.is_organization_admin(uuid) from authenticated;
revoke execute on function public.is_organization_member(uuid) from authenticated;
revoke execute on function public.current_user_organization_ids() from authenticated;

drop function if exists public.bootstrap_organization(text);
drop function if exists public.current_organization_id();
drop function if exists public.is_organization_admin(uuid);
drop function if exists public.is_organization_member(uuid);
drop function if exists public.current_user_organization_ids();

drop index if exists public.perfis_usuario_default_organization_id_idx;

alter table public.perfis_usuario
  drop column if exists default_organization_id;

drop table if exists public.organization_members;
drop table if exists public.organizations;

commit;

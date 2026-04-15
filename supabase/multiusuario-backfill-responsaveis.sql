with unico_usuario as (
  select id
  from public.perfis_usuario
  where coalesce(ativo, true) = true
  order by created_at asc nulls last, id asc
  limit 1
),
controle as (
  select count(*)::integer as total_usuarios
  from public.perfis_usuario
  where coalesce(ativo, true) = true
)
update public.propostas
set
  criado_por = coalesce(criado_por, (select id from unico_usuario)),
  atualizado_por = coalesce(atualizado_por, criado_por, (select id from unico_usuario)),
  responsavel_id = coalesce(responsavel_id, criado_por, atualizado_por, (select id from unico_usuario))
where (select total_usuarios from controle) = 1;

with unico_usuario as (
  select id
  from public.perfis_usuario
  where coalesce(ativo, true) = true
  order by created_at asc nulls last, id asc
  limit 1
),
controle as (
  select count(*)::integer as total_usuarios
  from public.perfis_usuario
  where coalesce(ativo, true) = true
)
update public.servicos
set
  criado_por = coalesce(criado_por, (select id from unico_usuario)),
  atualizado_por = coalesce(atualizado_por, criado_por, (select id from unico_usuario)),
  responsavel_id = coalesce(responsavel_id, criado_por, atualizado_por, (select id from unico_usuario))
where (select total_usuarios from controle) = 1;

with unico_usuario as (
  select id
  from public.perfis_usuario
  where coalesce(ativo, true) = true
  order by created_at asc nulls last, id asc
  limit 1
),
controle as (
  select count(*)::integer as total_usuarios
  from public.perfis_usuario
  where coalesce(ativo, true) = true
)
update public.tarefas
set
  criado_por = coalesce(criado_por, (select id from unico_usuario)),
  atualizado_por = coalesce(atualizado_por, criado_por, (select id from unico_usuario)),
  responsavel_id = coalesce(responsavel_id, criado_por, atualizado_por, (select id from unico_usuario))
where (select total_usuarios from controle) = 1;

with unico_usuario as (
  select id
  from public.perfis_usuario
  where coalesce(ativo, true) = true
  order by created_at asc nulls last, id asc
  limit 1
),
controle as (
  select count(*)::integer as total_usuarios
  from public.perfis_usuario
  where coalesce(ativo, true) = true
)
update public.financeiro
set
  criado_por = coalesce(criado_por, (select id from unico_usuario)),
  atualizado_por = coalesce(atualizado_por, criado_por, (select id from unico_usuario)),
  responsavel_id = coalesce(responsavel_id, criado_por, atualizado_por, (select id from unico_usuario))
where (select total_usuarios from controle) = 1;

with unico_usuario as (
  select id
  from public.perfis_usuario
  where coalesce(ativo, true) = true
  order by created_at asc nulls last, id asc
  limit 1
),
controle as (
  select count(*)::integer as total_usuarios
  from public.perfis_usuario
  where coalesce(ativo, true) = true
)
update public.servico_pendencias
set
  criado_por = coalesce(criado_por, (select id from unico_usuario)),
  atualizado_por = coalesce(atualizado_por, criado_por, (select id from unico_usuario)),
  responsavel_id = coalesce(responsavel_id, criado_por, atualizado_por, (select id from unico_usuario))
where (select total_usuarios from controle) = 1;

with unico_usuario as (
  select id
  from public.perfis_usuario
  where coalesce(ativo, true) = true
  order by created_at asc nulls last, id asc
  limit 1
),
controle as (
  select count(*)::integer as total_usuarios
  from public.perfis_usuario
  where coalesce(ativo, true) = true
)
update public.servico_documentos
set
  criado_por = coalesce(criado_por, (select id from unico_usuario)),
  atualizado_por = coalesce(atualizado_por, criado_por, (select id from unico_usuario))
where (select total_usuarios from controle) = 1;

with unico_usuario as (
  select id
  from public.perfis_usuario
  where coalesce(ativo, true) = true
  order by created_at asc nulls last, id asc
  limit 1
),
controle as (
  select count(*)::integer as total_usuarios
  from public.perfis_usuario
  where coalesce(ativo, true) = true
)
update public.servico_eventos
set
  criado_por = coalesce(criado_por, (select id from unico_usuario))
where (select total_usuarios from controle) = 1;

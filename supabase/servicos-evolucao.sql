alter table public.servicos
  add column if not exists tipo_servico text,
  add column if not exists situacao_operacional text;

alter table public.servicos
  alter column situacao_operacional set default 'em_execucao_ativa';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'servicos_situacao_operacional_check'
      and conrelid = 'public.servicos'::regclass
  ) then
    alter table public.servicos
      add constraint servicos_situacao_operacional_check
      check (
        situacao_operacional is null
        or situacao_operacional in (
          'aguardando_cliente',
          'aguardando_orgao',
          'aguardando_cartorio',
          'aguardando_equipe',
          'pronto_para_protocolar',
          'pronto_para_entregar',
          'em_execucao_ativa'
        )
      );
  end if;
end $$;

create index if not exists servicos_situacao_operacional_idx
  on public.servicos(situacao_operacional);

create table if not exists public.servico_etapas (
  id bigserial primary key,
  servico_id bigint not null references public.servicos(id) on delete cascade,
  titulo text not null,
  status text not null default 'Pendente' check (status in ('Pendente', 'Em andamento', 'Concluida')),
  ordem integer not null default 0,
  opcional boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.servico_etapas
  add column if not exists opcional boolean not null default false;

with etapas_ordenadas as (
  select
    id,
    row_number() over (
      partition by servico_id
      order by
        case when ordem is null or ordem <= 0 then 1 else 0 end,
        coalesce(ordem, 999999),
        created_at,
        id
    ) as nova_ordem
  from public.servico_etapas
)
update public.servico_etapas as etapas
set ordem = etapas_ordenadas.nova_ordem
from etapas_ordenadas
where etapas.id = etapas_ordenadas.id
  and (etapas.ordem is null or etapas.ordem <= 0);

create index if not exists servico_etapas_servico_id_idx on public.servico_etapas(servico_id);
create index if not exists servico_etapas_ordem_idx on public.servico_etapas(servico_id, ordem);
create index if not exists servico_etapas_status_ordem_idx on public.servico_etapas(servico_id, status, ordem);

create table if not exists public.servico_pendencias (
  id bigserial primary key,
  servico_id bigint not null references public.servicos(id) on delete cascade,
  titulo text not null,
  origem text,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  prazo_resposta date,
  status text not null default 'Aberta' check (status in ('Aberta', 'Aguardando retorno', 'Resolvida')),
  observacao text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.servico_pendencias
  add column if not exists prioridade text not null default 'media',
  add column if not exists prazo_resposta date;

do $$
declare
  prioridade_constraint_name text;
begin
  select conname
  into prioridade_constraint_name
  from pg_constraint
  where conrelid = 'public.servico_pendencias'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%prioridade%';

  if prioridade_constraint_name is not null
     and prioridade_constraint_name <> 'servico_pendencias_prioridade_check' then
    execute format(
      'alter table public.servico_pendencias drop constraint %I',
      prioridade_constraint_name
    );
  end if;
end $$;

alter table public.servico_pendencias
  alter column prioridade set default 'media';

update public.servico_pendencias
set prioridade = case
  when lower(trim(prioridade)) = 'alta' then 'alta'
  when lower(trim(prioridade)) = 'baixa' then 'baixa'
  else 'media'
end
where prioridade is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'servico_pendencias_prioridade_check'
      and conrelid = 'public.servico_pendencias'::regclass
  ) then
    alter table public.servico_pendencias
      add constraint servico_pendencias_prioridade_check
      check (prioridade in ('baixa', 'media', 'alta'));
  end if;
end $$;

create index if not exists servico_pendencias_servico_id_idx on public.servico_pendencias(servico_id);
create index if not exists servico_pendencias_status_idx on public.servico_pendencias(servico_id, status);
create index if not exists servico_pendencias_prazo_resposta_idx on public.servico_pendencias(servico_id, prazo_resposta);
create index if not exists servico_pendencias_prioridade_status_idx on public.servico_pendencias(servico_id, prioridade, status);

create table if not exists public.servico_eventos (
  id bigserial primary key,
  servico_id bigint not null references public.servicos(id) on delete cascade,
  tipo text not null default 'manual',
  titulo text not null,
  descricao text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists servico_eventos_servico_id_idx on public.servico_eventos(servico_id);
create index if not exists servico_eventos_created_at_idx on public.servico_eventos(servico_id, created_at desc);

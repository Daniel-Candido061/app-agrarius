create or replace view public.vw_metricas_servicos_por_tipo as
with conclusoes as (
  select
    servico_id,
    min(created_at) as data_conclusao_evento
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
    sum(
      case
        when lower(trim(coalesce(tipo, ''))) = 'receita'
          and lower(trim(coalesce(status, ''))) = 'recebido'
          then coalesce(valor, 0)
        else 0
      end
    )::numeric(14, 2) as receita_recebida,
    sum(
      case
        when lower(trim(coalesce(tipo, ''))) = 'despesa'
          and lower(trim(coalesce(status, ''))) = 'pago'
          then coalesce(valor, 0)
        else 0
      end
    )::numeric(14, 2) as despesa_paga
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
  left join conclusoes as c
    on c.servico_id = s.id
  left join financeiro_por_servico as f
    on f.servico_id = s.id
  where nullif(trim(s.tipo_servico), '') is not null
),
servicos_concluidos as (
  select
    *,
    case
      when data_conclusao is not null
        and data_entrada is not null
        and data_conclusao >= data_entrada
        then extract(epoch from (data_conclusao - data_entrada)) / 86400.0
      else null
    end as tempo_execucao_dias,
    case
      when receita_recebida > 0
        then (receita_recebida - despesa_paga) / receita_recebida
      else null
    end as margem_percentual
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

create or replace view public.vw_conversao_comercial as
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
  select
    'tipo_servico'::text as dimensao,
    coalesce(tipo_servico, 'Nao informado') as agrupador,
    id,
    created_at,
    status_normalizado
  from propostas_base

  union all

  select
    'origem'::text as dimensao,
    coalesce(origem, 'Nao informada') as agrupador,
    id,
    created_at,
    status_normalizado
  from propostas_base
)
select
  dimensao,
  agrupador,
  count(*)::integer as total_propostas,
  count(*) filter (where status_normalizado = 'ganho')::integer as propostas_ganhas,
  round(
    (
      count(*) filter (where status_normalizado = 'ganho')
    )::numeric / nullif(count(*), 0),
    4
  ) as taxa_conversao
from dimensoes
group by dimensao, agrupador
order by dimensao asc, total_propostas desc, agrupador asc;

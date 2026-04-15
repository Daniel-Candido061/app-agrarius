create table if not exists public.propostas (
  id bigserial primary key,
  nome_oportunidade text not null,
  nome_contato text,
  empresa text,
  telefone text,
  cidade text,
  origem text,
  tipo_servico text,
  valor_estimado numeric(12,2),
  proxima_acao_data date,
  status text not null check (
    status in (
      'Entrada',
      'Qualificacao',
      'Proposta enviada',
      'Negociacao',
      'Ganho',
      'Perdido'
    )
  ),
  motivo_perda text,
  observacoes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.propostas
  add column if not exists cliente_id bigint references public.clientes(id) on delete set null,
  add column if not exists servico_id bigint references public.servicos(id) on delete set null,
  add column if not exists convertido_em timestamptz;

create index if not exists propostas_status_idx on public.propostas(status);
create index if not exists propostas_proxima_acao_data_idx on public.propostas(proxima_acao_data);
create index if not exists propostas_created_at_idx on public.propostas(created_at);
create index if not exists propostas_cliente_id_idx on public.propostas(cliente_id);
create index if not exists propostas_servico_id_idx on public.propostas(servico_id);

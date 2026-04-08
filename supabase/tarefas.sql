create table if not exists public.tarefas (
  id bigserial primary key,
  titulo text not null,
  servico_id bigint references public.servicos(id) on delete set null,
  responsavel text,
  data_limite date,
  prioridade text not null check (prioridade in ('baixa', 'média', 'alta')),
  status text not null check (status in ('pendente', 'em andamento', 'concluída')),
  observacao text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.tarefas
  alter column servico_id drop not null;

alter table public.tarefas
  drop constraint if exists tarefas_servico_id_fkey;

alter table public.tarefas
  add constraint tarefas_servico_id_fkey
  foreign key (servico_id) references public.servicos(id) on delete set null;

create index if not exists tarefas_servico_id_idx on public.tarefas(servico_id);
create index if not exists tarefas_data_limite_idx on public.tarefas(data_limite);

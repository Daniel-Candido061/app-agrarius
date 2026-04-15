alter table public.servico_eventos
  add column if not exists criado_por uuid references auth.users(id) on delete set null;

create index if not exists servico_eventos_criado_por_idx
  on public.servico_eventos(criado_por);

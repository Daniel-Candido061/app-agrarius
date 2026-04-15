alter table public.servicos
  add column if not exists data_entrada date;

update public.servicos
set data_entrada = (created_at at time zone 'utc')::date
where data_entrada is null
  and created_at is not null;

create index if not exists servicos_data_entrada_idx
  on public.servicos(data_entrada);

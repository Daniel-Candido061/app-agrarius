alter table public.servicos
  add column if not exists created_at timestamptz;

update public.servicos
set created_at = timezone('utc', now())
where created_at is null;

alter table public.servicos
  alter column created_at set default timezone('utc', now());

alter table public.servicos
  alter column created_at set not null;

create index if not exists servicos_created_at_idx on public.servicos(created_at);

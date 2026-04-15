create table if not exists public.servico_documentos (
  id bigserial primary key,
  servico_id bigint not null references public.servicos(id) on delete cascade,
  nome_original text not null,
  nome_arquivo text not null,
  caminho_storage text not null,
  tipo_mime text,
  tamanho_bytes bigint,
  observacao text,
  criado_em timestamptz not null default timezone('utc', now()),
  criado_por uuid references auth.users(id) on delete set null
);

create index if not exists servico_documentos_servico_id_idx
  on public.servico_documentos(servico_id);

create index if not exists servico_documentos_criado_em_idx
  on public.servico_documentos(servico_id, criado_em desc);

create unique index if not exists servico_documentos_caminho_storage_idx
  on public.servico_documentos(caminho_storage);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'servico-documentos',
  'servico-documentos',
  true,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.google-earth.kml+xml',
    'application/vnd.google-earth.kmz',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'servico_documentos_public_read'
  ) then
    create policy servico_documentos_public_read
      on storage.objects
      for select
      using (bucket_id = 'servico-documentos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'servico_documentos_public_insert'
  ) then
    create policy servico_documentos_public_insert
      on storage.objects
      for insert
      with check (bucket_id = 'servico-documentos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'servico_documentos_public_update'
  ) then
    create policy servico_documentos_public_update
      on storage.objects
      for update
      using (bucket_id = 'servico-documentos')
      with check (bucket_id = 'servico-documentos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'servico_documentos_public_delete'
  ) then
    create policy servico_documentos_public_delete
      on storage.objects
      for delete
      using (bucket_id = 'servico-documentos');
  end if;
end $$;

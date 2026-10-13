-- Bitácora QA · estructura de la base de datos
-- Pégalo completo en Supabase → SQL Editor → New query → Run.

-- Revisiones: cada fila es una revisión; el contenido va en "data".
create table if not exists public.revisiones (
  id          text        not null,
  user_id     uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  data        jsonb       not null,
  fecha       text        generated always as (data->>'fecha') stored,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists revisiones_fecha on public.revisiones (user_id, fecha desc);

-- Configuración por usuario (tu colección de stickers propios).
create table if not exists public.config (
  key      text  not null,
  user_id  uuid  not null default auth.uid() references auth.users(id) on delete cascade,
  data     jsonb not null,
  primary key (user_id, key)
);

-- Seguridad: cada persona solo ve y cambia lo suyo.
grant select, insert, update, delete on public.revisiones, public.config to authenticated;
alter table public.revisiones enable row level security;
alter table public.config     enable row level security;

drop policy if exists "revisiones propias" on public.revisiones;
create policy "revisiones propias" on public.revisiones
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "config propia" on public.config;
create policy "config propia" on public.config
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Imágenes (evidencias y stickers propios), en un espacio privado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencias', 'evidencias', false, 20971520,
        array['image/png','image/jpeg','image/gif','image/webp'])
on conflict (id) do nothing;

drop policy if exists "evidencias propias ver"    on storage.objects;
drop policy if exists "evidencias propias subir"  on storage.objects;
drop policy if exists "evidencias propias borrar" on storage.objects;
create policy "evidencias propias ver" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidencias' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidencias propias subir" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidencias' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidencias propias borrar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'evidencias' and (storage.foldername(name))[1] = auth.uid()::text);

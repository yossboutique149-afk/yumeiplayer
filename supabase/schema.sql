-- ============================================================================
-- YUMEIKA — THE MUSIC UNIVERSE
-- Supabase schema: tables, Row Level Security, storage policies, triggers.
--
-- Apply in Supabase Studio → SQL Editor (or `supabase db push`) once per project.
-- This file contains no credentials. The anon key used by the browser is safe
-- because every table below is protected by RLS; the service-role key is never
-- used by the client and must never be shipped to it.
--
-- Roles: admin (full control), editor (create/edit/publish content),
--        viewer (authenticated fan: favorites + own playlists).
-- Public (anon) visitors may only read published content.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles ---
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  role         text not null default 'viewer'
               check (role in ('admin', 'editor', 'viewer')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Staff roles for the Admin Studio. A new signup starts as viewer and must be promoted by an admin.';

-- ------------------------------------------------------- role helper funcs ---
-- security definer so policies can read profiles without recursive RLS.
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'anon'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'editor');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin';
$$;

revoke all on function public.current_role() from public;
revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_role() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ------------------------------------------------------------------ albums ---
create table if not exists public.albums (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  title_ja     text,
  description  text,
  cover_url    text,
  release_date date,
  album_type   text not null default 'album'
               check (album_type in ('album', 'ep', 'single', 'compilation')),
  status       text not null default 'draft'
               check (status in ('draft', 'published')),
  is_sample    boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists albums_status_idx on public.albums (status, sort_order);

-- ------------------------------------------------------------------- songs ---
create table if not exists public.songs (
  id                uuid primary key default gen_random_uuid(),
  album_id          uuid references public.albums (id) on delete set null,
  slug              text not null unique,
  title             text not null,
  title_ja          text,
  track_number      integer,
  duration_seconds  integer check (duration_seconds is null or duration_seconds >= 0),
  release_type      text not null default 'album_track'
                    check (release_type in ('album_track', 'single', 'other')),
  status            text not null default 'draft'
                    check (status in ('draft', 'published')),
  is_sample         boolean not null default false,
  cover_url         text,
  audio_url         text,
  description       text,
  credits           text,
  spotify_embed_url text,
  youtube_embed_url text,
  external_links    jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists songs_album_idx on public.songs (album_id, track_number);
create index if not exists songs_status_idx on public.songs (status, release_type);

-- ---------------------------------------------------------- audio sources ---
-- Uploaded files (provider 'upload', url from the audio bucket) or authorized
-- external links. Nothing is downloaded or re-hosted without authorization.
create table if not exists public.audio_sources (
  id         uuid primary key default gen_random_uuid(),
  song_id    uuid not null references public.songs (id) on delete cascade,
  label      text,
  url        text not null,
  provider   text not null default 'upload'
             check (provider in ('upload', 'external')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists audio_sources_song_idx on public.audio_sources (song_id);

-- ---------------------------------------------------------- lyric versions ---
create table if not exists public.lyric_versions (
  id          uuid primary key default gen_random_uuid(),
  song_id     uuid not null references public.songs (id) on delete cascade,
  language    text not null default 'ja',
  label       text not null default 'official',
  source_note text,
  is_published boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (song_id, language, label)
);

-- ------------------------------------------------------------- lyric lines ---
-- Primary language columns live here so one query can render a song.
-- Additional languages go in public.translations (below).
create table if not exists public.lyric_lines (
  id            uuid primary key default gen_random_uuid(),
  song_id       uuid not null references public.songs (id) on delete cascade,
  version_id    uuid references public.lyric_versions (id) on delete cascade,
  line_index    integer not null default 0,
  original      text not null default '',
  translation   text,
  romanization  text,
  pronunciation text,
  start_ms      integer check (start_ms is null or start_ms >= 0),
  end_ms        integer check (end_ms is null or end_ms >= 0),
  created_at    timestamptz not null default now(),
  unique (song_id, version_id, line_index),
  constraint lyric_lines_timing_order check (
    start_ms is null or end_ms is null or end_ms >= start_ms
  )
);

create index if not exists lyric_lines_song_idx on public.lyric_lines (song_id, line_index);

-- ------------------------------------------------------------ translations ---
create table if not exists public.translations (
  id              uuid primary key default gen_random_uuid(),
  lyric_line_id   uuid not null references public.lyric_lines (id) on delete cascade,
  language        text not null,
  text            text not null,
  translator_note text,
  created_at      timestamptz not null default now(),
  unique (lyric_line_id, language)
);

-- --------------------------------------------------- pronunciation guides ---
create table if not exists public.pronunciation_guides (
  id              uuid primary key default gen_random_uuid(),
  lyric_line_id   uuid not null references public.lyric_lines (id) on delete cascade,
  romanization    text,
  syllable_guide  text,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (lyric_line_id)
);

-- -------------------------------------------------------------- vocabulary ---
create table if not exists public.vocabulary (
  id         uuid primary key default gen_random_uuid(),
  song_id    uuid not null references public.songs (id) on delete cascade,
  term       text not null,
  reading    text,
  romaji     text,
  meaning    text,
  notes      text,
  line_index integer,
  created_at timestamptz not null default now()
);

create index if not exists vocabulary_song_idx on public.vocabulary (song_id);

-- ----------------------------------------------------------- song analyses ---
create table if not exists public.song_analyses (
  id               uuid primary key default gen_random_uuid(),
  song_id          uuid not null unique references public.songs (id) on delete cascade,
  story            text,
  meaning          text,
  pronunciation_guide text,
  verses           text,
  metaphors        text,
  symbolism        text,
  emotions         text,
  production       text,
  themes           text,
  connections      text,
  is_ai_generated  boolean not null default false,
  disclaimer       text,
  updated_at       timestamptz not null default now()
);

-- Columns added for AI studies (meaning summary and singing guide).
alter table public.song_analyses add column if not exists meaning text;
alter table public.song_analyses add column if not exists pronunciation_guide text;

-- --------------------------------------------------------------- favorites ---
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  song_id    uuid not null references public.songs (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, song_id)
);

create index if not exists favorites_user_idx on public.favorites (user_id);

-- --------------------------------------------------------------- playlists ---
create table if not exists public.playlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.playlist_items (
  id          uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  song_id     uuid not null references public.songs (id) on delete cascade,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (playlist_id, song_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles             enable row level security;
alter table public.albums               enable row level security;
alter table public.songs                enable row level security;
alter table public.audio_sources        enable row level security;
alter table public.lyric_versions       enable row level security;
alter table public.lyric_lines          enable row level security;
alter table public.translations         enable row level security;
alter table public.pronunciation_guides enable row level security;
alter table public.vocabulary           enable row level security;
alter table public.song_analyses        enable row level security;
alter table public.favorites            enable row level security;
alter table public.playlists            enable row level security;
alter table public.playlist_items       enable row level security;

-- profiles: a user reads their own row; admins read all; only admins write roles.
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- A signed-in non-admin must not promote themselves: block role changes
-- unless the caller is an admin.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an administrator can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- albums / songs: published content is world-readable, drafts are staff-only.
drop policy if exists albums_read_published on public.albums;
create policy albums_read_published on public.albums
  for select to anon, authenticated
  using (status = 'published' or public.is_staff());

drop policy if exists albums_staff_write on public.albums;
create policy albums_staff_write on public.albums
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists songs_read_published on public.songs;
create policy songs_read_published on public.songs
  for select to anon, authenticated
  using (status = 'published' or public.is_staff());

drop policy if exists songs_staff_write on public.songs;
create policy songs_staff_write on public.songs
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Child content of a song is readable only when its song is published.
create or replace function public.song_is_public(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.songs s
    where s.id = target and s.status = 'published'
  );
$$;

revoke all on function public.song_is_public(uuid) from public;
grant execute on function public.song_is_public(uuid) to anon, authenticated;

drop policy if exists audio_read on public.audio_sources;
create policy audio_read on public.audio_sources
  for select to anon, authenticated
  using (public.song_is_public(song_id) or public.is_staff());

drop policy if exists audio_write on public.audio_sources;
create policy audio_write on public.audio_sources
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists lyric_versions_read on public.lyric_versions;
create policy lyric_versions_read on public.lyric_versions
  for select to anon, authenticated
  using ((is_published and public.song_is_public(song_id)) or public.is_staff());

drop policy if exists lyric_versions_write on public.lyric_versions;
create policy lyric_versions_write on public.lyric_versions
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists lyric_lines_read on public.lyric_lines;
create policy lyric_lines_read on public.lyric_lines
  for select to anon, authenticated
  using (public.song_is_public(song_id) or public.is_staff());

drop policy if exists lyric_lines_write on public.lyric_lines;
create policy lyric_lines_write on public.lyric_lines
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists vocabulary_read on public.vocabulary;
create policy vocabulary_read on public.vocabulary
  for select to anon, authenticated
  using (public.song_is_public(song_id) or public.is_staff());

drop policy if exists vocabulary_write on public.vocabulary;
create policy vocabulary_write on public.vocabulary
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists analyses_read on public.song_analyses;
create policy analyses_read on public.song_analyses
  for select to anon, authenticated
  using (public.song_is_public(song_id) or public.is_staff());

drop policy if exists analyses_write on public.song_analyses;
create policy analyses_write on public.song_analyses
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- translations / pronunciation guides inherit the parent line's visibility.
drop policy if exists translations_read on public.translations;
create policy translations_read on public.translations
  for select to anon, authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.lyric_lines l
      where l.id = lyric_line_id and public.song_is_public(l.song_id)
    )
  );

drop policy if exists translations_write on public.translations;
create policy translations_write on public.translations
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists pronunciation_read on public.pronunciation_guides;
create policy pronunciation_read on public.pronunciation_guides
  for select to anon, authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.lyric_lines l
      where l.id = lyric_line_id and public.song_is_public(l.song_id)
    )
  );

drop policy if exists pronunciation_write on public.pronunciation_guides;
create policy pronunciation_write on public.pronunciation_guides
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- favorites: strictly per user.
drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- playlists: owner manages, public playlists readable by everyone.
drop policy if exists playlists_read on public.playlists;
create policy playlists_read on public.playlists
  for select to anon, authenticated
  using (is_public or user_id = auth.uid() or public.is_staff());

drop policy if exists playlists_write on public.playlists;
create policy playlists_write on public.playlists
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists playlist_items_read on public.playlist_items;
create policy playlist_items_read on public.playlist_items
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (p.is_public or p.user_id = auth.uid() or public.is_staff())
    )
  );

drop policy if exists playlist_items_write on public.playlist_items;
create policy playlist_items_write on public.playlist_items
  for all to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists albums_touch on public.albums;
create trigger albums_touch before update on public.albums
  for each row execute function public.touch_updated_at();

drop trigger if exists songs_touch on public.songs;
create trigger songs_touch before update on public.songs
  for each row execute function public.touch_updated_at();

drop trigger if exists lyric_versions_touch on public.lyric_versions;
create trigger lyric_versions_touch before update on public.lyric_versions
  for each row execute function public.touch_updated_at();

drop trigger if exists playlists_touch on public.playlists;
create trigger playlists_touch before update on public.playlists
  for each row execute function public.touch_updated_at();

-- Every new auth user gets a profile with the least-privileged role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- STORAGE
-- Audio uploads and artwork. Public read (the platform displays them), staff
-- write only. Bucket names must match src/lib/supabase.js STORAGE_BUCKETS.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('yumeika-audio', 'yumeika-audio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('yumeika-artwork', 'yumeika-artwork', true)
on conflict (id) do nothing;

drop policy if exists yumeika_media_read on storage.objects;
create policy yumeika_media_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('yumeika-audio', 'yumeika-artwork'));

drop policy if exists yumeika_media_insert on storage.objects;
create policy yumeika_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('yumeika-audio', 'yumeika-artwork') and public.is_staff());

drop policy if exists yumeika_media_update on storage.objects;
create policy yumeika_media_update on storage.objects
  for update to authenticated
  using (bucket_id in ('yumeika-audio', 'yumeika-artwork') and public.is_staff())
  with check (bucket_id in ('yumeika-audio', 'yumeika-artwork') and public.is_staff());

drop policy if exists yumeika_media_delete on storage.objects;
create policy yumeika_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('yumeika-audio', 'yumeika-artwork') and public.is_staff());

-- ============================================================================
-- FIRST ADMINISTRATOR
-- Sign up once through the app, then run (as the project owner, in SQL Editor):
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- After that the Admin Studio can manage albums, songs, lyrics, media and roles.
-- ============================================================================

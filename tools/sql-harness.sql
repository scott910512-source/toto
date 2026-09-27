-- ============================================================================
--  Supabase 흉내내기 — 마이그레이션을 진짜 PostgreSQL 에서 돌려보기 위한 껍데기
--
--  Supabase 는 auth / storage 스키마와 몇몇 함수를 미리 깔아 둡니다.
--  그게 없으면 우리 SQL 을 실행해 볼 수 없으니, 검사에 필요한 만큼만 만듭니다.
--  운영 DB 에는 절대 실행하지 않습니다 (CI 와 로컬 검사 전용).
--
--  흉내내는 것
--    · auth.users, auth.uid()          — set_config 로 "지금 누가 요청했나" 를 바꾼다
--    · storage.buckets, storage.objects
--    · storage.foldername()            — 경로를 / 로 쪼개 배열로
--    · authenticated / anon / service_role 역할
--    · supabase_realtime 퍼블리케이션
-- ============================================================================

create extension if not exists "pgcrypto";

do $$ begin create role anon nologin;          exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb
);

-- 요청자를 바꾸는 방법: select set_config('request.jwt.claim.sub', '<uuid>', false);
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table if not exists storage.buckets (
  id     text primary key,
  name   text,
  public boolean not null default false
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets(id),
  name       text not null,
  owner      uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;

-- Supabase 의 storage.foldername: 'a/b/c.jpg' → {a,b}
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1];
$$;

grant usage on schema auth, storage, public to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;

do $$ begin create publication supabase_realtime; exception when duplicate_object then null; end $$;

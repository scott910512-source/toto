-- ============================================================================
--  또또 가족 갤러리 · Supabase 스키마 + RLS 정책
--  실행 방법: Supabase 대시보드 → SQL Editor → 새 쿼리 → 전체 붙여넣기 → RUN
--  (여러 번 실행해도 안전하도록 작성했습니다)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. 확장
-- ────────────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────────────────
-- 1. 테이블
-- ────────────────────────────────────────────────────────────────────────────

-- 1-1. 가족 구성원 프로필 (auth.users 와 1:1)
--   role: admin(아빠/총관리자) / parent(엄마) / family(친척) / gallery_only(조부모)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  role         text not null default 'gallery_only'
               check (role in ('admin', 'parent', 'family', 'gallery_only')),
  approved     boolean not null default false,   -- 관리자 승인 전에는 아무것도 못 봄
  avatar       text,
  created_at   timestamptz not null default now()
);

-- 1-2. 앨범 (🏥 탄생 / 👶 50일 / 🎂 100일 / 🎄 첫 크리스마스 …)
create table if not exists public.albums (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  emoji         text default '📁',
  cover_media_id uuid,                            -- 대표사진 (media.id, FK는 아래에서)
  event_date    date,
  sort_order    int  not null default 0,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- 1-3. 사진/영상
create table if not exists public.media (
  id            uuid primary key default gen_random_uuid(),
  album_id      uuid references public.albums(id) on delete set null,
  storage_path  text not null,        -- 원본   family-media/2027/04/xxx.jpg
  preview_path  text,                 -- 감상용 (긴 변 1600px)
  thumb_path    text,                 -- 썸네일 (긴 변 400px)
  type          text not null default 'image' check (type in ('image', 'video')),
  mime          text,
  width         int,
  height        int,
  bytes         bigint,
  captured_at   timestamptz,          -- EXIF DateTimeOriginal (없으면 업로드 시각)
  uploaded_at   timestamptz not null default now(),
  uploaded_by   uuid references auth.users(id) on delete set null,
  caption       text,
  favorite      boolean not null default false
);

-- albums.cover_media_id → media.id (순환 참조라 테이블 생성 후 추가)
do $$ begin
  alter table public.albums
    add constraint albums_cover_media_fk
    foreign key (cover_media_id) references public.media(id) on delete set null;
exception when duplicate_object then null; end $$;

-- 1-4. 인덱스 (사진 수천 장에서도 첫 화면이 빠르도록)
create index if not exists media_captured_at_idx on public.media (captured_at desc);
create index if not exists media_album_idx       on public.media (album_id, captured_at desc);
create index if not exists media_favorite_idx    on public.media (favorite) where favorite;
create index if not exists media_uploader_idx    on public.media (uploaded_by);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. 권한 헬퍼 함수
--    security definer + search_path 고정 → RLS 재귀 없이 안전하게 역할 조회
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false);
$$;

-- 사진을 "볼" 수 있는 사람 = 승인된 모든 역할
create or replace function public.can_view()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_approved();
$$;

-- 사진을 "올리고 관리"할 수 있는 사람 = admin, parent 만
create or replace function public.can_upload()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_approved() and public.my_role() in ('admin', 'parent');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_approved() and public.my_role() = 'admin';
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. 신규 가입자 자동 프로필 생성
--    가입하면 gallery_only + 미승인 으로 시작 → 관리자가 승인/등급 조정
--    단, ADMIN_BOOTSTRAP_EMAIL 은 즉시 admin + 승인 (최초 1인)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bootstrap text := 'scott7259@naver.com';   -- ← 총관리자 이메일 (필요하면 수정)
begin
  insert into public.profiles (id, email, display_name, role, approved)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    case when lower(new.email) = lower(bootstrap) then 'admin' else 'gallery_only' end,
    case when lower(new.email) = lower(bootstrap) then true   else false end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS — 테이블
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.albums   enable row level security;
alter table public.media    enable row level security;

-- 4-1. profiles
drop policy if exists profiles_select_self  on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_update_self  on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;

-- 본인 프로필은 항상 읽을 수 있어야 함 (승인 대기 화면을 띄우기 위해)
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

-- 관리자는 전체 가족 목록 조회 (사용자 관리 화면)
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

-- 본인은 닉네임/아바타만 수정 가능 — role/approved 는 아래 트리거가 막음
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- 관리자는 모든 프로필(권한 포함) 수정 가능
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- 본인이 스스로 role/approved 를 올리는 것을 차단 (권한 상승 방지)
create or replace function public.guard_profile_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 로그인 컨텍스트가 없는 경우(대시보드 SQL 편집기 · service_role · 마이그레이션)는 허용.
  -- 웹에서 로그인하지 않은 사용자는 위의 RLS 정책에서 이미 막히므로 안전하며,
  -- 이 예외가 없으면 관리자가 대시보드에서 권한을 고칠 수 없어 잠기게 됩니다.
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;                       -- 관리자는 자유롭게 변경
  end if;
  if new.role is distinct from old.role
     or new.approved is distinct from old.approved then
    raise exception '권한은 관리자만 변경할 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_escalation_trg on public.profiles;
create trigger guard_profile_escalation_trg
  before update on public.profiles
  for each row execute function public.guard_profile_escalation();

-- 4-2. albums
drop policy if exists albums_select on public.albums;
drop policy if exists albums_write  on public.albums;

create policy albums_select on public.albums
  for select using (public.can_view());

create policy albums_write on public.albums
  for all using (public.can_upload()) with check (public.can_upload());

-- 4-3. media
drop policy if exists media_select        on public.media;
drop policy if exists media_insert        on public.media;
drop policy if exists media_update_owner  on public.media;
drop policy if exists media_delete_owner  on public.media;
drop policy if exists media_favorite_all  on public.media;

-- 승인된 가족만 조회 (비로그인/미승인은 0건)
create policy media_select on public.media
  for select using (public.can_view());

-- 업로드는 admin/parent 만, 그리고 uploaded_by 위조 금지
create policy media_insert on public.media
  for insert with check (public.can_upload() and uploaded_by = auth.uid());

-- 수정/삭제는 관리자 또는 올린 본인
create policy media_update_owner on public.media
  for update using (public.is_admin() or uploaded_by = auth.uid())
  with check   (public.is_admin() or uploaded_by = auth.uid());

create policy media_delete_owner on public.media
  for delete using (public.is_admin() or uploaded_by = auth.uid());

-- 즐겨찾기(❤️)는 가족 공용이라 승인된 누구나 토글할 수 있게 별도 RPC 제공
create or replace function public.toggle_favorite(p_media uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v boolean;
begin
  if not public.can_view() then
    raise exception '권한이 없습니다.';
  end if;
  update public.media set favorite = not favorite where id = p_media returning favorite into v;
  return v;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Storage — 비공개 버킷 + RLS
--    ⚠️ 버킷은 반드시 Public = OFF 로 만듭니다 (signed URL 로만 접근)
-- ────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('family-media', 'family-media', false)
on conflict (id) do update set public = false;   -- 실수로 public 이면 되돌림

drop policy if exists family_media_select on storage.objects;
drop policy if exists family_media_insert on storage.objects;
drop policy if exists family_media_update on storage.objects;
drop policy if exists family_media_delete on storage.objects;

-- 승인된 가족만 파일 읽기 (signed URL 발급도 이 정책을 통과해야 함)
create policy family_media_select on storage.objects
  for select using (bucket_id = 'family-media' and public.can_view());

-- 업로드는 admin/parent 만
create policy family_media_insert on storage.objects
  for insert with check (bucket_id = 'family-media' and public.can_upload());

create policy family_media_update on storage.objects
  for update using (bucket_id = 'family-media' and public.can_upload());

-- 삭제는 관리자 또는 올린 본인
create policy family_media_delete on storage.objects
  for delete using (
    bucket_id = 'family-media'
    and (public.is_admin() or owner = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 6. 기본 앨범 몇 개 (없을 때만)
-- ────────────────────────────────────────────────────────────────────────────
insert into public.albums (title, emoji, sort_order)
select v.title, v.emoji, v.ord
from (values
  ('탄생',         '🏥', 1),
  ('우리집',       '🏠', 2),
  ('50일',         '👶', 3),
  ('100일',        '🎂', 4),
  ('봄나들이',     '🌸', 5),
  ('첫 크리스마스','🎄', 6),
  ('첫돌',         '🎂', 7)
) as v(title, emoji, ord)
where not exists (select 1 from public.albums);

-- ============================================================================
--  끝. 확인용 쿼리:
--    select id, email, role, approved from public.profiles;
--    select id, public from storage.buckets where id = 'family-media';  -- public 이 false 여야 정상
-- ============================================================================

-- ============================================================================
--  또또 가족 앱 · 통합 스키마 (2단계)
--  육아수첩(기록·편지·설정·저장)을 Firebase → Supabase 로 옮기기 위한 테이블
--
--  실행 순서: schema.sql 을 먼저 실행한 뒤 이 파일을 실행하세요.
--  대시보드 → SQL Editor → 붙여넣기 → RUN  (여러 번 실행해도 안전)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. profiles 확장 (기존 users 문서의 나머지 필드)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists disabled    boolean not null default false;
alter table public.profiles add column if not exists login_days  text[]  not null default '{}';
alter table public.profiles add column if not exists letter_count int    not null default 0;
alter table public.profiles add column if not exists last_login  timestamptz;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. records — 수유·수면·기저귀·유축·이유식·투약·성장·건강·마일스톤·편지·메모·임신
--    타입마다 필드가 달라서 공통 컬럼 + data(jsonb) 구조로 둔다.
--    (기존 Firestore 문서 구조를 그대로 옮길 수 있어 코드 수정이 최소화됨)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.records (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,
  at           timestamptz not null default now(),   -- 기록 대상 시각
  data         jsonb not null default '{}'::jsonb,   -- 타입별 상세
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null,
  creator_name text
);

create index if not exists records_type_at_idx on public.records (type, at desc);
create index if not exists records_creator_idx on public.records (created_by);
create index if not exists records_at_idx      on public.records (at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. media 확장 — 기존 photos 문서의 필드를 흡수 (사진 시스템 하나로 통합)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.media add column if not exists category      text default 'baby';   -- baby | ultrasound | milestone
alter table public.media add column if not exists uploader_name text;
alter table public.media add column if not exists people        text[] default '{}';
alter table public.media add column if not exists place         text;
alter table public.media add column if not exists gps           jsonb;
alter table public.media add column if not exists vis           text default 'public'; -- public | private
alter table public.media add column if not exists liked_by      uuid[] default '{}';

create index if not exists media_category_idx on public.media (category);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. saved_photos — 사용자별 "나중에 볼 사진" (기존 users/{uid}/savedPhotos)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.saved_photos (
  user_id  uuid not null references auth.users(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, media_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. settings — 아기 정보 · 예방접종 체크 (기존 settings/baby 문서, 단일 행)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.settings (
  id         text primary key default 'baby',
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.settings (id, data) values ('baby', '{}'::jsonb)
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. RLS
-- ────────────────────────────────────────────────────────────────────────────
alter table public.records      enable row level security;
alter table public.saved_photos enable row level security;
alter table public.settings     enable row level security;

-- 6-1. records
--   · 보기   : 승인된 가족 전원 (단, '나만보기' 편지는 본인/관리자만)
--   · 쓰기   : admin / parent  (육아 기록은 부모만)
--   · 편지   : 승인된 가족 누구나 쓸 수 있음 (이모·삼촌·조부모도 편지는 가능)
--   · 수정삭제: 관리자 또는 작성 본인
drop policy if exists records_select on public.records;
drop policy if exists records_insert on public.records;
drop policy if exists records_update on public.records;
drop policy if exists records_delete on public.records;

create policy records_select on public.records
  for select using (
    public.can_view()
    and (
      coalesce(data ->> 'vis', 'public') <> 'private'
      or created_by = auth.uid()
      or public.is_admin()
    )
  );

create policy records_insert on public.records
  for insert with check (
    created_by = auth.uid()
    and (
      public.can_upload()                                   -- 부모: 모든 기록
      or (public.can_view() and type in ('letter', 'memo'))  -- 가족: 편지·메모만
    )
  );

create policy records_update on public.records
  for update using (public.is_admin() or created_by = auth.uid())
  with check   (public.is_admin() or created_by = auth.uid());

create policy records_delete on public.records
  for delete using (public.is_admin() or created_by = auth.uid());

-- 6-2. saved_photos — 철저히 본인 것만
drop policy if exists saved_own on public.saved_photos;
create policy saved_own on public.saved_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 6-3. settings — 승인된 가족은 읽기, 관리자/부모만 쓰기
drop policy if exists settings_select on public.settings;
drop policy if exists settings_write  on public.settings;
create policy settings_select on public.settings
  for select using (public.can_view());
create policy settings_write on public.settings
  for all using (public.can_upload()) with check (public.can_upload());

-- ────────────────────────────────────────────────────────────────────────────
-- 7. 사진 좋아요 토글 (liked_by 배열) — 승인된 가족 누구나
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.toggle_like(p_media uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare v uuid[];
begin
  if not public.can_view() then
    raise exception '권한이 없습니다.';
  end if;
  update public.media
     set liked_by = case
       when auth.uid() = any(coalesce(liked_by, '{}')) then array_remove(liked_by, auth.uid())
       else array_append(coalesce(liked_by, '{}'), auth.uid())
     end
   where id = p_media
   returning liked_by into v;
  return coalesce(v, '{}');
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. 로그인 날짜 기록 (메달용) — 본인 것만
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare today text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD');
begin
  if auth.uid() is null then return; end if;
  update public.profiles
     set login_days = case when today = any(coalesce(login_days, '{}'))
                           then login_days else array_append(coalesce(login_days, '{}'), today) end,
         last_login = now()
   where id = auth.uid();
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 9. 실시간(Realtime) 구독 허용 — 가족이 올린 기록이 즉시 반영되도록
-- ────────────────────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.media;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.settings;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ============================================================================
--  확인용:
--    select count(*) from public.records;
--    select id, data from public.settings;
--    select column_name from information_schema.columns
--     where table_name='media' and column_name in ('category','liked_by','vis');
-- ============================================================================

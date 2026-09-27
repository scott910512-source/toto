-- ============================================================================
--  또또 가족 앱 · 3단계 — 여러 가족(아기) 지원
--  ---------------------------------------------------------------------------
--  지금까지는 아기가 하나뿐이라 누가 가입하든 같은 데이터를 봤습니다.
--  이 마이그레이션은 '가족(families)' 단위로 데이터를 완전히 분리합니다.
--
--    · 초대코드 없이 가입  → 새 가족을 만들고 본인이 그 가족의 관리자
--    · 초대코드 넣고 가입  → 그 가족에 합류 (관람전용 + 승인대기)
--
--  기존 또또 데이터는 '또또네' 가족으로 전부 옮겨집니다(유실 없음).
--
--  실행 순서: schema.sql → schema-v2.sql → 이 파일
--  대시보드 → SQL Editor → 붙여넣기 → RUN  (여러 번 실행해도 안전)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. families — 가족(= 아기 한 명) 단위
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '우리 가족',
  invite_code text unique,                       -- 가족을 초대할 때 쓰는 6자리 코드
  baby        jsonb not null default '{}'::jsonb,-- name/birthDate/dueDate/sex/vaccines/units
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

/* 사람이 읽기 쉬운 초대코드 (헷갈리는 0/O/1/I 제외) */
create or replace function public.gen_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.families where invite_code = code);
  end loop;
  return code;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. 모든 테이블에 family_id 추가
--    DEFAULT 를 my_family_id() 로 두면 앱 코드를 고치지 않아도
--    새로 넣는 행에 자동으로 내 가족이 붙습니다.
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles     add column if not exists family_id uuid references public.families(id) on delete set null;
alter table public.records      add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.media        add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.albums       add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.saved_photos add column if not exists family_id uuid references public.families(id) on delete cascade;

create index if not exists profiles_family_idx on public.profiles (family_id);
create index if not exists records_family_idx  on public.records  (family_id, type, at desc);
create index if not exists media_family_idx    on public.media    (family_id, captured_at desc);
create index if not exists albums_family_idx   on public.albums   (family_id, sort_order);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. 내 가족 조회 헬퍼
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.my_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid();
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. 기존 데이터를 '또또네' 가족으로 이관 (최초 1회만)
-- ────────────────────────────────────────────────────────────────────────────
do $$
declare
  fid uuid;
  baby_json jsonb;
begin
  -- 이미 이관됐으면 건너뜀
  if exists (select 1 from public.profiles where family_id is not null) then
    return;
  end if;

  select coalesce(data, '{}'::jsonb) into baby_json from public.settings where id = 'baby';

  insert into public.families (name, invite_code, baby)
  values (
    coalesce(nullif(baby_json ->> 'name', ''), '또또') || '네',
    public.gen_invite_code(),
    coalesce(baby_json, '{}'::jsonb)
  )
  returning id into fid;

  update public.profiles     set family_id = fid where family_id is null;
  update public.records      set family_id = fid where family_id is null;
  update public.media        set family_id = fid where family_id is null;
  update public.albums       set family_id = fid where family_id is null;
  update public.saved_photos set family_id = fid where family_id is null;

  raise notice '기존 데이터를 가족 % 로 이관했습니다.', fid;
end $$;

-- 이관이 끝났으니 이제부터 새 행은 자동으로 내 가족에 붙는다
alter table public.records      alter column family_id set default public.my_family_id();
alter table public.media        alter column family_id set default public.my_family_id();
alter table public.albums       alter column family_id set default public.my_family_id();
alter table public.saved_photos alter column family_id set default public.my_family_id();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. 가입 트리거 — 초대코드 유무로 갈린다
--    · 코드 있음 → 그 가족에 합류 (관람전용 + 승인대기)
--    · 코드 없음 → 새 가족 생성 + 본인이 관리자 (바로 사용 가능)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  code   text := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
  nick   text := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1));
  fid    uuid;
  is_new boolean := false;
begin
  if code <> '' then
    select id into fid from public.families where invite_code = code;
  end if;

  if fid is null then
    -- 초대코드가 없거나 틀림 → 본인 가족을 새로 만든다
    insert into public.families (name, invite_code, baby, created_by)
    values (nick || '네', public.gen_invite_code(), '{}'::jsonb, new.id)
    returning id into fid;
    is_new := true;
  end if;

  insert into public.profiles (id, email, display_name, role, approved, family_id)
  values (
    new.id, new.email, nick,
    case when is_new then 'admin' else 'gallery_only' end,
    is_new,                       -- 새 가족을 만든 사람은 바로 사용, 합류자는 승인 대기
    fid
  )
  on conflict (id) do update set family_id = excluded.family_id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- 6. 권한 헬퍼를 가족 기준으로 다시 정의
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select approved and role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_view()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_upload()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select approved and role in ('admin','parent') from public.profiles where id = auth.uid()), false);
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. RLS 재작성 — 전부 "내 가족 것만"
-- ────────────────────────────────────────────────────────────────────────────
alter table public.families enable row level security;

drop policy if exists families_select on public.families;
drop policy if exists families_update on public.families;
create policy families_select on public.families
  for select using (id = public.my_family_id());
create policy families_update on public.families
  for update using (id = public.my_family_id() and public.can_upload())
  with check   (id = public.my_family_id() and public.can_upload());

-- 7-1. profiles — 같은 가족만 보인다
drop policy if exists profiles_select_self  on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_update_self  on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;

create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin() and family_id = public.my_family_id());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin() and family_id = public.my_family_id())
  with check   (public.is_admin() and family_id = public.my_family_id());

-- 7-2. records
drop policy if exists records_select on public.records;
drop policy if exists records_insert on public.records;
drop policy if exists records_update on public.records;
drop policy if exists records_delete on public.records;

create policy records_select on public.records
  for select using (
    family_id = public.my_family_id() and public.can_view()
    and (coalesce(data ->> 'vis', 'public') <> 'private'
         or created_by = auth.uid() or public.is_admin())
  );
create policy records_insert on public.records
  for insert with check (
    family_id = public.my_family_id() and created_by = auth.uid()
    and (public.can_upload() or (public.can_view() and type in ('letter','memo')))
  );
create policy records_update on public.records
  for update using (family_id = public.my_family_id() and (public.is_admin() or created_by = auth.uid()))
  with check   (family_id = public.my_family_id() and (public.is_admin() or created_by = auth.uid()));
create policy records_delete on public.records
  for delete using (family_id = public.my_family_id() and (public.is_admin() or created_by = auth.uid()));

-- 7-3. media
drop policy if exists media_select       on public.media;
drop policy if exists media_insert       on public.media;
drop policy if exists media_update_owner on public.media;
drop policy if exists media_delete_owner on public.media;

create policy media_select on public.media
  for select using (
    family_id = public.my_family_id() and public.can_view()
    and (coalesce(vis, 'public') <> 'private' or uploaded_by = auth.uid() or public.is_admin())
  );
create policy media_insert on public.media
  for insert with check (family_id = public.my_family_id() and public.can_upload() and uploaded_by = auth.uid());
create policy media_update_owner on public.media
  for update using (family_id = public.my_family_id() and (public.is_admin() or uploaded_by = auth.uid()))
  with check   (family_id = public.my_family_id() and (public.is_admin() or uploaded_by = auth.uid()));
create policy media_delete_owner on public.media
  for delete using (family_id = public.my_family_id() and (public.is_admin() or uploaded_by = auth.uid()));

-- 7-4. albums
drop policy if exists albums_select on public.albums;
drop policy if exists albums_write  on public.albums;
create policy albums_select on public.albums
  for select using (family_id = public.my_family_id() and public.can_view());
create policy albums_write on public.albums
  for all using (family_id = public.my_family_id() and public.can_upload())
  with check   (family_id = public.my_family_id() and public.can_upload());

-- 7-5. saved_photos — 본인 것만
drop policy if exists saved_own on public.saved_photos;
create policy saved_own on public.saved_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 7-6. settings — 더 이상 쓰지 않음(families.baby 로 이동). 읽기만 남겨둠.
drop policy if exists settings_write on public.settings;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. RPC 들도 가족 경계를 지키도록
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.toggle_like(p_media uuid)
returns uuid[]
language plpgsql security definer set search_path = public as $$
declare v uuid[];
begin
  if not public.can_view() then raise exception '권한이 없습니다.'; end if;
  update public.media
     set liked_by = case
       when auth.uid() = any(coalesce(liked_by,'{}')) then array_remove(liked_by, auth.uid())
       else array_append(coalesce(liked_by,'{}'), auth.uid()) end
   where id = p_media and family_id = public.my_family_id()
   returning liked_by into v;
  if v is null then raise exception '사진을 찾을 수 없습니다.'; end if;
  return v;
end; $$;

create or replace function public.toggle_favorite(p_media uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v boolean;
begin
  if not public.can_view() then raise exception '권한이 없습니다.'; end if;
  update public.media set favorite = not favorite
   where id = p_media and family_id = public.my_family_id()
   returning favorite into v;
  if v is null then raise exception '사진을 찾을 수 없습니다.'; end if;
  return v;
end; $$;

-- 내 가족의 초대코드 확인 (관리자·부모만)
create or replace function public.my_invite_code()
returns text
language sql stable security definer set search_path = public as $$
  select case when public.can_upload()
         then (select invite_code from public.families where id = public.my_family_id())
         else null end;
$$;

-- 초대코드 새로 발급 (관리자만)
create or replace function public.reset_invite_code()
returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.is_admin() then raise exception '관리자만 초대코드를 바꿀 수 있습니다.'; end if;
  c := public.gen_invite_code();
  update public.families set invite_code = c where id = public.my_family_id();
  return c;
end; $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 9. Storage — 파일 경로 앞에 가족 폴더가 붙도록 정책 정리
--    경로 형식: <familyId>/<YYYY>/<MM>/<uuid>_o.jpg
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists family_media_select on storage.objects;
drop policy if exists family_media_insert on storage.objects;
drop policy if exists family_media_update on storage.objects;
drop policy if exists family_media_delete on storage.objects;

create policy family_media_select on storage.objects
  for select using (
    bucket_id = 'family-media' and public.can_view()
    and (
      -- 새 경로(가족 폴더) 또는 이관 전 옛 경로
      (storage.foldername(name))[1] = public.my_family_id()::text
      or (storage.foldername(name))[1] ~ '^\d{4}$'
    )
  );
create policy family_media_insert on storage.objects
  for insert with check (
    bucket_id = 'family-media' and public.can_upload()
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );
create policy family_media_update on storage.objects
  for update using (bucket_id = 'family-media' and public.can_upload());
create policy family_media_delete on storage.objects
  for delete using (
    bucket_id = 'family-media'
    and (public.is_admin() or owner = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 10. Realtime
-- ────────────────────────────────────────────────────────────────────────────
do $$ begin alter publication supabase_realtime add table public.families;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ============================================================================
--  확인용:
--    select id, name, invite_code, baby ->> 'name' as baby from public.families;
--    select display_name, role, approved, family_id from public.profiles;
-- ============================================================================

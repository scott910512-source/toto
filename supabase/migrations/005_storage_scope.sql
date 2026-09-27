-- ============================================================================
--  005 · Storage 접근 범위 좁히기
--
--  왜 필요한가
--  ───────────────────────────────────────────────────────────────────────────
--  v3 에서 사진 경로를 <familyId>/YYYY/MM/... 로 바꿨지만, 그 전에 올라간
--  옛 경로(YYYY/MM/...)를 계속 읽게 해 두려고 이런 예외를 뒀습니다.
--
--      or (storage.foldername(name))[1] ~ '^\d{4}$'
--
--  이 한 줄 때문에 "네 자리 숫자로 시작하는 모든 파일" 이 모든 가족에게
--  열려 있습니다. 다른 엄마가 가입한 뒤로는 실제로 남의 집 사진을 볼 수
--  있는 구멍입니다(경로를 알아야 하지만, 권한은 막고 있지 않습니다).
--
--  덧붙여 두 가지가 더 있었습니다.
--    · update 정책에 가족 조건이 없어, 업로드 권한만 있으면 버킷 안의
--      어떤 파일이든 덮어쓸 수 있었습니다.
--    · delete 정책의 is_admin() 에 가족 조건이 없어, 다른 가족의 관리자가
--      우리 집 파일을 지울 수 있었습니다.
--
--  무엇을 하는가
--  ───────────────────────────────────────────────────────────────────────────
--  파일을 옮기지 않습니다. 옛 경로를 "그 파일을 가리키는 media 행이 우리
--  가족 것일 때만" 열어 주는 방식으로 바꿉니다. 경로 모양이 아니라 실제
--  소유 관계로 판단하므로, 파일 이동 없이 구멍이 닫힙니다.
--  (Storage 의 실제 객체 이름을 SQL 로 바꾸면 파일이 깨지므로 하지 않습니다.)
--
--  겸사겸사 나만보기도 Storage 층에서 한 번 더 막습니다. 지금은 앱이
--  서명 URL 을 안 만들어 주는 것으로만 가려지고 있는데, 권한 자체로
--  막는 편이 맞습니다.
--
--  안전한가
--  ───────────────────────────────────────────────────────────────────────────
--  데이터를 지우거나 옮기지 않습니다. 정책(권한)만 바꿉니다.
--  되돌리려면 schema-v3.sql 의 9번 절을 다시 실행하면 됩니다.
--  실행 전 아래 확인 쿼리로 옛 경로가 몇 개인지 먼저 봐도 좋습니다.
--
--    -- 옛 경로 파일 수
--    select count(*) from storage.objects
--     where bucket_id = 'family-media'
--       and (storage.foldername(name))[1] ~ '^\d{4}$';
--
--    -- 그중 media 행이 가리키지 않는 파일 (= 이 이후로 아무도 못 봄)
--    select o.name from storage.objects o
--     where o.bucket_id = 'family-media'
--       and (storage.foldername(o.name))[1] ~ '^\d{4}$'
--       and not exists (
--         select 1 from public.media m
--          where o.name in (m.storage_path, m.preview_path, m.thumb_path));
--
--  두 번째 쿼리에 나오는 파일은 어느 사진에도 연결되지 않은 찌꺼기입니다.
--  그래도 지우지는 않습니다 — 확인은 사람이 하는 게 맞습니다.
-- ============================================================================

-- 앞선 마이그레이션이 적용됐는지 먼저 확인한다 (틀린 순서로 돌려 깨지는 일 방지)
do $preflight$
begin
  if to_regclass('public.families') is null then
    raise exception '먼저 schema-v3.sql 을 실행하세요. public.families 가 없습니다.';
  end if;
  if to_regprocedure('public.my_family_id()') is null then
    raise exception '먼저 schema-v3.sql 을 실행하세요. my_family_id() 가 없습니다.';
  end if;
end
$preflight$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. 경로 하나가 우리 가족 것이고, 내가 볼 수 있는 사진인지 판단
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.can_read_media_path(p text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.media m
     where p in (m.storage_path, m.preview_path, m.thumb_path)
       and m.family_id = public.my_family_id()
       and (
         coalesce(m.vis, 'public') <> 'private'
         or m.uploaded_by = auth.uid()
         or public.is_admin()
       )
  );
$$;

-- 우리 가족 사진이 가리키는 경로인지 (공개범위와 무관 — 쓰기/삭제 판단용)
create or replace function public.is_my_family_media_path(p text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.media m
     where p in (m.storage_path, m.preview_path, m.thumb_path)
       and m.family_id = public.my_family_id()
  );
$$;

comment on function public.can_read_media_path(text) is
  '경로가 우리 가족 사진이고 내가 볼 수 있는지. 옛 경로(YYYY/MM/...)를 파일 이동 없이 가족별로 가르는 데 쓴다.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Storage 정책 다시 세우기
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists family_media_select on storage.objects;
drop policy if exists family_media_insert on storage.objects;
drop policy if exists family_media_update on storage.objects;
drop policy if exists family_media_delete on storage.objects;

-- 읽기: 우리 가족 폴더 + 내가 볼 수 있는 사진만.
--       옛 경로는 media 행으로 소유를 확인한다 (경로 모양으로 열어주지 않는다).
create policy family_media_select on storage.objects
  for select using (
    bucket_id = 'family-media'
    and public.can_view()
    and (
      (
        (storage.foldername(name))[1] = public.my_family_id()::text
        -- 새 경로도 나만보기는 Storage 층에서 한 번 더 막는다.
        -- 아직 media 행이 없는 업로드 직후 파일은 올린 사람에게만 열어둔다.
        and (
          public.can_read_media_path(name)
          or owner = auth.uid()
          or public.is_admin()
        )
      )
      or public.can_read_media_path(name)          -- 옛 경로
    )
  );

-- 쓰기: 우리 가족 폴더에만. 옛 경로로는 새로 올릴 수 없다.
create policy family_media_insert on storage.objects
  for insert with check (
    bucket_id = 'family-media'
    and public.can_upload()
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );

-- 덮어쓰기: 우리 가족 파일만. (앱은 덮어쓰지 않고 새로 올리지만, 열어둘 이유가 없다)
create policy family_media_update on storage.objects
  for update using (
    bucket_id = 'family-media'
    and public.can_upload()
    and (
      (storage.foldername(name))[1] = public.my_family_id()::text
      or public.is_my_family_media_path(name)
    )
  );

-- 삭제: 올린 사람이거나 우리 가족 관리자. 다른 가족 관리자는 손대지 못한다.
create policy family_media_delete on storage.objects
  for delete using (
    bucket_id = 'family-media'
    and (
      owner = auth.uid()
      or (
        public.is_admin()
        and (
          (storage.foldername(name))[1] = public.my_family_id()::text
          or public.is_my_family_media_path(name)
        )
      )
    )
  );

-- ============================================================================
--  확인용 (실행 후)
--    · 우리 가족 사진이 그대로 보이는지: 앱에서 갤러리 열어 보기
--    · 정책이 바뀌었는지:
--        select policyname, cmd from pg_policies
--         where schemaname = 'storage' and tablename = 'objects'
--           and policyname like 'family_media%';
-- ============================================================================

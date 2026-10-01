-- 또또 보안 수정 · 4/5 조각
-- 붙여넣기가 버벅일 때 쓰는 쪼갠 버전입니다. 1번부터 순서대로 실행하세요.
-- 조각 하나씩 붙여넣고 RUN → 다음 조각. 여러 번 실행해도 안전합니다.
-- 이 파일은 tools/build-compact-sql.mjs 가 만듭니다 — 손으로 고치지 마세요.

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

drop policy if exists family_media_select on storage.objects;

drop policy if exists family_media_insert on storage.objects;

drop policy if exists family_media_update on storage.objects;

drop policy if exists family_media_delete on storage.objects;

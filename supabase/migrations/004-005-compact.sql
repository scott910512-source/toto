-- 또또 아기수첩 · 보안 수정 004 + 005 (짧은 버전)
-- 아이패드/아이폰 사파리에서 붙여넣기가 버벅이지 않도록 설명을 뺀 것입니다.
-- 설명이 달린 원본: supabase/migrations/004_security_fix.sql · supabase/migrations/005_storage_scope.sql
-- 한 번에 전체 붙여넣고 RUN 하세요. 여러 번 실행해도 안전합니다.
-- 이 파일은 tools/build-compact-sql.mjs 가 만듭니다 — 손으로 고치지 마세요.

do $preflight$
begin
  if to_regclass('public.families') is null then
    raise exception '앞 단계가 실행되지 않았습니다. schema.sql → schema-v2.sql → schema-v3.sql 을 먼저 실행하세요.';
  end if;
end $preflight$;
create or replace function public.invite_code_exists(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.families
     where invite_code = upper(trim(coalesce(p_code, '')))
       and coalesce(trim(p_code), '') <> ''
  );
$$;
do $grants$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.invite_code_exists(text) to anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.invite_code_exists(text) to authenticated';
  end if;
end $grants$;
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
    if fid is null then
      raise exception '초대코드를 찾을 수 없습니다: %', code
        using errcode = 'check_violation';
    end if;
  else
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
create or replace function public.guard_profile_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare admin_count int;
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.role is not distinct from old.role
     and new.approved is not distinct from old.approved
     and new.family_id is not distinct from old.family_id then
    return new;
  end if;
  if not public.is_admin() then
    raise exception '권한은 관리자만 변경할 수 있습니다.';
  end if;
  if new.family_id is distinct from old.family_id then
    raise exception '소속 가족은 여기서 변경할 수 없습니다.';
  end if;
  if new.id = auth.uid()
     and old.role = 'admin'
     and (new.role <> 'admin' or new.approved = false) then
    select count(*) into admin_count
      from public.profiles
     where family_id = old.family_id and role = 'admin' and approved;
    if admin_count <= 1 then
      raise exception '마지막 관리자는 권한을 낮출 수 없습니다. 다른 관리자를 먼저 지정하세요.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_escalation_trg on public.profiles;
create trigger guard_profile_escalation_trg
  before update on public.profiles
  for each row execute function public.guard_profile_escalation();

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
create policy family_media_select on storage.objects
  for select using (
    bucket_id = 'family-media'
    and public.can_view()
    and (
      (
        (storage.foldername(name))[1] = public.my_family_id()::text
        and (
          public.can_read_media_path(name)
          or owner = auth.uid()
          or public.is_admin()
        )
      )
      or public.can_read_media_path(name)          -- 옛 경로
    )
  );
create policy family_media_insert on storage.objects
  for insert with check (
    bucket_id = 'family-media'
    and public.can_upload()
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );
create policy family_media_update on storage.objects
  for update using (
    bucket_id = 'family-media'
    and public.can_upload()
    and (
      (storage.foldername(name))[1] = public.my_family_id()::text
      or public.is_my_family_media_path(name)
    )
  );
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

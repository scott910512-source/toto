-- ============================================================================
--  004 · 보안/안정성 수정 (Phase 1)
--  ---------------------------------------------------------------------------
--  · 잘못된 초대코드로 새 가족이 생기지 않게 막는다
--  · 가입자가 스스로 권한을 낮추는 것도 막는다 (자기 강등)
--  · 초대코드 존재 여부를 가입 전에 확인하는 RPC 추가
--
--  기존 테이블을 지우거나 데이터를 바꾸지 않습니다. 여러 번 실행해도 안전합니다.
--  실행 순서: schema.sql → schema-v2.sql → schema-v3.sql → 이 파일
-- ============================================================================

-- 사전 점검
do $preflight$
begin
  if to_regclass('public.families') is null then
    raise exception '앞 단계가 실행되지 않았습니다. schema.sql → schema-v2.sql → schema-v3.sql 을 먼저 실행하세요.';
  end if;
end $preflight$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. 초대코드 존재 확인 (가입 전에 프론트가 호출)
--    코드가 맞는지만 알려주고, 어느 가족인지는 알려주지 않는다.
-- ────────────────────────────────────────────────────────────────────────────
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

-- 가입 전(로그인 안 된 상태)에도 호출해야 하므로 anon 에도 권한을 준다.
-- 역할이 없는 환경에서도 실패하지 않도록 있는 것만 부여한다.
do $grants$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.invite_code_exists(text) to anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.invite_code_exists(text) to authenticated';
  end if;
end $grants$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. 가입 트리거 — 잘못된 초대코드는 가입 자체를 거부
--    (예전에는 코드를 못 찾으면 조용히 새 가족을 만들어, 가족에 합류하려던
--     사람이 엉뚱한 빈 공간에 혼자 들어가 버렸다)
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
    if fid is null then
      -- 새 가족을 만들지 않고 가입을 중단시킨다
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

-- ────────────────────────────────────────────────────────────────────────────
-- 3. 자기 강등 차단
--    프론트 버그나 실수로 본인이 admin → gallery_only 로 떨어지면, 그 가족의
--    유일한 관리자가 사라져 아무도 승인해 줄 수 없는 상태가 된다.
--    · 남의 권한 변경은 여전히 관리자만
--    · 본인 권한은 "마지막 관리자"인 경우 낮추지 못하게 막는다
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.guard_profile_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare admin_count int;
begin
  -- 로그인 컨텍스트가 없으면(대시보드 SQL 편집기·service_role·마이그레이션) 통과
  if auth.uid() is null then
    return new;
  end if;

  -- 권한 관련 값이 바뀌지 않았다면 통과 (닉네임·접속일 등 일반 수정)
  if new.role is not distinct from old.role
     and new.approved is not distinct from old.approved
     and new.family_id is not distinct from old.family_id then
    return new;
  end if;

  if not public.is_admin() then
    raise exception '권한은 관리자만 변경할 수 있습니다.';
  end if;

  -- family_id 는 관리자라도 임의로 못 바꾼다 (가족 이동은 별도 절차)
  if new.family_id is distinct from old.family_id then
    raise exception '소속 가족은 여기서 변경할 수 없습니다.';
  end if;

  -- 마지막 관리자가 스스로를 강등/미승인 처리하는 것을 막는다
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

-- ============================================================================
--  확인:
--    select public.invite_code_exists('ABC123');   -- 없는 코드 → false
--    select id, name, invite_code from public.families;
-- ============================================================================

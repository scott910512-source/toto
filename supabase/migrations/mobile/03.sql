-- 또또 보안 수정 · 3/5 조각
-- 붙여넣기가 버벅일 때 쓰는 쪼갠 버전입니다. 1번부터 순서대로 실행하세요.
-- 조각 하나씩 붙여넣고 RUN → 다음 조각. 여러 번 실행해도 안전합니다.
-- 이 파일은 tools/build-compact-sql.mjs 가 만듭니다 — 손으로 고치지 마세요.

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

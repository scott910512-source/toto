-- 또또 보안 수정 · 2/5 조각
-- 붙여넣기가 버벅일 때 쓰는 쪼갠 버전입니다. 1번부터 순서대로 실행하세요.
-- 조각 하나씩 붙여넣고 RUN → 다음 조각. 여러 번 실행해도 안전합니다.
-- 이 파일은 tools/build-compact-sql.mjs 가 만듭니다 — 손으로 고치지 마세요.

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

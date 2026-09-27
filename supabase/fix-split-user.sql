-- ============================================================================
--  특정 계정을 '자기 가족(아기)' 으로 분리하기
--  ---------------------------------------------------------------------------
--  언제 쓰나:
--    schema-v3.sql 을 돌리기 전에 이미 가입해 있던 사람은, 이관 과정에서
--    기존 가족(또또네)으로 함께 옮겨집니다. 그 사람이 원래 '자기 아기'를
--    따로 관리해야 하는 경우 이 스크립트로 분리합니다.
--
--  하는 일:
--    1) 그 사람 이름으로 새 가족을 만들고
--    2) 그 사람을 새 가족의 관리자로 옮기고
--    3) 그 사람이 기존 가족에 남긴 기록/사진이 있으면 같이 가져옵니다
--       (남의 아기 기록을 가져오지 않도록, 본인이 만든 것만)
--
--  사용법: 아래 EMAIL 한 줄만 바꾸고 SQL Editor 에서 실행
-- ============================================================================

do $$
declare
  target_email text := 'jsr9297@naver.com';   -- ← 분리할 계정 이메일만 바꾸세요
  uid      uuid;
  old_fid  uuid;
  new_fid  uuid;
  nick     text;
  n_rec    int;
  n_media  int;
begin
  select p.id, p.family_id, coalesce(nullif(p.display_name,''), split_part(p.email,'@',1))
    into uid, old_fid, nick
    from public.profiles p
   where lower(p.email) = lower(target_email);

  if uid is null then
    raise exception '해당 계정을 찾을 수 없습니다: %  (auth.users 에 가입돼 있는지 확인하세요)', target_email;
  end if;

  -- 이미 혼자만 있는 가족이면 굳이 옮기지 않는다
  if old_fid is not null
     and (select count(*) from public.profiles where family_id = old_fid) = 1 then
    update public.profiles set role = 'admin', approved = true where id = uid;
    raise notice '% 님은 이미 단독 가족입니다. 관리자 권한만 확인했습니다.', nick;
    return;
  end if;

  insert into public.families (name, invite_code, baby, created_by)
  values (nick || '네', public.gen_invite_code(), '{}'::jsonb, uid)
  returning id into new_fid;

  -- 본인이 만든 것만 새 가족으로 이동 (남의 아기 데이터는 건드리지 않음)
  update public.records      set family_id = new_fid where created_by  = uid and family_id = old_fid;
  get diagnostics n_rec = row_count;
  update public.media        set family_id = new_fid where uploaded_by = uid and family_id = old_fid;
  get diagnostics n_media = row_count;
  update public.saved_photos set family_id = new_fid where user_id     = uid;

  update public.profiles
     set family_id = new_fid, role = 'admin', approved = true
   where id = uid;

  raise notice '✅ % 님을 새 가족으로 분리했습니다. (기록 %건 · 사진 %장 함께 이동)', nick, n_rec, n_media;
  raise notice '   새 가족 id: %', new_fid;
end $$;

-- 확인
select p.display_name, p.email, p.role, p.approved, f.name as family, f.invite_code
  from public.profiles p
  left join public.families f on f.id = p.family_id
 order by f.name, p.display_name;

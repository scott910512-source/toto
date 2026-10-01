-- 또또 보안 수정 · 5/5 조각
-- 붙여넣기가 버벅일 때 쓰는 쪼갠 버전입니다. 1번부터 순서대로 실행하세요.
-- 조각 하나씩 붙여넣고 RUN → 다음 조각. 여러 번 실행해도 안전합니다.
-- 이 파일은 tools/build-compact-sql.mjs 가 만듭니다 — 손으로 고치지 마세요.

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

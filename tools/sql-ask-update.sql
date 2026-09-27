-- "이 사람이 이 파일을 덮어쓸 수 있나?" → 바뀐 줄 수
-- psql -v uid="'<uuid>'" -v obj="'<경로>'" 로 부른다. 시도 후 되돌린다(rollback).
select set_config('request.jwt.claim.sub', :uid, false) \g /dev/null
set role authenticated;
begin;
with u as (
  update storage.objects set owner = owner
   where bucket_id = 'family-media' and name = :obj
  returning 1
) select count(*)::int from u;
rollback;

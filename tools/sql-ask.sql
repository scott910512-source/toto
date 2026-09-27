-- "이 사람이 이 파일을 읽을 수 있나?" 를 1/0 으로 답한다.
-- psql -v uid="'<uuid>'" -v obj="'<경로>'" 로 부른다.
-- 세션마다 새로 부르기 때문에, 역할을 바꿔 RLS 를 실제로 통과시켜 본다.
select set_config('request.jwt.claim.sub', :uid, false) \g /dev/null
set role authenticated;
select count(*)::int from storage.objects
 where bucket_id = 'family-media' and name = :obj;

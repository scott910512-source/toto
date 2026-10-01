-- 또또 보안 수정 · 1/5 조각
-- 붙여넣기가 버벅일 때 쓰는 쪼갠 버전입니다. 1번부터 순서대로 실행하세요.
-- 조각 하나씩 붙여넣고 RUN → 다음 조각. 여러 번 실행해도 안전합니다.
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

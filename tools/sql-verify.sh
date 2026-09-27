#!/usr/bin/env bash
# ============================================================================
#  마이그레이션을 진짜 PostgreSQL 에서 돌려보고, 권한이 의도대로인지 확인한다.
#
#  왜: RLS 는 눈으로 읽어서 맞는지 알기 어렵다. 한 줄 예외 때문에 남의 집
#      사진이 열려 있던 일이 실제로 있었다. 그래서 사람이 아니라 DB 에게 묻는다.
#
#  쓰는 곳: 로컬 검사와 CI. 운영 DB 는 건드리지 않는다 (임시 DB 를 새로 만든다).
#  실행:   bash tools/sql-verify.sh
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
DB=toto_verify

# 어디서 돌리든 같게 동작하도록 접속 방법을 한 곳에서 정한다.
#   · CI(서비스 컨테이너): PGHOST 가 설정돼 있으면 그대로 붙는다
#   · 로컬/컨테이너: 로컬에 깔린 PostgreSQL 을 postgres 계정으로 쓴다
if [ -n "${PGHOST:-}" ]; then
  run() { psql -v ON_ERROR_STOP=1 -q "$@"; }
else
  run() {
    local args=""
    for a in "$@"; do args="$args \"$a\""; done
    su postgres -c "psql -v ON_ERROR_STOP=1 -q$args"
  }
  pg_isready -q || { service postgresql start >/dev/null 2>&1; for _ in $(seq 1 15); do pg_isready -q && break; sleep 1; done; }
fi
runf() { run -d "$DB" -f "$ROOT/$1" >/dev/null; }

pg_isready -q || { echo "❌ PostgreSQL 에 붙지 못했습니다"; exit 1; }

run -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null

echo "▶ 스키마 올리기"
for f in tools/sql-harness.sql supabase/schema.sql supabase/schema-v2.sql \
         supabase/schema-v3.sql supabase/migrations/004_security_fix.sql; do
  runf "$f"
  echo "  ✅ $f"
done

echo "▶ 검사용 데이터 넣기 (두 가족 · 네 사람 · 사진 네 장)"
runf tools/sql-test-storage.sql

A_ADMIN=a0000000-0000-0000-0000-000000000001
A_PARENT=a0000000-0000-0000-0000-000000000002
A_FAMILY=a0000000-0000-0000-0000-000000000003
B_ADMIN=b0000000-0000-0000-0000-000000000001
OLD=2026/05/old_o.jpg
SEC=2026/05/sec_o.jpg
NEW=11111111-1111-1111-1111-111111111111/2026/09/new_o.jpg
ORPHAN=2024/12/orphan_o.jpg

# "이 사람이 이 파일을 읽을 수 있나?" — 세션마다 역할을 바꿔 RLS 를 실제로 통과시켜 본다
ask() {   # ask <uid> <경로> → 1/0
  run -At -d "$DB" -f "$ROOT/tools/sql-ask.sql" -v "uid='$1'" -v "obj='$2'" 2>/dev/null | tail -1
}

# 덮어쓰기·삭제는 실제로 시도해 보고 되돌린다(rollback). 바뀐 줄 수가 답이다.
askw() {  # askw <uid> <경로> <update|delete> → 1/0
  run -At -d "$DB" -f "$ROOT/tools/sql-ask-$3.sql" -v "uid='$1'" -v "obj='$2'" 2>/dev/null | tail -1
}

expect() { # expect <설명> <실제> <기대>
  if [ "$2" = "$3" ]; then echo "  ✅ $1"; else echo "  ❌ $1 — 기대 $3, 실제 $2"; FAILED=$((FAILED+1)); fi
}
FAILED=0

echo "▶ 005 적용 전 — 구멍이 실제로 있는지"
expect "다른집 관리자가 또또네 옛 경로 사진을 읽을 수 있다 (구멍)" "$(ask "$B_ADMIN" "$OLD")" 1
expect "다른집 관리자가 또또네 나만보기까지 읽을 수 있다 (구멍)"   "$(ask "$B_ADMIN" "$SEC")" 1
expect "다른집 관리자는 또또네 새 경로는 못 읽는다"                 "$(ask "$B_ADMIN" "$NEW")" 0

echo "▶ 005 적용"
runf supabase/migrations/005_storage_scope.sql
echo "  ✅ supabase/migrations/005_storage_scope.sql"

echo "▶ 005 적용 후 — 막혔는지, 그리고 우리 가족은 그대로인지"
expect "다른집 관리자는 또또네 옛 경로를 못 읽는다"       "$(ask "$B_ADMIN" "$OLD")" 0
expect "다른집 관리자는 또또네 나만보기를 못 읽는다"      "$(ask "$B_ADMIN" "$SEC")" 0
expect "다른집 관리자는 자기 집 옛 경로는 읽는다"        "$(ask "$B_ADMIN" "2025/01/bold_o.jpg")" 1

expect "또또네 관리자는 옛 경로를 읽는다"                "$(ask "$A_ADMIN" "$OLD")" 1
expect "또또네 관리자는 새 경로를 읽는다"                "$(ask "$A_ADMIN" "$NEW")" 1
expect "또또네 엄마는 옛 경로를 읽는다"                  "$(ask "$A_PARENT" "$OLD")" 1
expect "또또네 친척도 공개 사진은 읽는다"                "$(ask "$A_FAMILY" "$OLD")" 1

echo "▶ 나만보기"
expect "올린 사람(엄마)은 자기 나만보기를 읽는다"        "$(ask "$A_PARENT" "$SEC")" 1
expect "우리 집 관리자는 나만보기를 읽는다"              "$(ask "$A_ADMIN" "$SEC")" 1
expect "우리 집 친척은 남의 나만보기를 못 읽는다"        "$(ask "$A_FAMILY" "$SEC")" 0

echo "▶ 덮어쓰기 · 삭제 (005 가 가족 조건을 채워 넣었다)"
expect "다른집 관리자는 또또네 옛 경로 파일을 덮어쓸 수 없다"  "$(askw "$B_ADMIN" "$OLD" update)" 0
expect "다른집 관리자는 또또네 옛 경로 파일을 지울 수 없다"    "$(askw "$B_ADMIN" "$OLD" delete)" 0
expect "다른집 관리자는 또또네 새 경로 파일도 지울 수 없다"    "$(askw "$B_ADMIN" "$NEW" delete)" 0
expect "올린 사람은 자기 파일을 지울 수 있다"                 "$(askw "$A_ADMIN" "$OLD" delete)" 1
expect "우리 집 관리자는 엄마가 올린 파일도 지울 수 있다"      "$(askw "$A_ADMIN" "$SEC" delete)" 1
expect "친척(업로드 권한 없음)은 덮어쓸 수 없다"              "$(askw "$A_FAMILY" "$OLD" update)" 0

echo "▶ 연결 안 된 찌꺼기 파일"
expect "어느 사진에도 연결되지 않은 파일은 아무도 못 읽는다" "$(ask "$A_ADMIN" "$ORPHAN")" 0

echo
if [ "$FAILED" -gt 0 ]; then echo "❌ ${FAILED}건 실패"; exit 1; fi
echo "✅ Storage 권한 검사 전부 통과"
run -d postgres -c "drop database if exists $DB" >/dev/null

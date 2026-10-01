#!/usr/bin/env node
/* 아이패드·아이폰 사파리에서 붙여넣기가 버벅이지 않도록
   004 + 005 를 설명 없이 짧게 합친 파일과, 더 잘게 쪼갠 조각 파일을 만든다.

   손으로 관리하면 원본과 어긋나므로 매번 다시 만든다.
   npm run verify 가 다시 만들어 비교한다. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const SRC = [
  "supabase/migrations/004_security_fix.sql",
  "supabase/migrations/005_storage_scope.sql",
];
const OUT_DIR = "supabase/migrations/mobile";
const OUT_ONE = "supabase/migrations/004-005-compact.sql";

/** 주석 줄과 빈 줄만 버린다. 줄 안쪽의 -- 는 건드리지 않는다. */
function strip(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => {
      const s = l.trim();
      return s !== "" && !s.startsWith("--");
    })
    .map((l) => l.trimEnd())
    .join("\n");
}

const HEAD = `-- 또또 아기수첩 · 보안 수정 004 + 005 (짧은 버전)
-- 아이패드/아이폰 사파리에서 붙여넣기가 버벅이지 않도록 설명을 뺀 것입니다.
-- 설명이 달린 원본: ${SRC.join(" · ")}
-- 한 번에 전체 붙여넣고 RUN 하세요. 여러 번 실행해도 안전합니다.
-- 이 파일은 tools/build-compact-sql.mjs 가 만듭니다 — 손으로 고치지 마세요.
`;

const bodies = SRC.map(strip);
writeFileSync(OUT_ONE, `${HEAD}\n${bodies.join("\n\n")}\n`);

/* ── 조각내기 ─────────────────────────────────────────────────────────────
   한 조각 안에 문장이 끊기면 안 되므로, 최상위 문장 단위로 센다.
   $...$ 달러 인용 안에서는 세미콜론을 문장 끝으로 보지 않는다. */
function statements(sql) {
  const out = [];
  let buf = "";
  let tag = null;                 // 지금 열려 있는 달러 인용 태그
  const lines = sql.split("\n");
  for (const line of lines) {
    buf += (buf ? "\n" : "") + line;
    let i = 0;
    while (i < line.length) {
      if (tag) {
        const end = line.indexOf(tag, i);
        if (end === -1) break;
        i = end + tag.length;
        tag = null;
        continue;
      }
      const m = /\$[A-Za-z_]*\$/.exec(line.slice(i));
      const semi = line.indexOf(";", i);
      if (m && (semi === -1 || i + m.index < semi)) {
        tag = m[0];
        i += m.index + m[0].length;
        continue;
      }
      if (semi === -1) break;
      i = semi + 1;
      if (!tag && i >= line.length) {
        out.push(buf.trim());
        buf = "";
      }
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

const all = bodies.flatMap(statements);
const MAX_LINES = 45;             // 한 조각이 이보다 길어지면 새 조각을 시작한다
const chunks = [];
let cur = [];
for (const st of all) {
  const curLines = cur.join("\n").split("\n").length;
  if (cur.length && curLines + st.split("\n").length > MAX_LINES) {
    chunks.push(cur);
    cur = [];
  }
  cur.push(st);
}
if (cur.length) chunks.push(cur);

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
chunks.forEach((c, i) => {
  const n = String(i + 1).padStart(2, "0");
  const head = `-- 또또 보안 수정 · ${i + 1}/${chunks.length} 조각
-- 붙여넣기가 버벅일 때 쓰는 쪼갠 버전입니다. 1번부터 순서대로 실행하세요.
-- 조각 하나씩 붙여넣고 RUN → 다음 조각. 여러 번 실행해도 안전합니다.
-- 이 파일은 tools/build-compact-sql.mjs 가 만듭니다 — 손으로 고치지 마세요.
`;
  writeFileSync(`${OUT_DIR}/${n}.sql`, `${head}\n${c.join("\n\n")}\n`);
});

const one = readFileSync(OUT_ONE, "utf8");
console.log(`✅ ${OUT_ONE} — ${one.length.toLocaleString()}자 · ${one.split("\n").length}줄`);
chunks.forEach((c, i) => {
  const t = readFileSync(`${OUT_DIR}/${String(i + 1).padStart(2, "0")}.sql`, "utf8");
  console.log(`   ${OUT_DIR}/${String(i + 1).padStart(2, "0")}.sql — ${t.split("\n").length}줄 (문장 ${c.length}개)`);
});

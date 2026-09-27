#!/usr/bin/env node
/* 현재 운영 중인 정적 HTML 들이 깨지지 않았는지 확인한다.
   Vite 로 옮기는 중에도 이 파일들이 실제 서비스이므로, CI 가 매번 검사한다. */
import { readFileSync, existsSync } from "node:fs";
import { transform } from "@babel/standalone";

const FILES = ["app.html", "dday.html", "gallery.html", "baby-care.html"];
let failed = 0;

/* 있으면 안 되는 것 — 되돌아오면 바로 잡는다.
   파일마다 성격이 달라 적용 범위를 나눈다. */
const FORBIDDEN = [
  // 모든 파일: 비밀번호 평문 저장
  { re: /localStorage\.setItem\(\s*["']baby-cred["']/, why: "비밀번호를 localStorage 에 저장", files: null },
  // 모든 파일: 실제 service_role 키가 박힌 경우 (주석의 경고 문구는 제외)
  { re: /["']sb_secret_[A-Za-z0-9_-]{10,}["']/, why: "service_role(비밀) 키가 코드에 있음", files: null },
  // app.html 전용: 가입 직후 권한 덮어쓰기 (Supabase 는 DB 트리거가 정한다)
  { re: /role:\s*["']viewer["'],\s*approved:\s*false/, why: "가입 직후 권한 덮어쓰기", files: ["app.html"] },
];

for (const f of FILES) {
  if (!existsSync(f)) continue;
  const html = readFileSync(f, "utf8");

  for (const rule of FORBIDDEN) {
    if (rule.files && !rule.files.includes(f)) continue;
    if (rule.re.test(html)) { console.error(`❌ ${f}: ${rule.why}`); failed++; }
  }

  const m = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) { console.log(`   ${f}: babel 스크립트 없음 (건너뜀)`); continue; }
  try {
    transform(m[1], { presets: [["react", { runtime: "classic" }]] });
    console.log(`✅ ${f} 문법 OK (${m[1].length.toLocaleString()} chars)`);
  } catch (e) {
    console.error(`❌ ${f} 문법 오류: ${e.message}`);
    failed++;
  }
}

/* 서비스워커가 정적 파일에 HTML 을 돌려주지 않는지 */
if (existsSync("sw.js")) {
  const sw = readFileSync("sw.js", "utf8");
  if (!/req\.mode === "navigate"/.test(sw)) {
    console.error("❌ sw.js: navigate 분기가 없습니다 (정적 파일에 app.html 이 갈 수 있음)");
    failed++;
  } else console.log("✅ sw.js navigate/정적 분리 확인");
  if (!/supabase\\?\.co/.test(sw)) {
    console.error("❌ sw.js: supabase 요청이 캐시될 수 있습니다");
    failed++;
  } else console.log("✅ sw.js supabase 캐시 금지 확인");
}

if (failed) { console.error(`\n${failed}건 실패`); process.exit(1); }
console.log("\n모두 통과");

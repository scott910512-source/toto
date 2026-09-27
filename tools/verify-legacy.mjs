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
  // app.html 전용: 프론트가 권한을 직접 쓰는 코드 (DB 트리거가 정해야 한다)
  { re: /upd\.(role|approved|disabled)\s*=/, why: "프론트에서 role/approved/disabled 를 씀", files: ["app.html"] },
  { re: /isAdminEmail\(\s*user\.email\s*\)\s*(\|\||\?)/, why: "이메일만으로 관리자 권한을 줌", files: ["app.html"] },
  // app.html 전용: 12px 아래로 내려간 글씨 (한 손으로 보는 화면이다)
  { re: /text-\[(?:[0-9]|10|11)px\]/, why: "12px 보다 작은 글씨", files: ["app.html"] },
  { re: /fontSize:\s*(?:[0-9]|10|11)\b/, why: "12px 보다 작은 차트 글씨", files: ["app.html"] },
  // app.html 전용: 겁주는 표시 — 무엇이 급한지 구분이 안 된다
  { re: /🚨/u, why: "🚨 경고 표시 (⚠️ 로 통일하기로 했다)", files: ["app.html"] },
  // app.html 전용: 진단하는 말투
  { re: /비정상/, why: "'비정상' 판정 문구 (참고 범위 안내로 쓰기로 했다)", files: ["app.html"] },
];

/* 있어야 하는 것 — 없어지면 사용성·보안이 되돌아간 것이다 */
const REQUIRED = [
  { re: /purgeLegacyCredentials\(\)/, why: "예전 평문 비밀번호 정리", files: ["app.html"] },
  { re: /invite_code_exists/, why: "가입 전 초대코드 확인", files: ["app.html"] },
  { re: /useFocusTrap/, why: "모달 초점 가두기", files: ["app.html"] },
  { re: /addRecordUndoable/, why: "빠른 기록 실행취소", files: ["app.html"] },
  { re: /useHashRoute/, why: "화면 주소 기억 (뒤로가기)", files: ["app.html"] },
  { re: /rpc\(["']toggle_like["']/, why: "좋아요를 DB 함수로 처리 (남의 사진에도 눌러야 한다)", files: ["app.html"] },
  { re: /rpc\(["']touch_login["']/, why: "접속일 기록을 DB 함수로 처리", files: ["app.html"] },
];

for (const f of FILES) {
  if (!existsSync(f)) continue;
  const html = readFileSync(f, "utf8");

  for (const rule of FORBIDDEN) {
    if (rule.files && !rule.files.includes(f)) continue;
    if (rule.re.test(html)) { console.error(`❌ ${f}: ${rule.why}`); failed++; }
  }
  for (const rule of REQUIRED) {
    if (rule.files && !rule.files.includes(f)) continue;
    if (!rule.re.test(html)) { console.error(`❌ ${f}: ${rule.why} 가 사라졌습니다`); failed++; }
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

/* 화면에 찍히는 버전과 서비스워커 캐시 이름이 어긋나면,
   "최신으로 새로고침" 을 눌러도 폰이 예전 화면을 계속 보여준다.
   실제로 한 번 겪은 문제라 검사로 고정한다. */
if (existsSync("app.html") && existsSync("sw.js")) {
  const v = readFileSync("app.html", "utf8").match(/APP_VERSION = "(v\d+)"/);
  const c = readFileSync("sw.js", "utf8").match(/CACHE = "toto-(v\d+)"/);
  if (!v || !c) {
    console.error("❌ 버전 표기를 찾지 못했습니다 (APP_VERSION / CACHE)");
    failed++;
  } else if (v[1] !== c[1]) {
    console.error(`❌ 버전 불일치: app.html ${v[1]} ≠ sw.js ${c[1]} — 폰이 최신화되지 않습니다`);
    failed++;
  } else console.log(`✅ 버전 일치 ${v[1]}`);
}

if (failed) { console.error(`\n${failed}건 실패`); process.exit(1); }
console.log("\n모두 통과");

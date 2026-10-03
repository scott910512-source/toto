#!/usr/bin/env node
/* app.html 안의 JSX 를 미리 컴파일해 vendor/app-compiled.js 로 만든다.

   왜
   ─────────────────────────────────────────────────────────────────────────
   지금은 브라우저가 앱을 열 때마다
     · @babel/standalone 2.9MB 를 내려받고
     · 5,700줄 JSX 를 컴파일한다 (이 기계에서 ~900ms, 폰은 그 2~4배)
   미리 컴파일해 두면 둘 다 사라진다. 데이터와 시작 시간이 함께 줄어든다.

   왜 소스는 app.html 에 그대로 두나
   ─────────────────────────────────────────────────────────────────────────
   한 벌만 두기 위해서다. app.html 이 여전히 원본이고, 이 파일은 그걸 기계가
   옮겨 적은 것이다. 어긋나지 않게 npm run verify 가 다시 만들어 비교한다.
   미리 컴파일한 파일을 못 받는 상황에서는 app.html 이 예전처럼 Babel 을
   불러와 직접 컴파일한다 (느리지만 뜨긴 뜬다).

   쓰는 법: npm run build:app
   ========================================================================= */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { transform } from "@babel/standalone";
import { readAppSource } from "./app-source.mjs";

const SRC = "app.html";
const OUT = "vendor/app-compiled.js";

if (!existsSync(SRC)) { console.error(`${SRC} 이 없습니다`); process.exit(1); }

const html = readFileSync(SRC, "utf8");
const jsxSrc = readAppSource(html);
if (jsxSrc === null) { console.error("app.html 에서 JSX 스크립트를 찾지 못했습니다"); process.exit(1); }

let code;
try {
  code = transform(jsxSrc, { presets: [["react", { runtime: "classic" }]] }).code ?? "";
} catch (e) {
  console.error("컴파일 실패: " + e.message);
  process.exit(1);
}
if (!code.trim()) { console.error("컴파일 결과가 비었습니다"); process.exit(1); }

/* 다 끝났다고 알린다. app.html 이 이 표시를 보고
   "미리 컴파일한 것이 돌았는지" 를 판단해 Babel 되돌림을 결정한다. */
const banner =
  "/* 또또 아기수첩 · app.html 의 JSX 를 미리 컴파일한 것입니다.\n" +
  "   tools/build-app-bundle.mjs 가 만듭니다 — 손으로 고치지 마세요.\n" +
  '   원본은 app.html 안의 id="toto-source" 스크립트입니다. */\n';
const footer = '\n;window.__TOTO_PRECOMPILED = true;\n';

writeFileSync(OUT, banner + code + footer);

const kb = (n) => (n / 1024).toFixed(1) + "kB";
console.log(`✅ ${OUT} — ${kb(code.length)} (원본 JSX ${kb(jsxSrc.length)} · ${jsxSrc.split("\n").length.toLocaleString()}줄)`);
console.log("   브라우저가 더 이상 Babel 2.9MB 를 내려받거나 컴파일하지 않습니다.");

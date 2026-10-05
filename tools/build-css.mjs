#!/usr/bin/env node
/* app.html 이 쓰는 Tailwind 클래스만 골라 vendor/app.css 로 미리 만든다.

   왜
   ─────────────────────────────────────────────────────────────────────────
   지금은 앱을 열 때마다 cdn.tailwindcss.com 에서 398kB 를 받고, 브라우저가
   페이지의 클래스를 훑어 그 자리에서 CSS 를 만든다(JIT). 폰에서는 이게
   Babel 다음으로 큰 시작 비용이었다.
   미리 만들어 두면 내려받기도, 런타임 컴파일도 사라진다.

   어떻게
   ─────────────────────────────────────────────────────────────────────────
   tailwindcss CLI 가 app.html 을 훑어 실제로 쓰인 클래스만 담는다.
   (동적으로 조립되는 클래스가 없는지 확인했다 — 전부 글자 그대로 적혀 있다)
   결과는 커밋한다. Pages 가 브랜치를 그대로 내보내 빌드 단계가 없어서다.
   npm run verify 가 다시 만들어 비교한다.

   못 받았을 때는 app.html 이 예전처럼 CDN 을 불러온다 (느리지만 뜬다).

   쓰는 법: npm run build:css
   ========================================================================= */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "vendor/app.css");
const CONFIG = join(ROOT, "tools/tailwind.legacy.config.js");
const INPUT = join(ROOT, "tools/tailwind.legacy.input.css");

if (!existsSync(join(ROOT, "app.html"))) { console.error("app.html 이 없습니다"); process.exit(1); }
mkdirSync(join(ROOT, "vendor"), { recursive: true });

/* CDN 이 주던 것과 같게: base(리셋) + components + utilities */
writeFileSync(INPUT, "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n");

try {
  execFileSync(
    "npx",
    ["tailwindcss", "-c", CONFIG, "-i", INPUT, "-o", OUT, "--minify"],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );
} catch (e) {
  console.error("Tailwind 빌드 실패:\n" + String(e.stderr || e.message).slice(0, 600));
  process.exit(1);
}

let css = readFileSync(OUT, "utf8");
if (css.length < 5_000) {
  console.error(`결과가 너무 작습니다 (${css.length}자) — app.html 을 못 읽은 것 같습니다`);
  process.exit(1);
}
/* 손으로 고치지 말라는 표시. 빌드가 매번 같은 결과를 내도록 날짜는 넣지 않는다. */
css = "/* 또또 아기수첩 · app.html 에 쓰인 Tailwind 클래스만 담은 CSS.\n"
    + "   tools/build-css.mjs 가 만듭니다 — 손으로 고치지 마세요. */\n" + css;
writeFileSync(OUT, css);

const kb = (n) => (n / 1024).toFixed(1) + "kB";
console.log(`✅ vendor/app.css — ${kb(css.length)} (CDN 398kB + 런타임 컴파일 대신)`);

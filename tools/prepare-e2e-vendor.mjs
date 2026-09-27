#!/usr/bin/env node
/* E2E 는 app.html 의 CDN 주소를 로컬 파일로 바꿔치기해서 돌린다.
   그 로컬 파일을 node_modules 에서 만들어 둔다(저장소에 큰 파일을 넣지 않기 위해). */
import { copyFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";

const OUT = "e2e/vendor";
mkdirSync(OUT, { recursive: true });

const COPY = [
  ["node_modules/react/umd/react.production.min.js", "react.js"],
  ["node_modules/react-dom/umd/react-dom.production.min.js", "react-dom.js"],
  ["node_modules/@babel/standalone/babel.min.js", "babel.js"],
  ["node_modules/prop-types/prop-types.min.js", "prop-types.js"],
  ["node_modules/recharts/umd/Recharts.js", "recharts.js"],
];

for (const [from, to] of COPY) {
  if (!existsSync(from)) { console.error(`❌ 없음: ${from} — npm install 을 먼저 하세요`); process.exit(1); }
  copyFileSync(from, `${OUT}/${to}`);
  console.log(`  ✅ ${to}`);
}

writeFileSync(`${OUT}/exifr.js`, "window.exifr=null;\n");
writeFileSync(`${OUT}/empty.css`, "\n");

/* Tailwind 는 CDN 런타임이라 npm 패키지에 없다. 저장소에 넣어둔 사본을 쓴다. */
if (!existsSync(`${OUT}/tailwind.js`)) {
  console.error("❌ e2e/vendor/tailwind.js 가 없습니다. tools/fetch-tailwind.mjs 를 실행하세요.");
  process.exit(1);
}
console.log("  ✅ tailwind.js (저장소 사본)");
console.log("\nE2E 준비 완료");

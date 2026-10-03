#!/usr/bin/env node
/* 누르기 어려운 크기로 되돌아가는 것을 커밋 전에 잡는다.

   왜 이게 따로 필요한가
   ─────────────────────────────────────────────────────────────────────────
   e2e/a11y.spec.ts 는 실제로 그려진 크기를 재므로 정확하지만, 화면에 보이는
   것만 본다. 모달 안, 펼쳐야 보이는 행, 특정 기기에서만 뜨는 배너 같은
   자리는 테스트가 닿지 못한다. 실제로 그렇게 네 개를 놓쳤다.

   그래서 여기서는 클래스 글자만 보고 "확실히 작은 것" 만 잡는다.
   애매한 것(py-2 에 큰 글씨 등)은 런타임 검사에 맡긴다.
   ========================================================================= */
import { readFileSync, existsSync } from "node:fs";

const FILES = ["app.html"];

/* 44px 를 채우는 탈출구 — 이 중 하나가 있으면 넘어간다 */
const ESCAPE = /min-h-\[4[4-9]px\]|min-h-\[[5-9]\d px?\]|min-h-\[[5-9]\d px\]|min-h-\[[5-9]\dpx\]|\bh-1[12]\b|\bw-1[12]\b|\bh-full\b|\bpy-[3-9]\b|\bpy-2\.5\b|min-h-\[5[0-9]px\]/;

/* 확실히 작은 것 */
const TOO_SMALL = [
  { re: /\bw-[1-9]\b/, why: "너비 40px 미만 (w-1~w-9)" },
  { re: /\bh-[1-9]\b/, why: "높이 40px 미만 (h-1~h-9)" },
  { re: /\bw-10\b/, why: "너비 40px (44 미만)" },
  { re: /\bh-10\b/, why: "높이 40px (44 미만)" },
  { re: /\bpy-1(\.5)?\b/, why: "세로 패딩이 너무 작음 (py-1 / py-1.5)" },
];

let failed = 0;

for (const f of FILES) {
  if (!existsSync(f)) continue;
  const src = readFileSync(f, "utf8");
  const found = [];

  /* className 하나하나를 보고, 그 앞에 가장 가까운 여는 태그가 button 인지 본다.

     태그 전체를 정규식으로 자르려 하면 안 된다 — onClick={() => ...} 의 "=>" 가
     태그 끝으로 읽혀서 그 버튼들을 통째로 건너뛴다 (실제로 그렇게
     과소보고하고 있었다). */
  const clsRe = /className=(?:"([^"]*)"|\{`([\s\S]*?)`\})/g;
  for (const m of src.matchAll(clsRe)) {
    const cls = [m[1], m[2]].filter(Boolean).join(" ");
    if (!cls) continue;
    // 바로 앞의 여는 태그 이름
    const before = src.slice(0, m.index);
    const open = before.lastIndexOf("<");
    if (open === -1) continue;
    const name = (src.slice(open + 1, open + 12).match(/^([A-Za-z][\w-]*)/) || [])[1];
    if (name !== "button") continue;
    const tag = src.slice(open, m.index + m[0].length);
    if (ESCAPE.test(cls)) continue;

    for (const rule of TOO_SMALL) {
      if (rule.re.test(cls)) {
        const line = before.split("\n").length;
        const label = (tag.match(/aria-label="([^"]*)"/) || [])[1] || "";
        found.push(`${f}:${line} ${rule.why}${label ? ` · "${label}"` : ""}`);
        break;
      }
    }
  }

  if (found.length) {
    console.error(`❌ 누르기 어려운 크기 ${found.length}곳 (한 손으로 쓰는 앱이라 44px 이상)`);
    for (const l of found) console.error("   " + l);
    console.error("   고치는 법: min-h-[44px] 를 더하거나, 사진 위라면");
    console.error("   겉보기는 두고 바깥을 w-11 h-11 로 감싸 누를 영역만 넓히세요.");
    failed += found.length;
  } else {
    console.log(`✅ ${f}: 누를 수 있는 크기 (버튼 클래스 검사)`);
  }
}

process.exit(failed ? 1 : 0);

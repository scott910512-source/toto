#!/usr/bin/env node
/* 앱이 뜨기까지 무엇에 시간이 걸리는지 잰다.

   왜: app.html 은 6천 줄 JSX 를 브라우저에서 Babel 로 컴파일한다. 폰에서는
   이게 시작 시간의 대부분일 수 있는데, 재 본 적이 없다. 고치기 전에 먼저
   재서 "정말 그런가" 를 확인한다.

   쓰는 법: node tools/measure-startup.mjs [대상URL]
   (대상URL 없으면 로컬 파일 기준으로 크기만 센다) */
import { readFileSync, existsSync } from "node:fs";
import { transform } from "@babel/standalone";
import { readAppSource } from "./app-source.mjs";

const file = "app.html";
if (!existsSync(file)) { console.error("app.html 이 없습니다"); process.exit(1); }

const html = readFileSync(file, "utf8");
const jsxSrc = readAppSource(html);
if (jsxSrc === null) { console.error("babel 스크립트를 찾지 못했습니다"); process.exit(1); }
const jsx = jsxSrc;

const kb = (n) => (n / 1024).toFixed(1) + "kB";

console.log("파일 크기");
console.log(`  app.html 전체        ${kb(html.length)}`);
console.log(`  그중 JSX 스크립트    ${kb(jsx.length)} (${jsx.split("\n").length.toLocaleString()}줄)`);

/* 같은 컴파일을 여러 번 돌려 중간값을 쓴다 (한 번만 재면 들쭉날쭉하다) */
const runs = [];
for (let i = 0; i < 5; i++) {
  const t = process.hrtime.bigint();
  transform(jsx, { presets: [["react", { runtime: "classic" }]] });
  runs.push(Number(process.hrtime.bigint() - t) / 1e6);
}
runs.sort((a, b) => a - b);
const mid = runs[Math.floor(runs.length / 2)];

const out = transform(jsx, { presets: [["react", { runtime: "classic" }]] }).code ?? "";

console.log("\n브라우저에서 매번 하는 일 (이 기계 기준)");
console.log(`  Babel 컴파일 시간    ${mid.toFixed(0)}ms  (5회 중간값, 최소 ${runs[0].toFixed(0)} / 최대 ${runs[runs.length - 1].toFixed(0)})`);
console.log(`  컴파일 결과 크기     ${kb(out.length)}`);
console.log(`  내려받는 Babel 자체  ~2.9MB (@babel/standalone)`);

console.log("\n폰은 이 기계보다 느리다");
console.log("  아이폰 Safari 는 보통 데스크톱의 2~4배 걸린다고 본다.");
console.log(`  대략 ${(mid * 2).toFixed(0)}~${(mid * 4).toFixed(0)}ms + Babel 내려받기.`);
console.log("\n미리 컴파일해 두면 이 시간과 2.9MB 내려받기가 사라진다.");

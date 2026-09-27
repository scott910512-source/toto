#!/usr/bin/env node
/* Tailwind CDN 런타임을 한 번 받아 e2e/vendor 에 보관한다.
   (npm 패키지의 tailwindcss 는 빌드 도구라 브라우저에서 바로 못 쓴다) */
import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("e2e/vendor", { recursive: true });
const res = await fetch("https://cdn.tailwindcss.com");
if (!res.ok) { console.error("받기 실패:", res.status); process.exit(1); }
const body = await res.text();
writeFileSync("e2e/vendor/tailwind.js", body);
console.log(`✅ e2e/vendor/tailwind.js (${body.length.toLocaleString()} bytes)`);

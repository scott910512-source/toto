import { test, type Page } from "@playwright/test";
import { stubScript } from "../../e2e/fixtures/stub";
import { serveVendorLocally } from "../../e2e/fixtures/offline";

/* 미리 만든 CSS 와 CDN Tailwind(그 자리에서 컴파일)의 시작 시간을 비교한다.
   재 보기용 — 테스트 묶음(e2e/)에서 빼 둔다.
     npx playwright test -c tools/bench/playwright.config.ts --project=desktop css

   2026-10-05 측정 (이 기계, CDN 도 로컬에서 받음):
     미리 만든 CSS 207ms · CDN 479ms → 272ms 빨라짐 */
async function timeBoot(page: Page, blockCss: boolean): Promise<number> {
  await serveVendorLocally(page);
  if (blockCss) await page.route((u) => u.pathname.endsWith("/vendor/app.css"), (r) => r.abort());
  await page.route("**/supabase-config.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: stubScript({ role: "admin" }) }));
  const t = Date.now();
  await page.goto("/app.html", { waitUntil: "commit" });
  // 스타일까지 입혀진 순간을 잰다 (nav 의 border-top 이 1px 이 되는 때)
  await page.waitForFunction(
    () => { const n = document.querySelector("nav"); return !!n && getComputedStyle(n).borderTopWidth === "1px"; },
    undefined, { timeout: 40_000 },
  );
  return Date.now() - t;
}

test("CSS 시작 시간 비교", async ({ browser }) => {
  const pre: number[] = [], cdn: number[] = [];
  for (let i = 0; i < 3; i++) {
    let c = await browser.newContext(); pre.push(await timeBoot(await c.newPage(), false)); await c.close();
    c = await browser.newContext(); cdn.push(await timeBoot(await c.newPage(), true)); await c.close();
  }
  const mid = (a: number[]) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)]!;
  console.log(`\n  미리 만든 CSS   ${mid(pre)}ms   (${pre.join(", ")})`);
  console.log(`  CDN Tailwind    ${mid(cdn)}ms   (${cdn.join(", ")})`);
  console.log(`  차이            ${mid(cdn) - mid(pre)}ms 빨라짐  (CDN 도 로컬에서 받은 조건)\n`);
});

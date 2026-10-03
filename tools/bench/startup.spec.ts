import { test, type Page } from "@playwright/test";
import { stubScript } from "../../e2e/fixtures/stub";
import { serveVendorLocally } from "../../e2e/fixtures/offline";

/* 미리 컴파일한 것과 Babel 로 직접 컴파일하는 것의 시작 시간을 비교한다.

   검사가 아니라 재 보기용이다. 시간 단정은 여러 테스트를 같이 돌릴 때
   들쭉날쭉해서 거짓 실패를 만든다. 그래서 테스트 묶음(e2e/)에서 빼 두고,
   필요할 때만 손으로 돌린다.

     npx playwright test --project=desktop tools/bench/startup.spec.ts

   2026-10-03 측정 (이 기계, Babel 도 로컬에서 받음):
     미리 컴파일 638ms · Babel 직접 1829ms → 1.2초 빨라짐
   폰에서는 Babel 2.9MB 내려받기까지 빠지므로 차이가 더 크다. */
async function timeBoot(page: Page, blockCompiled: boolean): Promise<number> {
  await serveVendorLocally(page);
  if (blockCompiled) await page.route("**/vendor/app-compiled.js", (r) => r.abort());
  await page.route("**/supabase-config.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: stubScript({ role: "admin" }) }));
  const t = Date.now();
  await page.goto("/app.html", { waitUntil: "commit" });
  await page.locator("nav").waitFor({ state: "visible", timeout: 40_000 });
  return Date.now() - t;
}

test("시작 시간 비교", async ({ browser }) => {
  const runs = 3;
  const pre: number[] = [], fb: number[] = [];
  for (let i = 0; i < runs; i++) {
    let c = await browser.newContext();
    pre.push(await timeBoot(await c.newPage(), false));
    await c.close();
    c = await browser.newContext();
    fb.push(await timeBoot(await c.newPage(), true));
    await c.close();
  }
  const mid = (a: number[]) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)]!;
  console.log(`\n  미리 컴파일   ${mid(pre)}ms   (${pre.join(", ")})`);
  console.log(`  Babel 직접    ${mid(fb)}ms   (${fb.join(", ")})`);
  console.log(`  차이          ${mid(fb) - mid(pre)}ms 빨라짐\n`);
});

import { test, expect, type Page } from "@playwright/test";
import { stubScript, type Seed } from "./fixtures/stub";
import { serveVendorLocally } from "./fixtures/offline";

/* 차트 라이브러리(Recharts 487kB)를 필요할 때만 받는지, 그리고 받았을 때
   차트가 '진짜로' 그려지는지.

   왜 진짜로 그려지는지까지 보나
   · Recharts 는 자식의 타입으로 축·막대를 알아본다. 지연 로딩을 위해 자식을
     프록시로 바꾸면서 그 인식이 깨지면, 글자는 다 떠도 막대와 축이 사라진다.
     글자만 보는 테스트는 그걸 못 잡는다. SVG 안의 막대·축 요소를 센다. */

async function boot(page: Page, seed: Seed, opts: { blockCharts?: boolean } = {}) {
  const asked: string[] = [];
  page.on("request", (r) => { if (/recharts/i.test(r.url())) asked.push(r.url()); });
  await serveVendorLocally(page);
  if (opts.blockCharts) await page.route(/recharts/i, (r) => r.abort());
  await page.route("**/supabase-config.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: stubScript(seed) }));
  await page.goto("/app.html", { waitUntil: "load" });
  await expect(page.locator("nav")).toBeVisible({ timeout: 20_000 });
  return asked;
}

test("1) 출산 전 홈은 차트 라이브러리를 아예 받지 않는다 (487kB 절약)", async ({ page }) => {
  const asked = await boot(page, { role: "admin", birthDate: "" });
  await page.waitForTimeout(1500);
  expect(asked, `받은 것: ${asked.join(", ")}`).toEqual([]);
});

test("2) 사진·편지·더보기에서도 받지 않는다", async ({ page }) => {
  const asked = await boot(page, { role: "admin", birthDate: "", photos: 2, privatePhotos: 0 });
  for (const h of ["#/gallery", "#/letters", "#/more", "#/more/settings"]) {
    await page.evaluate((x) => { location.hash = x; }, h);
    await page.waitForTimeout(900);
  }
  expect(asked).toEqual([]);
});

test("3) 출산 뒤 홈은 받아서 주간 통계 차트를 진짜로 그린다", async ({ page }) => {
  const asked = await boot(page, { role: "admin", birthDate: "2026-08-10" });
  // 차트가 그려질 때까지 (라이브러리를 받는 시간 포함)
  /* 표본 데이터에 수유·기저귀 기록이 없어 막대 높이가 0 이다. 그러면 Playwright 는
     "안 보인다" 고 본다. 여기서 보려는 건 '막대 요소가 만들어졌는가' 이므로
     붙어 있는지로 본다. */
  const bars = page.locator(".recharts-bar-rectangle");
  await expect(bars.first()).toBeAttached({ timeout: 20_000 });
  expect(asked.length, "라이브러리를 받지 않았다").toBeGreaterThan(0);

  // 축·눈금·막대가 전부 인식됐는지 — 프록시가 자식을 제대로 바꿔 넘긴 증거
  expect(await page.locator(".recharts-cartesian-axis").count()).toBeGreaterThanOrEqual(2);  // X·Y
  expect(await page.locator(".recharts-cartesian-axis-tick").count()).toBeGreaterThan(0);
  expect(await page.locator(".recharts-legend-item").count()).toBeGreaterThan(0);          // Legend 도
  expect(await bars.count()).toBeGreaterThan(0);
});

test("4) 두 번째 차트부터는 다시 받지 않는다", async ({ page }) => {
  const asked = await boot(page, { role: "admin", birthDate: "2026-08-10" });
  await expect(page.locator(".recharts-bar-rectangle").first()).toBeAttached({ timeout: 20_000 });
  const n = asked.length;
  // 수면 기록 화면에도 차트가 있다
  await page.evaluate(() => { location.hash = "#/records/sleep"; });
  await page.waitForTimeout(1500);
  expect(asked.length).toBe(n);
});

test("5) 라이브러리를 못 받으면 그 자리에 안내만 뜨고 나머지는 멀쩡하다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await boot(page, { role: "admin", birthDate: "2026-08-10" }, { blockCharts: true });
  await expect(page.getByText("차트를 불러오지 못했어요")).toBeVisible({ timeout: 15_000 });
  // 차트 말고는 다 떠야 한다
  await expect(page.locator("body")).toContainText("최근 7일 통계");
  await expect(page.locator("body")).toContainText("빠른 입력");
  expect(errors).toEqual([]);
});

test("6) 받는 동안에는 '준비 중' 을 보여준다 (빈 칸이 아니라)", async ({ page }) => {
  // 라이브러리 응답을 잠깐 붙잡아 두고 그 사이 화면을 본다
  await serveVendorLocally(page);
  await page.route(/recharts/i, async (r) => { await new Promise((ok) => setTimeout(ok, 1500)); await r.continue(); });
  await page.route("**/supabase-config.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: stubScript({ role: "admin", birthDate: "2026-08-10" }) }));
  await page.goto("/app.html", { waitUntil: "load" });
  await expect(page.getByText("차트 준비 중")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".recharts-bar-rectangle").first()).toBeAttached({ timeout: 20_000 });
});

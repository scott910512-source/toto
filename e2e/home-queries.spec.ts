import { test, expect, type Page } from "@playwright/test";
import { stubScript, type Seed } from "./fixtures/stub";
import { serveVendorLocally } from "./fixtures/offline";

/* 홈이 '그 시기에 필요한 것만' 조회하는지.

   왜: 출산 전 홈은 초음파 기록만 보여주는데도 수유·수면·기저귀·유축·이유식·
   투약 구독까지 7개를 열고, 그중 3개가 끝나길 기다렸다가 그렸다. 지금 또또네가
   매일 여는 화면이다. 조회 목록을 세어서 되돌아가지 못하게 한다. */

async function boot(page: Page, seed: Seed = {}) {
  await serveVendorLocally(page);
  await page.route("**/supabase-config.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: stubScript(seed) }));
  await page.goto("/app.html", { waitUntil: "load" });
  await expect(page.locator("nav")).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(800);
}
/** records 테이블을 어떤 type 으로 읽었는지 (중복 제거) */
const recordTypes = (page: Page) => page.evaluate(() => {
  const reads = (window as any).__E2E.reads as Array<{ t: string; eq: Record<string, unknown> }>;
  return [...new Set(reads.filter((r) => r.t === "records").map((r) => String(r.eq.type)))].sort();
});

test("1) 출산 전 홈은 초음파 기록만 읽는다", async ({ page }) => {
  await boot(page, { birthDate: "" });
  await expect(page.getByText(/^D-\d+$/)).toBeVisible();
  expect(await recordTypes(page)).toEqual(["prenatal"]);
});

test("2) 출산 후 홈은 수유·수면·기저귀를 읽고, 초음파는 안 읽는다", async ({ page }) => {
  await boot(page, { birthDate: "2026-08-10" });
  await expect(page.getByText("빠른 입력")).toBeVisible();
  const types = await recordTypes(page);
  expect(types).toEqual(expect.arrayContaining(["feeding", "sleep", "diaper"]));
  expect(types).not.toContain("prenatal");
});

test("3) 출산 전 홈은 초음파 조회 하나로 바로 그려진다 (다른 조회를 기다리지 않는다)", async ({ page }) => {
  // 초음파 기록이 아직 없어도 D-day 와 '아직 없어요' 가 뜬다
  await boot(page, { birthDate: "", records: 0 });
  await expect(page.getByText(/^D-\d+$/)).toBeVisible();
  await expect(page.getByText("아직 없어요. 검진 다녀오면 적어두면 좋아요.")).toBeVisible();
});

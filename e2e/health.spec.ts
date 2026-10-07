import { test, expect, type Page } from "@playwright/test";
import { stubScript, type Seed } from "./fixtures/stub";
import { serveVendorLocally } from "./fixtures/offline";

/* 조회가 실패했을 때(오프라인·로그인 만료·서버 오류) "기록이 없어요" 로
   보이지 않고 "불러오지 못했어요" 를 말하는지.

   왜: 예전에는 조회 실패가 조용히 빈 목록이 됐다. 오프라인으로 앱을 열면
   모든 화면이 "아직 기록이 없어요" 였다 — 가족이 "기록이 사라졌나" 하고
   놀랄 수 있는 문구다. */

async function boot(page: Page, seed: Seed = {}) {
  await serveVendorLocally(page);
  await page.route("**/supabase-config.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: stubScript(seed) }));
  await page.goto("/app.html", { waitUntil: "load" });
  await expect(page.locator("nav")).toBeVisible({ timeout: 20_000 });
}
const banner = (page: Page) => page.getByRole("alert").filter({ hasText: /연결|오프라인|만료/ });
const setDbError = (page: Page, msg: string) => page.evaluate((m) => { (window as any).__E2E.dbError = m; }, msg);

test("1) 정상이면 배너가 없다", async ({ page }) => {
  await boot(page);
  await page.waitForTimeout(800);
  await expect(banner(page)).toHaveCount(0);
});

test("2) 조회가 실패하면 '연결하지 못했어요' 를 말하고, 다시 시도하면 기록이 돌아온다", async ({ page }) => {
  await boot(page, { dbError: "Failed to fetch" });
  await expect(banner(page)).toBeVisible();
  await expect(banner(page)).toContainText("서버에 연결하지 못했어요");
  await expect(banner(page)).toContainText("보이는 기록이 전부가 아닐 수 있어요");

  // 편지 화면도 같은 배너를 본다 (기록은 못 받았으니 편지가 없다)
  await page.evaluate(() => { location.hash = "#/letters"; });
  await expect(banner(page)).toBeVisible();
  await expect(page.getByText("사랑하는 또또에게")).toHaveCount(0);

  // 서버가 돌아왔다 → 다시 시도 → 배너가 사라지고 편지가 보인다
  await setDbError(page, "");
  await banner(page).getByRole("button", { name: "다시 시도" }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(page.getByText("사랑하는 또또에게")).toBeVisible();
});

test("3) 로그인 만료는 '다시 시도' 대신 로그아웃을 준다", async ({ page }) => {
  await boot(page, { dbError: "JWT expired" });
  await expect(banner(page)).toContainText("로그인이 만료됐어요");
  await expect(banner(page).getByRole("button", { name: "다시 시도" })).toHaveCount(0);
  await banner(page).getByRole("button", { name: "로그아웃" }).click();
  const calls = await page.evaluate(() => (window as any).__E2E.calls.map((c: any) => c.op));
  expect(calls).toContain("signOut");
});

test("4) 오프라인이면 그렇게 말하고, 연결되면 스스로 다시 불러온다", async ({ page }) => {
  await boot(page, { dbError: "Failed to fetch" });
  await expect(banner(page)).toContainText("서버에 연결하지 못했어요");

  // 브라우저가 '오프라인' 이라고 알린다 (엔진마다 setOffline 이 navigator.onLine 에
  // 반영되는 정도가 달라, 이벤트를 직접 보낸다)
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
  });
  await expect(banner(page)).toContainText("오프라인이에요");
  await expect(banner(page).getByRole("button")).toHaveCount(0);  // 눌러도 소용없는 버튼은 없다

  // 연결됨 + 서버 정상 → 자동 재조회 → 배너 사라짐
  await setDbError(page, "");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    window.dispatchEvent(new Event("online"));
  });
  await expect(banner(page)).toHaveCount(0);
  await page.evaluate(() => { location.hash = "#/letters"; });
  await expect(page.getByText("사랑하는 또또에게")).toBeVisible();
});

test("5) 관람 계정(이모·삼촌) 화면에도 뜬다", async ({ page }) => {
  await boot(page, { role: "family", dbError: "Failed to fetch" });
  await expect(banner(page)).toContainText("서버에 연결하지 못했어요");
});

test("6) 홈이 뜨는 것을 막지 않는다 — 배너와 함께 D-day 는 보인다", async ({ page }) => {
  await boot(page, { dbError: "Failed to fetch" });
  await expect(banner(page)).toBeVisible();
  await expect(page.getByText(/^D-\d+$/)).toBeVisible();
});

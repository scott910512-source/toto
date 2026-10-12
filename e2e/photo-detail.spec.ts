import { test, expect, type Page } from "@playwright/test";
import { stubScript, type Seed } from "./fixtures/stub";
import { serveVendorLocally } from "./fixtures/offline";

/* 사진 전체화면 위에서 여는 창(삭제 확인·수정)이 '같은 자리에' 보이는지.

   왜: 전체화면 보기는 z-90, 모달은 z-80 이었다. 삭제를 누르면 확인창이
   전체화면 뒤에 열려서, 전체화면을 닫아야 "이 사진을 삭제할까요?" 가
   보였다 (2026-10-12 폰에서 발견). 글자가 DOM 에 있는지만 보면 못 잡는다 —
   Playwright 의 click 은 가려진 요소를 누르지 못하므로 그걸로 확인한다. */

async function openPhoto(page: Page, seed: Seed = {}) {
  await serveVendorLocally(page);
  await page.route("**/supabase-config.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: stubScript({ role: "admin", photos: 3, privatePhotos: 0, ...seed }) }));
  await page.goto("/app.html#/gallery", { waitUntil: "load" });
  await expect(page.locator("nav")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /님의 사진 열기/ }).first().click({ force: true });
  const viewer = page.getByRole("dialog", { name: "사진 상세" });
  await expect(viewer).toBeVisible();
  return viewer;
}
const calls = (page: Page) => page.evaluate(() => (window as any).__E2E.calls as Array<{ op: string; t?: string }>);

test("1) 전체화면에서 삭제를 누르면 확인창이 그 위에 바로 보이고, 눌러서 지울 수 있다", async ({ page }) => {
  const viewer = await openPhoto(page);
  await viewer.getByRole("button", { name: /삭제/ }).click();

  const confirm = page.getByRole("dialog", { name: "확인" });
  await expect(confirm).toContainText("이 사진을 삭제할까요?");
  // 가려져 있으면 이 click 이 실패한다 (Playwright 는 덮인 요소를 누르지 않는다)
  await confirm.getByRole("button", { name: "삭제" }).click({ timeout: 5_000 });

  await expect.poll(async () => (await calls(page)).some((c) => c.op === "delete" && c.t === "media")).toBe(true);
  await expect(confirm).toHaveCount(0);
});

test("2) 취소하면 아무것도 지우지 않고 전체화면으로 돌아온다", async ({ page }) => {
  const viewer = await openPhoto(page);
  await viewer.getByRole("button", { name: /삭제/ }).click();
  const confirm = page.getByRole("dialog", { name: "확인" });
  await confirm.getByRole("button", { name: "취소" }).click({ timeout: 5_000 });
  await expect(confirm).toHaveCount(0);
  await expect(viewer).toBeVisible();
  expect((await calls(page)).some((c) => c.op === "delete")).toBe(false);
});

test("3) 수정창도 전체화면 위에 열려 바로 입력할 수 있다", async ({ page }) => {
  const viewer = await openPhoto(page);
  await viewer.getByRole("button", { name: /수정/ }).click();
  const edit = page.getByRole("dialog", { name: /수정/ });
  await expect(edit).toBeVisible();
  const box = edit.getByRole("textbox").first();
  await box.click({ timeout: 5_000 });       // 가려져 있으면 실패
  await box.fill("첫 초음파");
  await expect(box).toHaveValue("첫 초음파");
});

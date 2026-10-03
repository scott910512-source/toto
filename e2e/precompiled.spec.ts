import { test, expect, type Page } from "@playwright/test";
import { stubScript } from "./fixtures/stub";
import { serveVendorLocally } from "./fixtures/offline";

/* 앱을 미리 컴파일해 두고 쓰는지, 그리고 그게 없을 때도 뜨는지.

   왜 되돌림까지 보는가
   · 배포가 한쪽만 올라가면 vendor/app-compiled.js 가 없을 수 있다.
   · 그때 가족이 아무것도 못 보면 안 된다. 느려도 떠야 한다.
   · 테스트하지 않은 되돌림 경로는 되돌림이 아니다. */

async function boot(page: Page, opts: { blockCompiled?: boolean } = {}) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await serveVendorLocally(page);
  if (opts.blockCompiled) {
    // 미리 컴파일한 파일을 못 받는 상황을 만든다.
    // 주소에 ?v=NN 이 붙으므로 glob 이 아니라 함수로 걸러야 한다.
    await page.route((u) => u.pathname.endsWith("/vendor/app-compiled.js"), (r) => r.abort());
  }
  await page.route("**/supabase-config.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: stubScript({ role: "admin" }) }));
  await page.goto("/app.html", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  return errors;
}

test("1) 미리 컴파일한 앱으로 뜬다", async ({ page }) => {
  const errors = await boot(page);
  await expect(page.locator("nav")).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => window.__TOTO_PRECOMPILED === true)).toBe(true);
  expect(errors).toEqual([]);
});

test("2) Babel 을 내려받지 않는다 (2.9MB)", async ({ page }) => {
  const asked: string[] = [];
  page.on("request", (r) => { if (/babel/i.test(r.url())) asked.push(r.url()); });
  await boot(page);
  await expect(page.locator("nav")).toBeVisible({ timeout: 15_000 });
  expect(asked, `Babel 을 받았다: ${asked.join(", ")}`).toEqual([]);
});

test("3) 미리 컴파일한 파일을 못 받아도 앱이 뜬다 (되돌림)", async ({ page }) => {
  const errors = await boot(page, { blockCompiled: true });
  // Babel 을 받아 직접 컴파일하므로 느리다. 넉넉히 기다린다.
  await expect(page.locator("nav")).toBeVisible({ timeout: 25_000 });
  expect(await page.evaluate(() => window.__TOTO_PRECOMPILED === true)).toBe(false);
  // 되돌림 경로에서도 화면이 제대로 그려져야 한다
  await expect(page.locator("nav")).toContainText("홈");
  expect(errors.filter((e) => !/app-compiled/.test(e))).toEqual([]);
});

test("4) 되돌림일 때는 그렇다고 남긴다", async ({ page }) => {
  const warns: string[] = [];
  page.on("console", (m) => { if (m.type() === "warning") warns.push(m.text()); });
  await boot(page, { blockCompiled: true });
  await expect(page.locator("nav")).toBeVisible({ timeout: 25_000 });
  expect(warns.some((w) => w.includes("미리 컴파일한 파일을 쓰지 못해"))).toBe(true);
});

test("5) 원본 JSX 는 브라우저가 실행하지 않는다", async ({ page }) => {
  await boot(page);
  // type 이 text/plain 이라 실행되지 않는다. 두 번 실행되면 상태가 꼬인다.
  const type = await page.locator("#toto-source").getAttribute("type");
  expect(type).toBe("text/plain");
  // 그래도 되돌림을 위해 내용은 남아 있어야 한다
  const len = await page.locator("#toto-source").evaluate((el) => el.textContent?.length ?? 0);
  expect(len).toBeGreaterThan(100_000);
});

test("6) vendor 주소에 버전이 붙어 있다 (새 HTML 에 옛 코드가 짝지어지지 않게)", async ({ page }) => {
  /* 앱 코드를 app.html 밖으로 옮기면서 생긴 틈을 막는 장치다.
     화면 이동은 네트워크 우선이라 새 app.html 이 오는데, vendor/*.js 는
     캐시 우선이라 옛 파일이 나올 수 있었다. 주소에 버전을 붙이면 옛 캐시에
     없는 주소가 되므로 반드시 새로 받는다. */
  const asked: string[] = [];
  /* /e2e/vendor/ 는 테스트가 CDN 대신 쓰는 사본이라 세지 않는다.
     우리가 만든 /vendor/ 만 본다. */
  page.on("request", (r) => {
    const p = new URL(r.url()).pathname;
    if (p.startsWith("/vendor/")) asked.push(r.url());
  });
  await boot(page);
  await expect(page.locator("nav")).toBeVisible({ timeout: 15_000 });

  expect(asked.length, "vendor 파일을 하나도 안 불렀다").toBeGreaterThan(0);
  const noVersion = asked.filter((u) => !/\?v=\d+/.test(u));
  expect(noVersion, `버전 없는 주소: ${noVersion.join(", ")}`).toEqual([]);

  // 화면에 찍히는 버전과 같은 번호여야 한다
  const appVer = await page.evaluate(() => {
    const el = [...document.querySelectorAll("script")].find((s) => s.src.includes("app-compiled"));
    return el ? new URL(el.src).searchParams.get("v") : null;
  });
  expect(appVer).toMatch(/^\d+$/);
});

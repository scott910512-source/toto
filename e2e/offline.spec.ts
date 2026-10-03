import { test, expect, type Page } from "@playwright/test";
import { stubScript } from "./fixtures/stub";
import { serveVendorLocally } from "./fixtures/offline";

/* 서비스워커와 오프라인 동작.

   다른 테스트는 서비스워커를 막아 둔다(캐시된 옛 화면이 돌아오면 검사가
   흔들린다). 그래서 지금까지 "지하철에서 앱이 뜨는가" 를 아무도 확인하지
   않았다. 여기서만 켜고 확인한다.

   확인하는 것
   · 서비스워커가 등록되고 앱 껍데기를 담아두는가
   · 네트워크가 끊겨도 화면이 뜨는가
   · 끊긴 동안 사진·토큰을 캐시에서 꺼내 쓰지 않는가 (남의 기기에 남으면 안 된다)
   · 새 버전이 준비되면 알려주는가 */

test.describe.configure({ mode: "serial" });

test.use({ serviceWorkers: "allow" });

async function boot(page: Page) {
  await serveVendorLocally(page);
  await page.route("**/supabase-config.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: stubScript({ role: "admin" }) }));
  await page.goto("/app.html", { waitUntil: "load" });
  await page.waitForTimeout(2500);
}

/** 서비스워커가 자리를 잡고 껍데기를 담을 때까지 기다린다 */
async function swReady(page: Page) {
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null || !!navigator.serviceWorker?.controller,
    undefined,
    { timeout: 15_000 },
  ).catch(() => {});
  // install 단계의 addAll 이 끝날 시간을 준다
  await page.waitForTimeout(1500);
}

test("1) 서비스워커가 등록된다", async ({ page }) => {
  await boot(page);
  const n = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
  expect(n).toBeGreaterThan(0);
});

test("2) 앱 껍데기를 캐시에 담는다", async ({ page }) => {
  await boot(page);
  await swReady(page);
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const out: string[] = [];
    for (const n of names) {
      const keys = await (await caches.open(n)).keys();
      out.push(...keys.map((r) => new URL(r.url).pathname));
    }
    return out;
  });
  // 이 둘이 없으면 오프라인에서 앱이 아예 못 뜬다
  expect(cached.some((p) => p.endsWith("/app.html"))).toBe(true);
  expect(cached.some((p) => p.endsWith("/vendor/toto-core.js"))).toBe(true);
});

test("3) 네트워크가 끊겨도 화면이 뜬다", async ({ page, context }) => {
  await boot(page);
  await swReady(page);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(2500);

  // 껍데기가 돌아오는지만 본다 (로그인·사진은 네트워크가 필요하다)
  const html = await page.content();
  expect(html).toContain("또또");
  expect(await page.locator("#root").count()).toBe(1);

  await context.setOffline(false);
});

test("4) 사진·토큰은 캐시에 담지 않는다", async ({ page }) => {
  await boot(page);
  await swReady(page);
  const bad = await page.evaluate(async () => {
    const names = await caches.keys();
    const out: string[] = [];
    for (const n of names) {
      const keys = await (await caches.open(n)).keys();
      out.push(...keys.map((r) => r.url).filter((u) => /supabase\.(co|in)|securetoken|identitytoolkit/.test(u)));
    }
    return out;
  });
  // 같이 쓰는 기기에 남의 가족 사진이나 로그인 토큰이 남으면 안 된다
  expect(bad).toEqual([]);
});

test("5) 정적 파일 요청에 앱 화면(HTML)을 돌려주지 않는다", async ({ page }) => {
  await boot(page);
  await swReady(page);
  // 없는 .js 를 요청했을 때 HTML 이 오면, 앱이 이상하게 깨진다
  const res = await page.evaluate(async () => {
    const r = await fetch("/없는파일-" + Date.now() + ".js");
    return { status: r.status, type: r.headers.get("content-type") ?? "" };
  });
  expect(res.type).not.toContain("text/html");
});

test("6) 새 버전이 준비되면 배너로 알린다", async ({ page }) => {
  await boot(page);
  await swReady(page);
  // 화면이 다 그려진 뒤에 신호를 보낸다. 먼저 보내면 아직 듣는 쪽이 없다.
  await expect(page.locator("nav")).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("toto:update-ready")));
  await expect(page.getByText(/새 버전/)).toBeVisible();
  await expect(page.getByRole("button", { name: /업데이트/ })).toBeVisible();
});

test("7) 첫 방문에는 화면을 새로고침하지 않는다", async ({ page }) => {
  /* 서비스워커가 처음 자리를 잡을 때 clients.claim() 이 controllerchange 를
     띄운다. 그것까지 새로고침하면 앱을 처음 열 때마다 화면이 껌뻑인다.

     해시 변경은 framenavigated 로도 올라오므로 'load' 로 센다 — 문서가
     다시 읽힌 횟수만 잡힌다. */
  let loads = 0;
  page.on("load", () => { loads++; });
  await boot(page);
  await swReady(page);
  await expect(page.locator("nav")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);
  expect(loads, `문서를 ${loads}번 읽었다`).toBe(1);
});

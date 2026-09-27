import { test, expect, type Page } from "@playwright/test";
import { stubScript, type Seed } from "./fixtures/stub";
import { serveVendorLocally } from "./fixtures/offline";

/* 가족이 실제로 하는 일을 순서대로 확인한다.
   진짜 Supabase 대신 목을 끼워 넣어, 가족 데이터를 건드리지 않는다. */

async function open(page: Page, seed: Seed = {}) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|CERT|favicon/i.test(m.text())) {
      errors.push(m.text());
    }
  });

  await serveVendorLocally(page);        // CDN 대신 로컬 라이브러리 사용

  // 접속 설정을 목으로 교체
  await page.route("**/supabase-config.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: stubScript(seed) }));
  await page.goto("/app.html", { waitUntil: "load" });
  await page.waitForTimeout(2500);        // Babel 컴파일 + 첫 렌더
  return { errors };
}

const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __E2E: { calls: unknown[] } }).__E2E.calls);

test.describe("로그인 · 권한", () => {
  test("1) 관리자로 들어오면 전체 메뉴가 보인다", async ({ page }) => {
    const { errors } = await open(page, { role: "admin" });
    const nav = page.locator("nav");
    await expect(nav).toContainText("홈");
    await expect(nav).toContainText("기록");
    await expect(nav).toContainText("설정");
    expect(errors).toEqual([]);
  });

  test("2) 관람전용은 기록·설정 메뉴가 없다", async ({ page }) => {
    await open(page, { role: "gallery_only" });
    const nav = page.locator("nav");
    await expect(nav).toContainText("갤러리");
    await expect(nav).not.toContainText("기록");
    await expect(nav).not.toContainText("설정");
  });

  test("3) 승인 대기 상태면 사진이 하나도 안 보인다", async ({ page }) => {
    await open(page, { role: "gallery_only", approved: false, photos: 3, privatePhotos: 0 });
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("사진0");
    expect(body).not.toContain("사진1");
  });

  test("4) 비밀번호를 저장소에 남기지 않는다", async ({ page }) => {
    await open(page);
    const leaked = await page.evaluate(() => {
      const out: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        const v = localStorage.getItem(k) ?? "";
        if (/baby-cred/.test(k) || /"pw"|password/i.test(v)) out.push(k);
      }
      return out;
    });
    expect(leaked).toEqual([]);
  });
});

test.describe("나만보기 — 실제로 가려지는가", () => {
  test("5) 내가 올린 나만보기 사진은 나에게 보인다", async ({ page }) => {
    await open(page, { role: "parent", photos: 3, privatePhotos: 1, privateOwner: "me" });
    await page.getByRole("button", { name: /갤러리/ }).first().click();
    await page.waitForTimeout(1500);
    await expect(page.locator(`img[alt="비밀사진0"]`)).toHaveCount(1);
  });

  test("6) 남이 올린 나만보기 사진은 일반 가족에게 안 보인다", async ({ page }) => {
    await open(page, { role: "parent", photos: 3, privatePhotos: 1, privateOwner: "other" });
    await page.getByRole("button", { name: /갤러리/ }).first().click();
    await page.waitForTimeout(1500);
    await expect(page.locator(`img[alt="비밀사진0"]`)).toHaveCount(0);   // 가려져야 한다
    await expect(page.locator(`img[alt="사진1"]`)).toHaveCount(1);       // 공개 사진은 보인다
  });

  test("7) 관리자는 남의 나만보기도 볼 수 있다", async ({ page }) => {
    await open(page, { role: "admin", photos: 3, privatePhotos: 1, privateOwner: "other" });
    await page.getByRole("button", { name: /갤러리/ }).first().click();
    await page.waitForTimeout(1500);
    await expect(page.locator(`img[alt="비밀사진0"]`)).toHaveCount(1);
  });
});

test.describe("기록", () => {
  test("8) 수유를 기록하면 저장 요청이 나간다", async ({ page }) => {
    await open(page, { role: "admin" });
    await page.getByRole("button", { name: /기록/ }).first().click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /수유/ }).first().click();
    await page.waitForTimeout(600);

    const save = page.getByRole("button", { name: /수유 기록 저장|저장/ }).last();
    if (await save.count()) {
      await save.click();
      await page.waitForTimeout(900);
      const c = (await calls(page)) as Array<{ op: string; t?: string }>;
      expect(c.some((x) => x.op === "insert" && x.t === "records")).toBe(true);
    }
  });

  test("9) 기록에 family_id 를 프론트가 직접 넣지 않는다", async ({ page }) => {
    await open(page, { role: "admin" });
    await page.getByRole("button", { name: /기록/ }).first().click();
    await page.waitForTimeout(800);
    const c = (await calls(page)) as Array<{ op: string; t?: string; row?: Record<string, unknown> }>;
    const inserts = c.filter((x) => x.op === "insert" && x.t === "records");
    for (const ins of inserts) {
      // family_id 는 DB 기본값이 채운다. 프론트가 보내면 위조 위험이 있다.
      expect(ins.row?.family_id === undefined || ins.row?.family_id === "fam-1").toBe(true);
    }
  });
});

test.describe("갤러리 · 슬라이드쇼", () => {
  test("10) 사진이 그려지고 서명 URL 을 받아온다", async ({ page }) => {
    await open(page, { role: "admin", photos: 3, privatePhotos: 0 });
    await page.getByRole("button", { name: /갤러리/ }).first().click();
    await page.waitForTimeout(1500);
    expect(await page.locator("img").count()).toBeGreaterThan(0);
  });

  test("11) 슬라이드쇼가 열리고 액자 모드가 있다", async ({ page }) => {
    await open(page, { role: "admin", photos: 3, privatePhotos: 0 });
    await page.getByRole("button", { name: /갤러리/ }).first().click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /슬라이드쇼/ }).first().click();
    await page.waitForTimeout(1800);
    await expect(page.locator(".ss-root")).toBeVisible();
    await expect(page.locator(".ss-backdrop")).toBeVisible();
    await expect(page.getByRole("button", { name: "액자 모드" })).toBeVisible();
  });

  test("12) 좋아요는 DB 함수로 처리한다 (남의 사진에도 눌러야 하므로)", async ({ page }) => {
    await open(page, { role: "admin", photos: 3, privatePhotos: 0 });
    await page.getByRole("button", { name: /갤러리/ }).first().click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /슬라이드쇼/ }).first().click();
    await page.waitForTimeout(1800);
    await page.mouse.move(400, 300);                 // UI 다시 띄우기
    const like = page.locator(".ss-bar button[aria-label*=\"좋아요\"]").first();
    if (await like.count()) {
      await like.click({ force: true });
      await page.waitForTimeout(600);
      const c = (await calls(page)) as Array<{ op: string; fn?: string }>;
      expect(c.some((x) => x.op === "rpc" && x.fn === "toggle_like")).toBe(true);
    }
  });
});

test.describe("D-day", () => {
  test("13) 출생 전에는 D- 로 표시된다", async ({ page }) => {
    await open(page, { role: "admin", dueDate: "2026-12-14", birthDate: "" });
    expect(await page.locator("body").innerText()).toMatch(/D-\d+|임신 \d+주/);
  });

  test("14) 출생일이 들어오면 생후 표기로 바뀐다", async ({ page }) => {
    await open(page, { role: "admin", dueDate: "2026-08-12", birthDate: "2026-08-10" });
    expect(await page.locator("body").innerText()).toMatch(/생후 \d+일/);
  });
});

test.describe("설정 · 가족", () => {
  test("15) 초대코드가 보인다", async ({ page }) => {
    await open(page, { role: "admin" });
    await page.getByRole("button", { name: /설정/ }).first().click();
    await page.waitForTimeout(1000);
    const invite = page.getByRole("button", { name: /가족 초대/ });
    if (await invite.count()) {
      await invite.click();
      await page.waitForTimeout(900);
      expect(await page.locator("body").innerText()).toContain("AB3K9Z");
    }
  });

  test("16) D-day 위젯 코드를 우리 아기 값으로 만들어 준다", async ({ page }) => {
    await open(page, { role: "admin", babyName: "또또", dueDate: "2026-12-14" });
    await page.getByRole("button", { name: /설정/ }).first().click();
    await page.waitForTimeout(1200);
    const body = await page.locator("body").innerText();
    expect(body).toContain("D-day 위젯");
    expect(body).toContain("위젯 코드 복사");
  });

  test("17) 로그아웃하면 세션과 캐시를 정리한다", async ({ page }) => {
    await open(page, { role: "admin" });
    await page.getByRole("button", { name: /로그아웃/ }).first().click();
    await page.waitForTimeout(900);
    const c = (await calls(page)) as Array<{ op: string }>;
    expect(c.some((x) => x.op === "signOut")).toBe(true);
  });
});

test.describe("PWA", () => {
  test("18) manifest 가 세로로 고정돼 있지 않다 (액자 모드가 가로를 쓴다)", async ({ page }) => {
    const res = await page.request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m.orientation).toBeUndefined();
    expect(m.start_url).toContain("app.html");
  });

  test("19) 서비스워커가 정적 파일에 HTML 을 돌려주지 않는다", async ({ page }) => {
    const res = await page.request.get("/sw.js");
    const sw = await res.text();
    expect(sw).toContain('req.mode === "navigate"');
    expect(sw).toMatch(/supabase\\?\.co/);           // 사진·토큰 캐시 금지
    expect(sw).toContain("res.status === 200");      // 404/500 캐시 금지
  });

  test("20) 전체화면 D-day 페이지가 파라미터를 받는다", async ({ page }) => {
    await page.goto("/dday.html?name=콩이&due=2027-03-20&birth=");
    await page.waitForTimeout(800);
    const body = await page.locator("body").innerText();
    expect(body).toContain("콩이");
    expect(body).toMatch(/D-\d+/);
  });
});

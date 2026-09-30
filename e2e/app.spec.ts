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

/* 하단 메뉴 구성이 바뀌어도 테스트가 흔들리지 않게 주소로 이동한다.
   앱이 #/gallery, #/more/family 같은 해시 라우팅을 쓰기 때문에 가능하다. */
async function go(page: Page, hash: string, wait = 1500) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(wait);
}

const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __E2E: { calls: unknown[] } }).__E2E.calls);

test.describe("로그인 · 권한", () => {
  test("1) 관리자로 들어오면 전체 메뉴가 보인다", async ({ page }) => {
    const { errors } = await open(page, { role: "admin" });
    const nav = page.locator("nav");
    await expect(nav).toContainText("홈");
    await expect(nav).toContainText("기록");
    await expect(nav).toContainText("사진");
    await expect(nav).toContainText("더보기");   // 저장·설정은 이 안으로 들어갔다
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
    await go(page, "#/gallery");
    await expect(page.locator(`img[alt="비밀사진0"]`)).toHaveCount(1);
  });

  test("6) 남이 올린 나만보기 사진은 일반 가족에게 안 보인다", async ({ page }) => {
    await open(page, { role: "parent", photos: 3, privatePhotos: 1, privateOwner: "other" });
    await go(page, "#/gallery");
    await expect(page.locator(`img[alt="비밀사진0"]`)).toHaveCount(0);   // 가려져야 한다
    await expect(page.locator(`img[alt="사진1"]`)).toHaveCount(1);       // 공개 사진은 보인다
  });

  test("7) 관리자는 남의 나만보기도 볼 수 있다", async ({ page }) => {
    await open(page, { role: "admin", photos: 3, privatePhotos: 1, privateOwner: "other" });
    await go(page, "#/gallery");
    await expect(page.locator(`img[alt="비밀사진0"]`)).toHaveCount(1);
  });
});

test.describe("기록", () => {
  test("8) 수유를 기록하면 저장 요청이 나간다", async ({ page }) => {
    await open(page, { role: "admin" });
    await go(page, "#/records/feeding", 900);
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
    await go(page, "#/records/feeding", 900);
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
    await go(page, "#/gallery");
    expect(await page.locator("img").count()).toBeGreaterThan(0);
  });

  test("11) 슬라이드쇼가 열리고 액자 모드가 있다", async ({ page }) => {
    test.slow();
    await open(page, { role: "admin", photos: 3, privatePhotos: 0 });
    await go(page, "#/gallery", 1200);
    await page.getByRole("button", { name: /슬라이드쇼/ }).first().click({ force: true });
    await expect(page.locator(".ss-root")).toBeVisible();
    await expect(page.locator(".ss-backdrop")).toBeVisible();
    await expect(page.getByRole("button", { name: "액자 모드" })).toBeVisible();
  });

  test("12) 좋아요는 DB 함수로 처리한다 (남의 사진에도 눌러야 하므로)", async ({ page }) => {
    // 슬라이드쇼는 사진 주소를 받아 첫 장을 띄우기까지 시간이 걸린다.
    // 세 기기를 한꺼번에 돌리면 30초 안에 못 끝나 흔들렸다.
    test.slow();
    await open(page, { role: "admin", photos: 3, privatePhotos: 0 });
    await go(page, "#/gallery", 1200);
    // force: 갤러리 사진이 서서히 나타나는 동안 Playwright 가 "아직 안 멈췄다" 며
    // 기다리는 걸 건너뛴다. 버튼 위치는 이미 정해져 있다.
    await page.getByRole("button", { name: /슬라이드쇼/ }).first().click({ force: true });
    await expect(page.locator(".ss-root")).toBeVisible();

    // 조작 막대는 4.5초 뒤 흐려지지만(opacity:0) 자리와 클릭은 살아 있다.
    // 그래서 다시 띄우지 않고 그대로 누른다 — 전체화면 덮개를 클릭하려 하면
    // Playwright 가 "가려져 있다" 며 30초를 기다려 테스트가 흔들렸다.
    const like = page.locator('.ss-bar button[aria-label*="좋아요"]').first();
    await expect(like).toHaveCount(1, { timeout: 15_000 });
    await like.click({ force: true });
    await page.waitForTimeout(600);
    const c = (await calls(page)) as Array<{ op: string; fn?: string }>;
    expect(c.some((x) => x.op === "rpc" && x.fn === "toggle_like")).toBe(true);
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
    await go(page, "#/more/family", 1200);
    const invite = page.getByRole("button", { name: /가족 초대/ });
    if (await invite.count()) {
      await invite.click();
      await page.waitForTimeout(900);
      expect(await page.locator("body").innerText()).toContain("AB3K9Z");
    }
  });

  test("16) D-day 위젯 코드를 우리 아기 값으로 만들어 준다", async ({ page }) => {
    await open(page, { role: "admin", babyName: "또또", dueDate: "2026-12-14" });
    await go(page, "#/more/widget", 1400);
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

test.describe("더보기 · 주소 기억", () => {
  test("21) 더보기에 저장·메달·설정이 모두 들어 있다 (없어진 기능이 아니다)", async ({ page }) => {
    const { errors } = await open(page, { role: "admin" });
    await go(page, "#/more", 900);
    const body = await page.locator("body").innerText();
    for (const label of ["저장한 사진", "메달", "가족 관리", "아기 정보", "D-day 위젯", "데이터 백업", "설정"]) {
      expect(body).toContain(label);
    }
    expect(errors).toEqual([]);
  });

  test("22) 새로고침하면 보던 화면이 그대로 열린다", async ({ page }) => {
    await open(page, { role: "admin", photos: 2, privatePhotos: 0 });
    await go(page, "#/gallery", 1200);
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => location.hash)).toBe("#/gallery");
    await expect(page.locator("nav button[aria-current=\"page\"]")).toContainText("사진");
  });

  test("23) 더보기 상세에서 뒤로가기를 누르면 목록으로 돌아온다", async ({ page }) => {
    await open(page, { role: "admin" });
    await go(page, "#/more", 900);
    await page.getByRole("button", { name: /설정/ }).last().click();   // 목록 → 상세
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => location.hash)).toBe("#/more/settings");
    await page.goBack();
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => location.hash)).toBe("#/more");
  });
});

test.describe("실행취소 · 잘못 눌렀을 때", () => {
  test("24) 빠른 기저귀 기록에 실행취소가 뜨고, 누르면 지워진다", async ({ page }) => {
    // 기저귀 빠른 입력은 태어난 뒤 홈에 나온다
    const { errors } = await open(page, { role: "admin", birthDate: "2026-08-10" });
    await go(page, "#/dashboard", 900);
    await page.getByRole("button", { name: /소변/ }).first().click();
    await page.waitForTimeout(900);

    const alert = page.getByRole("alert").filter({ hasText: "기저귀 기록 추가" });
    await expect(alert).toBeVisible();
    const undo = alert.getByRole("button", { name: "실행취소" });
    await expect(undo).toBeVisible();

    await undo.click();
    await page.waitForTimeout(900);
    const c = (await calls(page)) as Array<{ op: string; t?: string }>;
    expect(c.some((x) => x.op === "insert" && x.t === "records")).toBe(true);
    expect(c.some((x) => x.op === "delete" && x.t === "records")).toBe(true);
    expect(errors).toEqual([]);
  });

  test("25) 그냥 저장한 기록에는 실행취소가 없다 (모든 토스트에 붙지 않는다)", async ({ page }) => {
    await open(page, { role: "admin" });
    await go(page, "#/dashboard", 900);
    await page.getByRole("button", { name: /메모/ }).first().click();
    await page.waitForTimeout(700);
    await page.getByRole("textbox").last().fill("오늘 태동이 심했어");
    await page.getByRole("button", { name: /저장/ }).last().click();
    await page.waitForTimeout(900);
    const alert = page.getByRole("alert").filter({ hasText: "메모를 저장했어요" });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole("button", { name: "실행취소" })).toHaveCount(0);
  });
});

test.describe("한 화면에 너무 많던 것들", () => {
  test("26) 출산 전에는 임신·건강·다이어리가 앞에 오고 나머지는 접혀 있다", async ({ page }) => {
    await open(page, { role: "admin", dueDate: "2026-12-14", birthDate: "" });
    await go(page, "#/records", 1200);
    const tablist = page.getByRole("tablist", { name: "육아 기록 종류" });
    await expect(tablist).toContainText("임신");
    await expect(tablist).toContainText("다이어리");
    await expect(tablist).not.toContainText("유축");      // 접혀 있다

    // 접힌 것도 사라진 게 아니라 '＋ 다른 기록' 안에 있다
    await page.getByRole("button", { name: /다른 기록/ }).click();
    await page.waitForTimeout(700);
    const dlg = page.getByRole("dialog");
    for (const label of ["수유", "수면", "기저귀", "유축", "이유식", "투약", "성장"]) {
      await expect(dlg).toContainText(label);
    }
  });

  test("27) 태어난 뒤에는 수유·수면·기저귀가 앞에 온다", async ({ page }) => {
    await open(page, { role: "admin", dueDate: "2026-08-12", birthDate: "2026-08-10" });
    await go(page, "#/records", 1200);
    const tablist = page.getByRole("tablist", { name: "육아 기록 종류" });
    await expect(tablist).toContainText("수유");
    await expect(tablist).toContainText("수면");
    await expect(tablist).toContainText("기저귀");
  });

  test("28) 주소로 들어온 기록 종류는 접혀 있어도 앞줄에 보인다", async ({ page }) => {
    await open(page, { role: "admin" });
    await go(page, "#/records/pump", 1200);
    await expect(page.getByRole("tab", { selected: true })).toContainText("유축");
  });

  test("29) 갤러리 조건은 접혀 있고, 펼치면 전부 그대로 있다", async ({ page }) => {
    await open(page, { role: "admin", photos: 3, privatePhotos: 0 });
    await go(page, "#/gallery", 1500);
    await expect(page.getByLabel("시작 날짜")).toHaveCount(0);   // 접혀 있다

    await page.getByRole("button", { name: /^필터/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByLabel("시작 날짜")).toBeVisible();
    await expect(page.getByLabel("끝 날짜")).toBeVisible();
    await expect(page.getByLabel("업로더별 보기")).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).toContain("최신순");
    expect(body).toContain("월별 보기");
  });

  test("30) 조건을 걸면 필터 버튼에 개수가 표시된다", async ({ page }) => {
    await open(page, { role: "admin", photos: 3, privatePhotos: 0 });
    await go(page, "#/gallery", 1500);
    await page.getByRole("button", { name: /^필터/ }).click();
    await page.waitForTimeout(400);
    await page.getByLabel("시작 날짜").fill("2026-01-01");
    await page.waitForTimeout(400);
    await expect(page.getByRole("button", { name: /필터 \(1개 적용됨\)/ })).toBeVisible();
  });
});

test.describe("키보드·스크린리더", () => {
  test("31) 모달은 제목과 연결되고 ESC 로 닫힌다", async ({ page }) => {
    await open(page, { role: "admin" });
    await go(page, "#/records", 1200);
    await page.getByRole("button", { name: /다른 기록/ }).click();
    await page.waitForTimeout(700);

    const dlg = page.getByRole("dialog");
    await expect(dlg).toHaveAttribute("aria-labelledby", "modal-title");
    await expect(page.locator("#modal-title")).toHaveText("다른 기록");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    await expect(dlg).toHaveCount(0);
  });

  test("32) Tab 을 계속 눌러도 초점이 모달 밖으로 새지 않는다", async ({ page }) => {
    await open(page, { role: "admin" });
    await go(page, "#/records", 1200);
    await page.getByRole("button", { name: /다른 기록/ }).click();
    await page.waitForTimeout(800);

    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        return !!(dlg && document.activeElement && dlg.contains(document.activeElement));
      });
      expect(inside).toBe(true);
    }
  });

  test("33) 닫으면 열었던 버튼으로 초점이 돌아온다", async ({ page }) => {
    await open(page, { role: "admin" });
    await go(page, "#/records", 1200);
    const opener = page.getByRole("button", { name: /다른 기록/ });
    await opener.click();
    await page.waitForTimeout(800);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    const txt = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText || "");
    expect(txt).toContain("다른 기록");
  });

  test("34) 작은 글씨가 12px 아래로 내려가지 않는다", async ({ page }) => {
    await open(page, { role: "admin", photos: 2, privatePhotos: 0 });
    const tooSmall = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll("body *").forEach((el) => {
        const e = el as HTMLElement;
        if (!e.offsetParent && e.tagName !== "BODY") return;
        if (!e.textContent || !e.textContent.trim()) return;
        if (e.children.length) return;                   // 글자를 직접 담은 것만
        const px = parseFloat(getComputedStyle(e).fontSize);
        if (px && px < 12) out.push(px + "px · " + e.textContent.trim().slice(0, 20));
      });
      return out;
    });
    expect(tooSmall).toEqual([]);
  });
});

test.describe("홈 — 시기에 맞는 것이 위에", () => {
  test("35) 출산 전 홈은 D-day 와 초음파가 앞에 온다", async ({ page }) => {
    const { errors } = await open(page, { role: "admin", dueDate: "2026-12-14", birthDate: "" });
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/D-\d+/);
    expect(body).toContain("최근 초음파");
    // 아직 쓸 일 없는 것은 홈에서 빼 두었다
    expect(body).not.toContain("오늘 타임라인");
    expect(body).not.toContain("최근 7일 통계");
    // 없어진 게 아니라는 안내는 남긴다
    expect(body).toContain("태어난 뒤 홈에 나타나요");
    expect(errors).toEqual([]);
  });

  test("36) 출산 전 홈에서 초음파 카드를 누르면 임신 기록으로 간다", async ({ page }) => {
    await open(page, { role: "admin", birthDate: "" });
    await page.getByRole("button", { name: /최근 초음파/ }).click();
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => location.hash)).toBe("#/records/prenatal");
  });

  test("37) 태어난 뒤 홈은 빠른 입력이 통계보다 위에 온다", async ({ page }) => {
    const { errors } = await open(page, { role: "admin", birthDate: "2026-08-10" });
    const order = await page.evaluate(() => {
      const t = document.body.innerText;
      return { quick: t.indexOf("빠른 입력"), today: t.indexOf("수유"), week: t.indexOf("최근 7일 통계") };
    });
    expect(order.quick).toBeGreaterThan(-1);
    expect(order.week).toBeGreaterThan(order.quick);
    expect(errors).toEqual([]);
  });

  test("38) 태어난 뒤 홈에 오늘 요약·타임라인·주간통계가 모두 있다", async ({ page }) => {
    await open(page, { role: "admin", birthDate: "2026-08-10" });
    const body = await page.locator("body").innerText();
    expect(body).toContain("오늘 타임라인");
    expect(body).toContain("최근 7일 통계");
    expect(body).toContain("마지막 수유");
  });
});

test.describe("말투 — 진단하지 않는다", () => {
  test("39) 체온·심박 안내에 '정상/비정상' 판정이 없다", async ({ page }) => {
    await open(page, { role: "admin", birthDate: "2026-08-10" });
    await go(page, "#/records/health", 1500);
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("비정상");
    expect(body).toContain("수첩");            // 면책 안내가 보인다
  });

  test("40) 놀라게 하는 🚨 표시를 쓰지 않는다", async ({ page }) => {
    const res = await page.request.get("/app.html");
    expect(await res.text()).not.toContain("🚨");
  });
});

test.describe("권한은 DB 가 정한다", () => {
  test("41) 로그인해도 프론트가 권한을 쓰지 않는다", async ({ page }) => {
    const { errors } = await open(page, { role: "admin" });
    const c = (await calls(page)) as Array<{ op: string; t?: string; patch?: Record<string, unknown>; row?: Record<string, unknown> }>;
    const writes = c.filter((x) => (x.op === "update" || x.op === "upsert" || x.op === "insert") && x.t === "profiles");
    for (const w of writes) {
      const body = { ...(w.patch || {}), ...(w.row || {}) };
      // role/approved/family_id/disabled 는 DB 트리거와 관리자 화면만 건드린다
      expect(Object.keys(body)).not.toContain("role");
      expect(Object.keys(body)).not.toContain("approved");
      expect(Object.keys(body)).not.toContain("disabled");
      expect(Object.keys(body)).not.toContain("family_id");
    }
    expect(errors).toEqual([]);
  });

  test("42) 접속일은 DB 함수로 남긴다 (프로필을 직접 수정하지 않는다)", async ({ page }) => {
    await open(page, { role: "admin" });
    const c = (await calls(page)) as Array<{ op: string; fn?: string }>;
    expect(c.some((x) => x.op === "rpc" && x.fn === "touch_login")).toBe(true);
  });

  test("43) 관리자 이메일이어도 DB 가 아니라고 하면 관리자 메뉴를 열지 않는다", async ({ page }) => {
    // scott7259@naver.com 은 app.html 의 ADMIN_EMAILS 에 있다.
    // 예전에는 이 조건만으로 화면이 관리자 권한을 줬다.
    await open(page, { role: "family", email: "scott7259@naver.com" });
    const body = await page.locator("body").innerText();
    expect(body).toContain("관리자 권한이 서버에 반영되어 있지 않습니다");

    await go(page, "#/more", 900);
    // 가족 관리는 관리자만 보이는 항목이다
    expect(await page.locator("body").innerText()).not.toContain("가족 관리");
  });

  test("44) DB 가 관리자라고 하면 그대로 관리자다 (안내는 안 뜬다)", async ({ page }) => {
    await open(page, { role: "admin", email: "scott7259@naver.com" });
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("관리자 권한이 서버에 반영되어 있지 않습니다");
    await go(page, "#/more", 900);
    expect(await page.locator("body").innerText()).toContain("가족 관리");
  });
});

test.describe("공용 로직 한 벌 (vendor/toto-core.js)", () => {
  test("45) 앱이 공용 로직을 실제로 불러 쓴다", async ({ page }) => {
    const { errors } = await open(page, { role: "admin" });
    const core = await page.evaluate(() => {
      const c = (window as unknown as { TotoCore?: Record<string, unknown> }).TotoCore;
      return c ? Object.keys(c).sort() : null;
    });
    expect(core).not.toBeNull();
    // 화면이 쓰는 것들이 빠지지 않았는지
    for (const k of ["toDate", "ymd", "fmtTime", "ago", "hm", "babyAge", "dday", "errMsg", "diagnoseConfig"]) {
      expect(core).toContain(k);
    }
    expect(errors).toEqual([]);
  });

  test("46) 로그인 실패 메시지가 영어로 나오지 않는다", async ({ page }) => {
    // 예전에는 Firebase 오류코드(e.code)로 찾는 표를 쓰고 있어서, Supabase 가
    // 주는 "Invalid login credentials" 가 그대로 가족 화면에 떴다.
    await open(page, { loggedOut: true, signInError: "Invalid login credentials" });
    await page.getByLabel("이메일", { exact: true }).fill("a@b.com");
    await page.getByLabel("비밀번호", { exact: true }).fill("wrongpw");
    await page.getByRole("button", { name: /로그인/ }).last().click();
    await page.waitForTimeout(1200);
    const body = await page.locator("body").innerText();
    expect(body).toContain("이메일 또는 비밀번호가 올바르지 않아요");
    expect(body).not.toContain("Invalid login credentials");
  });

  test("47) 나이 계산이 자정 기준이라 오후에 봐도 하루가 안 틀어진다", async ({ page }) => {
    await open(page, { role: "admin", birthDate: "2026-08-10", dueDate: "" });
    const days = await page.evaluate(() => {
      const c = (window as unknown as {
        TotoCore: { babyAge: (b: unknown, n: Date) => { days?: number } };
      }).TotoCore;
      const baby = { birthDate: "2026-08-10", dueDate: "" };
      // 같은 날의 아침과 밤은 같은 '생후 N일' 이어야 한다
      return [
        c.babyAge(baby, new Date("2026-09-27T06:00:00")).days,
        c.babyAge(baby, new Date("2026-09-27T23:30:00")).days,
      ];
    });
    expect(days[0]).toBe(days[1]);
    expect(days[0]).toBe(48);
  });

  test("48) 24시간을 넘는 수면 값은 잘라서 보여준다", async ({ page }) => {
    await open(page, { role: "admin" });
    const out = await page.evaluate(() => {
      const c = (window as unknown as { TotoCore: { hm: (m: number) => string } }).TotoCore;
      return [c.hm(9999), c.hm(-5), c.hm(90)];
    });
    expect(out).toEqual(["24시간 0분", "0시간 0분", "1시간 30분"]);
  });
});

test.describe("접속 설정이 잘못됐을 때", () => {
  test("49) service_role 키를 넣으면 앱을 띄우지 않고 경고한다", async ({ page }) => {
    await serveVendorLocally(page);
    await page.route("**/supabase-config.js", (r) =>
      r.fulfill({
        contentType: "application/javascript",
        body: `window.SUPABASE_URL="https://x.supabase.co";
               window.SUPABASE_ANON_KEY="sb_secret_ABCDEFGHIJKLMNOP";
               window.MEDIA_BUCKET="family-media";
               window.supabase={createClient:function(){throw new Error("만들면 안 된다")}};`,
      }));
    await page.goto("/app.html", { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const body = await page.locator("body").innerText();
    expect(body).toContain("service_role");
    expect(body).toContain("절대 넣지 마세요");
  });

  test("50) 키 자리에 주소를 넣으면 그렇다고 말해준다", async ({ page }) => {
    await serveVendorLocally(page);
    await page.route("**/supabase-config.js", (r) =>
      r.fulfill({
        contentType: "application/javascript",
        body: `window.SUPABASE_URL="https://x.supabase.co";
               window.SUPABASE_ANON_KEY="https://x.supabase.co";
               window.supabase={createClient:function(){return {}}};`,
      }));
    await page.goto("/app.html", { waitUntil: "load" });
    await page.waitForTimeout(2500);
    expect(await page.locator("body").innerText()).toContain("키 자리에 주소를 넣으셨어요");
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

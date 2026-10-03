import { test, expect, type Page } from "@playwright/test";
import { stubScript, type Seed } from "./fixtures/stub";
import { serveVendorLocally } from "./fixtures/offline";

/* 손으로 보기 어려운 것들을 기계가 보게 한다.

   왜 필요한가
   · 아기 안고 한 손으로 쓰는 앱이다. 누를 수 있는 영역이 작으면 못 누른다.
   · 이모티콘만 있는 버튼은 스크린리더가 "버튼" 이라고만 읽는다.
   · 입력칸 글씨가 16px 보다 작으면 아이폰이 화면을 확 키워 버린다.

   화면을 하나씩 돌며 규칙을 확인하고, 어긋난 것을 전부 모아서 보여준다.
   (하나 고치고 다시 돌리는 일을 반복하지 않도록) */

async function open(page: Page, seed: Seed = {}) {
  await serveVendorLocally(page);
  await page.route("**/supabase-config.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: stubScript(seed) }));
  await page.goto("/app.html", { waitUntil: "load" });
  await page.waitForTimeout(2500);
}

const go = async (page: Page, hash: string, wait = 1200) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(wait);
};

/** 아기 안고 한 손으로 누르는 앱이라 44×44 를 밑돌면 안 된다 */
const MIN_TOUCH = 44;

interface Finding { kind: string; detail: string }

async function audit(page: Page): Promise<Finding[]> {
  return page.evaluate((min) => {
    const out: Array<{ kind: string; detail: string }> = [];
    const seen = new Set<string>();
    const add = (kind: string, detail: string) => {
      const k = `${kind}|${detail}`;
      if (!seen.has(k)) { seen.add(k); out.push({ kind, detail }); }
    };
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      const cs = getComputedStyle(el);
      return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
    };
    const where = (el: Element) => {
      const t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 24);
      const cls = (el.className || "").toString().split(/\s+/).slice(0, 2).join(".");
      return t || el.getAttribute("aria-label") || cls || el.tagName;
    };

    /* 1. 누를 수 있는 것의 크기 */
    document.querySelectorAll("button, a[href], [role=button]").forEach((el) => {
      if (!shown(el)) return;
      const r = el.getBoundingClientRect();
      // 글 안에 섞인 링크는 줄 높이를 따르므로 제외한다
      if (el.tagName === "A" && getComputedStyle(el).display === "inline") return;
      if (r.height < min || r.width < min) {
        add("작은 터치영역", `${Math.round(r.width)}×${Math.round(r.height)} · ${where(el)}`);
      }
    });

    /* 2. 읽을 이름이 없는 것 */
    const EMOJI_ONLY = /^[\s\p{Extended_Pictographic}‍️×✕‹›＋·…]*$/u;
    document.querySelectorAll("button, [role=button]").forEach((el) => {
      if (!shown(el)) return;
      const label = (el.getAttribute("aria-label") || "").trim();
      const text = (el.textContent || "").trim();
      if (label) return;
      if (!text) { add("이름 없는 버튼", where(el)); return; }
      if (EMOJI_ONLY.test(text)) add("이모티콘만 있는 버튼", text.slice(0, 12));
    });

    /* 3. 설명 없는 그림 */
    document.querySelectorAll("img").forEach((el) => {
      if (!shown(el)) return;
      if (!el.hasAttribute("alt")) add("alt 없는 이미지", el.getAttribute("src")?.slice(0, 40) ?? "?");
    });

    /* 4. 이름 없는 입력칸 + 아이폰이 확대하는 글씨 크기 */
    document.querySelectorAll("input, textarea, select").forEach((el) => {
      if (!shown(el)) return;
      const e = el as HTMLInputElement;
      if (e.type === "hidden") return;
      const named =
        e.getAttribute("aria-label") ||
        e.getAttribute("aria-labelledby") ||
        (e.id && document.querySelector(`label[for="${e.id}"]`)) ||
        e.closest("label");
      if (!named) add("이름 없는 입력칸", `${e.type || e.tagName} · ${where(e.parentElement ?? e)}`);
      const px = parseFloat(getComputedStyle(e).fontSize);
      if (px && px < 16 && e.type !== "checkbox" && e.type !== "radio") {
        add("입력칸 글씨 16px 미만", `${px}px · ${e.getAttribute("aria-label") || e.type}`);
      }
    });

    /* 5. 제목 단계가 비어 있는지 (h1 없이 h3 부터 시작하면 건너뛰며 읽힌다) */
    const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(shown);
    if (hs.length && !document.querySelector("h1")) add("h1 없음", `첫 제목이 ${hs[0]!.tagName}`);

    return out;
  }, MIN_TOUCH);
}

/* 화면마다 돌린다. 역할도 섞어 관리자 전용 화면까지 본다. */
const SCREENS: Array<{ name: string; hash: string; seed?: Seed }> = [
  { name: "홈(출산 전)", hash: "#/dashboard" },
  { name: "홈(출산 후)", hash: "#/dashboard", seed: { birthDate: "2026-08-10" } },
  { name: "기록", hash: "#/records" },
  { name: "기록·수유", hash: "#/records/feeding", seed: { birthDate: "2026-08-10" } },
  { name: "기록·건강", hash: "#/records/health" },
  { name: "기록·임신", hash: "#/records/prenatal" },
  { name: "사진", hash: "#/gallery", seed: { photos: 3, privatePhotos: 0 } },
  { name: "편지", hash: "#/letters" },
  { name: "더보기", hash: "#/more" },
  { name: "더보기·메달", hash: "#/more/medals" },
  { name: "더보기·설정", hash: "#/more/settings" },
  { name: "더보기·가족", hash: "#/more/family" },
  { name: "더보기·아기정보", hash: "#/more/baby" },
  { name: "더보기·위젯", hash: "#/more/widget" },
  { name: "더보기·백업", hash: "#/more/backup" },
  { name: "더보기·DB수정", hash: "#/more/dbfix", seed: { migrated: false } },
];

test.describe("접근성 · 터치영역", () => {
  for (const s of SCREENS) {
    test(`${s.name} 화면`, async ({ page }) => {
      await open(page, { role: "admin", ...s.seed });
      await go(page, s.hash);
      const found = await audit(page);
      // 어긋난 것을 전부 모아 한 번에 보여준다
      expect(found, `${s.name}:\n` + found.map((f) => `  · ${f.kind}: ${f.detail}`).join("\n")).toEqual([]);
    });
  }

  test("관람전용 화면", async ({ page }) => {
    await open(page, { role: "gallery_only", photos: 2, privatePhotos: 0 });
    const found = await audit(page);
    expect(found, "관람전용:\n" + found.map((f) => `  · ${f.kind}: ${f.detail}`).join("\n")).toEqual([]);
  });

  test("로그인 화면", async ({ page }) => {
    await open(page, { loggedOut: true });
    const found = await audit(page);
    expect(found, "로그인:\n" + found.map((f) => `  · ${f.kind}: ${f.detail}`).join("\n")).toEqual([]);
  });
});

test.describe("화면 제목", () => {
  test("읽히는 제목이 눈에는 보이지 않는다", async ({ page }) => {
    // sr-only 가 실제로 숨기지 못하면 화면마다 '홈' 같은 글자가 그냥 찍힌다.
    // Tailwind 가 그 클래스를 만들어 주는지에 달려 있어 반드시 확인한다.
    await open(page, { role: "admin" });
    const h1 = page.locator("h1.sr-only").first();
    await expect(h1).toHaveCount(1);
    const box = await h1.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { w: r.width, h: r.height, pos: cs.position, clip: cs.clip, overflow: cs.overflow };
    });
    // 1px 남기고 잘라내는 방식이라 자리를 차지하지 않는다
    expect(box.w).toBeLessThanOrEqual(1);
    expect(box.h).toBeLessThanOrEqual(1);
    expect(box.pos).toBe("absolute");
    expect(box.overflow).toBe("hidden");
  });

  test("화면마다 제목이 하나씩 있다", async ({ page }) => {
    await open(page, { role: "admin", photos: 2, privatePhotos: 0 });
    for (const [hash, name] of [
      ["#/dashboard", "홈"], ["#/records", "기록"], ["#/gallery", "사진"],
      ["#/letters", "편지"], ["#/more", "더보기"],
    ] as const) {
      await go(page, hash);
      const h1 = page.locator("h1");
      expect(await h1.count(), `${hash} 에 h1 이 ${await h1.count()}개`).toBeGreaterThanOrEqual(1);
      await expect(h1.first()).toHaveText(name);
    }
  });
});

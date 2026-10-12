import { describe, it, expect, vi } from "vitest";
import { signIn, fetchAllRows, downloadObject, buildBackup, parseConfigJs, toDataUrl, type RemoteConfig } from "./backupRemote";
import { verifyBackup, inspectBackup } from "./backupInspect";

/* 가짜 Supabase REST — 요청을 보고 답한다. 무엇을 보냈는지도 남긴다. */
function fakeServer(db: { records?: unknown[]; media?: unknown[]; albums?: unknown[]; profiles?: unknown[]; families?: unknown[] }, opts: { files?: Record<string, Uint8Array>; badLogin?: boolean } = {}) {
  const seen: Array<{ url: string; init?: RequestInit }> = [];
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

  const fetch = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    seen.push({ url, init });
    const u = new URL(url);
    if (u.pathname.endsWith("/auth/v1/token")) {
      if (opts.badLogin) return json({ error_description: "Invalid login credentials" }, 400);
      return json({ access_token: "tok-1" });
    }
    const m = /\/rest\/v1\/(\w+)$/.exec(u.pathname);
    if (m) {
      const rows = (db as Record<string, unknown[]>)[m[1]!] || [];
      const range = String((init?.headers as Record<string, string>)?.Range || "0-999");
      const [a, b] = range.split("-").map(Number) as [number, number];
      if (a >= rows.length && rows.length > 0) return new Response("", { status: 416 });
      const page = rows.slice(a, b + 1);
      const end = Math.max(a, a + page.length - 1);
      return json(page, 200, { "content-range": `${a}-${end}/${rows.length}` });
    }
    // 서명(POST)과 내려받기(GET)는 같은 경로를 쓴다 — 실제 Storage API 와 같다
    const s = /\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/.exec(u.pathname);
    if (s && (init?.method || "GET") === "POST") {
      if (!opts.files?.[s[2]!]) return json({ message: "Object not found" }, 404);
      return json({ signedURL: `/object/sign/${s[1]}/${s[2]}?token=abc` });
    }
    if (s) {
      if (!u.searchParams.get("token")) return new Response("", { status: 400 });
      const bytes = opts.files?.[s[2]!];
      if (!bytes) return new Response("", { status: 404 });
      return new Response(bytes, { status: 200, headers: { "content-type": "image/png" } });
    }
    return new Response("nope", { status: 404 });
  });

  const cfg: RemoteConfig = { url: "https://x.supabase.co", anonKey: "sb_publishable_x", bucket: "family-media", fetch, pageSize: 2 };
  return { cfg, seen, fetch };
}

const REC = (i: number) => ({ id: `r${i}`, type: "feeding", at: `2026-10-0${(i % 9) + 1}T00:00:00Z`, created_at: "2026-10-01T00:00:00Z", created_by: "u1", creator_name: "엄마", data: { amount: 100 + i } });
const MEDIA = (i: number, path = `fam/2026/10/p${i}_o.png`) => ({ id: `m${i}`, storage_path: path, preview_path: null, thumb_path: null, caption: `사진${i}`, category: "baby", uploaded_by: "u1", uploader_name: "엄마", uploaded_at: "2026-10-01T00:00:00Z", captured_at: null, people: [], place: "", gps: null, vis: "public", liked_by: [], favorite: false, width: 1, height: 1, bytes: 3 });

describe("로그인", () => {
  it("가족 계정으로 로그인해 토큰을 받는다 (service_role 아님)", async () => {
    const { cfg, seen } = fakeServer({});
    expect(await signIn(cfg, "a@b.c", "pw")).toBe("tok-1");
    const req = seen[0]!;
    expect(req.url).toContain("grant_type=password");
    expect((req.init?.headers as Record<string, string>).apikey).toBe("sb_publishable_x");
    expect(JSON.parse(String(req.init?.body))).toEqual({ email: "a@b.c", password: "pw" });
  });
  it("틀리면 이유를 말한다", async () => {
    const { cfg } = fakeServer({}, { badLogin: true });
    await expect(signIn(cfg, "a@b.c", "x")).rejects.toThrow(/로그인 실패: Invalid login credentials/);
  });
});

describe("표 전체 읽기", () => {
  it("1000행 상한을 넘겨도 페이지로 나눠 전부 읽고, 총 행 수와 맞는지 확인한다", async () => {
    const { cfg, seen } = fakeServer({ records: [REC(1), REC(2), REC(3), REC(4), REC(5)] });
    const { rows, total } = await fetchAllRows(cfg, "t", "records");
    expect(total).toBe(5);
    expect(rows.map((r) => r.id)).toEqual(["r1", "r2", "r3", "r4", "r5"]);
    const ranges = seen.map((s) => (s.init?.headers as Record<string, string>)?.Range).filter(Boolean);
    expect(ranges).toEqual(["0-1", "2-3", "4-5"]);
  });
  it("빈 표도 된다", async () => {
    const { cfg } = fakeServer({ records: [] });
    expect(await fetchAllRows(cfg, "t", "records")).toEqual({ rows: [], total: 0 });
  });
  it("토큰을 Authorization 으로 보낸다 (RLS 가 가족 것만 돌려주도록)", async () => {
    const { cfg, seen } = fakeServer({ records: [REC(1)] });
    await fetchAllRows(cfg, "tok-9", "records");
    expect((seen[0]!.init?.headers as Record<string, string>).Authorization).toBe("Bearer tok-9");
  });
});

describe("사진 내려받기", () => {
  it("서명 URL 을 받아 파일을 가져온다", async () => {
    const { cfg } = fakeServer({}, { files: { "fam/a.png": new Uint8Array([1, 2, 3]) } });
    const { bytes, mime } = await downloadObject(cfg, "t", "fam/a.png");
    expect([...bytes]).toEqual([1, 2, 3]);
    expect(mime).toBe("image/png");
  });
  it("없는 파일은 경로를 들어 알려준다", async () => {
    const { cfg } = fakeServer({}, { files: {} });
    await expect(downloadObject(cfg, "t", "fam/none.png")).rejects.toThrow(/서명 실패\(fam\/none.png\)/);
  });
  it("dataURL 로 바꾼다", () => {
    expect(toDataUrl(new Uint8Array([104, 105]), "image/png; charset=x")).toBe("data:image/png;base64,aGk=");
  });
});

describe("백업 파일 만들기", () => {
  const db = {
    families: [{ id: "f1", baby: { name: "또또", dueDate: "2026-12-14" } }],
    records: [REC(1), REC(2), REC(3)],
    media: [MEDIA(1), MEDIA(2)],
    albums: [{ id: "a1", title: "첫 앨범", sort_order: 1 }],
    profiles: [{ id: "u1", email: "m@t.com", display_name: "엄마", role: "admin", approved: true }],
  };
  const files = { "fam/2026/10/p1_o.png": new Uint8Array([1]), "fam/2026/10/p2_o.png": new Uint8Array([2]) };

  it("사진까지 담으면 앱의 가져오기가 그대로 쓸 수 있는 v3 파일이 된다", async () => {
    const { cfg } = fakeServer(db, { files });
    const b = await buildBackup(cfg, { email: "a", password: "b", withPhotos: true });
    expect(b.version).toBe(3);
    expect(b.baby).toEqual({ name: "또또", dueDate: "2026-12-14" });
    expect(b.records.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
    expect(b.records[0]).toMatchObject({ type: "feeding", amount: 101, creatorName: "엄마" });   // data 가 펼쳐진다
    expect(b.photos.every((p) => p.url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(b.albums[0]).toMatchObject({ title: "첫 앨범" });
    expect(b.users[0]).toMatchObject({ name: "엄마", role: "admin" });
    expect(b.summary).toEqual({ records: 3, photos: 2, photosExpected: 2, albums: 1, users: 1, failedPhotoIds: [] });
    expect(verifyBackup(b).ok).toBe(true);
    expect(inspectBackup(b)).toMatchObject({ ok: true, photosWithImage: 2, records: 3 });
  });

  it("사진 없이 만들면 목록만 담기고 검사가 그렇게 말한다", async () => {
    const { cfg, fetch } = fakeServer(db, { files });
    const b = await buildBackup(cfg, { email: "a", password: "b", withPhotos: false });
    expect(b.photos).toHaveLength(2);
    expect(b.photos.every((p) => p.url === "")).toBe(true);
    expect(fetch.mock.calls.some(([u]) => String(u).includes("/storage/"))).toBe(false);   // Storage 는 안 건드린다
    expect(verifyBackup(b).ok).toBe(false);
    expect(inspectBackup(b).photosWithImage).toBe(0);
  });

  it("한 장을 못 받아도 멈추지 않고 실패 목록에 적는다 — 검사가 그걸 잡는다", async () => {
    const { cfg } = fakeServer(db, { files: { "fam/2026/10/p1_o.png": new Uint8Array([1]) } });
    const b = await buildBackup(cfg, { email: "a", password: "b", withPhotos: true });
    expect(b.summary.failedPhotoIds).toEqual(["m2"]);
    expect(b.photos).toHaveLength(1);
    expect(verifyBackup(b)).toMatchObject({ ok: false, message: expect.stringContaining("1/2") });
  });

  it("가족 정보를 못 읽는 계정이면 왜 그런지 말한다", async () => {
    const { cfg } = fakeServer({ ...db, families: [] });
    await expect(buildBackup(cfg, { email: "a", password: "b", withPhotos: false })).rejects.toThrow(/승인된 가족 계정/);
  });

  it("진행 상황을 알린다", async () => {
    const { cfg } = fakeServer(db, { files });
    const seen: string[] = [];
    await buildBackup(cfg, { email: "a", password: "b", withPhotos: true, onProgress: (p) => seen.push(`${p.label} ${p.done}/${p.total}`) });
    expect(seen).toEqual(["읽는 중 0/0", "사진 담는 중 0/2", "사진 담는 중 1/2"]);
  });
});

describe("설정 파일 읽기", () => {
  it("앱이 쓰는 supabase-config.js 에서 그대로 읽는다", () => {
    const src = 'window.SUPABASE_URL = "https://x.supabase.co";\nwindow.SUPABASE_ANON_KEY = "sb_publishable_abc";\nwindow.MEDIA_BUCKET = "family-media";';
    expect(parseConfigJs(src)).toEqual({ url: "https://x.supabase.co", anonKey: "sb_publishable_abc", bucket: "family-media" });
  });
  it("없으면 null", () => {
    expect(parseConfigJs("// 비어 있음")).toBeNull();
  });
});

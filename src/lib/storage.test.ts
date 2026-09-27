import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createSignedUrls = vi.fn();
vi.mock("./supabase", () => ({
  MEDIA_BUCKET: "family-media",
  sb: () => ({ storage: { from: () => ({ createSignedUrls, remove: vi.fn() }) } }),
}));

import { signPaths, signOne, clearSignedUrlCache, __cacheSize } from "./storage";

beforeEach(() => { createSignedUrls.mockReset(); clearSignedUrlCache(); });
afterEach(() => { vi.useRealTimers(); });

const ok = (paths: string[]) => ({
  data: paths.map((p) => ({ path: p, signedUrl: `https://sig/${p}` })), error: null,
});

describe("signPaths", () => {
  it("경로를 서명 URL 로 바꾼다", async () => {
    createSignedUrls.mockResolvedValueOnce(ok(["a.jpg", "b.jpg"]));
    const m = await signPaths(["a.jpg", "b.jpg"]);
    expect(m["a.jpg"]).toBe("https://sig/a.jpg");
    expect(Object.keys(m)).toHaveLength(2);
  });

  it("같은 경로는 다시 요청하지 않는다", async () => {
    createSignedUrls.mockResolvedValueOnce(ok(["a.jpg"]));
    await signPaths(["a.jpg"]);
    await signPaths(["a.jpg"]);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
  });

  it("빈 값·중복을 걸러낸다", async () => {
    createSignedUrls.mockResolvedValueOnce(ok(["a.jpg"]));
    await signPaths(["a.jpg", "a.jpg", null, undefined, ""]);
    expect(createSignedUrls).toHaveBeenCalledWith(["a.jpg"], 3600);
  });

  it("90개씩 나눠 요청한다", async () => {
    const many = Array.from({ length: 200 }, (_, i) => `p${i}.jpg`);
    createSignedUrls.mockImplementation((chunk: string[]) => Promise.resolve(ok(chunk)));
    await signPaths(many);
    expect(createSignedUrls).toHaveBeenCalledTimes(3);   // 90 + 90 + 20
  });

  it("실패해도 예외를 던지지 않는다", async () => {
    createSignedUrls.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(signPaths(["a.jpg"])).resolves.toEqual({});
  });

  it("로그아웃하면 캐시가 비워진다", async () => {
    createSignedUrls.mockResolvedValueOnce(ok(["a.jpg"]));
    await signPaths(["a.jpg"]);
    expect(__cacheSize()).toBe(1);
    clearSignedUrlCache();
    expect(__cacheSize()).toBe(0);
  });

  it("만료가 임박하면 다시 받는다", async () => {
    vi.useFakeTimers();
    createSignedUrls.mockResolvedValue(ok(["a.jpg"]));
    await signPaths(["a.jpg"]);
    vi.advanceTimersByTime(59 * 60 * 1000);   // 59분 경과 → 만료 2분 전
    await signPaths(["a.jpg"]);
    expect(createSignedUrls).toHaveBeenCalledTimes(2);
  });
});

describe("signOne", () => {
  it("없는 경로는 null", async () => {
    expect(await signOne(null)).toBeNull();
    expect(createSignedUrls).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStorage, type MinimalStorageClient } from "./storage";

/* 가짜 Storage — 몇 번 요청했는지, 어떤 경로를 보냈는지 본다 */
function fake() {
  const createSignedUrls = vi.fn();
  const remove = vi.fn().mockResolvedValue({ error: null });
  const client: MinimalStorageClient = {
    storage: { from: () => ({ createSignedUrls, remove }) },
  };
  return { client, createSignedUrls, remove };
}

const ok = (paths: string[]) => ({
  data: paths.map((p) => ({ path: p, signedUrl: `https://sig/${p}` })),
  error: null,
});

let clock = 1_700_000_000_000;
beforeEach(() => { clock = 1_700_000_000_000; });
const nowFn = () => clock;

const make = (f: ReturnType<typeof fake>, fetchFn?: typeof fetch) =>
  createStorage(f.client, "family-media", { nowFn, fetchFn });

describe("사진 주소 받아오기", () => {
  it("경로를 서명 URL 로 바꾼다", async () => {
    const f = fake();
    f.createSignedUrls.mockResolvedValueOnce(ok(["a.jpg", "b.jpg"]));
    const m = await make(f).signPaths(["a.jpg", "b.jpg"]);
    expect(m["a.jpg"]).toBe("https://sig/a.jpg");
    expect(Object.keys(m)).toHaveLength(2);
  });

  it("같은 경로는 다시 요청하지 않는다", async () => {
    const f = fake();
    f.createSignedUrls.mockResolvedValueOnce(ok(["a.jpg"]));
    const s = make(f);
    await s.signPaths(["a.jpg"]);
    await s.signPaths(["a.jpg"]);
    expect(f.createSignedUrls).toHaveBeenCalledTimes(1);
  });

  it("빈 값과 중복을 걸러낸다", async () => {
    const f = fake();
    f.createSignedUrls.mockResolvedValueOnce(ok(["a.jpg"]));
    await make(f).signPaths(["a.jpg", "a.jpg", null, undefined, ""]);
    expect(f.createSignedUrls).toHaveBeenCalledWith(["a.jpg"], 3600);
  });

  it("90개씩 나눠 요청한다 (한 번에 다 보내면 거부당한다)", async () => {
    const f = fake();
    const many = Array.from({ length: 200 }, (_, i) => `p${i}.jpg`);
    f.createSignedUrls.mockImplementation((chunk: string[]) => Promise.resolve(ok(chunk)));
    await make(f).signPaths(many);
    expect(f.createSignedUrls).toHaveBeenCalledTimes(3);
    expect(f.createSignedUrls.mock.calls[0]![0]).toHaveLength(90);
    expect(f.createSignedUrls.mock.calls[2]![0]).toHaveLength(20);
  });

  it("만료 2분 전이면 새로 받는다 (슬라이드쇼를 오래 켜 둬도 사진이 살아 있게)", async () => {
    const f = fake();
    f.createSignedUrls.mockImplementation((c: string[]) => Promise.resolve(ok(c)));
    const s = make(f);
    await s.signPaths(["a.jpg"]);
    expect(f.createSignedUrls).toHaveBeenCalledTimes(1);

    clock += 58 * 60 * 1000 + 1;             // 만료 2분 전을 막 지난 시점
    await s.signPaths(["a.jpg"]);
    expect(f.createSignedUrls).toHaveBeenCalledTimes(2);   // 새로 받는다
  });

  it("만료 2분 전 경계에서는 아직 갱신하지 않는다", async () => {
    const f = fake();
    f.createSignedUrls.mockImplementation((c: string[]) => Promise.resolve(ok(c)));
    const s = make(f);
    await s.signPaths(["a.jpg"]);
    clock += 58 * 60 * 1000;                 // 정확히 2분 남은 순간
    await s.signPaths(["a.jpg"]);
    expect(f.createSignedUrls).toHaveBeenCalledTimes(1);
  });

  it("만료가 멀면 갱신하지 않는다", async () => {
    const f = fake();
    f.createSignedUrls.mockImplementation((c: string[]) => Promise.resolve(ok(c)));
    const s = make(f);
    await s.signPaths(["a.jpg"]);
    clock += 30 * 60 * 1000;                 // 30분 뒤
    await s.signPaths(["a.jpg"]);
    expect(f.createSignedUrls).toHaveBeenCalledTimes(1);
  });

  it("일부가 실패해도 나머지 사진은 보인다", async () => {
    const f = fake();
    const many = Array.from({ length: 100 }, (_, i) => `p${i}.jpg`);
    f.createSignedUrls
      .mockResolvedValueOnce({ data: null, error: { message: "권한 없음" } })
      .mockImplementationOnce((c: string[]) => Promise.resolve(ok(c)));
    const m = await make(f).signPaths(many);
    expect(Object.keys(m)).toHaveLength(10);      // 뒤쪽 10장은 살아났다
  });

  it("네트워크가 끊겨도 터지지 않는다", async () => {
    const f = fake();
    f.createSignedUrls.mockRejectedValueOnce(new Error("네트워크 끊김"));
    await expect(make(f).signPaths(["a.jpg"])).resolves.toEqual({});
  });

  it("예전 이름(signedURL)으로 와도 받아준다", async () => {
    const f = fake();
    f.createSignedUrls.mockResolvedValueOnce({ data: [{ path: "a.jpg", signedURL: "https://old" }], error: null });
    const m = await make(f).signPaths(["a.jpg"]);
    expect(m["a.jpg"]).toBe("https://old");
  });

  it("한 장만 받는 길도 있다", async () => {
    const f = fake();
    f.createSignedUrls.mockResolvedValueOnce(ok(["a.jpg"]));
    const s = make(f);
    expect(await s.signOne("a.jpg")).toBe("https://sig/a.jpg");
    expect(await s.signOne(null)).toBeNull();
    expect(await s.signOne("")).toBeNull();
  });
});

describe("로그아웃하면 캐시를 비운다", () => {
  it("다음 사람에게 남의 사진이 보이지 않게", async () => {
    const f = fake();
    f.createSignedUrls.mockImplementation((c: string[]) => Promise.resolve(ok(c)));
    const s = make(f);
    await s.signPaths(["a.jpg"]);
    expect(s.cacheSize()).toBe(1);
    s.clearSignedUrlCache();
    expect(s.cacheSize()).toBe(0);
    await s.signPaths(["a.jpg"]);
    expect(f.createSignedUrls).toHaveBeenCalledTimes(2);   // 다시 받아온다
  });
});

describe("사진 파일 지우기", () => {
  it("지운 사진의 주소를 캐시에서 버린다", async () => {
    // 지웠는데 캐시된 주소로 계속 보이면 안 된다
    const f = fake();
    f.createSignedUrls.mockImplementation((c: string[]) => Promise.resolve(ok(c)));
    const s = make(f);
    await s.signPaths(["a.jpg"]);
    expect(s.cacheSize()).toBe(1);
    await s.removeFiles(["a.jpg"]);
    expect(s.cacheSize()).toBe(0);
    expect(f.remove).toHaveBeenCalledWith(["a.jpg"]);
  });

  it("지우기가 실패해도 캐시는 비운다", async () => {
    const f = fake();
    f.createSignedUrls.mockImplementation((c: string[]) => Promise.resolve(ok(c)));
    f.remove.mockRejectedValueOnce(new Error("이미 없음"));
    const s = make(f);
    await s.signPaths(["a.jpg"]);
    await s.removeFiles(["a.jpg"]);
    expect(s.cacheSize()).toBe(0);
  });

  it("빈 값만 주면 아무것도 하지 않는다", async () => {
    const f = fake();
    await make(f).removeFiles([null, undefined, ""]);
    expect(f.remove).not.toHaveBeenCalled();
  });

  it("문자열 하나만 줘도 된다", async () => {
    const f = fake();
    await make(f).removeFiles("a.jpg");
    expect(f.remove).toHaveBeenCalledWith(["a.jpg"]);
  });
});

describe("사진 원본 받아오기 (백업)", () => {
  const res = (status: number) => ({ ok: status >= 200 && status < 300, status }) as Response;

  it("만료된 주소면 새로 받아 한 번 다시 시도한다", async () => {
    const f = fake();
    f.createSignedUrls.mockImplementation((c: string[]) => Promise.resolve(ok(c)));
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(res(403))     // 만료
      .mockResolvedValueOnce(res(200));
    const out = await make(f, fetchFn as unknown as typeof fetch).fetchSigned("a.jpg");
    expect(out.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(f.createSignedUrls).toHaveBeenCalledTimes(2);   // 주소를 새로 받았다
  });

  it("두 번째도 실패하면 무엇이 문제인지 알려준다", async () => {
    const f = fake();
    f.createSignedUrls.mockImplementation((c: string[]) => Promise.resolve(ok(c)));
    const fetchFn = vi.fn().mockResolvedValue(res(403));
    await expect(make(f, fetchFn as unknown as typeof fetch).fetchSigned("a.jpg"))
      .rejects.toThrow(/HTTP 403/);
  });

  it("만료가 아닌 실패는 다시 시도하지 않는다", async () => {
    const f = fake();
    f.createSignedUrls.mockImplementation((c: string[]) => Promise.resolve(ok(c)));
    const fetchFn = vi.fn().mockResolvedValue(res(500));
    await expect(make(f, fetchFn as unknown as typeof fetch).fetchSigned("a.jpg"))
      .rejects.toThrow(/HTTP 500/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("주소를 못 받으면 그렇다고 말한다", async () => {
    const f = fake();
    f.createSignedUrls.mockResolvedValueOnce({ data: [], error: null });
    await expect(make(f).fetchSigned("a.jpg")).rejects.toThrow(/사진 주소를 받지 못했어요/);
  });
});

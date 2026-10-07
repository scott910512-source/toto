import { describe, it, expect, vi } from "vitest";
import { createDbHealth, isAuthExpired } from "./dbHealth";

describe("DB 연결 상태", () => {
  it("처음에는 실패가 없다", () => {
    const h = createDbHealth();
    expect(h.get()).toEqual({ failedCount: 0, lastError: null, tick: 0 });
  });

  it("실패를 알리면 수와 마지막 오류가 올라간다", () => {
    const h = createDbHealth();
    const f = vi.fn();
    h.subscribe(f);
    h.fail("records:feeding", new Error("Failed to fetch"));
    h.fail("records:sleep", new Error("Failed to fetch"));
    expect(h.get().failedCount).toBe(2);
    expect((h.get().lastError as Error).message).toBe("Failed to fetch");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("같은 조회가 다시 실패해도 두 번 세지 않는다", () => {
    const h = createDbHealth();
    h.fail("records:feeding", "a");
    h.fail("records:feeding", "b");
    expect(h.get().failedCount).toBe(1);
  });

  it("성공하면 실패 목록에서 빠지고, 다 빠지면 오류도 비운다", () => {
    const h = createDbHealth();
    h.fail("a", "x");
    h.fail("b", "y");
    h.ok("a");
    expect(h.get().failedCount).toBe(1);
    expect(h.get().lastError).toBe("y");
    h.ok("b");
    expect(h.get()).toMatchObject({ failedCount: 0, lastError: null });
  });

  it("실패한 적 없는 조회의 성공은 알림을 내지 않는다 (매 조회마다 화면이 다시 그려지지 않게)", () => {
    const h = createDbHealth();
    const f = vi.fn();
    h.subscribe(f);
    h.ok("never-failed");
    expect(f).not.toHaveBeenCalled();
    expect(h.get()).toBe(h.get()); // 같은 객체
  });

  it("다시 시도하면 실패를 비우고 tick 이 올라간다", () => {
    const h = createDbHealth();
    h.fail("a", "x");
    h.retry();
    expect(h.get()).toEqual({ failedCount: 0, lastError: null, tick: 1 });
    h.retry();
    expect(h.get().tick).toBe(2);
  });

  it("구독이 끝나면(forget) 실패로 남지 않는다", () => {
    const h = createDbHealth();
    h.fail("a", "x");
    h.forget("a");
    expect(h.get().failedCount).toBe(0);
  });

  it("구독 해제가 된다", () => {
    const h = createDbHealth();
    const f = vi.fn();
    const off = h.subscribe(f);
    off();
    h.fail("a", "x");
    expect(f).not.toHaveBeenCalled();
  });

  it("get 은 바뀐 게 없으면 같은 객체를 준다 (useSyncExternalStore 가 무한 루프에 빠지지 않게)", () => {
    const h = createDbHealth();
    const a = h.get();
    expect(h.get()).toBe(a);
    h.fail("a", "x");
    expect(h.get()).not.toBe(a);
  });
});

describe("로그인 만료 판별", () => {
  it("JWT 만료 문구와 PostgREST 코드를 알아본다", () => {
    expect(isAuthExpired({ message: "JWT expired" })).toBe(true);
    expect(isAuthExpired({ code: "PGRST301", message: "x" })).toBe(true);
    expect(isAuthExpired("token is expired")).toBe(true);
  });
  it("네트워크 오류는 아니다", () => {
    expect(isAuthExpired(new TypeError("Failed to fetch"))).toBe(false);
    expect(isAuthExpired(null)).toBe(false);
  });
});

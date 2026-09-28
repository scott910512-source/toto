import { describe, it, expect } from "vitest";
import { SV, isSV, applySV, isoOf } from "./fieldValues";

describe("쓰기 지시(sentinel)", () => {
  it("지시인지 아닌지 가른다", () => {
    expect(isSV(SV.serverTimestamp())).toBe(true);
    expect(isSV(SV.increment(1))).toBe(true);
    expect(isSV({ __sv: 3 })).toBe(false);      // 문자열이 아니면 지시가 아니다
    expect(isSV(null)).toBe(false);
    expect(isSV("ts")).toBe(false);
    expect(isSV(new Date())).toBe(false);
  });

  it("지금 시각은 쓰기 시점으로 적는다", () => {
    const at = new Date("2026-05-01T12:00:00Z");
    expect(applySV(null, SV.serverTimestamp(), at)).toBe("2026-05-01T12:00:00.000Z");
  });

  describe("숫자 더하기", () => {
    it("있는 값에 더한다", () => {
      expect(applySV(4, SV.increment(1))).toBe(5);
    });
    it("값이 없으면 0 에서 시작한다", () => {
      expect(applySV(null, SV.increment(1))).toBe(1);
      expect(applySV(undefined, SV.increment(2))).toBe(2);
    });
    it("숫자가 아닌 값이 저장돼 있어도 NaN 을 만들지 않는다", () => {
      // 편지 수가 NaN 으로 저장되면 메달 계산이 전부 깨진다
      expect(applySV("이상한값", SV.increment(1))).toBe(1);
      expect(applySV(NaN, SV.increment(1))).toBe(1);
      expect(applySV({}, SV.increment(1))).toBe(1);
    });
    it("문자열 숫자는 숫자로 본다", () => {
      expect(applySV("4", SV.increment(1))).toBe(5);
    });
    it("빼기도 된다", () => {
      expect(applySV(3, SV.increment(-1))).toBe(2);
    });
  });

  describe("배열에 넣기 · 빼기 (좋아요)", () => {
    it("없으면 넣는다", () => {
      expect(applySV(["a"], SV.arrayUnion("b"))).toEqual(["a", "b"]);
    });
    it("이미 있으면 중복으로 쌓지 않는다", () => {
      // 좋아요를 두 번 눌러도 한 번만 세어야 한다
      expect(applySV(["a"], SV.arrayUnion("a"))).toEqual(["a"]);
    });
    it("값이 없던 자리에도 넣는다", () => {
      expect(applySV(null, SV.arrayUnion("a"))).toEqual(["a"]);
      expect(applySV("배열아님", SV.arrayUnion("a"))).toEqual(["a"]);
    });
    it("뺀다", () => {
      expect(applySV(["a", "b"], SV.arrayRemove("a"))).toEqual(["b"]);
    });
    it("없는 것을 빼도 그대로", () => {
      expect(applySV(["a"], SV.arrayRemove("z"))).toEqual(["a"]);
    });
    it("원래 배열을 건드리지 않는다", () => {
      const orig = ["a"];
      applySV(orig, SV.arrayUnion("b"));
      expect(orig).toEqual(["a"]);
    });
    it("한 번에 여러 개", () => {
      expect(applySV([], SV.arrayUnion("a", "b"))).toEqual(["a", "b"]);
      expect(applySV(["a", "b", "c"], SV.arrayRemove("a", "c"))).toEqual(["b"]);
    });
  });
});

describe("날짜를 DB 가 받는 형태로", () => {
  it("Date 를 ISO 로", () => {
    expect(isoOf(new Date("2026-05-01T12:00:00Z"))).toBe("2026-05-01T12:00:00.000Z");
  });

  it("문자열도 받는다", () => {
    expect(isoOf("2026-05-01T12:00:00Z")).toBe("2026-05-01T12:00:00.000Z");
  });

  it("지시가 들어오면 지금 시각으로", () => {
    const at = new Date("2026-05-01T12:00:00Z");
    expect(isoOf(SV.serverTimestamp(), at)).toBe("2026-05-01T12:00:00.000Z");
  });

  it("백업 JSON 의 {seconds} 형태", () => {
    expect(isoOf({ seconds: 1777000000 })).toBe(new Date(1777000000000).toISOString());
  });

  it("예전 Firestore Timestamp 객체", () => {
    expect(isoOf({ toDate: () => new Date("2026-05-01T12:00:00Z") }))
      .toBe("2026-05-01T12:00:00.000Z");
  });

  it("빈 값은 null", () => {
    expect(isoOf(null)).toBeNull();
    expect(isoOf(undefined)).toBeNull();
    expect(isoOf("")).toBeNull();
  });

  it("말이 안 되는 값에 'Invalid Date' 를 저장하지 않는다", () => {
    expect(isoOf("어제쯤")).toBeNull();
    expect(isoOf(new Date("x"))).toBeNull();
    expect(isoOf({})).toBeNull();
    expect(isoOf({ toDate: () => "날짜아님" })).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { MEDALS, medalStats, earnedMedals, medalProgress } from "./medals";

describe("메달 수 세기", () => {
  it("접속일 목록의 길이를 센다", () => {
    expect(medalStats({ loginDays: ["2026-05-01", "2026-05-02"] }).login).toBe(2);
  });

  it("편지 수를 센다", () => {
    expect(medalStats({ letterCount: 4 }).letter).toBe(4);
  });

  it("값이 없으면 0 (새로 가입한 사람)", () => {
    expect(medalStats(null)).toEqual({ login: 0, letter: 0 });
    expect(medalStats({})).toEqual({ login: 0, letter: 0 });
  });

  it("이상한 값이 저장돼 있어도 숫자를 준다", () => {
    // 예전에 NaN 이 저장될 수 있었던 자리다. 화면에 NaN 이 찍히면 안 된다
    expect(medalStats({ loginDays: "배열아님", letterCount: NaN })).toEqual({ login: 0, letter: 0 });
    expect(medalStats({ letterCount: "4" }).letter).toBe(0);
    expect(medalStats({ letterCount: -3 }).letter).toBe(0);
    expect(medalStats({ letterCount: 2.7 }).letter).toBe(2);
  });
});

describe("받은 메달", () => {
  it("기준을 넘긴 것만 준다", () => {
    const got = earnedMedals({ loginDays: Array(10).fill("d"), letterCount: 1 });
    expect(got.map((m) => m.id)).toEqual(["login3", "login10", "letter1"]);
  });

  it("아무것도 없으면 빈 목록", () => {
    expect(earnedMedals(null)).toEqual([]);
  });

  it("기준에 딱 맞으면 받는다", () => {
    expect(earnedMedals({ loginDays: Array(3).fill("d") }).map((m) => m.id)).toEqual(["login3"]);
  });

  it("하나 부족하면 못 받는다", () => {
    expect(earnedMedals({ loginDays: Array(2).fill("d") })).toEqual([]);
  });

  it("전부 채우면 여섯 개", () => {
    const all = earnedMedals({ loginDays: Array(30).fill("d"), letterCount: 30 });
    expect(all).toHaveLength(MEDALS.length);
  });
});

describe("진행 막대", () => {
  it("목표까지의 비율을 준다", () => {
    const m = MEDALS.find((x) => x.id === "login10")!;
    expect(medalProgress({ loginDays: Array(5).fill("d") }, m)).toEqual({ value: 5, goal: 10, ratio: 0.5 });
  });

  it("목표를 넘겨도 100% 를 넘지 않는다", () => {
    const m = MEDALS.find((x) => x.id === "login3")!;
    expect(medalProgress({ loginDays: Array(99).fill("d") }, m).ratio).toBe(1);
  });

  it("아직 아무것도 안 했으면 0", () => {
    const m = MEDALS.find((x) => x.id === "letter1")!;
    expect(medalProgress(null, m)).toEqual({ value: 0, goal: 1, ratio: 0 });
  });
});

describe("메달 목록 자체", () => {
  it("id 가 겹치지 않는다 (React key 가 겹치면 화면이 섞인다)", () => {
    expect(new Set(MEDALS.map((m) => m.id)).size).toBe(MEDALS.length);
  });

  it("목표가 오름차순이다 (진행 막대 순서가 뒤바뀌지 않게)", () => {
    for (const type of ["login", "letter"] as const) {
      const goals = MEDALS.filter((m) => m.type === type).map((m) => m.goal);
      expect(goals).toEqual([...goals].sort((a, b) => a - b));
    }
  });

  it("목표가 1 이상이다", () => {
    for (const m of MEDALS) expect(m.goal).toBeGreaterThan(0);
  });
});

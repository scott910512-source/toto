import { describe, it, expect } from "vitest";
import { babyAge, dday, isValidYmd, daysBetween, clampMinutes, toDate, ymd } from "./dates";

const D = (s: string) => new Date(`${s}T09:00:00`);

describe("isValidYmd", () => {
  it("형식과 실제 존재 여부를 모두 본다", () => {
    expect(isValidYmd("2026-12-14")).toBe(true);
    expect(isValidYmd("2026-13-01")).toBe(false);  // 13월
    expect(isValidYmd("2026-02-30")).toBe(false);  // 2월 30일
    expect(isValidYmd("2026-2-3")).toBe(false);    // 0 안 채움
    expect(isValidYmd("")).toBe(false);
  });
});

describe("daysBetween", () => {
  it("시각과 무관하게 날짜 차이만 센다", () => {
    expect(daysBetween(new Date("2026-09-17T23:59:00"), new Date("2026-09-18T00:01:00"))).toBe(1);
    expect(daysBetween(new Date("2026-09-17T01:00:00"), new Date("2026-09-17T23:00:00"))).toBe(0);
  });
});

describe("babyAge", () => {
  it("출생일이 있으면 생후 일수", () => {
    const a = babyAge({ birthDate: "2026-08-10" }, D("2026-09-27"));
    expect(a.mode).toBe("born");
    if (a.mode === "born") expect(a.days).toBe(48);
  });
  it("출생일이 미래면 아직 임신 중으로 본다", () => {
    const a = babyAge({ birthDate: "2027-03-18", dueDate: "2027-03-20" }, D("2026-09-27"));
    expect(a.mode).toBe("pregnant");
  });
  it("예정일만 있으면 임신 주수", () => {
    const a = babyAge({ dueDate: "2026-12-14" }, D("2026-09-27"));
    expect(a.mode).toBe("pregnant");
    if (a.mode === "pregnant") {
      expect(a.daysLeft).toBe(78);
      expect(a.gaWeeks).toBe(28);
      expect(a.label).toBe("임신 28주 6일");
    }
  });
  it("아무것도 없으면 unknown", () => {
    expect(babyAge({}).mode).toBe("unknown");
  });
  it("잘못된 날짜는 무시한다", () => {
    expect(babyAge({ dueDate: "2026-13-45" }).mode).toBe("unknown");
  });
});

describe("dday", () => {
  it("출생 전에는 D-", () => {
    expect(dday({ dueDate: "2026-12-14" }, D("2026-09-27"))).toBe("D-78");
  });
  it("예정일 당일은 D-DAY", () => {
    expect(dday({ dueDate: "2026-12-14" }, D("2026-12-14"))).toBe("D-DAY");
  });
  it("예정일을 넘기면 D+", () => {
    expect(dday({ dueDate: "2026-12-14" }, D("2026-12-17"))).toBe("D+3");
  });
  it("출생일이 들어오면 D+ 로 바뀐다", () => {
    expect(dday({ dueDate: "2026-12-14", birthDate: "2026-08-10" }, D("2026-09-27"))).toBe("D+48");
  });
});

describe("clampMinutes", () => {
  it("24시간을 넘는 이상값을 잘라낸다", () => {
    expect(clampMinutes(29710909)).toBe(1440);
    expect(clampMinutes(-5)).toBe(0);
    expect(clampMinutes(480)).toBe(480);
  });
});

describe("toDate / ymd", () => {
  it("Firestore 백업의 {seconds} 형태를 받아준다", () => {
    const d = toDate({ seconds: 1780769095, nanoseconds: 0 });
    expect(d).toBeInstanceOf(Date);
    expect(ymd(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("빈 값은 null", () => {
    expect(toDate("")).toBeNull();
    expect(toDate(null)).toBeNull();
    expect(toDate("어쩌구")).toBeNull();
  });
});

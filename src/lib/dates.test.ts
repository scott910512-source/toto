import { describe, it, expect } from "vitest";
import { babyAge, dday, isValidYmd, daysBetween, clampMinutes, toDate, ymd, isSameDay, fmtTime, fmtDate, fmtDateTime, ago } from "./dates";

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

describe("화면에 찍히는 날짜·시간 글자", () => {
  it("예전 Firestore Timestamp 객체도 받아준다 (오래된 백업 가져오기)", () => {
    const stamp = { toDate: () => new Date("2026-05-01T10:00:00") };
    expect(ymd(stamp)).toBe("2026-05-01");
  });

  it("{seconds} 형태도 받아준다", () => {
    expect(ymd({ seconds: Math.floor(new Date("2026-05-01T10:00:00").getTime() / 1000) }))
      .toBe("2026-05-01");
  });

  it("망가진 값은 null 로 (화면에 Invalid Date 가 찍히지 않게)", () => {
    expect(toDate("어제")).toBeNull();
    expect(toDate({})).toBeNull();
    expect(toDate(new Date("x"))).toBeNull();
    expect(fmtTime("어제")).toBe("-");
    expect(fmtDate(null)).toBe("-");
    expect(fmtDateTime(undefined)).toBe("-");
  });

  it("같은 날 판정은 시각을 보지 않는다", () => {
    expect(isSameDay("2026-05-01T00:01:00", "2026-05-01T23:59:00")).toBe(true);
    expect(isSameDay("2026-05-01T23:59:00", "2026-05-02T00:01:00")).toBe(false);
  });

  it("값이 없으면 같은 날이 아니다 (빈 기록끼리 묶이지 않게)", () => {
    expect(isSameDay(null, null)).toBe(false);
    expect(isSameDay(null, "2026-05-01")).toBe(false);
  });

  it("경과 시간을 분까지 보여준다", () => {
    const now = new Date("2026-05-01T12:00:00");
    expect(ago("2026-05-01T11:59:30", now)).toBe("방금 전");
    expect(ago("2026-05-01T11:20:00", now)).toBe("40분 전");
    expect(ago("2026-05-01T09:25:00", now)).toBe("2시간 35분 전");
    expect(ago("2026-04-28T12:00:00", now)).toBe("3일 전");
  });

  it("기기 시계가 앞서 있어도 '-3분 전' 이 안 나온다", () => {
    const now = new Date("2026-05-01T12:00:00");
    expect(ago("2026-05-01T12:03:00", now)).toBe("방금 전");
  });

  it("값이 없으면 빈 문자열 (기록 없음 자리에 '-' 가 겹치지 않게)", () => {
    expect(ago(null)).toBe("");
  });
});

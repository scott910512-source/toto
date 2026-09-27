import type { BabyInfo, BabyAge } from "@/types/models";

/** 임신 기간을 40주(280일)로 본다 */
export const GESTATION_DAYS = 280;

export const pad2 = (n: number): string => String(n).padStart(2, "0");

export function toDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "object" && v !== null) {
    // 예전 Firestore Timestamp 객체 (오래된 백업을 가져올 때 들어온다)
    const maybe = v as { toDate?: unknown; seconds?: unknown };
    if (typeof maybe.toDate === "function") {
      const d = (maybe.toDate as () => unknown)();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
    // 백업 JSON 으로 넘어오는 {seconds, nanoseconds} 형태
    if ("seconds" in maybe) {
      return typeof maybe.seconds === "number" ? new Date(maybe.seconds * 1000) : null;
    }
  }
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d;
}

/** 시각을 떼고 날짜만 남긴다 — 오전/오후에 따라 하루가 틀어지는 걸 막는다 */
export const midnight = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function daysBetween(from: Date, to: Date): number {
  return Math.round((midnight(to).getTime() - midnight(from).getTime()) / 86_400_000);
}

export function ymd(v: unknown): string {
  const d = toDate(v);
  return d ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` : "";
}

export function fmtDot(v: unknown): string {
  const d = toDate(v);
  return d ? `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}` : "";
}

/** 같은 날인지 — 시각은 보지 않는다 */
export function isSameDay(a: unknown, b: unknown): boolean {
  const x = ymd(a), y = ymd(b);
  return x !== "" && x === y;
}

/** 24시간제 대신 '오후 3:20' 처럼 (한국에서 읽기 편한 쪽) */
export function fmtTime(v: unknown): string {
  const d = toDate(v);
  return d ? d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "-";
}

/** '9월 27일' */
export function fmtDate(v: unknown): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "-";
}

export function fmtDateTime(v: unknown): string {
  const d = toDate(v);
  return d ? `${fmtDate(d)} ${fmtTime(d)}` : "-";
}

/**
 * 얼마나 지났는지 사람이 읽는 말로.
 * 수유·수면 간격을 눈으로 가늠하는 데 쓰이므로, 분 단위까지 보여준다.
 * 아직 오지 않은 시각은 "방금 전" 으로 뭉갠다 — 기기 시계가 조금 어긋나도
 * "-3분 전" 같은 이상한 글자가 나오지 않게.
 */
export function ago(v: unknown, now: Date = new Date()): string {
  const d = toDate(v);
  if (!d) return "";
  const m = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 ${m % 60}분 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** YYYY-MM-DD 이면서 실제로 존재하는 날짜인지 */
export function isValidYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** <input type="datetime-local"> 값으로 변환 */
export function toLocalInput(v: unknown): string {
  const d = toDate(v) ?? new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export const fromLocalInput = (s: string): Date => (s ? new Date(s) : new Date());

/**
 * 아기 나이 계산.
 * 출생일이 있고 오늘 이후가 아니면 '출생 후', 없으면 예정일 기준 '임신 중'.
 * 출생일이 미래면 아직 안 태어난 것으로 본다(오타 방어).
 */
export function babyAge(baby: BabyInfo, now: Date = new Date()): BabyAge {
  if (baby.birthDate && isValidYmd(baby.birthDate)) {
    const born = new Date(`${baby.birthDate}T00:00:00`);
    const days = daysBetween(born, now);
    if (days >= 0) {
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30.44);
      return { mode: "born", days, weeks, months, label: `생후 ${days}일 (${weeks}주 / 약 ${months}개월)` };
    }
  }
  if (baby.dueDate && isValidYmd(baby.dueDate)) {
    const due = new Date(`${baby.dueDate}T00:00:00`);
    const daysLeft = daysBetween(now, due);
    const gaDays = GESTATION_DAYS - daysLeft;
    const w = Math.floor(gaDays / 7);
    const d = gaDays % 7;
    return {
      mode: "pregnant", gaDays, gaWeeks: w, daysLeft,
      label: gaDays > 0 ? `임신 ${w}주 ${d}일` : "출산 예정 정보를 확인하세요",
    };
  }
  return { mode: "unknown", label: "아기 정보를 설정하세요" };
}

/** 화면에 띄울 D-day 문자열 (출생 전 D-, 출생 후 D+) */
export function dday(baby: BabyInfo, when: unknown = new Date()): string {
  const d = toDate(when);
  if (!d) return "";
  if (baby.birthDate && isValidYmd(baby.birthDate)) {
    const n = daysBetween(new Date(`${baby.birthDate}T00:00:00`), d);
    return n >= 0 ? `D+${n}` : "";
  }
  if (baby.dueDate && isValidYmd(baby.dueDate)) {
    const n = daysBetween(d, new Date(`${baby.dueDate}T00:00:00`));
    if (n > 0) return `D-${n}`;
    if (n === 0) return "D-DAY";
    return `D+${-n}`;
  }
  return "";
}

/** 24시간을 넘는 값은 잘못 저장된 것으로 보고 잘라낸다 */
export const clampMinutes = (m: number): number => Math.max(0, Math.min(1440, m));

export function hm(mins: number): string {
  const m = clampMinutes(mins);
  return `${Math.floor(m / 60)}시간 ${Math.round(m % 60)}분`;
}

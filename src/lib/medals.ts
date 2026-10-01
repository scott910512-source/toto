/* 🏅 메달 — 접속 일수와 편지 횟수로 준다.
   할머니·이모가 매일 들여다보게 만드는 장치라, 숫자가 틀리면 바로 눈에 띈다. */

export type MedalType = "login" | "letter";

export interface Medal {
  id: string;
  icon: string;
  name: string;
  type: MedalType;
  goal: number;
  desc: string;
}

export const MEDALS: readonly Medal[] = [
  { id: "login3", icon: "🌱", name: "첫 발걸음", type: "login", goal: 3, desc: "3일 접속" },
  { id: "login10", icon: "🔥", name: "꾸준한 사랑", type: "login", goal: 10, desc: "10일 접속" },
  { id: "login30", icon: "👑", name: "한결같은 마음", type: "login", goal: 30, desc: "30일 접속" },
  { id: "letter1", icon: "💌", name: "첫 편지", type: "letter", goal: 1, desc: "편지 1회" },
  { id: "letter10", icon: "✍️", name: "편지왕", type: "letter", goal: 10, desc: "편지 10회" },
  { id: "letter30", icon: "🏆", name: "마음 부자", type: "letter", goal: 30, desc: "편지 30회" },
];

export interface MedalStats { login: number; letter: number }

/** 접속일은 날짜 목록의 길이. 같은 날 여러 번 들어와도 하루로 센다(DB 가 보장). */
export function medalStats(u: { loginDays?: unknown; letterCount?: unknown } | null | undefined): MedalStats {
  const days = u && Array.isArray(u.loginDays) ? u.loginDays.length : 0;
  const letters = u && typeof u.letterCount === "number" && Number.isFinite(u.letterCount)
    ? Math.max(0, Math.floor(u.letterCount))
    : 0;
  return { login: days, letter: letters };
}

export function earnedMedals(u: Parameters<typeof medalStats>[0]): Medal[] {
  const s = medalStats(u);
  return MEDALS.filter((m) => s[m.type] >= m.goal);
}

/** 다음 메달까지 얼마나 남았나 — 진행 막대에 쓴다 */
export function medalProgress(u: Parameters<typeof medalStats>[0], m: Medal): { value: number; goal: number; ratio: number } {
  const s = medalStats(u);
  const value = Math.min(s[m.type], m.goal);
  return { value, goal: m.goal, ratio: m.goal > 0 ? value / m.goal : 0 };
}

/** 앱 전체에서 쓰는 도메인 타입 */

export type Role = "admin" | "parent" | "family" | "gallery_only";
/** 화면에서 쓰던 예전 등급 이름 (호환용) */
export type LegacyRole = "admin" | "member" | "viewer";

export type Visibility = "public" | "private";

export type RecordType =
  | "feeding" | "sleep" | "diaper" | "pump" | "solid" | "med"
  | "growth" | "health" | "milestone" | "letter" | "memo" | "prenatal";

export interface Family {
  id: string;
  name: string;
  inviteCode: string | null;
  baby: BabyInfo;
  createdAt: string;
}

export interface BabyInfo {
  name?: string;
  /** 출생일 (YYYY-MM-DD). 비어 있으면 임신 중 */
  birthDate?: string;
  /** 출산 예정일 (YYYY-MM-DD) */
  dueDate?: string;
  sex?: "male" | "female" | "";
  vaccines?: Record<string, boolean>;
  units?: { vol?: "ml" | "oz" };
}

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
  approved: boolean;
  disabled: boolean;
  familyId: string | null;
  loginDays: string[];
  letterCount: number;
  createdAt: string;
}

export interface BabyRecord {
  id: string;
  type: RecordType;
  /** 기록 대상 시각 */
  at: string;
  createdAt: string;
  createdBy: string | null;
  creatorName: string | null;
  /** 타입마다 다른 상세값 (amount, durationMin, title …) */
  [key: string]: unknown;
}

export interface Photo {
  id: string;
  albumId: string | null;
  storagePath: string;
  previewPath: string | null;
  thumbPath: string | null;
  /** 표시용 서명 URL — 필요할 때 주입된다 */
  url: string | null;
  thumbUrl: string | null;
  caption: string;
  category: "baby" | "ultrasound" | "milestone";
  uploaderName: string | null;
  uploadedBy: string | null;
  createdAt: string;
  takenAt: string | null;
  people: string[];
  place: string;
  gps: { lat: number; lng: number } | null;
  vis: Visibility;
  likedBy: string[];
  favorite: boolean;
  width: number | null;
  height: number | null;
  bytes: number | null;
}

export interface Album {
  id: string;
  title: string;
  emoji: string;
  description: string;
  coverMediaId: string | null;
  eventDate: string | null;
  sortOrder: number;
  createdAt: string;
}

/** 아기 나이 — 출생 전/후를 하나로 다룬다 */
export type BabyAge =
  | { mode: "pregnant"; gaDays: number; gaWeeks: number; daysLeft: number; label: string }
  | { mode: "born"; days: number; weeks: number; months: number; label: string }
  | { mode: "unknown"; label: string };

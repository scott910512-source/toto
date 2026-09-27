import type { Album, BabyRecord, Photo, Profile, Role, LegacyRole, Visibility } from "@/types/models";

/* DB 컬럼(snake_case) ↔ 화면 모델(camelCase) 변환.
   여기만 DB 모양을 알고, 화면은 모델만 본다. */

export const ROLE_TO_LEGACY: Record<Role, LegacyRole> = {
  admin: "admin", parent: "member", family: "viewer", gallery_only: "viewer",
};
export const LEGACY_TO_ROLE: Record<LegacyRole, Role> = {
  admin: "admin", member: "parent", viewer: "gallery_only",
};

type Row = Record<string, unknown>;
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function toProfile(r: Row): Profile {
  return {
    id: str(r.id),
    email: (r.email as string) ?? null,
    name: (r.display_name as string) ?? null,
    role: (str(r.role, "gallery_only") as Role),
    approved: r.approved === true,
    disabled: r.disabled === true,
    familyId: (r.family_id as string) ?? null,
    loginDays: arr<string>(r.login_days),
    letterCount: typeof r.letter_count === "number" ? r.letter_count : 0,
    createdAt: str(r.created_at),
  };
}

/** records 는 공통 컬럼 + data(jsonb) 구조라, data 를 펼쳐서 돌려준다 */
export function toRecord(r: Row): BabyRecord {
  const data = (r.data && typeof r.data === "object" ? r.data : {}) as Row;
  return {
    id: str(r.id),
    type: str(r.type) as BabyRecord["type"],
    at: str(r.at),
    createdAt: str(r.created_at),
    createdBy: (r.created_by as string) ?? null,
    creatorName: (r.creator_name as string) ?? null,
    ...data,
  };
}

/** 화면 모델 → DB 행. 공통 컬럼이 아닌 것은 전부 data 로 보낸다 */
export function fromRecord(o: Record<string, unknown>): { row: Row; data: Row } {
  const row: Row = {};
  const data: Row = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === "id") continue;
    else if (k === "type") row.type = v;
    else if (k === "at") row.at = v;
    else if (k === "createdAt") row.created_at = v;
    else if (k === "createdBy") row.created_by = v;
    else if (k === "creatorName") row.creator_name = v;
    else data[k] = v;
  }
  return { row, data };
}

export function toPhoto(r: Row): Photo {
  return {
    id: str(r.id),
    albumId: (r.album_id as string) ?? null,
    storagePath: str(r.storage_path),
    previewPath: (r.preview_path as string) ?? null,
    thumbPath: (r.thumb_path as string) ?? null,
    url: null, thumbUrl: null,                 // 서명 URL 은 나중에 주입
    caption: str(r.caption),
    category: (str(r.category, "baby") as Photo["category"]),
    uploaderName: (r.uploader_name as string) ?? null,
    uploadedBy: (r.uploaded_by as string) ?? null,
    createdAt: str(r.uploaded_at),
    takenAt: (r.captured_at as string) ?? null,
    people: arr<string>(r.people),
    place: str(r.place),
    gps: (r.gps as Photo["gps"]) ?? null,
    vis: (str(r.vis, "public") as Visibility),
    likedBy: arr<string>(r.liked_by),
    favorite: r.favorite === true,
    width: num(r.width), height: num(r.height), bytes: num(r.bytes),
  };
}

const PHOTO_COLS: Record<string, string> = {
  albumId: "album_id", storagePath: "storage_path", previewPath: "preview_path",
  thumbPath: "thumb_path", caption: "caption", category: "category",
  uploaderName: "uploader_name", uploadedBy: "uploaded_by",
  takenAt: "captured_at", createdAt: "uploaded_at", people: "people",
  place: "place", gps: "gps", vis: "vis", likedBy: "liked_by",
  favorite: "favorite", width: "width", height: "height", bytes: "bytes", mime: "mime",
};

export function fromPhoto(o: Record<string, unknown>): Row {
  const row: Row = {};
  for (const [k, v] of Object.entries(o)) {
    const col = PHOTO_COLS[k];
    if (col) row[col] = v;
  }
  return row;
}

export function toAlbum(r: Row): Album {
  return {
    id: str(r.id),
    title: str(r.title),
    emoji: str(r.emoji, "📁"),
    description: str(r.description),
    coverMediaId: (r.cover_media_id as string) ?? null,
    eventDate: (r.event_date as string) ?? null,
    sortOrder: typeof r.sort_order === "number" ? r.sort_order : 0,
    createdAt: str(r.created_at),
  };
}

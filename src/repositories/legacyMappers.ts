/* ============================================================================
   DB 행(snake_case) ↔ 화면 객체(camelCase) 변환.

   app.html 의 모든 읽기·쓰기가 이 표를 지나간다. 컬럼 이름 하나만 틀려도
   기록이 조용히 비어서 저장되는데, 지금까지 테스트가 없었다.
   여기로 옮기고 테스트를 붙였다.

   역할 이름이 두 가지인 이유
     DB   : admin / parent / family / gallery_only
     화면 : admin / member / viewer        ← Firebase 시절부터 쓰던 이름
   화면 코드 수천 줄이 이 이름을 쓰고 있어서, 한 번에 바꾸면 위험하다.
   그래서 변환은 여기 한 곳에서만 한다. roleDb 로 원래 값도 함께 넘긴다.
   ========================================================================== */
import { isSV, isoOf } from "@/lib/fieldValues";

type Row = Record<string, unknown>;

export const ROLE_TO_DB: Record<string, string> = {
  admin: "admin", member: "parent", viewer: "gallery_only",
};
export const ROLE_FROM_DB: Record<string, string> = {
  admin: "admin", parent: "member", family: "viewer", gallery_only: "viewer",
};

/** 공통 컬럼. 이 목록에 없는 것은 records.data(jsonb) 로 들어간다 */
export const REC_COLS = ["type", "at", "created_at", "created_by", "creator_name"] as const;

export interface Mapper {
  table: string;
  fromDb: (r: Row) => Row;
  /** 화면 객체 → { row: 컬럼, data: jsonb (없으면 null) } */
  split: (o: Row) => { row: Row; data: Row | null };
}

const records: Mapper = {
  table: "records",
  fromDb: (r) => ({
    id: r.id, type: r.type, at: r.at, createdAt: r.created_at,
    createdBy: r.created_by, creatorName: r.creator_name,
    ...(r.data && typeof r.data === "object" ? (r.data as Row) : {}),
  }),
  split: (o) => {
    const row: Row = {}, data: Row = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === "id") continue;
      else if (k === "type") row.type = v;
      else if (k === "at") row.at = isoOf(v);
      else if (k === "createdAt") row.created_at = isoOf(v);
      else if (k === "createdBy") row.created_by = v;
      else if (k === "creatorName") row.creator_name = v;
      // data 안의 날짜형 값도 ISO 로 (백업 가져오기에서 {seconds} 로 들어온다)
      else data[k] = isSV(v) ? v : (v && typeof v === "object" && "seconds" in (v as Row) ? isoOf(v) : v);
    }
    return { row, data };
  },
};

const PHOTO_COLS: Record<string, string> = {
  albumId: "album_id",
  storagePath: "storage_path", previewPath: "preview_path", thumbPath: "thumb_path",
  caption: "caption", category: "category", uploaderName: "uploader_name",
  uploadedBy: "uploaded_by", takenAt: "captured_at", createdAt: "uploaded_at",
  people: "people", place: "place", gps: "gps", vis: "vis", likedBy: "liked_by",
  favorite: "favorite", width: "width", height: "height", bytes: "bytes", mime: "mime",
};

const photos: Mapper = {
  table: "media",
  fromDb: (r) => ({
    id: r.id,
    albumId: r.album_id || null,
    // 서명 URL 은 조회 뒤에 주입된다 (__url / __thumb)
    url: r.__url || null,
    thumbUrl: r.__thumb || r.__url || null,
    storagePath: r.storage_path, previewPath: r.preview_path, thumbPath: r.thumb_path,
    caption: r.caption || "", category: r.category || "baby",
    uploaderName: r.uploader_name, uploadedBy: r.uploaded_by,
    createdAt: r.uploaded_at, takenAt: r.captured_at,
    people: r.people || [], place: r.place || "", gps: r.gps || null,
    vis: r.vis || "public", likedBy: r.liked_by || [], favorite: !!r.favorite,
    width: r.width, height: r.height, bytes: r.bytes, type: r.type,
  }),
  split: (o) => {
    const row: Row = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === "id" || k === "url" || k === "thumbUrl") continue;
      const c = PHOTO_COLS[k];
      if (!c) continue;
      row[c] = (c === "captured_at" || c === "uploaded_at") ? isoOf(v) : v;
    }
    return { row, data: null };
  },
};

const ALBUM_COLS: Record<string, string> = {
  title: "title", emoji: "emoji", description: "description",
  coverMediaId: "cover_media_id", eventDate: "event_date",
  sortOrder: "sort_order", createdBy: "created_by",
};

const albums: Mapper = {
  table: "albums",
  fromDb: (r) => ({
    id: r.id, title: r.title, emoji: r.emoji || "📁", description: r.description || "",
    coverMediaId: r.cover_media_id, eventDate: r.event_date,
    sortOrder: r.sort_order || 0, createdBy: r.created_by, createdAt: r.created_at,
  }),
  split: (o) => {
    const row: Row = {};
    for (const [k, v] of Object.entries(o)) if (ALBUM_COLS[k]) row[ALBUM_COLS[k] as string] = v;
    return { row, data: null };
  },
};

const users: Mapper = {
  table: "profiles",
  fromDb: (r) => ({
    uid: r.id, id: r.id, email: r.email, name: r.display_name,
    role: ROLE_FROM_DB[String(r.role)] || "viewer", roleDb: r.role,
    approved: r.approved, disabled: r.disabled,
    createdAt: r.created_at,
    loginDays: r.login_days || [], letterCount: r.letter_count || 0,
  }),
  split: (o) => {
    const row: Row = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === "name") row.display_name = v;
      else if (k === "role") row.role = ROLE_TO_DB[String(v)] || v;
      else if (k === "approved") row.approved = v;
      else if (k === "disabled") row.disabled = v;
      else if (k === "email") row.email = v;
      else if (k === "loginDays") row.login_days = v;
      else if (k === "letterCount") row.letter_count = v;
    }
    return { row, data: null };
  },
};

export const MAPPERS: Record<string, Mapper> = { records, photos, albums, users };

/** where/orderBy 에서 쓰는 필드 → 컬럼 이름 */
export const FIELD_COL: Record<string, Record<string, string>> = {
  records: { type: "type", at: "at", createdAt: "created_at", createdBy: "created_by" },
  photos: {
    albumId: "album_id", category: "category", takenAt: "captured_at",
    createdAt: "uploaded_at", uploadedBy: "uploaded_by", vis: "vis", favorite: "favorite",
  },
  albums: { sortOrder: "sort_order", createdBy: "created_by", createdAt: "created_at" },
  users: { role: "role", approved: "approved" },
};

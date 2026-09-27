import { fetchSigned } from "./storage";
import { toDate } from "./dates";
import type { Album, BabyInfo, BabyRecord, Photo, Profile } from "@/types/models";

/* 백업 형식 v3.
   v2 까지는 사진 메타데이터만 담겨서, 복원하면 사진이 전부 사라졌다.
   v3 는 원본을 base64 로 실제로 담고, 담긴 수를 세어 무결성을 확인한다. */
export const BACKUP_VERSION = 3;

export interface BackupSummary {
  records: number;
  photos: number;
  photosExpected: number;
  albums: number;
  users: number;
  failedPhotoIds: string[];
}

export interface BackupFile {
  exportedAt: string;
  version: number;
  baby: BabyInfo;
  records: BabyRecord[];
  photos: Array<Photo & { url: string }>;
  albums: Album[];
  users: Array<Partial<Profile>>;
  summary: BackupSummary;
}

export interface Progress { label: string; done: number; total: number }

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("사진을 읽지 못했어요."));
    fr.readAsDataURL(blob);
  });

/** 사진 원본을 받아 base64 로 만든다. 실패하면 null. */
export async function photoToDataUrl(p: Photo): Promise<string | null> {
  const path = p.storagePath || p.previewPath || p.thumbPath;
  if (!path) return null;
  try {
    const res = await fetchSigned(path);
    return await blobToDataUrl(await res.blob());
  } catch {
    return null;
  }
}

export async function buildBackup(input: {
  baby: BabyInfo;
  records: BabyRecord[];
  photos: Photo[];
  albums: Album[];
  users: Array<Partial<Profile>>;
  onProgress?: (p: Progress) => void;
  toDataUrl?: (p: Photo) => Promise<string | null>;
}): Promise<BackupFile> {
  const { baby, records, albums, users } = input;
  const conv = input.toDataUrl ?? photoToDataUrl;
  const metas = input.photos;

  const photos: Array<Photo & { url: string }> = [];
  const failedPhotoIds: string[] = [];

  for (let i = 0; i < metas.length; i++) {
    const p = metas[i]!;
    input.onProgress?.({ label: "사진 담는 중", done: i, total: metas.length });
    // 한 장이 실패해도 나머지는 계속 담는다 (중간에 멈추면 백업이 통째로 날아간다)
    let url: string | null = null;
    try { url = await conv(p); } catch { url = null; }
    if (url) photos.push({ ...p, url });
    else failedPhotoIds.push(p.id);
  }
  input.onProgress?.({ label: "파일 만드는 중", done: metas.length, total: metas.length });

  return {
    exportedAt: new Date().toISOString(),
    version: BACKUP_VERSION,
    baby,
    records: [...records].sort((a, b) => (toDate(a.at)?.getTime() ?? 0) - (toDate(b.at)?.getTime() ?? 0)),
    photos,
    albums,
    users,
    summary: {
      records: records.length,
      photos: photos.length,
      photosExpected: metas.length,
      albums: albums.length,
      users: users.length,
      failedPhotoIds,
    },
  };
}

/** 담긴 사진 수가 DB 수와 맞는지 — 사용자에게 그대로 알려준다 */
export function verifyBackup(b: BackupFile): { ok: boolean; message: string } {
  const s = b.summary;
  const withImage = b.photos.filter((p) => typeof p.url === "string" && p.url.startsWith("data:")).length;
  if (withImage !== s.photosExpected) {
    return {
      ok: false,
      message: `⚠️ 사진 ${withImage}/${s.photosExpected}장만 담겼어요. ${s.photosExpected - withImage}장 실패 — 다시 시도해주세요.`,
    };
  }
  return {
    ok: true,
    message: `백업 완료 · 기록 ${s.records}건 · 사진 ${withImage}/${s.photosExpected}장 · 앨범 ${s.albums}개`,
  };
}

/** 복원 전 검사 — 무엇이 들어있는지, 사진이 실제로 있는지 */
export function inspectBackup(raw: unknown): {
  ok: boolean; reason?: string; version: number;
  records: number; photos: number; photosWithImage: number; albums: number; users: number;
  baby: BabyInfo | null;
} {
  const b = raw as Partial<BackupFile>;
  const base = { version: 0, records: 0, photos: 0, photosWithImage: 0, albums: 0, users: 0, baby: null };
  if (!b || typeof b !== "object") return { ok: false, reason: "파일을 읽을 수 없어요.", ...base };
  if (!Array.isArray(b.records) && !Array.isArray(b.photos))
    return { ok: false, reason: "백업 파일 형식이 아니에요.", ...base };

  const photos = Array.isArray(b.photos) ? b.photos : [];
  const withImage = photos.filter(
    (p) => typeof (p as { url?: unknown }).url === "string" && String((p as { url: string }).url).startsWith("data:"),
  ).length;

  return {
    ok: true,
    version: typeof b.version === "number" ? b.version : 1,
    records: Array.isArray(b.records) ? b.records.length : 0,
    photos: photos.length,
    photosWithImage: withImage,
    albums: Array.isArray(b.albums) ? b.albums.length : 0,
    users: Array.isArray(b.users) ? b.users.length : 0,
    baby: (b.baby as BabyInfo) ?? null,
  };
}

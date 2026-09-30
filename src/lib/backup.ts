import { fetchSigned } from "./storageDefault";
import { toDate } from "./dates";
import type { Album, BabyInfo, BabyRecord, Photo, Profile } from "@/types/models";
import { BACKUP_VERSION } from "./backupTypes";
import type { BackupFile } from "./backupTypes";

/* 백업 형식 v3.
   v2 까지는 사진 메타데이터만 담겨서, 복원하면 사진이 전부 사라졌다.
   v3 는 원본을 base64 로 실제로 담고, 담긴 수를 세어 무결성을 확인한다. */
export { BACKUP_VERSION } from "./backupTypes";
export { verifyBackup, inspectBackup } from "./backupInspect";

export type { BackupSummary, BackupFile } from "./backupTypes";

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

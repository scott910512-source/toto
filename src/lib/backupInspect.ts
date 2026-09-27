/* 백업 파일을 들여다보는 순수 함수.
   사진을 실제로 받아오는 부분(Storage 접근)과 분리해 둔다 —
   app.html 도 이 검사를 쓰기 때문에, 불러오는 것만으로 Supabase 클라이언트가
   생기면 안 된다. */
import type { BackupFile, BabyInfo } from "./backupTypes";

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

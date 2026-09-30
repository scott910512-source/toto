import { sb } from "@/lib/supabase";
import { signPaths, removeFiles } from "@/lib/storageDefault";
import { toPhoto, fromPhoto } from "./mappers";
import type { Photo } from "@/types/models";

/** 표시용 서명 URL 을 붙여서 돌려준다 (비공개 버킷이라 필수) */
async function withUrls(rows: Record<string, unknown>[]): Promise<Photo[]> {
  const photos = rows.map(toPhoto);
  const map = await signPaths(photos.flatMap((p) => [p.thumbPath, p.previewPath, p.storagePath]));
  return photos.map((p) => ({
    ...p,
    url: map[p.previewPath ?? ""] ?? map[p.storagePath] ?? map[p.thumbPath ?? ""] ?? null,
    thumbUrl: map[p.thumbPath ?? ""] ?? map[p.previewPath ?? ""] ?? map[p.storagePath] ?? null,
  }));
}

export async function list(limit = 300): Promise<Photo[]> {
  const { data, error } = await sb()
    .from("media").select("*")
    .order("captured_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return withUrls(data ?? []);
}

/** 백업용 — 서명 URL 없이 메타데이터만 (원본은 따로 받는다) */
export async function listMeta(limit = 3000): Promise<Photo[]> {
  const { data, error } = await sb()
    .from("media").select("*").order("uploaded_at", { ascending: true }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(toPhoto);
}

export async function create(payload: Record<string, unknown>): Promise<string> {
  const { data, error } = await sb().from("media").insert(fromPhoto(payload)).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function update(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await sb().from("media").update(fromPhoto(patch)).eq("id", id);
  if (error) throw error;
}

/** 파일과 DB 행을 함께 지운다 */
export async function remove(p: Pick<Photo, "id" | "storagePath" | "previewPath" | "thumbPath">): Promise<void> {
  await removeFiles([p.storagePath, p.previewPath, p.thumbPath]);
  const { error } = await sb().from("media").delete().eq("id", p.id);
  if (error) throw error;
}

/** 좋아요는 남의 사진에도 눌러야 하므로 DB 함수를 쓴다 (media 수정 권한은 올린 사람만) */
export async function toggleLike(photoId: string): Promise<string[]> {
  const { data, error } = await sb().rpc("toggle_like", { p_media: photoId });
  if (error) throw error;
  return (data as string[]) ?? [];
}

export function watch(onData: (p: Photo[]) => void, onError?: (e: unknown) => void, limit = 300): () => void {
  let alive = true;
  const run = () => {
    list(limit).then((p) => { if (alive) onData(p); }).catch((e) => { if (alive) onError?.(e); });
  };
  run();
  const ch = sb()
    .channel(`media:${Math.random().toString(36).slice(2, 8)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "media" }, run)
    .subscribe();
  return () => { alive = false; try { sb().removeChannel(ch); } catch { /* 이미 닫힘 */ } };
}

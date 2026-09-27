import { sb } from "@/lib/supabase";
import { toRecord, fromRecord } from "./mappers";
import type { BabyRecord, RecordType } from "@/types/models";

/* 기록 읽기/쓰기는 전부 여기를 통한다. 화면은 Supabase 를 직접 만지지 않는다.
   family_id 는 DB 기본값(my_family_id())이 채우므로 여기서 넣지 않는다. */

export async function listByType(type: RecordType, limit = 200): Promise<BabyRecord[]> {
  const { data, error } = await sb()
    .from("records").select("*").eq("type", type)
    .order("at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(toRecord);
}

export async function listAll(limit = 3000): Promise<BabyRecord[]> {
  const { data, error } = await sb()
    .from("records").select("*").order("at", { ascending: true }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(toRecord);
}

export async function create(
  type: RecordType,
  payload: Record<string, unknown>,
  author: { id: string; name: string },
): Promise<string> {
  const { row, data } = fromRecord({
    ...payload,
    type,
    at: payload.at ?? new Date().toISOString(),
    createdBy: author.id,
    creatorName: author.name,
  });
  const { data: ins, error } = await sb()
    .from("records").insert({ ...row, data }).select("id").single();
  if (error) throw error;
  return (ins as { id: string }).id;
}

/** 기존 data 를 읽어 합친 뒤 저장한다 (부분 수정) */
export async function update(id: string, patch: Record<string, unknown>): Promise<void> {
  const { data: cur } = await sb().from("records").select("data").eq("id", id).maybeSingle();
  const { row, data } = fromRecord(patch);
  const merged = { ...((cur?.data as Record<string, unknown>) ?? {}), ...data };
  const { error } = await sb().from("records").update({ ...row, data: merged }).eq("id", id);
  if (error) throw error;
}

export async function remove(id: string): Promise<void> {
  const { error } = await sb().from("records").delete().eq("id", id);
  if (error) throw error;
}

/** 실시간 구독 — 변경이 생기면 다시 읽어서 알려준다 */
export function watchByType(
  type: RecordType,
  onData: (items: BabyRecord[]) => void,
  onError?: (e: unknown) => void,
  limit = 200,
): () => void {
  let alive = true;
  const run = () => {
    listByType(type, limit)
      .then((items) => { if (alive) onData(items); })
      .catch((e) => { if (alive) onError?.(e); });
  };
  run();
  const ch = sb()
    .channel(`rec:${type}:${Math.random().toString(36).slice(2, 8)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "records" }, run)
    .subscribe();
  return () => { alive = false; try { sb().removeChannel(ch); } catch { /* 이미 닫힘 */ } };
}

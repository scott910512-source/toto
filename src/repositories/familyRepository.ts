import { sb } from "@/lib/supabase";
import { toProfile, toAlbum, LEGACY_TO_ROLE } from "./mappers";
import type { Album, BabyInfo, Family, LegacyRole, Profile } from "@/types/models";

/* RLS 가 내 가족 행만 돌려주므로 조건 없이 첫 행을 쓴다 */
export async function getFamily(): Promise<Family | null> {
  const { data, error } = await sb().from("families").select("*").limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    name: (data.name as string) ?? "우리 가족",
    inviteCode: (data.invite_code as string) ?? null,
    baby: ((data.baby ?? {}) as BabyInfo),
    createdAt: (data.created_at as string) ?? "",
  };
}

export async function saveBaby(patch: BabyInfo): Promise<void> {
  const fam = await getFamily();
  if (!fam) throw new Error("가족 정보를 찾을 수 없어요. 다시 로그인해주세요.");
  const { error } = await sb()
    .from("families").update({ baby: { ...fam.baby, ...patch } }).eq("id", fam.id);
  if (error) throw error;
}

export async function listMembers(): Promise<Profile[]> {
  const { data, error } = await sb().from("profiles").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []).map(toProfile);
}

/** 관리자만 호출된다. role/approved 외의 값은 건드리지 않는다. */
export async function setRole(userId: string, legacy: LegacyRole): Promise<void> {
  const { error } = await sb().from("profiles").update({ role: LEGACY_TO_ROLE[legacy] }).eq("id", userId);
  if (error) throw error;
}

export async function setApproved(userId: string, approved: boolean): Promise<void> {
  const { error } = await sb().from("profiles").update({ approved }).eq("id", userId);
  if (error) throw error;
}

export async function setDisabled(userId: string, disabled: boolean): Promise<void> {
  const { error } = await sb().from("profiles").update({ disabled }).eq("id", userId);
  if (error) throw error;
}

/** 본인 닉네임만 바꾼다 (권한 값은 절대 건드리지 않는다) */
export async function setNickname(userId: string, name: string): Promise<void> {
  const { error } = await sb().from("profiles").update({ display_name: name }).eq("id", userId);
  if (error) throw error;
}

export async function getInviteCode(): Promise<string | null> {
  const { data, error } = await sb().rpc("my_invite_code");
  if (error) throw error;
  return (data as string) ?? null;
}

export async function resetInviteCode(): Promise<string> {
  const { data, error } = await sb().rpc("reset_invite_code");
  if (error) throw error;
  return data as string;
}

/** 가입 전에 코드가 실제로 있는지 확인 — 없는 코드로 새 가족이 생기는 걸 막는다 */
export async function inviteCodeExists(code: string): Promise<boolean> {
  const { data, error } = await sb().rpc("invite_code_exists", { p_code: code });
  if (error) throw error;
  return data === true;
}

export async function listAlbums(): Promise<Album[]> {
  const { data, error } = await sb().from("albums").select("*").order("sort_order").order("created_at");
  if (error) throw error;
  return (data ?? []).map(toAlbum);
}

export async function createAlbum(title: string, emoji: string): Promise<void> {
  const { error } = await sb().from("albums").insert({ title, emoji, sort_order: 50 });
  if (error) throw error;
}

export async function removeAlbum(id: string): Promise<void> {
  const { error } = await sb().from("albums").delete().eq("id", id);
  if (error) throw error;
}

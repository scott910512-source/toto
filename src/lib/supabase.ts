import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* 접속 정보는 빌드 시 주입한다.
   anon 키는 공개되도록 설계된 키이고, 실제 보안은 DB 의 RLS 가 담당한다.
   service_role 키는 절대 여기 넣지 않는다. */
const URL_ = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const KEY_ = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const MEDIA_BUCKET = (import.meta.env.VITE_MEDIA_BUCKET ?? "family-media").trim();

export type ConfigProblem =
  | { code: "no-url" | "bad-url" | "no-key" | "url-as-key" | "secret-key" | "bad-key"; msg: string }
  | null;

/** JWT 의 role 클레임만 들여다본다(서명 검증 아님 · 실수 방지용) */
function jwtRole(k: string): string | null {
  try {
    const p = k.split(".")[1];
    if (!p) return null;
    const json = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    return json.role ?? null;
  } catch {
    return null;
  }
}

export function diagnoseConfig(url = URL_, key = KEY_): ConfigProblem {
  if (!url) return { code: "no-url", msg: "Supabase 주소가 비어 있어요." };
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url.replace(/\/+$/, "")))
    return { code: "bad-url", msg: "Supabase 주소 형식이 올바르지 않아요. (예: https://xxxx.supabase.co)" };
  if (!key) return { code: "no-key", msg: "anon 키가 비어 있어요." };
  if (/^https?:\/\//i.test(key))
    return { code: "url-as-key", msg: "anon 키 자리에 주소를 넣으셨어요. 키는 eyJ… 또는 sb_publishable_… 입니다." };
  if (/^sb_secret_/i.test(key) || jwtRole(key) === "service_role")
    return { code: "secret-key", msg: "⛔ service_role(비밀) 키가 들어 있어요. 즉시 지우고 anon 키로 바꿔주세요." };
  const jwtOk = /^eyJ[\w-]+\.[\w-]+\.?[\w-]*$/.test(key);
  const newOk = /^sb_publishable_[\w-]{10,}$/i.test(key);
  if (!jwtOk && !newOk)
    return { code: "bad-key", msg: "anon 키 형식이 올바르지 않아요. eyJ… 또는 sb_publishable_… 이어야 합니다." };
  return null;
}

export const configProblem = diagnoseConfig();
export const isConfigured = configProblem === null;

/** 설정이 잘못되면 null. 화면에서 안내를 띄운다. */
export const supabase: SupabaseClient | null = isConfigured
  ? createClient(URL_, KEY_, {
      auth: {
        persistSession: true,      // 세션만 유지한다 (비밀번호는 저장하지 않는다)
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/** 설정이 끝난 뒤에만 쓰는 헬퍼 — null 체크를 매번 하지 않도록 */
export function sb(): SupabaseClient {
  if (!supabase) throw new Error("Supabase 설정이 필요합니다.");
  return supabase;
}

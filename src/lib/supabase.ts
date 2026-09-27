import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* 접속 정보는 빌드 시 주입한다.
   anon 키는 공개되도록 설계된 키이고, 실제 보안은 DB 의 RLS 가 담당한다.
   service_role 키는 절대 여기 넣지 않는다. */
const URL_ = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const KEY_ = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const MEDIA_BUCKET = (import.meta.env.VITE_MEDIA_BUCKET ?? "family-media").trim();

/* 진단은 순수 함수라 별도 파일에 있다 — app.html 도 같은 판정을 쓴다 */
export { diagnoseConfig, type ConfigProblem } from "./configDiagnosis";
import { diagnoseConfig as diagnose } from "./configDiagnosis";

export const configProblem = diagnose(URL_, KEY_);
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

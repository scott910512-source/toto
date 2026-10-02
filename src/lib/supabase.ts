import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* 진단은 순수 함수라 별도 파일에 있다 — app.html 도 같은 판정을 쓴다 */
export { diagnoseConfig, type ConfigProblem } from "./configDiagnosis";
import { diagnoseConfig as diagnose } from "./configDiagnosis";
import { readConfig } from "./readConfig";

/* 접속 정보를 어디서 읽나
   ─────────────────────────────────────────────────────────────────────────
   1) 빌드할 때 넣은 값 (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
   2) 없으면 supabase-config.js 가 window 에 올려둔 값

   2번이 있는 이유: app.html 이 이미 그 파일을 쓰고 있다. 같은 파일을 쓰면
   접속 정보가 두 곳으로 갈리지 않고, 저장소에 키를 넣지 않아도 된다.

   anon 키는 공개되도록 설계된 키이고, 실제 보안은 DB 의 RLS 가 담당한다.
   service_role 키는 절대 넣지 않는다 — diagnoseConfig 가 막는다. */
const cfg = readConfig(
  {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY,
    bucket: import.meta.env.VITE_MEDIA_BUCKET,
  },
  typeof window === "undefined" ? {} : (window as unknown as Record<string, unknown>),
);

export const MEDIA_BUCKET = cfg.bucket;

export const configProblem = diagnose(cfg.url, cfg.key);
export const isConfigured = configProblem === null;

/** 설정이 잘못되면 null. 화면에서 무엇이 잘못됐는지 안내한다. */
export const supabase: SupabaseClient | null = isConfigured
  ? createClient(cfg.url, cfg.key, {
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

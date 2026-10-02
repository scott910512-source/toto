/* 접속 정보를 고르는 규칙만 따로 떼어낸 순수 함수.
   supabase.ts 는 불러오는 즉시 클라이언트를 만들기 때문에,
   "어디서 값을 읽나" 를 테스트하려면 이 부분이 분리돼 있어야 한다. */

export interface RawConfig {
  url?: string | undefined;
  key?: string | undefined;
  bucket?: string | undefined;
}

export interface ResolvedConfig {
  url: string;
  key: string;
  bucket: string;
  /** 값을 어디서 가져왔나 — 설정이 꼬였을 때 어디를 고쳐야 하는지 알려준다 */
  source: { url: "env" | "window" | "none"; key: "env" | "window" | "none" };
}

const clean = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function readConfig(env: RawConfig, win: Record<string, unknown>): ResolvedConfig {
  const envUrl = clean(env.url), envKey = clean(env.key);
  const winUrl = clean(win.SUPABASE_URL), winKey = clean(win.SUPABASE_ANON_KEY);

  return {
    url: envUrl || winUrl,
    key: envKey || winKey,
    // 버킷은 기본값이 있으니 비어 있어도 괜찮다
    bucket: clean(env.bucket) || clean(win.MEDIA_BUCKET) || "family-media",
    source: {
      url: envUrl ? "env" : winUrl ? "window" : "none",
      key: envKey ? "env" : winKey ? "window" : "none",
    },
  };
}

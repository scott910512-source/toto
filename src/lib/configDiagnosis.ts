/* 접속 설정이 잘못됐을 때 무엇이 잘못됐는지 짚어주는 순수 함수.
   app.html 도 이 판정을 그대로 쓰기 때문에, Supabase 클라이언트를 만드는
   코드와 분리해 둔다. (여기를 불러오는 것만으로 클라이언트가 생기면 안 된다) */

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

export function diagnoseConfig(url: string, key: string): ConfigProblem {
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

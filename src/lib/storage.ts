import { sb, MEDIA_BUCKET } from "./supabase";

/* 비공개 버킷이라 사진은 서명 URL 로만 볼 수 있다.
   같은 경로를 여러 번 요청하지 않도록 캐시하되, 만료 전에 갱신한다. */
const TTL_SEC = 60 * 60;
const RENEW_MS = 2 * 60 * 1000;          // 만료 2분 전이면 새로 받는다

type Entry = { url: string; exp: number };
const cache = new Map<string, Entry>();

/** 로그아웃·계정 변경 때 반드시 호출 — 남의 사진이 보이면 안 된다 */
export function clearSignedUrlCache(): void {
  cache.clear();
}

export async function signPaths(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const now = Date.now();
  const uniq = [...new Set(paths.filter((p): p is string => !!p))];
  const need = uniq.filter((p) => {
    const c = cache.get(p);
    return !c || c.exp < now + RENEW_MS;
  });

  for (let i = 0; i < need.length; i += 90) {
    const chunk = need.slice(i, i + 90);
    try {
      const { data, error } = await sb().storage.from(MEDIA_BUCKET).createSignedUrls(chunk, TTL_SEC);
      if (error) continue;
      for (const d of data ?? []) {
        const url = (d as { signedUrl?: string; signedURL?: string }).signedUrl
          ?? (d as { signedURL?: string }).signedURL;
        if (url && d.path) cache.set(d.path, { url, exp: now + TTL_SEC * 1000 });
      }
    } catch {
      // 일부 실패는 넘어간다 — 나머지 사진이라도 보이게
    }
  }

  const out: Record<string, string> = {};
  for (const p of uniq) {
    const c = cache.get(p);
    if (c) out[p] = c.url;
  }
  return out;
}

export async function signOne(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const map = await signPaths([path]);
  return map[path] ?? null;
}

/** 서명 URL 이 만료돼 실패했을 때 한 번만 다시 받아 재시도 */
export async function fetchSigned(path: string): Promise<Response> {
  let url = await signOne(path);
  if (!url) throw new Error("사진 주소를 받지 못했어요.");
  let res = await fetch(url);
  if (res.status === 400 || res.status === 403 || res.status === 404) {
    cache.delete(path);                     // 만료로 보고 새로 받는다
    url = await signOne(path);
    if (url) res = await fetch(url);
  }
  if (!res.ok) throw new Error(`사진을 불러오지 못했어요 (HTTP ${res.status})`);
  return res;
}

export async function removeFiles(paths: (string | null | undefined)[]): Promise<void> {
  const list = paths.filter((p): p is string => !!p);
  if (!list.length) return;
  try {
    await sb().storage.from(MEDIA_BUCKET).remove(list);
    list.forEach((p) => cache.delete(p));
  } catch {
    // 이미 없는 파일이면 무시
  }
}

/** 테스트용 — 캐시 상태 확인 */
export const __cacheSize = () => cache.size;

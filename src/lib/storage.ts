/* ============================================================================
   비공개 버킷이라 사진은 서명 URL 로만 볼 수 있다.

   같은 경로를 여러 번 요청하지 않도록 캐시하되, 만료 직전이면 새로 받는다.
   서명 URL 은 1시간 뒤 만료되는데, 슬라이드쇼를 오래 켜 두면 그 사이에
   만료돼 사진이 회색으로 바뀌던 문제가 있었다.

   Supabase 클라이언트를 인자로 받는다(createStorage). 이 파일을 불러오는
   것만으로 클라이언트가 생기면, app.html 이 쓰는 번들에 supabase-js 전체가
   끌려 들어온다.
   ========================================================================== */

const TTL_SEC = 60 * 60;
const RENEW_MS = 2 * 60 * 1000;          // 만료 2분 전이면 새로 받는다
const CHUNK = 90;                        // 한 번에 서명 요청할 최대 개수

interface SignedRow { path?: string | null; signedUrl?: string; signedURL?: string }
export interface MinimalBucket {
  createSignedUrls: (paths: string[], ttl: number) => Promise<{ data: SignedRow[] | null; error: unknown }>;
  remove: (paths: string[]) => Promise<{ error?: unknown } | void>;
}
export interface MinimalStorageClient {
  storage: { from: (bucket: string) => MinimalBucket };
}

export interface StorageOptions {
  /** 테스트에서 시간을 직접 넣기 위한 구멍 */
  nowFn?: () => number;
  /** 서명 URL 로 실제 파일을 받아오는 함수 (기본은 전역 fetch) */
  fetchFn?: typeof fetch;
}

export function createStorage(client: MinimalStorageClient, bucket: string, opts: StorageOptions = {}) {
  const now = opts.nowFn ?? (() => Date.now());
  const doFetch = opts.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const cache = new Map<string, { url: string; exp: number }>();

  /** 로그아웃·계정 변경 때 반드시 호출 — 다음 사람에게 남의 사진이 보이면 안 된다 */
  const clear = (): void => { cache.clear(); };

  async function signPaths(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
    const t = now();
    const uniq = [...new Set((paths || []).filter((p): p is string => !!p))];
    const need = uniq.filter((p) => {
      const c = cache.get(p);
      return !c || c.exp < t + RENEW_MS;
    });

    for (let i = 0; i < need.length; i += CHUNK) {
      const chunk = need.slice(i, i + CHUNK);
      try {
        const { data, error } = await client.storage.from(bucket).createSignedUrls(chunk, TTL_SEC);
        if (error) continue;          // 일부 실패는 넘어간다 — 나머지 사진이라도 보이게
        for (const d of data ?? []) {
          const url = d.signedUrl ?? d.signedURL;
          if (url && d.path) cache.set(d.path, { url, exp: t + TTL_SEC * 1000 });
        }
      } catch {
        // 네트워크가 끊겨도 이미 받아둔 사진은 계속 보이게 한다
      }
    }

    const out: Record<string, string> = {};
    for (const p of uniq) {
      const c = cache.get(p);
      if (c) out[p] = c.url;
    }
    return out;
  }

  const signOne = async (path: string | null | undefined): Promise<string | null> => {
    if (!path) return null;
    const map = await signPaths([path]);
    return map[path] ?? null;
  };

  /** 서명 URL 이 만료돼 실패했을 때 한 번만 다시 받아 재시도 */
  async function fetchSigned(path: string): Promise<Response> {
    let url = await signOne(path);
    if (!url) throw new Error("사진 주소를 받지 못했어요.");
    let res = await doFetch(url);
    if (res.status === 400 || res.status === 403 || res.status === 404) {
      cache.delete(path);                     // 만료로 보고 새로 받는다
      url = await signOne(path);
      if (url) res = await doFetch(url);
    }
    if (!res.ok) throw new Error(`사진을 불러오지 못했어요 (HTTP ${res.status})`);
    return res;
  }

  async function removeFiles(paths: (string | null | undefined)[] | string | null): Promise<void> {
    const list = (Array.isArray(paths) ? paths : [paths]).filter((p): p is string => !!p);
    if (!list.length) return;
    try {
      await client.storage.from(bucket).remove(list);
    } catch {
      // 이미 없는 파일이면 무시
    } finally {
      // 지운 파일의 서명 URL 은 버린다 — 지웠는데 계속 보이면 안 된다
      list.forEach((p) => cache.delete(p));
    }
  }

  return {
    signPaths, signOne, fetchSigned, removeFiles,
    clearSignedUrlCache: clear,
    /** 테스트·진단용 */
    cacheSize: () => cache.size,
  };
}

export type Storage = ReturnType<typeof createStorage>;

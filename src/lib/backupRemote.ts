/* ============================================================================
   서버 밖에서 돌리는 백업 — GitHub Actions 가 매일 또또 자료를 꺼내 간다.

   왜: Supabase 무료 플랜은 자동 백업이 없다. 2026-10-12 에 프로젝트가 멈춘
   날, "자료가 정말 안전한가" 를 물었을 때 답이 '앱에서 손으로 내보낸 파일'
   뿐이었다. 이 모듈이 앱의 백업과 같은 모양(BackupFile v3)을 만들므로,
   복원은 앱의 "백업 가져오기" 로 그대로 된다.

   DB 를 아는 코드는 여기뿐이고 fetch 를 주입받는다 — 가짜 fetch 로 테스트한다.
   service_role 키는 쓰지 않는다. 가족 계정으로 로그인해 RLS 가 허락하는 만큼만
   읽는다 (그게 가족이 앱에서 보는 전부다).
   ========================================================================== */
import { MAPPERS } from "@/repositories/legacyMappers";
import { BACKUP_VERSION, type BackupFile } from "./backupTypes";
import type { BabyInfo, Photo } from "@/types/models";

type Row = Record<string, unknown>;
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface RemoteConfig {
  url: string;          // https://xxx.supabase.co
  anonKey: string;
  bucket: string;       // family-media
  fetch?: FetchLike;
  /** 한 번에 읽는 행 수 (PostgREST 기본 상한이 1000) */
  pageSize?: number;
}

const f = (c: RemoteConfig): FetchLike => c.fetch ?? ((u, i) => fetch(u, i));

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string; error_description?: string; msg?: string; error?: string };
    return j.message || j.error_description || j.msg || j.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/** 가족 계정으로 로그인해 접근 토큰을 받는다 */
export async function signIn(c: RemoteConfig, email: string, password: string): Promise<string> {
  const res = await f(c)(`${c.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: c.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`로그인 실패: ${await readError(res)}`);
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error("로그인 응답에 토큰이 없어요.");
  return j.access_token;
}

/** 테이블 전체를 페이지로 나눠 읽는다. 총 행 수(Content-Range)도 함께 돌려준다. */
export async function fetchAllRows(
  c: RemoteConfig, token: string, table: string, query = "select=*",
): Promise<{ rows: Row[]; total: number }> {
  const size = c.pageSize ?? 1000;
  const rows: Row[] = [];
  let total = -1;
  for (let from = 0; ; from += size) {
    const res = await f(c)(`${c.url}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: c.anonKey, Authorization: `Bearer ${token}`,
        Range: `${from}-${from + size - 1}`, Prefer: "count=exact",
      },
    });
    // 범위를 넘어가면 PostgREST 가 416 을 준다 — 끝이다
    if (res.status === 416) break;
    if (!res.ok) throw new Error(`${table} 읽기 실패: ${await readError(res)}`);
    const page = (await res.json()) as Row[];
    const cr = res.headers.get("content-range") || "";
    const m = /\/(\d+|\*)$/.exec(cr);
    if (m && m[1] !== "*") total = Number(m[1]);
    rows.push(...page);
    if (page.length < size) break;
    if (total >= 0 && rows.length >= total) break;
  }
  if (total < 0) total = rows.length;
  if (rows.length !== total) throw new Error(`${table}: ${total}행이어야 하는데 ${rows.length}행만 읽었어요.`);
  return { rows, total };
}

/** 비공개 버킷의 파일 하나를 서명 URL 로 받아 온다 */
export async function downloadObject(c: RemoteConfig, token: string, path: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const sign = await f(c)(`${c.url}/storage/v1/object/sign/${c.bucket}/${path}`, {
    method: "POST",
    headers: { apikey: c.anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  });
  if (!sign.ok) throw new Error(`서명 실패(${path}): ${await readError(sign)}`);
  const { signedURL } = (await sign.json()) as { signedURL?: string };
  if (!signedURL) throw new Error(`서명 응답이 비어 있어요(${path})`);
  const url = signedURL.startsWith("http") ? signedURL : `${c.url}/storage/v1${signedURL}`;
  const res = await f(c)(url);
  if (!res.ok) throw new Error(`내려받기 실패(${path}): HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (!buf.length) throw new Error(`빈 파일(${path})`);
  return { bytes: buf, mime: res.headers.get("content-type") || "image/jpeg" };
}

export function toDataUrl(bytes: Uint8Array, mime: string): string {
  // Buffer 는 Node 에만 있다. 브라우저에서는 쓰지 않는 함수지만, 있으면 쓴다.
  const B = (globalThis as { Buffer?: { from: (b: Uint8Array) => { toString: (e: string) => string } } }).Buffer;
  const b64 = B ? B.from(bytes).toString("base64") : btoa(String.fromCharCode(...bytes));
  return `data:${mime.split(";")[0]};base64,${b64}`;
}

export interface BackupProgress { label: string; done: number; total: number }

export interface BuildOptions {
  email: string;
  password: string;
  /** true 면 사진 원본까지 담는다 (앱의 가져오기가 그대로 복원할 수 있는 형태) */
  withPhotos: boolean;
  onProgress?: (p: BackupProgress) => void;
}

/** 앱의 백업과 같은 모양의 파일을 만든다 */
export async function buildBackup(c: RemoteConfig, o: BuildOptions): Promise<BackupFile> {
  const token = await signIn(c, o.email, o.password);
  o.onProgress?.({ label: "읽는 중", done: 0, total: 0 });

  const fam = await fetchAllRows(c, token, "families", "select=*&limit=1");
  const family = fam.rows[0];
  if (!family) throw new Error("이 계정으로는 가족 정보를 읽을 수 없어요 (승인된 가족 계정인지 확인).");
  const baby = ((family.baby as BabyInfo) || {}) as BabyInfo;

  const [rec, med, alb, usr] = await Promise.all([
    fetchAllRows(c, token, "records", "select=*&order=at.asc"),
    fetchAllRows(c, token, "media", "select=*&order=uploaded_at.asc"),
    fetchAllRows(c, token, "albums", "select=*&order=sort_order.asc"),
    fetchAllRows(c, token, "profiles", "select=*").catch(() => ({ rows: [] as Row[], total: 0 })),
  ]);

  // 매퍼는 느슨한 Row 를 주므로 한 번 unknown 을 거쳐 앱 타입으로 본다
  const records = rec.rows.map((r) => MAPPERS.records!.fromDb(r)) as unknown as BackupFile["records"];
  const metas = med.rows.map((r) => MAPPERS.photos!.fromDb(r)) as unknown as Photo[];
  const albums = alb.rows.map((r) => MAPPERS.albums!.fromDb(r)) as unknown as BackupFile["albums"];
  const users = usr.rows.map((r) => MAPPERS.users!.fromDb(r)) as unknown as BackupFile["users"];

  const photos: BackupFile["photos"] = [];
  const failed: string[] = [];
  for (let i = 0; i < metas.length; i++) {
    const p = metas[i]!;
    o.onProgress?.({ label: "사진 담는 중", done: i, total: metas.length });
    if (!o.withPhotos) { photos.push({ ...p, url: "" }); continue; }
    const path = p.storagePath || p.previewPath || p.thumbPath;
    if (!path) { failed.push(p.id); continue; }
    try {
      const { bytes, mime } = await downloadObject(c, token, path);
      photos.push({ ...p, url: toDataUrl(bytes, mime) });
    } catch {
      failed.push(p.id);
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    version: BACKUP_VERSION,
    baby, records, photos, albums, users,
    summary: {
      records: records.length, photos: photos.length, photosExpected: metas.length,
      albums: albums.length, users: users.length, failedPhotoIds: failed,
    },
  };
}

/** 받은 설정 파일(supabase-config.js) 에서 접속 정보를 읽는다 — 앱과 같은 파일 */
export function parseConfigJs(src: string): { url: string; anonKey: string; bucket: string } | null {
  const url = /SUPABASE_URL\s*=\s*"([^"]+)"/.exec(src)?.[1];
  const anonKey = /SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/.exec(src)?.[1];
  const bucket = /MEDIA_BUCKET\s*=\s*"([^"]+)"/.exec(src)?.[1] || "family-media";
  if (!url || !anonKey) return null;
  return { url, anonKey, bucket };
}

/* =========================================================================
   또또 자료 백업 — GitHub Actions 가 매일 돌린다. 손으로도 돌릴 수 있다.

     TOTO_BACKUP_EMAIL=... TOTO_BACKUP_PASSWORD=... npx vite-node tools/backup.ts [--photos] [--out 폴더]

   · 접속 정보는 앱과 같은 supabase-config.js 에서 읽는다 (anon 키, 공개값)
   · 가족 계정으로 로그인한다 — RLS 가 허락하는 만큼만 읽는다. service_role 은 쓰지 않는다
   · 결과는 앱의 "백업 가져오기" 가 그대로 읽는 v3 JSON 이다
   · --photos: 사진 원본까지 담는다 (파일이 커진다 — 주 1회)
   · 담긴 수가 DB 수와 다르면 실패로 끝낸다 (조용히 반쪽 백업을 남기지 않는다)
   ========================================================================= */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildBackup, parseConfigJs } from "@/lib/backupRemote";
import { verifyBackup } from "@/lib/backupInspect";

const args = process.argv.slice(2);
const withPhotos = args.includes("--photos");
const outDir = args[args.indexOf("--out") + 1] && args.includes("--out") ? args[args.indexOf("--out") + 1]! : "backup-out";

const email = process.env.TOTO_BACKUP_EMAIL || "";
const password = process.env.TOTO_BACKUP_PASSWORD || "";
if (!email || !password) {
  console.error("❌ TOTO_BACKUP_EMAIL / TOTO_BACKUP_PASSWORD 가 없습니다. 승인된 가족 계정(관리자 권장)을 넣으세요.");
  process.exit(2);
}

const cfg = parseConfigJs(readFileSync("supabase-config.js", "utf8"));
if (!cfg) { console.error("❌ supabase-config.js 에서 접속 정보를 읽지 못했습니다."); process.exit(2); }
if (/^sb_secret_|^eyJ/.test(cfg.anonKey)) { console.error("❌ anon 키가 아닌 것 같습니다. 백업은 anon 키 + 가족 계정으로만 돕니다."); process.exit(2); }

const t0 = Date.now();
let lastLine = "";
const progress = (p: { label: string; done: number; total: number }) => {
  const line = p.total ? `${p.label} ${p.done}/${p.total}` : p.label;
  if (line !== lastLine) { console.log("  " + line); lastLine = line; }
};

try {
  console.log(`대상: ${cfg.url} · 계정: ${email.replace(/(.{2}).+(@.*)/, "$1***$2")} · 사진 ${withPhotos ? "포함" : "목록만"}`);
  const b = await buildBackup({ url: cfg.url, anonKey: cfg.anonKey, bucket: cfg.bucket }, { email, password, withPhotos, onProgress: progress });
  mkdirSync(outDir, { recursive: true });
  const day = b.exportedAt.slice(0, 10);
  const name = `또또백업_${day}${withPhotos ? "" : "_기록만"}.json`;
  const json = JSON.stringify(b);
  writeFileSync(join(outDir, name), json);
  const mb = (json.length / 1048576).toFixed(1);
  const s = b.summary;
  console.log(`✅ ${name} — 기록 ${s.records}건 · 사진 ${withPhotos ? `${s.photos}/${s.photosExpected}장` : `${s.photosExpected}장(목록)`} · 앨범 ${s.albums}개 · 가족 ${s.users}명 · ${mb}MB · ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // 반쪽 백업은 성공이 아니다
  if (withPhotos) {
    const v = verifyBackup(b);
    if (!v.ok) { console.error("❌ " + v.message + " 실패 id: " + s.failedPhotoIds.join(", ")); process.exit(1); }
  }
  if (s.records === 0 && s.photosExpected === 0) {
    console.error("❌ 기록도 사진도 0건입니다. 계정이 다른 가족에 묶였거나 승인이 안 된 것 같습니다.");
    process.exit(1);
  }
} catch (e) {
  console.error("❌ " + ((e as Error).message || e));
  process.exit(1);
}

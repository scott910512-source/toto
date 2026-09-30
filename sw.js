/* 또또 아기수첩 · 서비스워커
   ---------------------------------------------------------------------------
   요청 종류별로 다르게 처리한다.

     화면 이동(navigate)  : 네트워크 우선 → 실패하면 캐시된 앱 화면
     JS/CSS/이미지/폰트   : 캐시 우선 + 뒤에서 갱신 (없으면 그냥 네트워크 오류)
     Supabase(인증·사진)  : 캐시 금지 — 기기에 토큰·가족 사진이 남지 않도록

   ⚠️ 정적 파일 요청에 앱 화면(app.html)을 돌려주지 않는다.
      예전에는 .js 가 실패하면 HTML 이 돌아와서 앱이 이상하게 깨졌다.
   배포할 때 CACHE 버전을 올리면 이전 캐시가 정리된다. */
const CACHE = "toto-v32";

const SHELL = [
  "./app.html",
  // 앱이 이 파일 없이는 못 뜬다 (날짜·오류문구·설정진단). 셸에 포함한다.
  "./vendor/toto-core.js",
  "./dday.html",
  "./supabase-config.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

/* 캐시하면 안 되는 요청 — 인증 토큰과 가족 사진 signed URL */
const BYPASS = /supabase\.co|supabase\.in|identitytoolkit|securetoken|google-analytics|googletagmanager/;

self.addEventListener("install", (e) => {
  // 새 버전을 받으면 바로 대기 상태로 (실제 적용은 아래 SKIP_WAITING 신호를 받고)
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 앱이 "지금 바꿔줘" 하고 보내는 신호 */
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

/* 정상 응답만 캐시에 넣는다 (404·500 을 캐시하면 앱이 계속 깨진 걸 본다) */
const cacheable = (res) => res && res.status === 200 && (res.type === "basic" || res.type === "cors");

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || BYPASS.test(req.url)) return;

  // ── 화면 이동: 네트워크 우선, 끊기면 캐시된 앱 화면 ──────────────────
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(req);
          if (hit) return hit;
          const url = new URL(req.url);
          // 어느 화면을 보려던 건지에 맞춰 돌려준다
          const shell = url.pathname.endsWith("dday.html") ? "./dday.html" : "./app.html";
          return (await caches.match(shell)) || Response.error();
        })
    );
    return;
  }

  // ── 그 밖의 파일: 캐시 우선 + 뒤에서 갱신 ────────────────────────────
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      const net = fetch(req)
        .then((res) => {
          if (cacheable(res)) cache.put(req, res.clone()).catch(() => {});
          return res;
        })
        .catch((err) => {
          // 캐시에도 없으면 그대로 실패시킨다.
          // (여기서 app.html 을 돌려주면 .js 자리에 HTML 이 들어가 앱이 깨진다)
          if (hit) return hit;
          throw err;
        });
      return hit || net;
    })
  );
});

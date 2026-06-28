/* 아기수첩 PWA 서비스워커
   - 앱 셸(같은 출처): 네트워크 우선 → 항상 최신, 오프라인 시 캐시 폴백
   - CDN/폰트(타 출처): 캐시 우선 → 빠른 로딩, 백그라운드 갱신
   - Firebase Auth/Firestore: 캐시하지 않음(실시간/인증)
   업데이트 배포 시 CACHE 버전을 올리면 이전 캐시가 정리됩니다. */
const CACHE = "babybook-v6";
const SHELL = [
  "./baby-care.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 캐시하면 안 되는(실시간/인증) 요청
const BYPASS = /firestore\.googleapis|firebasestorage|identitytoolkit|firebaseinstallations|firebaselogging|googleapis\.com\/google|google-analytics|googletagmanager|securetoken/;

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || BYPASS.test(req.url)) return; // 네트워크 그대로 통과
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // 앱 셸: 네트워크 우선(최신 보장) → 실패 시 캐시
    e.respondWith(
      fetch(req)
        .then((res) => { const c = res.clone(); caches.open(CACHE).then((ca) => ca.put(req, c)).catch(() => {}); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./baby-care.html")))
    );
  } else {
    // CDN/폰트: 캐시 우선 + 백그라운드 갱신
    e.respondWith(
      caches.open(CACHE).then(async (ca) => {
        const hit = await ca.match(req);
        const net = fetch(req)
          .then((res) => { if (res && (res.ok || res.type === "opaque")) ca.put(req, res.clone()).catch(() => {}); return res; })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});

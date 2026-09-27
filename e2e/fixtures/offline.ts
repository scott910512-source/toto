import type { Page } from "@playwright/test";

/* app.html 은 React·Babel·Tailwind 를 CDN 에서 받아온다.
   테스트 환경은 외부망이 막혀 있으므로, app.html 을 내려줄 때 CDN 주소만
   같은 출처(/e2e/vendor/...)로 바꿔치기한다.
   앱 코드 자체는 손대지 않으므로, 실제로 배포되는 그 파일을 검증하게 된다.
   같은 출처라 crossorigin/CORS 문제도 생기지 않는다. */

const SWAP: Array<[RegExp, string]> = [
  [/https:\/\/unpkg\.com\/react-dom@[^"']+/g, "/e2e/vendor/react-dom.js"],
  [/https:\/\/unpkg\.com\/react@[^"']+/g, "/e2e/vendor/react.js"],
  [/https:\/\/unpkg\.com\/@babel\/standalone@[^"']+/g, "/e2e/vendor/babel.js"],
  [/https:\/\/cdn\.jsdelivr\.net\/npm\/@babel\/standalone@[^"']+/g, "/e2e/vendor/babel.js"],
  [/https:\/\/unpkg\.com\/prop-types@[^"']+/g, "/e2e/vendor/prop-types.js"],
  [/https:\/\/unpkg\.com\/recharts@[^"']+/g, "/e2e/vendor/recharts.js"],
  [/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^"']+/g, "/e2e/vendor/exifr.js"],
  [/https:\/\/cdn\.tailwindcss\.com[^"']*/g, "/e2e/vendor/tailwind.js"],
  [/https:\/\/fonts\.googleapis\.com\/[^"']+/g, "/e2e/vendor/empty.css"],
];

export async function serveVendorLocally(page: Page, htmlPath = "app.html"): Promise<void> {
  await page.route(
    (url) => url.pathname.endsWith(`/${htmlPath}`) && url.origin === "http://127.0.0.1:4173",
    async (route) => {
      const res = await route.fetch();
      let html = await res.text();
      for (const [re, local] of SWAP) html = html.replace(re, local);
      await route.fulfill({ response: res, body: html, headers: { "content-type": "text/html; charset=utf-8" } });
    },
  );

  // 그래도 남은 외부 요청은 테스트가 밖으로 나가지 않도록 막는다
  await page.route((url) => url.origin !== "http://127.0.0.1:4173", (r) => r.abort());
}

import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

/* app.html 이 불러 쓰는 vendor/toto-core.js 를 만든다.
   ----------------------------------------------------------------------------
   Pages 가 브랜치를 그대로 내보내는 구조라 배포 시 빌드 단계가 없다.
   그래서 결과물을 저장소에 커밋한다. 소스와 어긋나지 않도록
   npm run verify 가 다시 빌드해 비교한다.

   이름에 해시를 붙이지 않는다 — app.html 의 <script src> 를 매번 고쳐야 하니까.
   대신 서비스워커 캐시 이름(CACHE=toto-vNN)을 올려 새 파일을 받게 한다. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  define: {
    // 브라우저에서 바로 실행되는 파일이라 import.meta.env 가 없다.
    // 이 번들에는 클라이언트를 만드는 코드가 들어 있지 않지만, 혹시 섞여
    // 들어오면 빌드가 조용히 통과하지 않도록 빈 값으로 못 박는다.
    "import.meta.env.VITE_SUPABASE_URL": '""',
    "import.meta.env.VITE_SUPABASE_ANON_KEY": '""',
    "import.meta.env.VITE_MEDIA_BUCKET": '"family-media"',
  },
  build: {
    outDir: "vendor",
    emptyOutDir: false,
    sourcemap: false,
    target: "es2019",          // 아이폰 Safari 구버전도 실행 가능하게
    minify: false,             // 커밋되는 파일이라 diff 를 읽을 수 있게 둔다
    lib: {
      entry: fileURLToPath(new URL("./src/legacy-bridge.ts", import.meta.url)),
      // IIFE 가 만드는 전역 이름. window.TotoCore 는 legacy-bridge 가 직접 넣으므로
      // 그 값을 번들 결과가 덮어쓰지 않도록 다른 이름을 쓴다.
      name: "TotoCoreBundle",
      formats: ["iife"],
      fileName: () => "toto-core.js",
    },
  },
});

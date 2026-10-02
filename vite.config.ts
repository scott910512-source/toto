import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

/* GitHub Pages 는 /toto/ 하위에서 서비스되므로 base 를 맞춘다. */
export default defineConfig({
  base: "/toto/",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      /* 저장소 루트의 index.html 은 다른 프로젝트 것이라 쓸 수 없다.
         새 구조의 진입점은 web/index.html 에 따로 둔다. */
      input: fileURLToPath(new URL("./web/index.html", import.meta.url)),
      output: {
        /* 첫 로딩을 가볍게: 무거운 라이브러리는 따로 떨어뜨린다.
           아직 쓰지 않는 것까지 미리 적으면 "빈 청크" 경고만 남으므로,
           실제로 불러온 모듈을 보고 가른다. */
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

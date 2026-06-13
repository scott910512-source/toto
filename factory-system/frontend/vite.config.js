import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
        host: true,
        port: 5173,
        proxy: {
            // 개발 중 백엔드로 프록시
            "/api": { target: "http://localhost:8000", changeOrigin: true },
        },
    },
});

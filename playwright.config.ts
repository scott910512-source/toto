import { defineConfig, devices } from "@playwright/test";

/* 가족이 실제로 쓰는 환경 = 아이폰 Safari 와 아이패드가 우선이다. */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    // 서비스워커가 캐시된 원본 HTML 을 돌려주면 테스트용 치환이 무시된다.
    // 서비스워커 자체는 별도 테스트(파일 내용 검사)로 확인한다.
    serviceWorkers: "block",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // 이 환경에는 Chromium 이 미리 깔려 있어 그것을 쓴다.
    // CI 에서는 playwright install 이 받은 것을 쓰도록 비워 둔다.
    launchOptions: process.env.PW_CHROMIUM
      ? { executablePath: process.env.PW_CHROMIUM, args: ["--no-sandbox", "--disable-dev-shm-usage"] }
      : {},
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 13"] } },
    { name: "ipad-landscape", use: { ...devices["iPad (gen 7) landscape"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npx --yes http-server . -p 4173 -s --cors",
    url: "http://127.0.0.1:4173/app.html",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

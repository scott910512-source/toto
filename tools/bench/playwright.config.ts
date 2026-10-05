import { defineConfig } from "@playwright/test";
import base from "../../playwright.config";

/* 측정용 스펙은 e2e/ 밖에 두므로(검사 묶음에서 빼기 위해) 전용 설정이 필요하다.
   루트 설정을 그대로 쓰되 testDir 만 이 폴더로 바꾼다.
     npx playwright test -c tools/bench/playwright.config.ts --project=desktop */
export default defineConfig({
  ...base,
  testDir: ".",
  workers: 1,          // 시간 재는 일이라 하나씩 돌린다
  retries: 0,
  // 정적 서버는 저장소 루트를 내보내야 한다 (이 설정 파일 위치 기준이면 tools/bench 를 내보내 버린다)
  webServer: { ...base.webServer!, cwd: "../.." },
});

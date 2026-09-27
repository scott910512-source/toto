/* ============================================================================
   app.html 과 src/ 를 잇는 다리
   ----------------------------------------------------------------------------
   문제: app.html(6천 줄)과 src/ 에 같은 로직이 두 벌 있었다. src/ 쪽은 테스트가
        붙어 있는데 정작 운영에서는 app.html 의 사본이 돌아가고 있었다.
        테스트가 통과해도 가족이 쓰는 화면은 고쳐지지 않는 구조다.

   해결: src/ 를 하나의 파일로 묶어 window.TotoCore 로 올리고, app.html 이
        그것을 꺼내 쓴다. app.html 의 사본은 지운다. 이제 한 벌만 남는다.

   왜 이런 방식인가: app.html 은 브라우저에서 Babel 로 바로 컴파일되는 단일
        파일이라 import 를 쓸 수 없다. 화면 코드를 전부 옮기는 건 한 번에 앱을
        새로 쓰는 일이라 위험하다. 그래서 '로직만' 먼저 한 벌로 합친다.
        화면은 그대로 두고, 다음 단계에서 조금씩 옮긴다.

   빌드: npm run build:core → vendor/toto-core.js (저장소에 커밋)
        Pages 가 브랜치를 그대로 내보내므로 빌드 결과물도 함께 둔다.
        어긋나지 않도록 npm run verify 가 다시 빌드해 비교한다.
   ========================================================================== */
import {
  GESTATION_DAYS, pad2, toDate, midnight, daysBetween, ymd, fmtDot, isValidYmd,
  toLocalInput, fromLocalInput, babyAge, dday, clampMinutes, hm,
  isSameDay, fmtTime, fmtDate, fmtDateTime, ago,
} from "@/lib/dates";
import { errMsg, AppError } from "@/lib/errors";
import { diagnoseConfig } from "@/lib/configDiagnosis";
import { BACKUP_VERSION } from "@/lib/backupTypes";
import { verifyBackup, inspectBackup } from "@/lib/backupInspect";

export const TotoCore = {
  // 날짜·시간
  GESTATION_DAYS, pad2, toDate, midnight, daysBetween, ymd, fmtDot, isValidYmd,
  toLocalInput, fromLocalInput, babyAge, dday, clampMinutes, hm,
  isSameDay, fmtTime, fmtDate, fmtDateTime, ago,
  // 오류 문구
  errMsg, AppError,
  // 접속 설정 진단
  diagnoseConfig,
  // 백업
  BACKUP_VERSION, verifyBackup, inspectBackup,
} as const;

declare global {
  interface Window {
    TotoCore?: typeof TotoCore;
  }
}

if (typeof window !== "undefined") window.TotoCore = TotoCore;

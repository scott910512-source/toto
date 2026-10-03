/* app.html 이 window 에 올리는 표시들. 테스트에서 읽기 위해 적어둔다. */
declare global {
  interface Window {
    /** vendor/app-compiled.js 가 돌았으면 true (Babel 되돌림 여부 판단) */
    __TOTO_PRECOMPILED?: boolean;
    /** 대기 중인 새 서비스워커 */
    __swWaiting?: ServiceWorker;
    /** 설치 프롬프트 (React 마운트 전에 올 수 있어 미리 보관) */
    __bipEvent?: Event;
  }
}
export {};

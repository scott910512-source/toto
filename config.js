/**
 * 사이트 설정
 *
 * AI 추천을 "공개용 프록시(Cloudflare Worker)"로 호출하려면 아래에 배포한
 * Worker 주소를 넣으세요. (worker/README.md 참고)
 *
 *   window.AI_PROXY_URL = "https://weekend-ai-proxy.<계정명>.workers.dev";
 *
 * 비워두면 → 브라우저에서 직접 호출(본인 API 키 입력 방식)으로 동작합니다.
 */
window.AI_PROXY_URL = "";

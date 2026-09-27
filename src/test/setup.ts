/* 테스트 공통 설정 */
if (typeof window !== "undefined") {
  window.matchMedia ??= (() => ({
    matches: false, media: "", onchange: null,
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
    addListener() {}, removeListener() {},
  })) as unknown as typeof window.matchMedia;
}

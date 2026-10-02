/* 테스트 공통 설정 */
if (typeof window !== "undefined") {
  window.matchMedia ??= (() => ({
    matches: false, media: "", onchange: null,
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
    addListener() {}, removeListener() {},
  })) as unknown as typeof window.matchMedia;
}

/* React Testing Library 가 각 테스트 뒤에 화면을 정리하도록 */
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => cleanup());

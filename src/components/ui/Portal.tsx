import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/* 전체화면 덮개를 body 최상위로 띄운다.
   안쪽 스크롤 영역에 갇히는 iOS 문제를 피하기 위한 것이다. */
export function Portal({ children }: { children?: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

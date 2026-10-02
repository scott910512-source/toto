import { useEffect, useRef, type RefObject } from "react";

/* 초점이 모달 안에 머물게 한다.
   · 열면 모달 안 첫 요소로 초점을 옮긴다 (스크린리더가 제목부터 읽는다)
   · Tab 이 모달 밖으로 새지 않는다
   · 닫으면 열기 전에 보던 버튼으로 초점을 되돌린다
   · ESC 로 닫힌다 */

const SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/* 숨겨진 요소인지. 레이아웃을 보지 않고 속성과 계산된 스타일만 본다.
   예전에는 offsetParent 가 null 인지로 판단했는데, position: fixed 인 요소는
   브라우저가 offsetParent 를 null 로 주기 때문에 보이는 버튼을 초점 순서에서
   빼 버릴 수 있었다. display 는 자식에게 물려받지 않으므로 조상까지 올라간다. */
function isHidden(el: HTMLElement): boolean {
  if (el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true") return true;
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden") return true;
  }
  return false;
}

export function useFocusTrap(open: boolean, onClose: () => void): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;

    const focusables = (): HTMLElement[] => {
      const box = ref.current;
      if (!box) return [];
      return Array.from(box.querySelectorAll<HTMLElement>(SELECTOR)).filter(
        (el) => el === document.activeElement || !isHidden(el),
      );
    };

    const t = setTimeout(() => {
      const f = focusables();
      (f[0] ?? ref.current)?.focus({ preventScroll: true });
    }, 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    window.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      // 열기 전 버튼이 사라졌을 수도 있으니 조용히 넘어간다
      try { prev?.focus({ preventScroll: true }); } catch { /* 무시 */ }
    };
  }, [open, onClose]);

  return ref;
}

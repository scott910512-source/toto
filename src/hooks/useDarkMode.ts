import { useEffect, useState } from "react";

const KEY = "baby-dark";

/* 어두운 화면. 밤중 수유 때 쓰는 앱이라 기기 설정을 따라가되,
   한 번 직접 고르면 그 선택을 기억한다. */
export function useDarkMode(): [boolean, (v: boolean) => void] {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "1") return true;
      if (saved === "0") return false;
    } catch { /* 저장소를 못 쓰는 환경이면 기기 설정을 따른다 */ }
    return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.dataset.theme = dark ? "dark" : "light";
    try { localStorage.setItem(KEY, dark ? "1" : "0"); } catch { /* 무시 */ }
  }, [dark]);

  return [dark, setDark];
}

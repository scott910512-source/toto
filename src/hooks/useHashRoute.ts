import { useCallback, useEffect, useState } from "react";

/* 지금 보고 있는 화면을 주소에 남긴다.
   · 모바일 뒤로가기가 앱을 벗어나지 않고 이전 화면으로 간다
   · 새로고침해도 보던 화면이 그대로 열린다
   예) #/records/feeding · #/more/saved */

export interface Route {
  path: string;
  tab: string;
  sub: string | null;
  nav: (to: string, opts?: { replace?: boolean }) => void;
}

export function useHashRoute(fallback = "/dashboard"): Route {
  const read = () => {
    const h = typeof location === "undefined" ? "" : location.hash;
    return (h || `#${fallback}`).slice(1) || fallback;
  };
  const [path, setPath] = useState(read);

  useEffect(() => {
    const on = () => setPath(read());
    window.addEventListener("hashchange", on);
    // 주소가 비어 있으면 기본 화면을 적어둔다 (뒤로가기 기록은 남기지 않는다)
    if (!location.hash) history.replaceState(null, "", `#${fallback}`);
    return () => window.removeEventListener("hashchange", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nav = useCallback((to: string, opts: { replace?: boolean } = {}) => {
    const next = `#${to.startsWith("/") ? to : `/${to}`}`;
    if (location.hash === next) { setPath(next.slice(1)); return; }
    if (opts.replace) { history.replaceState(null, "", next); setPath(next.slice(1)); }
    else location.hash = next;
  }, []);

  const parts = path.split("/").filter(Boolean);
  return { path, nav, tab: parts[0] ?? fallback.slice(1), sub: parts[1] ?? null };
}

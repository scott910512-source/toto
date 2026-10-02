import { useEffect, useState } from "react";

/** 흐르는 시간을 화면에 반영한다 ("3시간 20분 전" 같은 표시용) */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

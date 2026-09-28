/* ============================================================================
   "지금 시각으로 적어라", "1 더해라", "배열에 넣어라" 같은 지시를 값처럼
   들고 다니는 장치. Firestore 의 FieldValue 를 흉내낸 것이다.

   화면 코드는 이렇게 쓴다.
       COL.records().add({ at: SV.serverTimestamp() })
       COL.users().doc(id).update({ letterCount: SV.increment(1) })
       COL.media().doc(id).update({ likedBy: SV.arrayUnion(uid) })

   실제 값은 쓰기 직전에 applySV 가 만든다.

   이 코드는 모든 쓰기가 지나가는 길목인데 지금까지 테스트가 없었다.
   여기가 틀리면 기록이 조용히 어긋난다 — 좋아요가 중복으로 쌓이거나,
   날짜가 빈 값으로 저장되거나, 편지 수가 NaN 이 되는 식으로.
   ========================================================================== */

export type Sentinel =
  | { __sv: "ts" }
  | { __sv: "inc"; n: number }
  | { __sv: "au"; v: unknown[] }
  | { __sv: "ar"; v: unknown[] };

export const SV = {
  /** 서버 기준 '지금' — 기기 시계가 틀어져 있어도 쓰기 시점으로 적는다 */
  serverTimestamp: (): Sentinel => ({ __sv: "ts" }),
  increment: (n: number): Sentinel => ({ __sv: "inc", n }),
  arrayUnion: (...v: unknown[]): Sentinel => ({ __sv: "au", v }),
  arrayRemove: (...v: unknown[]): Sentinel => ({ __sv: "ar", v }),
} as const;

export function isSV(v: unknown): v is Sentinel {
  return !!v && typeof v === "object" && typeof (v as { __sv?: unknown }).__sv === "string";
}

/** 지시를 실제 값으로 바꾼다. cur 은 지금 저장돼 있는 값. */
export function applySV(cur: unknown, sv: Sentinel, now: Date = new Date()): unknown {
  if (sv.__sv === "ts") return now.toISOString();
  if (sv.__sv === "inc") {
    const base = typeof cur === "number" && Number.isFinite(cur) ? cur : Number(cur);
    // 값이 없거나 숫자가 아니면 0 에서 시작한다 (NaN 이 저장되지 않게)
    return (Number.isFinite(base) ? base : 0) + sv.n;
  }
  const arr = Array.isArray(cur) ? cur.slice() : [];
  if (sv.__sv === "au") {
    for (const x of sv.v) if (!arr.includes(x)) arr.push(x);
    return arr;
  }
  if (sv.__sv === "ar") return arr.filter((x) => !sv.v.includes(x));
  return cur;
}

/**
 * 무엇이 들어와도 Postgres 가 받는 ISO 문자열로.
 * 날짜 자리에 이상한 값이 들어오면 null 을 준다 — "Invalid Date" 라는
 * 글자가 DB 에 저장되는 것보다 비어 있는 게 낫다.
 */
export function isoOf(v: unknown, now: Date = new Date()): string | null {
  if (v == null || v === "") return null;
  if (isSV(v)) return now.toISOString();
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
  if (typeof v === "object") {
    const o = v as { seconds?: unknown; toDate?: unknown };
    // 백업 JSON 에서 넘어오는 {seconds, nanoseconds}
    if (typeof o.seconds === "number") return new Date(o.seconds * 1000).toISOString();
    // 예전 Firestore Timestamp 객체
    if (typeof o.toDate === "function") {
      const d = (o.toDate as () => unknown)();
      return d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : null;
    }
    return null;
  }
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

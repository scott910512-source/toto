/* ============================================================================
   DB 연결 상태 — "불러오지 못함" 을 "없음" 으로 보이지 않게 한다.

   왜: 기록 구독(useRecords 등)이 실패하면 예전에는 조용히 빈 배열을 넣었다.
   오프라인으로 앱을 열거나 로그인이 만료되면 모든 화면이 "아직 기록이
   없어요" 라고 했다 — 가족이 "기록이 사라졌나" 하고 놀랄 수 있는 문구다.

   화면 훅들은 실패하면 fail(), 성공하면 ok() 로 알리고, 배너 하나가
   이 상태를 구독해 "연결하지 못했어요 · 다시 시도" 를 보여준다.
   다시 시도는 tick 을 올려 구독 훅들이 다시 조회하게 만든다.
   ========================================================================== */

export interface DbHealthState {
  /** 지금 실패해 있는 조회 수 (0 이면 정상) */
  failedCount: number;
  /** 가장 최근 실패의 오류 (문구를 만드는 데 쓴다) */
  lastError: unknown;
  /** 다시 시도 횟수 — 훅의 의존성에 넣으면 올라갈 때 다시 구독한다 */
  tick: number;
}

export function createDbHealth() {
  const failed = new Map<string, unknown>();
  const subs = new Set<() => void>();
  let tick = 0;
  let lastError: unknown = null;
  let snapshot: DbHealthState = { failedCount: 0, lastError: null, tick: 0 };

  const emit = () => {
    snapshot = { failedCount: failed.size, lastError, tick };
    subs.forEach((f) => f());
  };

  return {
    /** 조회가 실패했다. key 는 조회마다 고유한 이름(예: "records:feeding"). */
    fail(key: string, e: unknown) {
      failed.set(key, e);
      lastError = e;
      emit();
    },
    /** 조회가 성공했다(복구됐다). 실패 목록에 없었다면 아무 일도 없다. */
    ok(key: string) {
      if (failed.delete(key)) {
        if (failed.size === 0) lastError = null;
        emit();
      }
    },
    /** 구독이 끝났다 — 실패로 남아 배너가 계속 뜨지 않게 지운다. */
    forget(key: string) {
      if (failed.delete(key)) {
        if (failed.size === 0) lastError = null;
        emit();
      }
    },
    /** 모두 다시 조회하게 한다. */
    retry() {
      failed.clear();
      lastError = null;
      tick++;
      emit();
    },
    /** useSyncExternalStore 용 — 바뀌지 않았으면 같은 객체를 준다. */
    get: () => snapshot,
    subscribe(f: () => void) {
      subs.add(f);
      return () => { subs.delete(f); };
    },
  };
}

export type DbHealth = ReturnType<typeof createDbHealth>;

/** 로그인 만료처럼 "다시 시도" 로는 안 풀리는 오류인지 */
export function isAuthExpired(e: unknown): boolean {
  const raw = String((e as { message?: string })?.message ?? (typeof e === "string" ? e : ""));
  const code = String((e as { code?: string })?.code ?? "");
  return /JWT expired|token is expired|invalid JWT|JWSError/i.test(raw) || code === "PGRST301";
}

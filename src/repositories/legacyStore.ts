/* ============================================================================
   Firestore 문법으로 Supabase 를 쓰게 해 주는 계층.

       COL.records().where("type", "==", "feeding").limit(50).onSnapshot(cb)
       COL.users().doc(uid).update({ letterCount: SV.increment(1) })

   왜 이런 게 있나: 앱이 Firebase 로 만들어졌고 화면 코드 4천 줄이 이 문법을
   쓰고 있다. Supabase 로 옮기면서 화면을 전부 고치는 대신 이 계층을 두었다.
   덕분에 화면 코드는 한 줄도 안 바뀌고 DB 만 갈아탔다.

   이 파일은 모든 읽기·쓰기·실시간 구독이 지나가는 길목인데 테스트가 없었다.
   Supabase 클라이언트를 인자로 받게 만들어(createStore) 가짜 클라이언트로
   실제 동작을 확인할 수 있게 했다.
   ========================================================================== */
import { isSV, applySV, SV } from "@/lib/fieldValues";
import { MAPPERS, FIELD_COL, ROLE_TO_DB } from "./legacyMappers";

type Row = Record<string, unknown>;

/* 쓰는 만큼만 최소로 적은 Supabase 모양.
   supabase-js 의 전체 타입을 끌어오면 이 파일이 클라이언트에 묶여 버린다. */
export interface MinimalQuery {
  select: (cols: string) => MinimalQuery;
  eq: (col: string, v: unknown) => MinimalQuery;
  order: (col: string, opt: { ascending: boolean; nullsFirst: boolean }) => MinimalQuery;
  limit: (n: number) => MinimalQuery;
  maybeSingle: () => Promise<{ data: Row | null; error: unknown }>;
  single: () => Promise<{ data: Row | null; error: unknown }>;
  insert: (o: Row) => { select: (c: string) => { single: () => Promise<{ data: Row | null; error: unknown }> } };
  upsert: (o: Row, opt?: { onConflict: string }) => Promise<{ error: unknown }>;
  update: (o: Row) => MinimalQuery;
  delete: () => MinimalQuery;
  then: <T>(res: (v: { data: Row[] | null; error: unknown }) => T) => Promise<T>;
}

export interface MinimalChannel {
  on: (ev: string, filter: unknown, cb: (payload?: ChangePayload) => void) => MinimalChannel;
  subscribe: () => MinimalChannel;
}

/** Realtime 이 보내는 변경 알림 중 우리가 보는 부분 */
export interface ChangePayload {
  eventType?: string;           // "INSERT" | "UPDATE" | "DELETE"
  new?: Row | null;             // INSERT·UPDATE 는 바뀐 행 전체
  old?: Row | null;             // DELETE 는 기본 설정에서 id 만 온다
}

export interface MinimalClient {
  from: (table: string) => MinimalQuery;
  channel: (name: string) => MinimalChannel;
  removeChannel: (ch: MinimalChannel) => void;
}

export interface StoreOptions {
  /** 변경 알림이 몰아칠 때 재조회를 묶는 시간(ms). 0 이면 묶지 않는다. */
  debounceMs?: number;
  /** 테스트에서 타이머를 직접 넣기 위한 구멍 */
  setTimeoutFn?: (fn: () => void, ms: number) => unknown;
  clearTimeoutFn?: (id: unknown) => void;
}

export interface DocSnapshot {
  exists: boolean;
  id: string;
  data: () => Row | null;
}
export interface QuerySnapshot {
  docs: Array<{ id: string; data: () => Row }>;
}
export type Unsubscribe = () => void;

export function createStore(sb: MinimalClient, opts: StoreOptions = {}) {
  const debounceMs = opts.debounceMs ?? 120;
  const setT = opts.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms));
  const clearT = opts.clearTimeoutFn ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));
  let chanSeq = 0;

  const mapperOf = (name: string) => {
    const M = MAPPERS[name];
    if (!M) throw new Error(`알 수 없는 컬렉션: ${name}`);
    return M;
  };

  /* ── 테이블당 Realtime 채널 하나 ─────────────────────────────────────
     예전에는 구독마다 채널을 하나씩 열었다. 홈만 열어도 records 채널이
     7개였고, 기록 하나가 바뀌면 서버가 그 수만큼 알림을 보냈다 (Realtime
     메시지 한도를 그만큼 빨리 쓴다). 이제 같은 테이블을 보는 구독은
     채널 하나를 나눠 쓰고, 마지막 구독이 끝날 때 닫는다. */
  type Listener = (payload?: ChangePayload) => void;
  const shared = new Map<string, { ch: MinimalChannel; listeners: Set<Listener> }>();
  const listenTable = (table: string, onChange: Listener): Unsubscribe => {
    let entry = shared.get(table);
    if (!entry) {
      const listeners = new Set<Listener>();
      const ch = sb.channel(`w${table}${++chanSeq}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
          // 알리는 도중 구독이 빠져도 안전하도록 복사해서 돈다
          [...listeners].forEach((f) => f(payload));
        })
        .subscribe();
      entry = { ch, listeners };
      shared.set(table, entry);
    }
    entry.listeners.add(onChange);
    return () => {
      const cur = shared.get(table);
      if (!cur || !cur.listeners.delete(onChange)) return;
      if (cur.listeners.size === 0) {
        shared.delete(table);
        try { sb.removeChannel(cur.ch); } catch { /* 이미 닫혔으면 무시 */ }
      }
    };
  };

  /* ── 실시간 구독 ──────────────────────────────────────────────────────
     테이블이 바뀌면 다시 조회한다. 변경이 몰아칠 때(사진 여러 장 업로드 등)
     한 번만 조회하도록 묶는다 — 예전에는 바뀐 횟수만큼 전부 다시 읽어서
     화면이 여러 번 깜빡였다. */
  /* 이 알림이 내 조회 결과를 바꿀 수 있나.
     같은 테이블이라도 수유 구독은 편지가 추가됐다고 다시 읽을 필요가 없다.
     INSERT·UPDATE 는 바뀐 행이 통째로 오므로 등호 조건으로 거를 수 있고,
     DELETE 는 id 만 오므로 거르지 않는다(모르면 읽는다). */
  const concerns = (eqs: Array<[string, unknown]>, p?: ChangePayload): boolean => {
    if (!p || !eqs.length) return true;
    if (p.eventType !== "INSERT" && p.eventType !== "UPDATE") return true;
    const row = p.new;
    if (!row) return true;
    return eqs.every(([col, v]) => !(col in row) || row[col] === v);
  };

  function watchRows(
    name: string,
    build: (q: MinimalQuery) => MinimalQuery,
    cb: (rows: Row[]) => void,
    errCb?: (e: unknown) => void,
    eqs: Array<[string, unknown]> = [],
  ): Unsubscribe {
    const M = mapperOf(name);
    let alive = true;
    let timer: unknown = null;

    const run = async () => {
      try {
        const { data, error } = await build(sb.from(M.table).select("*")).then((r) => r);
        if (!alive) return;
        if (error) { errCb?.(error); return; }
        cb(data || []);
      } catch (e) {
        if (alive) errCb?.(e);
      }
    };
    const schedule = (payload?: ChangePayload) => {
      if (!alive || !concerns(eqs, payload)) return;
      if (debounceMs <= 0) { void run(); return; }
      if (timer !== null) clearT(timer);
      timer = setT(() => { timer = null; void run(); }, debounceMs);
    };

    void run();
    const stop = listenTable(M.table, schedule);

    return () => {
      alive = false;
      if (timer !== null) clearT(timer);
      stop();
    };
  }

  /** 지시(SV)를 실제 값으로 바꿔 넣는다. cur 은 지금 저장된 행. */
  const resolveRow = (row: Row, cur: Row | null): Row => {
    const out: Row = { ...row };
    for (const k of Object.keys(out)) {
      if (isSV(out[k])) out[k] = applySV(cur ? cur[k] : null, out[k] as never);
    }
    return out;
  };
  const resolveJsonb = (data: Row, base: Row): Row => {
    const merged: Row = { ...base };
    for (const [k, v] of Object.entries(data)) merged[k] = isSV(v) ? applySV(base[k], v) : v;
    return merged;
  };

  /* ── 한 건 다루기 ─────────────────────────────────────────────────── */
  function docHandle(name: string, id: string) {
    const M = mapperOf(name);
    const readRow = async (): Promise<Row | null> => {
      const { data } = await sb.from(M.table).select("*").eq("id", id).maybeSingle();
      return data || null;
    };

    return {
      id,
      get: async (): Promise<DocSnapshot> => {
        const r = await readRow();
        return { exists: !!r, id, data: () => (r ? M.fromDb(r) : null) };
      },
      set: async (obj: Row, opt?: { merge?: boolean }): Promise<void> => {
        const merge = !!opt?.merge;
        const cur = merge ? await readRow() : null;
        const { row, data } = M.split(obj);
        const payload: Row = { ...resolveRow(row, cur), id };
        if (data) {
          const base = merge ? ((cur?.data as Row) || {}) : {};
          payload.data = resolveJsonb(data, base);
        }
        const { error } = await sb.from(M.table).upsert(payload, { onConflict: "id" });
        if (error) throw error;
      },
      update: async (obj: Row): Promise<void> => {
        const cur = await readRow();
        const { row, data } = M.split(obj);
        const payload: Row = resolveRow(row, cur);
        if (data && Object.keys(data).length) {
          payload.data = resolveJsonb(data, (cur?.data as Row) || {});
        }
        const { error } = await sb.from(M.table).update(payload).eq("id", id);
        if (error) throw error;
      },
      delete: async (): Promise<void> => {
        const { error } = await sb.from(M.table).delete().eq("id", id);
        if (error) throw error;
      },
      onSnapshot: (cb: (s: DocSnapshot) => void, errCb?: (e: unknown) => void) =>
        watchRows(name, (q) => q.eq("id", id), (rows) => {
          const r = rows[0];
          cb({ exists: !!r, id, data: () => (r ? M.fromDb(r) : null) });
        }, errCb, [["id", id]]),
      /* Firebase 시절의 users/{uid}/savedPhotos 하위 컬렉션.
         Supabase 에서는 saved_photos 테이블 한 장이라, 이름으로 갈라 보낸다. */
      collection: (sub: string) => {
        if (sub === "savedPhotos") return savedPhotosHandle(id);
        throw new Error(`알 수 없는 하위 컬렉션: ${sub}`);
      },
    };
  }

  /* ── 조건 붙이기 ──────────────────────────────────────────────────── */
  type Op =
    | { k: "where"; f: string; v: unknown }
    | { k: "order"; f: string; dir?: string }
    | { k: "limit"; n: number };

  /** where 조건을 DB 열 이름과 값으로 (조회와 알림 거르기가 같은 것을 쓴다) */
  const eqsOf = (name: string, ops: Op[]): Array<[string, unknown]> => {
    const F = FIELD_COL[name] || {};
    const out: Array<[string, unknown]> = [];
    for (const o of ops) {
      if (o.k !== "where") continue;
      // 역할은 화면 이름으로 들어오므로 DB 이름으로 바꿔 찾는다
      const v = o.f === "role" ? (ROLE_TO_DB[String(o.v)] ?? o.v) : o.v;
      out.push([F[o.f] || o.f, v]);
    }
    return out;
  };

  const applyOps = (q: MinimalQuery, name: string, ops: Op[]): MinimalQuery => {
    const F = FIELD_COL[name] || {};
    const eqs = eqsOf(name, ops);
    let out = q;
    let i = 0;
    for (const o of ops) {
      if (o.k === "where") {
        const [col, v] = eqs[i++]!;
        out = out.eq(col, v);
      } else if (o.k === "order") {
        out = out.order(F[o.f] || o.f, { ascending: o.dir !== "desc", nullsFirst: false });
      } else if (o.k === "limit") {
        out = out.limit(o.n);
      }
    }
    return out;
  };

  function collHandle(name: string) {
    const M = mapperOf(name);
    const make = (ops: Op[]) => ({
      /** op 은 "==" 만 받는다. 다른 것을 조용히 등호로 바꾸면 엉뚱한 결과가 나온다. */
      where(f: string, op: string, v: unknown) {
        if (op !== "==" && op !== "=") {
          throw new Error(`where 는 "==" 만 지원합니다 (받은 값: ${op}). 나머지는 화면에서 걸러주세요.`);
        }
        return make([...ops, { k: "where", f, v }]);
      },
      orderBy: (f: string, dir?: string) => make([...ops, { k: "order", f, dir }]),
      limit: (n: number) => make([...ops, { k: "limit", n }]),
      doc: (id: string) => docHandle(name, id),
      add: async (obj: Row): Promise<{ id: string }> => {
        const { row, data } = M.split(obj);
        const payload = resolveRow(row, null);
        if (data) payload.data = resolveJsonb(data, {});
        const { data: ins, error } = await sb.from(M.table).insert(payload).select("id").single();
        if (error) throw error;
        if (!ins) throw new Error("저장은 됐지만 결과를 받지 못했어요.");
        return { id: String(ins.id) };
      },
      get: async (): Promise<QuerySnapshot> => {
        const { data, error } = await applyOps(sb.from(M.table).select("*"), name, ops).then((r) => r);
        if (error) throw error;
        return { docs: (data || []).map((r) => ({ id: String(r.id), data: () => M.fromDb(r) })) };
      },
      onSnapshot: (cb: (s: QuerySnapshot) => void, errCb?: (e: unknown) => void) =>
        watchRows(name, (q) => applyOps(q, name, ops), (rows) => {
          cb({ docs: rows.map((r) => ({ id: String(r.id), data: () => M.fromDb(r) })) });
        }, errCb, eqsOf(name, ops)),
    });
    return make([]);
  }

  /* ── 아기 정보 (families 의 한 행) ─────────────────────────────────── */
  let myFamilyId: string | null = null;

  const loadFamily = async (): Promise<Row | null> => {
    // RLS 가 내 가족 행만 돌려주므로 조건 없이 첫 행을 쓴다
    const { data } = await sb.from("families").select("*").limit(1).maybeSingle();
    if (data) myFamilyId = String(data.id);
    return data || null;
  };

  function watchFamily(cb: (s: { exists: boolean; data: () => Row | null }) => void, errCb?: (e: unknown) => void) {
    let alive = true;
    let timer: unknown = null;
    const run = async () => {
      try {
        const { data, error } = await sb.from("families").select("*").limit(1).maybeSingle();
        if (!alive) return;
        if (error) { errCb?.(error); return; }
        if (data) myFamilyId = String(data.id);
        cb({ exists: !!data, data: () => (data ? (data.baby as Row) : null) });
      } catch (e) {
        if (alive) errCb?.(e);
      }
    };
    const schedule = () => {
      if (!alive) return;
      if (debounceMs <= 0) { void run(); return; }
      if (timer !== null) clearT(timer);
      timer = setT(() => { timer = null; void run(); }, debounceMs);
    };
    void run();
    const stop = listenTable("families", schedule);
    return () => {
      alive = false;
      if (timer !== null) clearT(timer);
      stop();
    };
  }

  const settingsHandle = () => ({
    onSnapshot: watchFamily,
    get: async () => {
      const f = await loadFamily();
      return { exists: !!f, data: () => (f ? (f.baby as Row) : null) };
    },
    set: async (obj: Row, opt?: { merge?: boolean }): Promise<void> => {
      const f = await loadFamily();
      if (!f) throw new Error("가족 정보를 찾을 수 없어요. 다시 로그인해주세요.");
      const base = opt?.merge ? ((f.baby as Row) || {}) : {};
      const { error } = await sb.from("families").update({ baby: { ...base, ...obj } }).eq("id", String(f.id));
      if (error) throw error;
    },
  });

  /* ── 저장한 사진 ──────────────────────────────────────────────────── */
  function savedPhotosHandle(uid: string) {
    const self = {
      // 정렬은 아래에서 savedAt 내림차순으로 고정한다. 체이닝만 받아넘긴다.
      orderBy: () => self,
      limit: () => self,
      where: () => self,
      doc: (mediaId: string) => ({
        set: async (): Promise<void> => {
          const { error } = await sb.from("saved_photos")
            .upsert({ user_id: uid, media_id: mediaId }, { onConflict: "user_id,media_id" });
          if (error) throw error;
        },
        delete: async (): Promise<void> => {
          const { error } = await sb.from("saved_photos").delete().eq("user_id", uid).eq("media_id", mediaId);
          if (error) throw error;
        },
      }),
      onSnapshot: (cb: (s: QuerySnapshot) => void, errCb?: (e: unknown) => void) => {
        let alive = true;
        let timer: unknown = null;
        const run = async () => {
          try {
            const { data, error } = await sb.from("saved_photos").select("*")
              .eq("user_id", uid).order("saved_at", { ascending: false, nullsFirst: false }).then((r) => r);
            if (!alive) return;
            if (error) { errCb?.(error); return; }
            cb({
              docs: (data || []).map((r) => ({
                id: String(r.media_id),
                data: () => ({ photoRef: r.media_id, savedAt: r.saved_at }),
              })),
            });
          } catch (e) {
            if (alive) errCb?.(e);
          }
        };
        const schedule = () => {
          if (!alive) return;
          if (debounceMs <= 0) { void run(); return; }
          if (timer !== null) clearT(timer);
          timer = setT(() => { timer = null; void run(); }, debounceMs);
        };
        void run();
        const stop = listenTable("saved_photos", schedule);
        return () => {
          alive = false;
          if (timer !== null) clearT(timer);
          stop();
        };
      },
    };
    return self;
  }

  const COL = {
    records: () => collHandle("records"),
    photos: () => collHandle("photos"),
    users: () => collHandle("users"),
    albums: () => collHandle("albums"),
    settings: settingsHandle,
  };

  return {
    COL,
    /** 컬렉션 핸들 — users/{uid}/savedPhotos 대응 */
    savedPhotosHandle,
    loadFamily,
    familyId: () => myFamilyId,
    resetFamilyId: () => { myFamilyId = null; },
    /** 서버 기준 '지금' */
    TS: () => SV.serverTimestamp(),
  };
}

export type LegacyStore = ReturnType<typeof createStore>;

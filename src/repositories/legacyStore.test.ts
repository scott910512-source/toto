import { describe, it, expect, vi } from "vitest";
import { createStore, type MinimalClient, type MinimalQuery, type MinimalChannel } from "./legacyStore";
import { SV } from "@/lib/fieldValues";

type Row = Record<string, unknown>;

/* 가짜 Supabase — 실제로 행을 담아두고 조건을 걸러준다.
   덕분에 "저장했다고 했는데 정말 그렇게 들어갔나" 를 눈으로 확인할 수 있다. */
function fakeClient(seed: Record<string, Row[]> = {}) {
  const db: Record<string, Row[]> = JSON.parse(JSON.stringify(seed));
  const log: Array<{ op: string; table: string; payload?: unknown; opts?: unknown }> = [];
  const channels: Array<{ name: string; table: string; fire: () => void; removed: boolean }> = [];
  let nextId = 1;

  function query(table: string): MinimalQuery {
    let rows = (db[table] || []).slice();
    let pending: null | { kind: "update"; o: Row } | { kind: "delete" } = null;
    const eqs: Array<[string, unknown]> = [];

    const api: MinimalQuery = {
      select: () => api,
      eq: (col, v) => {
        eqs.push([col, v]);
        if (pending?.kind === "update") {
          const patch = pending.o;
          let n = 0;
          for (const r of db[table] || []) {
            if (eqs.every(([c, val]) => r[c] === val)) { Object.assign(r, patch); n++; }
          }
          log.push({ op: "update", table, payload: patch });
          return { ...api, then: (res) => Promise.resolve(res({ data: null, error: n ? null : null })) };
        }
        if (pending?.kind === "delete") {
          const before = (db[table] || []).length;
          db[table] = (db[table] || []).filter((r) => !eqs.every(([c, val]) => r[c] === val));
          log.push({ op: "delete", table, payload: before - db[table].length });
          return { ...api, then: (res) => Promise.resolve(res({ data: null, error: null })) };
        }
        rows = rows.filter((r) => r[col] === v);
        return api;
      },
      order: (col, opt) => {
        log.push({ op: "order", table, payload: col, opts: opt });
        rows = rows.slice().sort((a, b) => {
          const x = String(a[col] ?? ""), y = String(b[col] ?? "");
          return opt.ascending ? x.localeCompare(y) : y.localeCompare(x);
        });
        return api;
      },
      limit: (n) => { rows = rows.slice(0, n); return api; },
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      insert: (o) => {
        const row = { id: `new${nextId++}`, ...o };
        (db[table] = db[table] || []).push(row);
        log.push({ op: "insert", table, payload: row });
        return { select: () => ({ single: () => Promise.resolve({ data: { id: row.id }, error: null }) }) };
      },
      upsert: (o, opt) => {
        log.push({ op: "upsert", table, payload: o, opts: opt });
        const list = (db[table] = db[table] || []);
        const key = opt?.onConflict?.split(",").map((s) => s.trim()) ?? ["id"];
        const found = list.find((r) => key.every((k) => r[k] === o[k]));
        if (found) Object.assign(found, o); else list.push({ ...o });
        return Promise.resolve({ error: null });
      },
      update: (o) => { pending = { kind: "update", o }; return api; },
      delete: () => { pending = { kind: "delete" }; return api; },
      then: (res) => Promise.resolve(res({ data: rows, error: null })),
    };
    return api;
  }

  const client: MinimalClient = {
    from: (table) => query(table),
    channel: (name) => {
      const entry = { name, table: "", fire: () => {}, removed: false };
      channels.push(entry);
      const ch: MinimalChannel = {
        on: (_ev, filter, cb) => {
          entry.table = (filter as { table: string }).table;
          entry.fire = cb;
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: () => {
      const last = channels[channels.length - 1];
      if (last) last.removed = true;
    },
  };

  return { client, db, log, channels };
}

/** 타이머를 우리가 돌린다 — 실제 시간을 기다리지 않게 */
function manualTimers() {
  const queue: Array<() => void> = [];
  return {
    setTimeoutFn: (fn: () => void) => { queue.push(fn); return queue.length; },
    clearTimeoutFn: (id: unknown) => { const i = (id as number) - 1; if (queue[i]) queue[i] = () => {}; },
    flush: () => { const q = queue.splice(0); for (const fn of q) fn(); },
    pending: () => queue.length,
  };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe("기록 저장", () => {
  it("공통 컬럼과 data 를 나눠 넣는다", async () => {
    const f = fakeClient({ records: [] });
    const store = createStore(f.client);
    const { id } = await store.COL.records().add({
      type: "feeding", at: new Date("2026-05-01T10:00:00Z"),
      createdBy: "u1", creatorName: "아부지요", kind: "breast", amount: 120,
    });
    expect(id).toMatch(/^new/);
    const row = f.db.records![0]!;
    expect(row.type).toBe("feeding");
    expect(row.at).toBe("2026-05-01T10:00:00.000Z");
    expect(row.created_by).toBe("u1");
    expect(row.data).toEqual({ kind: "breast", amount: 120 });
  });

  it("family_id 를 보내지 않는다 (DB 기본값이 채운다)", async () => {
    const f = fakeClient({ records: [] });
    await createStore(f.client).COL.records().add({ type: "memo", text: "안녕" });
    expect(Object.keys(f.db.records![0]!)).not.toContain("family_id");
  });

  it("'지금' 지시는 저장 시점의 시각으로 바뀐다", async () => {
    const f = fakeClient({ records: [] });
    await createStore(f.client).COL.records().add({ type: "memo", at: SV.serverTimestamp() });
    expect(String(f.db.records![0]!.at)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("한 건 수정 — 지금 값을 읽어서 반영한다", () => {
  it("숫자 더하기가 저장된 값에 더해진다", async () => {
    const f = fakeClient({ profiles: [{ id: "u1", letter_count: 4 }] });
    await createStore(f.client).COL.users().doc("u1").update({ letterCount: SV.increment(1) });
    expect(f.db.profiles![0]!.letter_count).toBe(5);
  });

  it("값이 없던 자리에도 더해진다", async () => {
    const f = fakeClient({ profiles: [{ id: "u1" }] });
    await createStore(f.client).COL.users().doc("u1").update({ letterCount: SV.increment(1) });
    expect(f.db.profiles![0]!.letter_count).toBe(1);
  });

  it("배열에 넣을 때 중복으로 쌓이지 않는다", async () => {
    const f = fakeClient({ profiles: [{ id: "u1", login_days: ["2026-05-01"] }] });
    const store = createStore(f.client);
    await store.COL.users().doc("u1").update({ loginDays: SV.arrayUnion("2026-05-01") });
    expect(f.db.profiles![0]!.login_days).toEqual(["2026-05-01"]);
    await store.COL.users().doc("u1").update({ loginDays: SV.arrayUnion("2026-05-02") });
    expect(f.db.profiles![0]!.login_days).toEqual(["2026-05-01", "2026-05-02"]);
  });

  it("data 안의 다른 값을 지우지 않는다", async () => {
    // 부분 수정인데 data 를 통째로 덮어쓰면 함께 적어둔 내용이 사라진다
    const f = fakeClient({ records: [{ id: "r1", type: "feeding", data: { kind: "breast", amount: 120, note: "잘 먹음" } }] });
    await createStore(f.client).COL.records().doc("r1").update({ amount: 150 });
    expect(f.db.records![0]!.data).toEqual({ kind: "breast", amount: 150, note: "잘 먹음" });
  });

  it("건드리지 않은 컬럼은 그대로 둔다", async () => {
    const f = fakeClient({ records: [{ id: "r1", type: "feeding", created_by: "u1", data: {} }] });
    await createStore(f.client).COL.records().doc("r1").update({ at: new Date("2026-05-02T00:00:00Z") });
    expect(f.db.records![0]!.created_by).toBe("u1");
    expect(f.db.records![0]!.type).toBe("feeding");
  });

  it("오류가 나면 조용히 넘기지 않고 던진다", async () => {
    const f = fakeClient({ records: [{ id: "r1", type: "memo" }] });
    const broken: MinimalClient = {
      ...f.client,
      from: (t) => ({ ...f.client.from(t), update: () => ({ ...f.client.from(t), eq: () => Promise.resolve({ error: { message: "권한 없음" } }) as never }) }),
    };
    await expect(createStore(broken).COL.records().doc("r1").update({ text: "x" }))
      .rejects.toMatchObject({ message: "권한 없음" });
  });
});

describe("합쳐 쓰기 (set merge)", () => {
  it("merge 면 data 의 기존 값을 남긴다", async () => {
    const f = fakeClient({ records: [{ id: "r1", type: "memo", data: { a: 1, b: 2 } }] });
    await createStore(f.client).COL.records().doc("r1").set({ type: "memo", b: 3 }, { merge: true });
    expect(f.db.records![0]!.data).toEqual({ a: 1, b: 3 });
  });

  it("merge 가 아니면 data 를 새로 쓴다", async () => {
    const f = fakeClient({ records: [{ id: "r1", type: "memo", data: { a: 1, b: 2 } }] });
    await createStore(f.client).COL.records().doc("r1").set({ type: "memo", b: 3 });
    expect(f.db.records![0]!.data).toEqual({ b: 3 });
  });
});

describe("조건 붙이기", () => {
  it("화면 이름을 컬럼 이름으로 바꿔 찾는다", async () => {
    const f = fakeClient({
      media: [
        { id: "m1", uploaded_by: "u1", caption: "가" },
        { id: "m2", uploaded_by: "u2", caption: "나" },
      ],
    });
    const snap = await createStore(f.client).COL.photos().where("uploadedBy", "==", "u1").get();
    expect(snap.docs.map((d) => d.data().caption)).toEqual(["가"]);
  });

  it("역할은 화면 이름으로 물어도 DB 이름으로 찾는다", async () => {
    const f = fakeClient({ profiles: [{ id: "u1", role: "parent" }, { id: "u2", role: "gallery_only" }] });
    const snap = await createStore(f.client).COL.users().where("role", "==", "member").get();
    expect(snap.docs.map((d) => d.id)).toEqual(["u1"]);
  });

  it("정렬 방향과 빈 값 위치를 정해서 넘긴다", async () => {
    const f = fakeClient({ records: [{ id: "a", at: "1" }, { id: "b", at: "2" }] });
    await createStore(f.client).COL.records().orderBy("at", "desc").get();
    const order = f.log.find((l) => l.op === "order");
    expect(order?.payload).toBe("at");
    expect(order?.opts).toEqual({ ascending: false, nullsFirst: false });
  });

  it("'==' 이 아닌 조건은 조용히 등호로 바꾸지 않고 막는다", () => {
    // 예전에는 연산자를 무시하고 전부 등호로 처리해서, 범위 조건을 쓰면
    // 엉뚱한 결과가 조용히 나왔다
    const f = fakeClient({ records: [] });
    const coll = createStore(f.client).COL.records();
    expect(() => coll.where("at", ">=", "2026-01-01")).toThrow(/"==" 만 지원/);
  });

  it("모르는 컬렉션은 바로 알려준다", () => {
    const f = fakeClient({});
    // @ts-expect-error 일부러 없는 이름
    expect(() => createStore(f.client).COL.nope?.()).toThrow;
  });
});

describe("실시간 구독", () => {
  it("처음에 한 번 읽고, 바뀌면 다시 읽는다", async () => {
    const f = fakeClient({ records: [{ id: "r1", type: "memo", data: {} }] });
    const t = manualTimers();
    const store = createStore(f.client, { setTimeoutFn: t.setTimeoutFn, clearTimeoutFn: t.clearTimeoutFn });
    const cb = vi.fn();
    const off = store.COL.records().onSnapshot(cb);
    await settle();
    expect(cb).toHaveBeenCalledTimes(1);

    f.db.records!.push({ id: "r2", type: "memo", data: {} });
    f.channels[0]!.fire();
    t.flush();
    await settle();
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb.mock.calls[1]![0].docs).toHaveLength(2);
    off();
  });

  it("변경이 몰아쳐도 한 번만 다시 읽는다", async () => {
    // 사진을 열 장 올리면 예전에는 열 번 전부 다시 읽어 화면이 깜빡였다
    const f = fakeClient({ media: [] });
    const t = manualTimers();
    const store = createStore(f.client, { setTimeoutFn: t.setTimeoutFn, clearTimeoutFn: t.clearTimeoutFn });
    const cb = vi.fn();
    const off = store.COL.photos().onSnapshot(cb);
    await settle();
    expect(cb).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 10; i++) f.channels[0]!.fire();
    t.flush();
    await settle();
    expect(cb).toHaveBeenCalledTimes(2);   // 10번이 아니라 1번
    off();
  });

  it("구독을 끊으면 더 이상 부르지 않는다", async () => {
    const f = fakeClient({ records: [] });
    const t = manualTimers();
    const store = createStore(f.client, { setTimeoutFn: t.setTimeoutFn, clearTimeoutFn: t.clearTimeoutFn });
    const cb = vi.fn();
    const off = store.COL.records().onSnapshot(cb);
    await settle();
    off();
    f.channels[0]!.fire();
    t.flush();
    await settle();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(f.channels[0]!.removed).toBe(true);
  });

  it("읽다가 터져도 앱을 멈추지 않고 알려준다", async () => {
    const boom: MinimalClient = {
      from: () => { throw new Error("네트워크 끊김"); },
      channel: () => ({ on: () => ({ on: () => ({}), subscribe: () => ({}) } as never), subscribe: () => ({} as never) }),
      removeChannel: () => {},
    };
    const err = vi.fn();
    createStore(boom).COL.records().onSnapshot(() => {}, err);
    await settle();
    expect(err).toHaveBeenCalled();
  });
});

describe("아기 정보 (families 한 행)", () => {
  it("조건 없이 첫 행을 쓴다 (RLS 가 내 가족만 돌려준다)", async () => {
    const f = fakeClient({ families: [{ id: "f1", baby: { name: "또또", dueDate: "2026-12-14" } }] });
    const snap = await createStore(f.client).COL.settings().get();
    expect(snap.exists).toBe(true);
    expect(snap.data()).toEqual({ name: "또또", dueDate: "2026-12-14" });
  });

  it("합쳐 저장하면 기존 값을 남긴다", async () => {
    const f = fakeClient({ families: [{ id: "f1", baby: { name: "또또", sex: "male" } }] });
    await createStore(f.client).COL.settings().set({ dueDate: "2026-12-14" }, { merge: true });
    expect(f.db.families![0]!.baby).toEqual({ name: "또또", sex: "male", dueDate: "2026-12-14" });
  });

  it("가족 정보가 없으면 무슨 일인지 말해준다", async () => {
    const f = fakeClient({ families: [] });
    await expect(createStore(f.client).COL.settings().set({ name: "x" }))
      .rejects.toThrow(/가족 정보를 찾을 수 없어요/);
  });

  it("읽으면 우리 가족 id 를 기억한다 (사진 경로에 쓴다)", async () => {
    const f = fakeClient({ families: [{ id: "f1", baby: {} }] });
    const store = createStore(f.client);
    expect(store.familyId()).toBeNull();
    await store.loadFamily();
    expect(store.familyId()).toBe("f1");
    store.resetFamilyId();          // 로그아웃 시
    expect(store.familyId()).toBeNull();
  });
});

describe("저장한 사진", () => {
  it("같은 사진을 두 번 저장해도 한 건이다", async () => {
    const f = fakeClient({ saved_photos: [] });
    const h = createStore(f.client).savedPhotosHandle("u1");
    await h.doc("m1").set();
    await h.doc("m1").set();
    expect(f.db.saved_photos).toHaveLength(1);
  });

  it("내 것만 지운다", async () => {
    const f = fakeClient({
      saved_photos: [
        { user_id: "u1", media_id: "m1" },
        { user_id: "u2", media_id: "m1" },
      ],
    });
    await createStore(f.client).savedPhotosHandle("u1").doc("m1").delete();
    expect(f.db.saved_photos).toEqual([{ user_id: "u2", media_id: "m1" }]);
  });

  it("체이닝을 받아넘겨도 깨지지 않는다", async () => {
    // 화면이 .orderBy(...).limit(...) 을 붙여 부르는 곳이 있다
    const f = fakeClient({ saved_photos: [{ user_id: "u1", media_id: "m1", saved_at: "2026-05-01" }] });
    const h = createStore(f.client).savedPhotosHandle("u1");
    const cb = vi.fn();
    const off = h.orderBy().limit().where().onSnapshot(cb);
    await settle();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]![0].docs[0].data()).toEqual({ photoRef: "m1", savedAt: "2026-05-01" });
    off();
  });
});

describe("하위 컬렉션 (users/{uid}/savedPhotos)", () => {
  it("Firebase 시절 문법이 그대로 동작한다", async () => {
    const f = fakeClient({ saved_photos: [] });
    const store = createStore(f.client);
    await store.COL.users().doc("u1").collection("savedPhotos").doc("m1").set();
    expect(f.db.saved_photos).toEqual([{ user_id: "u1", media_id: "m1" }]);
  });

  it("없는 하위 컬렉션은 조용히 null 을 주지 않고 알려준다", () => {
    // 예전에는 null 을 돌려줘서, 쓰는 쪽에서 "null 의 doc" 이라는
    // 엉뚱한 오류로 터졌다. 어디가 잘못인지 알 수 없었다.
    const f = fakeClient({});
    expect(() => createStore(f.client).COL.users().doc("u1").collection("없는것"))
      .toThrow(/알 수 없는 하위 컬렉션/);
  });
});

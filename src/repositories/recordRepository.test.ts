import { describe, it, expect, vi, beforeEach } from "vitest";

/* Supabase 쿼리 빌더를 흉내낸 목 */
const state = { rows: [] as Record<string, unknown>[], lastInsert: null as unknown, lastUpdate: null as unknown };
function builder() {
  const api: Record<string, unknown> = {};
  const chain = () => api;
  Object.assign(api, {
    select: chain, eq: chain, order: chain,
    limit: () => Promise.resolve({ data: state.rows, error: null }),
    maybeSingle: () => Promise.resolve({ data: state.rows[0] ?? null, error: null }),
    insert: (o: unknown) => { state.lastInsert = o; return { select: () => ({ single: () => Promise.resolve({ data: { id: "new1" }, error: null }) }) }; },
    update: (o: unknown) => { state.lastUpdate = o; return { eq: () => Promise.resolve({ error: null }) }; },
    delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    then: (r: (v: unknown) => unknown) => Promise.resolve({ data: state.rows, error: null }).then(r),
  });
  return api;
}
vi.mock("@/lib/supabase", () => ({
  sb: () => ({
    from: builder,
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: vi.fn(),
  }),
}));

import { listByType, create, update } from "./recordRepository";

beforeEach(() => { state.rows = []; state.lastInsert = null; state.lastUpdate = null; });

describe("recordRepository", () => {
  it("data 를 펼쳐 모델로 돌려준다", async () => {
    state.rows = [{ id: "r1", type: "feeding", at: "2026-09-27T00:00:00Z",
      created_at: "x", created_by: "u1", creator_name: "엄마", data: { amount: 120 } }];
    const [r] = await listByType("feeding");
    expect(r!.amount).toBe(120);
    expect(r!.creatorName).toBe("엄마");
  });

  it("작성자를 심고 상세는 data 로 보낸다", async () => {
    const id = await create("feeding", { amount: 120, kind: "formula" }, { id: "u1", name: "엄마" });
    expect(id).toBe("new1");
    const ins = state.lastInsert as Record<string, unknown>;
    expect(ins.type).toBe("feeding");
    expect(ins.created_by).toBe("u1");
    expect(ins.creator_name).toBe("엄마");
    expect((ins.data as Record<string, unknown>).amount).toBe(120);
    // family_id 는 프론트에서 넣지 않는다 (DB 기본값이 채운다)
    expect(ins.family_id).toBeUndefined();
  });

  it("수정은 기존 data 와 합친다", async () => {
    state.rows = [{ data: { amount: 120, kind: "formula" } }];
    await update("r1", { amount: 150 });
    const upd = state.lastUpdate as Record<string, unknown>;
    const d = upd.data as Record<string, unknown>;
    expect(d.amount).toBe(150);
    expect(d.kind).toBe("formula");   // 기존 값이 사라지지 않아야 한다
  });
});

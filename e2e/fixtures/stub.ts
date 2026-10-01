/* 실제 Supabase 대신 쓰는 목(mock).
   E2E 에서 진짜 가족 데이터를 건드리지 않으면서 화면 흐름을 검증한다. */

export type Seed = {
  role?: "admin" | "parent" | "family" | "gallery_only";
  approved?: boolean;
  babyName?: string;
  dueDate?: string;
  birthDate?: string;
  records?: number;
  photos?: number;
  privatePhotos?: number;
  /** 나만보기 사진을 올린 사람 — 본인이 아니면 못 봐야 한다 */
  privateOwner?: "me" | "other";
  /** 로그인한 사람의 이메일. ADMIN_EMAILS 와의 불일치를 재현할 때 쓴다 */
  email?: string;
  /** 로그인하지 않은 상태로 시작 (로그인 화면을 보려면) */
  loggedOut?: boolean;
  /** 로그인 시 Supabase 가 돌려줄 오류 원문 (영어가 한국어로 바뀌는지 확인) */
  signInError?: string;
  /** DB 보안 수정이 적용돼 있는지 — false 면 해당 함수가 없는 것처럼 답한다 */
  migrated?: boolean;
};

export function stubScript(seed: Seed = {}): string {
  const s: Required<Seed> = {
    role: "admin", approved: true, babyName: "또또",
    dueDate: "2026-12-14", birthDate: "", records: 2, photos: 3,
    privatePhotos: 1, privateOwner: "me", email: "me@t.com",
    loggedOut: false, signInError: "", migrated: true,
    ...seed,
  };

  return `
(function () {
  var now = Date.now();
  var UID = "11111111-1111-1111-1111-111111111111";
  var OTHER = "22222222-2222-2222-2222-222222222222";
  var SEED = ${JSON.stringify(s)};
  window.__E2E = { calls: [], db: null };

  function pic(label, bg) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">' +
      '<rect width="100%" height="100%" fill="' + bg + '"/>' +
      '<text x="50%" y="52%" font-size="90" text-anchor="middle">' + label + '</text></svg>');
  }
  var COLORS = ["#7dd3c0", "#a78bfa", "#fbbf24", "#fb7185", "#60a5fa"];

  var MEDIA = [];
  for (var i = 0; i < SEED.photos; i++) {
    var isPriv = i < SEED.privatePhotos;
    var owner = (isPriv && SEED.privateOwner === "other") ? OTHER : UID;
    MEDIA.push({
      id: "m" + i, family_id: "fam-1", album_id: i === 0 ? "a1" : null,
      storage_path: "fam-1/2026/09/x" + i + "_o.jpg",
      preview_path: "fam-1/2026/09/x" + i + "_p.jpg",
      thumb_path: "fam-1/2026/09/x" + i + "_t.jpg",
      type: "image", category: "baby",
      caption: isPriv ? ("비밀사진" + i) : ("사진" + i),
      uploader_name: owner === UID ? "아부지요" : "엄마", uploaded_by: owner,
      uploaded_at: new Date(now - i * 86400000).toISOString(),
      captured_at: new Date(now - i * 86400000).toISOString(),
      people: [], place: "", gps: null,
      vis: isPriv ? "private" : "public",
      liked_by: [], favorite: false, width: 600, height: 800, bytes: 1000,
      __u: pic(isPriv ? "🔒" : "👶", COLORS[i % 5])
    });
  }

  var RECORDS = [];
  for (var r = 0; r < SEED.records; r++) {
    RECORDS.push({
      id: "r" + r, family_id: "fam-1",
      type: r === 0 ? "letter" : "sleep",
      at: new Date(now - r * 3600000).toISOString(),
      created_at: new Date(now - r * 3600000).toISOString(),
      created_by: UID, creator_name: "아부지요",
      data: r === 0
        ? { title: "사랑하는 또또에게", body: "건강하게 나와줘", vis: "public" }
        : { naptype: "night", durationMin: 480 }
    });
  }

  var PATH = {};
  MEDIA.forEach(function (m) {
    PATH[m.thumb_path] = m.__u; PATH[m.preview_path] = m.__u; PATH[m.storage_path] = m.__u;
  });

  var DB = {
    profiles: [{
      id: UID, email: SEED.email, display_name: "아부지요", role: SEED.role,
      approved: SEED.approved, disabled: false, login_days: [], letter_count: 0,
      family_id: "fam-1", created_at: new Date(now).toISOString()
    }],
    records: RECORDS,
    media: MEDIA,
    albums: [{ id: "a1", family_id: "fam-1", title: "첫 크리스마스", emoji: "🎄", sort_order: 1, created_at: "" }],
    families: [{
      id: "fam-1", name: "또또네", invite_code: "AB3K9Z",
      baby: { name: SEED.babyName, birthDate: SEED.birthDate, dueDate: SEED.dueDate, sex: "male", vaccines: {} }
    }],
    saved_photos: [],
    settings: [{ id: "baby", data: {} }]
  };
  window.__E2E.db = DB;

  /* RLS 를 흉내낸다: 나만보기 사진은 올린 사람과 관리자만 조회된다 */
  function visibleRows(t) {
    var rows = (DB[t] || []).slice();
    if (t === "media") {
      var isAdmin = SEED.role === "admin" && SEED.approved;
      rows = rows.filter(function (m) {
        return m.vis !== "private" || m.uploaded_by === UID || isAdmin;
      });
    }
    if (!SEED.approved && (t === "media" || t === "records")) rows = [];
    return rows;
  }

  function qb(t) {
    var rows = visibleRows(t), pend = null;
    var api = {
      select: function () { return api; },
      eq: function (c, v) {
        if (pend === "del") {
          DB[t] = (DB[t] || []).filter(function (r) { return r[c] !== v; });
          window.__E2E.calls.push({ op: "delete", t: t });
          return Promise.resolve({ error: null });
        }
        if (pend && pend.u) {
          (DB[t] || []).forEach(function (r) { if (r[c] === v) Object.assign(r, pend.u); });
          window.__E2E.calls.push({ op: "update", t: t, patch: pend.u });
          return Promise.resolve({ error: null });
        }
        rows = rows.filter(function (r) { return r[c] === v; });
        return api;
      },
      order: function () { return api; },
      limit: function (n) { rows = rows.slice(0, n); return api; },
      maybeSingle: function () { return Promise.resolve({ data: rows[0] || null, error: null }); },
      single: function () { return Promise.resolve({ data: rows[0] || null, error: null }); },
      insert: function (o) {
        var row = Object.assign({ id: "n" + Math.random().toString(36).slice(2, 8), family_id: "fam-1" }, o);
        (DB[t] = DB[t] || []).push(row);
        window.__E2E.calls.push({ op: "insert", t: t, row: row });
        return { select: function () { return { single: function () {
          return Promise.resolve({ data: { id: row.id }, error: null }); } }; } };
      },
      upsert: function (o) { window.__E2E.calls.push({ op: "upsert", t: t, row: o }); return Promise.resolve({ error: null }); },
      update: function (o) { pend = { u: o }; return api; },
      delete: function () { pend = "del"; return api; },
      then: function (res, rej) { return Promise.resolve({ data: rows, error: null }).then(res, rej); }
    };
    return api;
  }

  window.supabase = { createClient: function () { return {
    auth: {
      getSession: function () {
        return Promise.resolve({ data: { session: SEED.loggedOut ? null : { user: { id: UID, email: SEED.email } } } });
      },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
      signInWithPassword: function (a) {
        window.__E2E.calls.push({ op: "signIn", args: a });
        if (SEED.signInError) return Promise.resolve({ data: null, error: { message: SEED.signInError } });
        return Promise.resolve({ data: { user: { id: UID } }, error: null });
      },
      signUp: function (a) { window.__E2E.calls.push({ op: "signUp", args: a }); return Promise.resolve({ data: { user: { id: UID }, session: {} }, error: null }); },
      resetPasswordForEmail: function () { return Promise.resolve({ error: null }); },
      signOut: function () { window.__E2E.calls.push({ op: "signOut" }); return Promise.resolve({ error: null }); }
    },
    from: qb,
    rpc: function (fn, args) {
      window.__E2E.calls.push({ op: "rpc", fn: fn, args: args });
      if (fn === "my_invite_code") return Promise.resolve({ data: "AB3K9Z", error: null });
      // 보안 수정으로 생기는 함수들 — 적용 전이면 PostgREST 가 PGRST202 로 답한다
      if (fn === "invite_code_exists" || fn === "can_read_media_path") {
        if (!SEED.migrated) {
          return Promise.resolve({
            data: null,
            error: { code: "PGRST202", message: "Could not find the function public." + fn + " in the schema cache" },
          });
        }
        if (fn === "can_read_media_path") return Promise.resolve({ data: true, error: null });
      }
      if (fn === "invite_code_exists") return Promise.resolve({ data: String((args || {}).p_code) === "AB3K9Z", error: null });
      if (fn === "toggle_like") return Promise.resolve({ data: [UID], error: null });
      return Promise.resolve({ data: true, error: null });
    },
    channel: function () { return { on: function () { return this; }, subscribe: function () { return this; } }; },
    removeChannel: function () {},
    storage: { from: function () { return {
      createSignedUrls: function (ps) {
        return Promise.resolve({ data: ps.map(function (p) { return { path: p, signedUrl: PATH[p] || "" }; }), error: null });
      },
      upload: function (p, f) { window.__E2E.calls.push({ op: "upload", path: p, size: f && f.size }); return Promise.resolve({ data: { path: p }, error: null }); },
      remove: function (ps) { window.__E2E.calls.push({ op: "removeFiles", paths: ps }); return Promise.resolve({ error: null }); }
    }; } }
  }; } };

  window.SUPABASE_URL = "https://cuxcxzqfcnofmuusxsvo.supabase.co";
  window.SUPABASE_ANON_KEY = "sb_publishable_E2ETESTKEY123456";
  window.MEDIA_BUCKET = "family-media";
})();
`;
}

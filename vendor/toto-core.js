var TotoCoreBundle = function(exports) {
  "use strict";
  const GESTATION_DAYS = 280;
  const pad2 = (n) => String(n).padStart(2, "0");
  function toDate(v) {
    if (v == null || v === "") return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === "object" && v !== null) {
      const maybe = v;
      if (typeof maybe.toDate === "function") {
        const d2 = maybe.toDate();
        return d2 instanceof Date && !isNaN(d2.getTime()) ? d2 : null;
      }
      if ("seconds" in maybe) {
        return typeof maybe.seconds === "number" ? new Date(maybe.seconds * 1e3) : null;
      }
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  function daysBetween(from, to) {
    return Math.round((midnight(to).getTime() - midnight(from).getTime()) / 864e5);
  }
  function ymd(v) {
    const d = toDate(v);
    return d ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` : "";
  }
  function fmtDot(v) {
    const d = toDate(v);
    return d ? `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}` : "";
  }
  function isSameDay(a, b) {
    const x = ymd(a), y = ymd(b);
    return x !== "" && x === y;
  }
  function fmtTime(v) {
    const d = toDate(v);
    return d ? d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "-";
  }
  function fmtDate(v) {
    const d = toDate(v);
    return d ? d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "-";
  }
  function fmtDateTime(v) {
    const d = toDate(v);
    return d ? `${fmtDate(d)} ${fmtTime(d)}` : "-";
  }
  function ago(v, now = /* @__PURE__ */ new Date()) {
    const d = toDate(v);
    if (!d) return "";
    const m = Math.floor((now.getTime() - d.getTime()) / 6e4);
    if (m < 1) return "방금 전";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 ${m % 60}분 전`;
    return `${Math.floor(h / 24)}일 전`;
  }
  function isValidYmd(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }
  function toLocalInput(v) {
    var _a;
    const d = (_a = toDate(v)) != null ? _a : /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  const fromLocalInput = (s) => s ? new Date(s) : /* @__PURE__ */ new Date();
  function babyAge(baby, now = /* @__PURE__ */ new Date()) {
    if (baby.birthDate && isValidYmd(baby.birthDate)) {
      const born = /* @__PURE__ */ new Date(`${baby.birthDate}T00:00:00`);
      const days = daysBetween(born, now);
      if (days >= 0) {
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30.44);
        return { mode: "born", days, weeks, months, label: `생후 ${days}일 (${weeks}주 / 약 ${months}개월)` };
      }
    }
    if (baby.dueDate && isValidYmd(baby.dueDate)) {
      const due = /* @__PURE__ */ new Date(`${baby.dueDate}T00:00:00`);
      const daysLeft = daysBetween(now, due);
      const gaDays = GESTATION_DAYS - daysLeft;
      const w = Math.floor(gaDays / 7);
      const d = gaDays % 7;
      return {
        mode: "pregnant",
        gaDays,
        gaWeeks: w,
        daysLeft,
        label: gaDays > 0 ? `임신 ${w}주 ${d}일` : "출산 예정 정보를 확인하세요"
      };
    }
    return { mode: "unknown", label: "아기 정보를 설정하세요" };
  }
  function dday(baby, when = /* @__PURE__ */ new Date()) {
    const d = toDate(when);
    if (!d) return "";
    if (baby.birthDate && isValidYmd(baby.birthDate)) {
      const n = daysBetween(/* @__PURE__ */ new Date(`${baby.birthDate}T00:00:00`), d);
      return n >= 0 ? `D+${n}` : "";
    }
    if (baby.dueDate && isValidYmd(baby.dueDate)) {
      const n = daysBetween(d, /* @__PURE__ */ new Date(`${baby.dueDate}T00:00:00`));
      if (n > 0) return `D-${n}`;
      if (n === 0) return "D-DAY";
      return `D+${-n}`;
    }
    return "";
  }
  const clampMinutes = (m) => Math.max(0, Math.min(1440, m));
  function hm(mins) {
    const m = clampMinutes(mins);
    return `${Math.floor(m / 60)}시간 ${Math.round(m % 60)}분`;
  }
  const TABLE = [
    [/Invalid login credentials/i, "이메일 또는 비밀번호가 올바르지 않아요."],
    [/Email not confirmed/i, "이메일 인증이 아직 완료되지 않았어요."],
    [/User already registered|already been registered/i, "이미 가입된 이메일이에요."],
    [/Password should be at least/i, "비밀번호는 6자 이상이어야 해요."],
    [/email_address_invalid|Email address .* is invalid/i, "사용할 수 없는 이메일 주소예요."],
    [/email rate limit exceeded|over_email_send_rate_limit/i, "메일 발송 한도를 넘었어요. 잠시 후 다시 시도해주세요."],
    [/초대코드를 찾을 수 없습니다/, "초대코드를 찾을 수 없습니다. 가족에게 코드를 다시 확인해주세요."],
    [/마지막 관리자는 권한을 낮출 수 없습니다/, "마지막 관리자는 권한을 낮출 수 없어요. 다른 관리자를 먼저 지정해주세요."],
    [/권한은 관리자만 변경할 수 있습니다/, "권한은 관리자만 바꿀 수 있어요."],
    [/row-level security|permission denied|violates/i, "권한이 없어요. 관리자에게 문의해주세요."],
    [/JWT expired|token is expired/i, "로그인이 만료됐어요. 다시 로그인해주세요."],
    [/Failed to fetch|NetworkError|network error/i, "네트워크 연결을 확인해주세요."],
    [/Bucket not found|NoSuchBucket/i, "사진 저장소를 찾을 수 없어요. 설정을 확인해주세요."],
    [/Payload too large|entity too large/i, "파일이 너무 커요. 더 작은 사진으로 올려주세요."]
  ];
  function errMsg(e) {
    var _a, _b, _c;
    const raw = (_c = (_b = (_a = e == null ? void 0 : e.message) != null ? _a : e == null ? void 0 : e.error_description) != null ? _b : e == null ? void 0 : e.msg) != null ? _c : typeof e === "string" ? e : "";
    for (const [re, msg] of TABLE) if (re.test(raw)) return msg;
    return raw || "알 수 없는 오류가 발생했어요.";
  }
  class AppError extends Error {
    constructor(message, cause) {
      super(message);
      this.cause = cause;
      this.name = "AppError";
    }
  }
  function jwtRole(k) {
    var _a;
    try {
      const p = k.split(".")[1];
      if (!p) return null;
      const json = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
      return (_a = json.role) != null ? _a : null;
    } catch {
      return null;
    }
  }
  function diagnoseConfig(url, key) {
    if (!url) return { code: "no-url", msg: "Supabase 주소가 비어 있어요." };
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url.replace(/\/+$/, "")))
      return { code: "bad-url", msg: "Supabase 주소 형식이 올바르지 않아요. (예: https://xxxx.supabase.co)" };
    if (!key) return { code: "no-key", msg: "anon 키가 비어 있어요." };
    if (/^https?:\/\//i.test(key))
      return { code: "url-as-key", msg: "anon 키 자리에 주소를 넣으셨어요. 키는 eyJ… 또는 sb_publishable_… 입니다." };
    if (/^sb_secret_/i.test(key) || jwtRole(key) === "service_role")
      return { code: "secret-key", msg: "⛔ service_role(비밀) 키가 들어 있어요. 즉시 지우고 anon 키로 바꿔주세요." };
    const jwtOk = /^eyJ[\w-]+\.[\w-]+\.?[\w-]*$/.test(key);
    const newOk = /^sb_publishable_[\w-]{10,}$/i.test(key);
    if (!jwtOk && !newOk)
      return { code: "bad-key", msg: "anon 키 형식이 올바르지 않아요. eyJ… 또는 sb_publishable_… 이어야 합니다." };
    return null;
  }
  const BACKUP_VERSION = 3;
  function verifyBackup(b) {
    const s = b.summary;
    const withImage = b.photos.filter((p) => typeof p.url === "string" && p.url.startsWith("data:")).length;
    if (withImage !== s.photosExpected) {
      return {
        ok: false,
        message: `⚠️ 사진 ${withImage}/${s.photosExpected}장만 담겼어요. ${s.photosExpected - withImage}장 실패 — 다시 시도해주세요.`
      };
    }
    return {
      ok: true,
      message: `백업 완료 · 기록 ${s.records}건 · 사진 ${withImage}/${s.photosExpected}장 · 앨범 ${s.albums}개`
    };
  }
  function inspectBackup(raw) {
    var _a;
    const b = raw;
    const base = { version: 0, records: 0, photos: 0, photosWithImage: 0, albums: 0, users: 0, baby: null };
    if (!b || typeof b !== "object") return { ok: false, reason: "파일을 읽을 수 없어요.", ...base };
    if (!Array.isArray(b.records) && !Array.isArray(b.photos))
      return { ok: false, reason: "백업 파일 형식이 아니에요.", ...base };
    const photos2 = Array.isArray(b.photos) ? b.photos : [];
    const withImage = photos2.filter(
      (p) => typeof p.url === "string" && String(p.url).startsWith("data:")
    ).length;
    return {
      ok: true,
      version: typeof b.version === "number" ? b.version : 1,
      records: Array.isArray(b.records) ? b.records.length : 0,
      photos: photos2.length,
      photosWithImage: withImage,
      albums: Array.isArray(b.albums) ? b.albums.length : 0,
      users: Array.isArray(b.users) ? b.users.length : 0,
      baby: (_a = b.baby) != null ? _a : null
    };
  }
  const SV = {
    /** 서버 기준 '지금' — 기기 시계가 틀어져 있어도 쓰기 시점으로 적는다 */
    serverTimestamp: () => ({ __sv: "ts" }),
    increment: (n) => ({ __sv: "inc", n }),
    arrayUnion: (...v) => ({ __sv: "au", v }),
    arrayRemove: (...v) => ({ __sv: "ar", v })
  };
  function isSV(v) {
    return !!v && typeof v === "object" && typeof v.__sv === "string";
  }
  function applySV(cur, sv, now = /* @__PURE__ */ new Date()) {
    if (sv.__sv === "ts") return now.toISOString();
    if (sv.__sv === "inc") {
      const base = typeof cur === "number" && Number.isFinite(cur) ? cur : Number(cur);
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
  function isoOf(v, now = /* @__PURE__ */ new Date()) {
    if (v == null || v === "") return null;
    if (isSV(v)) return now.toISOString();
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
    if (typeof v === "object") {
      const o = v;
      if (typeof o.seconds === "number") return new Date(o.seconds * 1e3).toISOString();
      if (typeof o.toDate === "function") {
        const d2 = o.toDate();
        return d2 instanceof Date && !isNaN(d2.getTime()) ? d2.toISOString() : null;
      }
      return null;
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const ROLE_TO_DB = {
    admin: "admin",
    member: "parent",
    viewer: "gallery_only"
  };
  const ROLE_FROM_DB = {
    admin: "admin",
    parent: "member",
    family: "viewer",
    gallery_only: "viewer"
  };
  const REC_COLS = ["type", "at", "created_at", "created_by", "creator_name"];
  const records = {
    table: "records",
    fromDb: (r) => ({
      id: r.id,
      type: r.type,
      at: r.at,
      createdAt: r.created_at,
      createdBy: r.created_by,
      creatorName: r.creator_name,
      ...r.data && typeof r.data === "object" ? r.data : {}
    }),
    split: (o) => {
      const row = {}, data = {};
      for (const [k, v] of Object.entries(o)) {
        if (k === "id") continue;
        else if (k === "type") row.type = v;
        else if (k === "at") row.at = isoOf(v);
        else if (k === "createdAt") row.created_at = isoOf(v);
        else if (k === "createdBy") row.created_by = v;
        else if (k === "creatorName") row.creator_name = v;
        else data[k] = isSV(v) ? v : v && typeof v === "object" && "seconds" in v ? isoOf(v) : v;
      }
      return { row, data };
    }
  };
  const PHOTO_COLS = {
    albumId: "album_id",
    storagePath: "storage_path",
    previewPath: "preview_path",
    thumbPath: "thumb_path",
    caption: "caption",
    category: "category",
    uploaderName: "uploader_name",
    uploadedBy: "uploaded_by",
    takenAt: "captured_at",
    createdAt: "uploaded_at",
    people: "people",
    place: "place",
    gps: "gps",
    vis: "vis",
    likedBy: "liked_by",
    favorite: "favorite",
    width: "width",
    height: "height",
    bytes: "bytes",
    mime: "mime"
  };
  const photos = {
    table: "media",
    fromDb: (r) => ({
      id: r.id,
      albumId: r.album_id || null,
      // 서명 URL 은 조회 뒤에 주입된다 (__url / __thumb)
      url: r.__url || null,
      thumbUrl: r.__thumb || r.__url || null,
      storagePath: r.storage_path,
      previewPath: r.preview_path,
      thumbPath: r.thumb_path,
      caption: r.caption || "",
      category: r.category || "baby",
      uploaderName: r.uploader_name,
      uploadedBy: r.uploaded_by,
      createdAt: r.uploaded_at,
      takenAt: r.captured_at,
      people: r.people || [],
      place: r.place || "",
      gps: r.gps || null,
      vis: r.vis || "public",
      likedBy: r.liked_by || [],
      favorite: !!r.favorite,
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      type: r.type
    }),
    split: (o) => {
      const row = {};
      for (const [k, v] of Object.entries(o)) {
        if (k === "id" || k === "url" || k === "thumbUrl") continue;
        const c = PHOTO_COLS[k];
        if (!c) continue;
        row[c] = c === "captured_at" || c === "uploaded_at" ? isoOf(v) : v;
      }
      return { row, data: null };
    }
  };
  const ALBUM_COLS = {
    title: "title",
    emoji: "emoji",
    description: "description",
    coverMediaId: "cover_media_id",
    eventDate: "event_date",
    sortOrder: "sort_order",
    createdBy: "created_by"
  };
  const albums = {
    table: "albums",
    fromDb: (r) => ({
      id: r.id,
      title: r.title,
      emoji: r.emoji || "📁",
      description: r.description || "",
      coverMediaId: r.cover_media_id,
      eventDate: r.event_date,
      sortOrder: r.sort_order || 0,
      createdBy: r.created_by,
      createdAt: r.created_at
    }),
    split: (o) => {
      const row = {};
      for (const [k, v] of Object.entries(o)) if (ALBUM_COLS[k]) row[ALBUM_COLS[k]] = v;
      return { row, data: null };
    }
  };
  const users = {
    table: "profiles",
    fromDb: (r) => ({
      uid: r.id,
      id: r.id,
      email: r.email,
      name: r.display_name,
      role: ROLE_FROM_DB[String(r.role)] || "viewer",
      roleDb: r.role,
      approved: r.approved,
      disabled: r.disabled,
      createdAt: r.created_at,
      loginDays: r.login_days || [],
      letterCount: r.letter_count || 0
    }),
    split: (o) => {
      const row = {};
      for (const [k, v] of Object.entries(o)) {
        if (k === "name") row.display_name = v;
        else if (k === "role") row.role = ROLE_TO_DB[String(v)] || v;
        else if (k === "approved") row.approved = v;
        else if (k === "disabled") row.disabled = v;
        else if (k === "email") row.email = v;
        else if (k === "loginDays") row.login_days = v;
        else if (k === "letterCount") row.letter_count = v;
      }
      return { row, data: null };
    }
  };
  const MAPPERS = { records, photos, albums, users };
  const FIELD_COL = {
    records: { type: "type", at: "at", createdAt: "created_at", createdBy: "created_by" },
    photos: {
      albumId: "album_id",
      category: "category",
      takenAt: "captured_at",
      createdAt: "uploaded_at",
      uploadedBy: "uploaded_by",
      vis: "vis",
      favorite: "favorite"
    },
    albums: { sortOrder: "sort_order", createdBy: "created_by", createdAt: "created_at" },
    users: { role: "role", approved: "approved" }
  };
  function createStore(sb, opts = {}) {
    var _a, _b, _c;
    const debounceMs = (_a = opts.debounceMs) != null ? _a : 120;
    const setT = (_b = opts.setTimeoutFn) != null ? _b : (fn, ms) => setTimeout(fn, ms);
    const clearT = (_c = opts.clearTimeoutFn) != null ? _c : (id) => clearTimeout(id);
    let chanSeq = 0;
    const mapperOf = (name) => {
      const M = MAPPERS[name];
      if (!M) throw new Error(`알 수 없는 컬렉션: ${name}`);
      return M;
    };
    function watchRows(name, build, cb, errCb) {
      const M = mapperOf(name);
      let alive = true;
      let timer = null;
      const run = async () => {
        try {
          const { data, error } = await build(sb.from(M.table).select("*")).then((r) => r);
          if (!alive) return;
          if (error) {
            errCb == null ? void 0 : errCb(error);
            return;
          }
          cb(data || []);
        } catch (e) {
          if (alive) errCb == null ? void 0 : errCb(e);
        }
      };
      const schedule = () => {
        if (!alive) return;
        if (debounceMs <= 0) {
          void run();
          return;
        }
        if (timer !== null) clearT(timer);
        timer = setT(() => {
          timer = null;
          void run();
        }, debounceMs);
      };
      void run();
      const ch = sb.channel(`w${M.table}${++chanSeq}`).on("postgres_changes", { event: "*", schema: "public", table: M.table }, schedule).subscribe();
      return () => {
        alive = false;
        if (timer !== null) clearT(timer);
        try {
          sb.removeChannel(ch);
        } catch {
        }
      };
    }
    const resolveRow = (row, cur) => {
      const out = { ...row };
      for (const k of Object.keys(out)) {
        if (isSV(out[k])) out[k] = applySV(cur ? cur[k] : null, out[k]);
      }
      return out;
    };
    const resolveJsonb = (data, base) => {
      const merged = { ...base };
      for (const [k, v] of Object.entries(data)) merged[k] = isSV(v) ? applySV(base[k], v) : v;
      return merged;
    };
    function docHandle(name, id) {
      const M = mapperOf(name);
      const readRow = async () => {
        const { data } = await sb.from(M.table).select("*").eq("id", id).maybeSingle();
        return data || null;
      };
      return {
        id,
        get: async () => {
          const r = await readRow();
          return { exists: !!r, id, data: () => r ? M.fromDb(r) : null };
        },
        set: async (obj, opt) => {
          const merge = !!(opt == null ? void 0 : opt.merge);
          const cur = merge ? await readRow() : null;
          const { row, data } = M.split(obj);
          const payload = { ...resolveRow(row, cur), id };
          if (data) {
            const base = merge ? (cur == null ? void 0 : cur.data) || {} : {};
            payload.data = resolveJsonb(data, base);
          }
          const { error } = await sb.from(M.table).upsert(payload, { onConflict: "id" });
          if (error) throw error;
        },
        update: async (obj) => {
          const cur = await readRow();
          const { row, data } = M.split(obj);
          const payload = resolveRow(row, cur);
          if (data && Object.keys(data).length) {
            payload.data = resolveJsonb(data, (cur == null ? void 0 : cur.data) || {});
          }
          const { error } = await sb.from(M.table).update(payload).eq("id", id);
          if (error) throw error;
        },
        delete: async () => {
          const { error } = await sb.from(M.table).delete().eq("id", id);
          if (error) throw error;
        },
        onSnapshot: (cb, errCb) => watchRows(name, (q) => q.eq("id", id), (rows) => {
          const r = rows[0];
          cb({ exists: !!r, id, data: () => r ? M.fromDb(r) : null });
        }, errCb),
        /* Firebase 시절의 users/{uid}/savedPhotos 하위 컬렉션.
           Supabase 에서는 saved_photos 테이블 한 장이라, 이름으로 갈라 보낸다. */
        collection: (sub) => {
          if (sub === "savedPhotos") return savedPhotosHandle(id);
          throw new Error(`알 수 없는 하위 컬렉션: ${sub}`);
        }
      };
    }
    const applyOps = (q, name, ops) => {
      var _a2;
      const F = FIELD_COL[name] || {};
      let out = q;
      for (const o of ops) {
        if (o.k === "where") {
          const v = o.f === "role" ? (_a2 = ROLE_TO_DB[String(o.v)]) != null ? _a2 : o.v : o.v;
          out = out.eq(F[o.f] || o.f, v);
        } else if (o.k === "order") {
          out = out.order(F[o.f] || o.f, { ascending: o.dir !== "desc", nullsFirst: false });
        } else if (o.k === "limit") {
          out = out.limit(o.n);
        }
      }
      return out;
    };
    function collHandle(name) {
      const M = mapperOf(name);
      const make = (ops) => ({
        /** op 은 "==" 만 받는다. 다른 것을 조용히 등호로 바꾸면 엉뚱한 결과가 나온다. */
        where(f, op, v) {
          if (op !== "==" && op !== "=") {
            throw new Error(`where 는 "==" 만 지원합니다 (받은 값: ${op}). 나머지는 화면에서 걸러주세요.`);
          }
          return make([...ops, { k: "where", f, v }]);
        },
        orderBy: (f, dir) => make([...ops, { k: "order", f, dir }]),
        limit: (n) => make([...ops, { k: "limit", n }]),
        doc: (id) => docHandle(name, id),
        add: async (obj) => {
          const { row, data } = M.split(obj);
          const payload = resolveRow(row, null);
          if (data) payload.data = resolveJsonb(data, {});
          const { data: ins, error } = await sb.from(M.table).insert(payload).select("id").single();
          if (error) throw error;
          if (!ins) throw new Error("저장은 됐지만 결과를 받지 못했어요.");
          return { id: String(ins.id) };
        },
        get: async () => {
          const { data, error } = await applyOps(sb.from(M.table).select("*"), name, ops).then((r) => r);
          if (error) throw error;
          return { docs: (data || []).map((r) => ({ id: String(r.id), data: () => M.fromDb(r) })) };
        },
        onSnapshot: (cb, errCb) => watchRows(name, (q) => applyOps(q, name, ops), (rows) => {
          cb({ docs: rows.map((r) => ({ id: String(r.id), data: () => M.fromDb(r) })) });
        }, errCb)
      });
      return make([]);
    }
    let myFamilyId = null;
    const loadFamily = async () => {
      const { data } = await sb.from("families").select("*").limit(1).maybeSingle();
      if (data) myFamilyId = String(data.id);
      return data || null;
    };
    function watchFamily(cb, errCb) {
      let alive = true;
      let timer = null;
      const run = async () => {
        try {
          const { data, error } = await sb.from("families").select("*").limit(1).maybeSingle();
          if (!alive) return;
          if (error) {
            errCb == null ? void 0 : errCb(error);
            return;
          }
          if (data) myFamilyId = String(data.id);
          cb({ exists: !!data, data: () => data ? data.baby : null });
        } catch (e) {
          if (alive) errCb == null ? void 0 : errCb(e);
        }
      };
      const schedule = () => {
        if (!alive) return;
        if (debounceMs <= 0) {
          void run();
          return;
        }
        if (timer !== null) clearT(timer);
        timer = setT(() => {
          timer = null;
          void run();
        }, debounceMs);
      };
      void run();
      const ch = sb.channel(`wfam${++chanSeq}`).on("postgres_changes", { event: "*", schema: "public", table: "families" }, schedule).subscribe();
      return () => {
        alive = false;
        if (timer !== null) clearT(timer);
        try {
          sb.removeChannel(ch);
        } catch {
        }
      };
    }
    const settingsHandle = () => ({
      onSnapshot: watchFamily,
      get: async () => {
        const f = await loadFamily();
        return { exists: !!f, data: () => f ? f.baby : null };
      },
      set: async (obj, opt) => {
        const f = await loadFamily();
        if (!f) throw new Error("가족 정보를 찾을 수 없어요. 다시 로그인해주세요.");
        const base = (opt == null ? void 0 : opt.merge) ? f.baby || {} : {};
        const { error } = await sb.from("families").update({ baby: { ...base, ...obj } }).eq("id", String(f.id));
        if (error) throw error;
      }
    });
    function savedPhotosHandle(uid) {
      const self = {
        // 정렬은 아래에서 savedAt 내림차순으로 고정한다. 체이닝만 받아넘긴다.
        orderBy: () => self,
        limit: () => self,
        where: () => self,
        doc: (mediaId) => ({
          set: async () => {
            const { error } = await sb.from("saved_photos").upsert({ user_id: uid, media_id: mediaId }, { onConflict: "user_id,media_id" });
            if (error) throw error;
          },
          delete: async () => {
            const { error } = await sb.from("saved_photos").delete().eq("user_id", uid).eq("media_id", mediaId);
            if (error) throw error;
          }
        }),
        onSnapshot: (cb, errCb) => {
          let alive = true;
          let timer = null;
          const run = async () => {
            try {
              const { data, error } = await sb.from("saved_photos").select("*").eq("user_id", uid).order("saved_at", { ascending: false, nullsFirst: false }).then((r) => r);
              if (!alive) return;
              if (error) {
                errCb == null ? void 0 : errCb(error);
                return;
              }
              cb({
                docs: (data || []).map((r) => ({
                  id: String(r.media_id),
                  data: () => ({ photoRef: r.media_id, savedAt: r.saved_at })
                }))
              });
            } catch (e) {
              if (alive) errCb == null ? void 0 : errCb(e);
            }
          };
          const schedule = () => {
            if (!alive) return;
            if (debounceMs <= 0) {
              void run();
              return;
            }
            if (timer !== null) clearT(timer);
            timer = setT(() => {
              timer = null;
              void run();
            }, debounceMs);
          };
          void run();
          const ch = sb.channel(`wsav${++chanSeq}`).on("postgres_changes", { event: "*", schema: "public", table: "saved_photos" }, schedule).subscribe();
          return () => {
            alive = false;
            if (timer !== null) clearT(timer);
            try {
              sb.removeChannel(ch);
            } catch {
            }
          };
        }
      };
      return self;
    }
    const COL = {
      records: () => collHandle("records"),
      photos: () => collHandle("photos"),
      users: () => collHandle("users"),
      albums: () => collHandle("albums"),
      settings: settingsHandle
    };
    return {
      COL,
      /** 컬렉션 핸들 — users/{uid}/savedPhotos 대응 */
      savedPhotosHandle,
      loadFamily,
      familyId: () => myFamilyId,
      resetFamilyId: () => {
        myFamilyId = null;
      },
      /** 서버 기준 '지금' */
      TS: () => SV.serverTimestamp()
    };
  }
  const TTL_SEC = 60 * 60;
  const RENEW_MS = 2 * 60 * 1e3;
  const CHUNK = 90;
  function createStorage(client, bucket, opts = {}) {
    var _a, _b;
    const now = (_a = opts.nowFn) != null ? _a : () => Date.now();
    const doFetch = (_b = opts.fetchFn) != null ? _b : (...a) => fetch(...a);
    const cache = /* @__PURE__ */ new Map();
    const clear = () => {
      cache.clear();
    };
    async function signPaths(paths) {
      var _a2;
      const t = now();
      const uniq = [...new Set((paths || []).filter((p) => !!p))];
      const need = uniq.filter((p) => {
        const c = cache.get(p);
        return !c || c.exp < t + RENEW_MS;
      });
      for (let i = 0; i < need.length; i += CHUNK) {
        const chunk = need.slice(i, i + CHUNK);
        try {
          const { data, error } = await client.storage.from(bucket).createSignedUrls(chunk, TTL_SEC);
          if (error) continue;
          for (const d of data != null ? data : []) {
            const url = (_a2 = d.signedUrl) != null ? _a2 : d.signedURL;
            if (url && d.path) cache.set(d.path, { url, exp: t + TTL_SEC * 1e3 });
          }
        } catch {
        }
      }
      const out = {};
      for (const p of uniq) {
        const c = cache.get(p);
        if (c) out[p] = c.url;
      }
      return out;
    }
    const signOne = async (path) => {
      var _a2;
      if (!path) return null;
      const map = await signPaths([path]);
      return (_a2 = map[path]) != null ? _a2 : null;
    };
    async function fetchSigned(path) {
      let url = await signOne(path);
      if (!url) throw new Error("사진 주소를 받지 못했어요.");
      let res = await doFetch(url);
      if (res.status === 400 || res.status === 403 || res.status === 404) {
        cache.delete(path);
        url = await signOne(path);
        if (url) res = await doFetch(url);
      }
      if (!res.ok) throw new Error(`사진을 불러오지 못했어요 (HTTP ${res.status})`);
      return res;
    }
    async function removeFiles(paths) {
      const list = (Array.isArray(paths) ? paths : [paths]).filter((p) => !!p);
      if (!list.length) return;
      try {
        await client.storage.from(bucket).remove(list);
      } catch {
      } finally {
        list.forEach((p) => cache.delete(p));
      }
    }
    return {
      signPaths,
      signOne,
      fetchSigned,
      removeFiles,
      clearSignedUrlCache: clear,
      /** 테스트·진단용 */
      cacheSize: () => cache.size
    };
  }
  const TotoCore = {
    // 날짜·시간
    GESTATION_DAYS,
    pad2,
    toDate,
    midnight,
    daysBetween,
    ymd,
    fmtDot,
    isValidYmd,
    toLocalInput,
    fromLocalInput,
    babyAge,
    dday,
    clampMinutes,
    hm,
    isSameDay,
    fmtTime,
    fmtDate,
    fmtDateTime,
    ago,
    // 오류 문구
    errMsg,
    AppError,
    // 접속 설정 진단
    diagnoseConfig,
    // 백업
    BACKUP_VERSION,
    verifyBackup,
    inspectBackup,
    // 쓰기 지시(FieldValue 흉내)
    SV,
    isSV,
    applySV,
    isoOf,
    // DB 행 ↔ 화면 객체 변환
    MAPPERS,
    FIELD_COL,
    REC_COLS,
    ROLE_TO_DB,
    ROLE_FROM_DB,
    // DB 접근 계층 (Firestore 문법 → Supabase)
    createStore,
    // 비공개 버킷 서명 URL 캐시 · 파일 지우기
    createStorage
  };
  if (typeof window !== "undefined") window.TotoCore = TotoCore;
  exports.TotoCore = TotoCore;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({});

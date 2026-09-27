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
    const photos = Array.isArray(b.photos) ? b.photos : [];
    const withImage = photos.filter(
      (p) => typeof p.url === "string" && String(p.url).startsWith("data:")
    ).length;
    return {
      ok: true,
      version: typeof b.version === "number" ? b.version : 1,
      records: Array.isArray(b.records) ? b.records.length : 0,
      photos: photos.length,
      photosWithImage: withImage,
      albums: Array.isArray(b.albums) ? b.albums.length : 0,
      users: Array.isArray(b.users) ? b.users.length : 0,
      baby: (_a = b.baby) != null ? _a : null
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
    inspectBackup
  };
  if (typeof window !== "undefined") window.TotoCore = TotoCore;
  exports.TotoCore = TotoCore;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({});

/* 또또 아기수첩 · app.html 의 JSX 를 미리 컴파일한 것입니다.
   tools/build-app-bundle.mjs 가 만듭니다 — 손으로 고치지 마세요.
   원본은 app.html 안의 id="toto-source" 스크립트입니다. */
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React, ReactDOM, Recharts, BABY_DEFAULTS */
const {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  createContext,
  useContext
} = React;
/* ── 차트 라이브러리(Recharts 487kB)는 차트가 처음 그려질 때만 받는다 ──────
   첫 로딩 때 받는 외부 파일 중 가장 큰데, 출산 전 홈은 차트를 하나도 안
   그리고 출산 뒤에도 기록 탭 몇 개와 통계 모달에서만 쓴다.
    Recharts 는 '자식의 타입' 으로 축·막대·선을 알아본다. 그래서 자식 자리
   (XAxis 등)는 표시만 하는 빈 컴포넌트로 두고, 차트 프록시가 그릴 때 그
   표시를 진짜 타입으로 바꿔 넘긴다. 호출부는 한 줄도 안 바뀐다. */
const RECHARTS_SRC = "https://unpkg.com/recharts@2.12.7/umd/Recharts.js";
let rechartsLoading = null;
const loadRecharts = () => rechartsLoading || (rechartsLoading = new Promise(resolve => {
  if (window.Recharts) return resolve(window.Recharts);
  const el = document.createElement("script");
  el.crossOrigin = "anonymous";
  el.src = RECHARTS_SRC;
  el.onload = () => resolve(window.Recharts || null);
  el.onerror = () => resolve(null);
  document.head.appendChild(el);
}));
// { rc: 라이브러리 | null, failed: 받다가 실패했는지 }
const useRecharts = () => {
  const [st, setSt] = useState(() => ({
    rc: window.Recharts || null,
    failed: false
  }));
  useEffect(() => {
    if (st.rc) return;
    let alive = true;
    loadRecharts().then(rc => {
      if (alive) setSt({
        rc,
        failed: !rc
      });
    });
    return () => {
      alive = false;
    };
  }, []);
  return st;
};
const ChartFallback = () => /*#__PURE__*/React.createElement("div", {
  style: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    fontSize: 12
  }
}, "\uCC28\uD2B8\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694 (\uC778\uD130\uB137 \uC5F0\uACB0 \uD655\uC778)");
const ChartLoading = () => /*#__PURE__*/React.createElement("div", {
  role: "status",
  "aria-live": "polite",
  style: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    fontSize: 12
  }
}, "\uCC28\uD2B8 \uC900\uBE44 \uC911\u2026");
/* 자식 자리 표시. 직접 그려질 일은 없다 — 차트 프록시가 진짜 타입으로 바꾼다. */
const rcPart = name => {
  const P = () => null;
  P.__rc = name;
  P.displayName = name;
  return P;
};
const XAxis = rcPart("XAxis"),
  YAxis = rcPart("YAxis"),
  Bar = rcPart("Bar"),
  Line = rcPart("Line");
const CartesianGrid = rcPart("CartesianGrid"),
  Tooltip = rcPart("Tooltip"),
  Legend = rcPart("Legend");
const ReferenceLine = rcPart("ReferenceLine"),
  ReferenceArea = rcPart("ReferenceArea");
const realizeParts = (rc, children) => React.Children.map(children, c => {
  if (!c || !c.type || !c.type.__rc) return c;
  const Real = rc[c.type.__rc];
  return Real ? React.createElement(Real, {
    ...c.props,
    key: c.key
  }) : null;
});
const chartProxy = name => {
  const Proxy = props => {
    const {
      rc,
      failed
    } = useRecharts();
    if (failed) return /*#__PURE__*/React.createElement(ChartFallback, null);
    if (!rc) return /*#__PURE__*/React.createElement(ChartLoading, null);
    const Real = rc[name];
    if (!Real) return /*#__PURE__*/React.createElement(ChartFallback, null);
    return /*#__PURE__*/React.createElement(Real, props, realizeParts(rc, props.children));
  };
  Proxy.displayName = name;
  return Proxy;
};
const BarChart = chartProxy("BarChart");
const LineChart = chartProxy("LineChart");
/* 크기를 재서 자식 차트에 width/height 를 넣어주는 컨테이너.
   라이브러리가 아직 없으면 같은 크기의 상자만 두어 자리가 흔들리지 않게 한다. */
const ResponsiveContainer = props => {
  const {
    rc
  } = useRecharts();
  if (!rc || !rc.ResponsiveContainer) return /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: "100%"
    }
  }, props.children);
  const Real = rc.ResponsiveContainer;
  return /*#__PURE__*/React.createElement(Real, props);
};

/* ========================================================================
   0. 유틸리티 & 상수
   ======================================================================== */

// Firebase 설정이 플레이스홀더 그대로인지 확인
const isFirebaseConfigured = () => sbReady;

/* 오류 문구는 vendor/toto-core.js 의 errMsg 가 담당한다.
   예전 표는 Firebase 오류코드(e.code)로 찾게 되어 있었는데, Supabase 로
   옮긴 뒤로는 e.code 를 아무도 넣지 않아 한 번도 맞지 않았다. 그래서
   "Invalid login credentials" 같은 영어가 가족 화면에 그대로 떴다. */

/* 등급 이름과 메달도 vendor/toto-core.js 한 벌만 쓴다.
   메달 숫자는 NaN 이 저장될 수 있던 자리라 테스트로 고정했다. */

/* 날짜·시간·오류문구는 src/ 에 한 벌만 둔다 (vendor/toto-core.js).
   예전에는 여기에 사본이 또 있어서, 테스트를 고쳐도 가족이 보는 화면은
   그대로였다. 이제 같은 코드가 돌아간다.
    함께 고쳐진 것들
   · 나이 계산이 자정 기준이 되어, 오후에 보면 하루 틀어지던 문제가 없다
   · ymd 가 값이 없을 때 '오늘' 이 아니라 빈 문자열을 준다
     (날짜 없는 기록이 오늘 칸에 섞이지 않는다)
   · hm 이 24시간을 넘는 값을 잘라낸다
   · 망가진 날짜에 'Invalid Date' 가 찍히지 않는다 */
const {
  toDate,
  fmtTime,
  fmtDate,
  fmtDateTime,
  ymd,
  isSameDay,
  pad2,
  toLocalInput,
  fromLocalInput,
  ago,
  hm,
  babyAge: coreBabyAge,
  dday: coreDday,
  errMsg,
  diagnoseConfig,
  inspectBackup,
  verifyBackup,
  SV,
  isSV,
  applySV,
  isoOf,
  MAPPERS,
  FIELD_COL,
  ROLE_TO_DB,
  ROLE_FROM_DB,
  canSeePhoto,
  canSeeLetter,
  likeCountOf,
  likedByMe,
  MEDALS,
  medalStats,
  earnedMedals,
  tempStage,
  fhrCheck,
  crlGuide,
  roleLabel,
  createDbHealth,
  isAuthExpired
} = window.TotoCore;

// 화면에 표시할 빌드 버전 — 폰이 최신인지 바로 확인할 수 있게
const APP_VERSION = "v42";

/* ========================================================================
   1. Supabase 초기화 + Firestore 호환 계층
   ------------------------------------------------------------------------
   기존 육아수첩 코드는 Firestore 문법(COL.records().doc(id).update(...))으로
   쓰여 있습니다. 그 4천 줄을 그대로 살리기 위해, 같은 모양의 API를
   Supabase 위에 올렸습니다. 아래 계층만 Supabase를 알고 나머지는 모릅니다.
      records  →  public.records (공통 컬럼 + data jsonb)
     photos   →  public.media   (원본은 Storage, 행에는 경로만)
     users    →  public.profiles
     settings →  public.settings (단일 행 'baby')
     users/{uid}/savedPhotos → public.saved_photos
   ======================================================================== */
const SB_URL = (window.SUPABASE_URL || "").trim();
const SB_KEY = (window.SUPABASE_ANON_KEY || "").trim();
const BUCKET = window.MEDIA_BUCKET || "family-media";
/* 예전 검사는 "주소가 https 로 시작하고 키가 주소가 아니면 통과" 였다.
   service_role(비밀) 키를 넣어도 통과했다. 이제 vendor/toto-core.js 의
   diagnoseConfig 가 무엇이 잘못됐는지 짚어준다. */
const CFG_PROBLEM = diagnoseConfig(SB_URL, SB_KEY);
const sbReady = CFG_PROBLEM === null;
const sb = sbReady ? window.supabase.createClient(SB_URL, SB_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
}) : null;

/* 쓰기 지시(FieldValue 흉내)와 날짜 변환은 vendor/toto-core.js 한 벌만 쓴다.
   모든 쓰기가 지나가는 길목인데 여기 사본은 테스트가 없었다.
   옮기면서 고쳐진 것: toDate() 가 Date 를 안 돌려주는 값이 오면
   예전 사본은 그 자리에서 죽었다. 이제 null 로 넘어간다. */

/* DB 행 ↔ 화면 객체 변환도 vendor/toto-core.js 한 벌만 쓴다.
   모든 읽기·쓰기가 이 표를 지나간다. 컬럼 이름 하나만 틀려도 기록이
   조용히 비어서 저장되는데, 여기 사본은 테스트가 없었다. */

/* DB 접근 계층도 vendor/toto-core.js 한 벌만 쓴다.
   Firestore 문법(COL.records().where(...).onSnapshot(...))을 Supabase 위에
   흉내내는 계층으로, 모든 읽기·쓰기·실시간 구독이 여기를 지나간다.
   Supabase 클라이언트를 인자로 받게 만들어 가짜 클라이언트로 검증했다.
    옮기면서 고쳐진 것
   · 변경이 몰아칠 때(사진 여러 장 업로드) 바뀐 횟수만큼 전부 다시 읽어
     화면이 여러 번 깜빡였다. 이제 묶어서 한 번만 읽는다.
   · where 에 "==" 이 아닌 조건을 주면 조용히 등호로 바꿔 엉뚱한 결과를
     냈다. 이제 그 자리에서 알려준다.
   · 없는 하위 컬렉션에 null 을 돌려줘서 "null 의 doc" 이라는 엉뚱한
     오류로 터졌다. 이제 무엇이 잘못인지 말해준다.
   · 조회가 예외를 던지면 아무 일도 일어나지 않았다. 이제 오류로 알린다. */
const store = window.TotoCore.createStore(sb);
const COL = store.COL;
const loadFamily = store.loadFamily;

/* ── Firebase Auth 호환 계층 ─────────────────────────────────────────── */
const mapUser = u => u ? {
  uid: u.id,
  email: u.email
} : null;
const auth = {
  onAuthStateChanged: cb => {
    let fired = false;
    sb.auth.getSession().then(({
      data
    }) => {
      if (!fired) {
        fired = true;
        cb(mapUser(data.session && data.session.user));
      }
    });
    const {
      data: sub
    } = sb.auth.onAuthStateChange((_e, sess) => {
      fired = true;
      cb(mapUser(sess && sess.user));
    });
    return () => {
      try {
        sub.subscription.unsubscribe();
      } catch (e) {}
    };
  },
  signInWithEmailAndPassword: async (email, password) => {
    const {
      data,
      error
    } = await sb.auth.signInWithPassword({
      email: String(email).trim(),
      password
    });
    if (error) throw error;
    return {
      user: mapUser(data.user)
    };
  },
  createUserWithEmailAndPassword: async (email, password, meta) => {
    const {
      data,
      error
    } = await sb.auth.signUp({
      email: String(email).trim(),
      password,
      options: meta ? {
        data: meta
      } : undefined
    });
    if (error) throw error;
    if (!data.user) throw new Error("가입은 됐지만 사용자 정보를 받지 못했어요.");
    return {
      user: mapUser(data.user),
      needsConfirm: !data.session
    };
  },
  sendPasswordResetEmail: async email => {
    const {
      error
    } = await sb.auth.resetPasswordForEmail(String(email).trim(), {
      redirectTo: location.origin + location.pathname
    });
    if (error) throw error;
  },
  signOut: () => sb.auth.signOut()
};

/* 예전 버전이 localStorage 에 평문으로 남긴 비밀번호를 제거한다.
   (앱을 열 때마다 확인해서, 구버전을 쓰다 온 기기도 즉시 정리되게 한다) */
const purgeLegacyCredentials = () => {
  try {
    ["baby-cred", "baby-remember", "baby-skip-autologin"].forEach(k => localStorage.removeItem(k));
  } catch (e) {/* 저장소를 못 쓰는 환경이면 무시 */}
};
purgeLegacyCredentials();

/* 사진 주소(서명 URL) 캐시와 파일 지우기도 vendor/toto-core.js 한 벌만 쓴다.
    옮기면서 고쳐진 것
   · 사진을 지운 뒤에도 캐시에 남은 주소로 계속 보일 수 있었다.
     이제 지울 때 주소도 함께 버린다.
   · 백업 중 서명 URL 이 만료되면 그 사진은 그냥 실패했다. 사진이 많으면
     뒤쪽이 통째로 빠질 수 있었다. 이제 한 번 다시 받아 재시도한다. */
const photoStore = window.TotoCore.createStorage(sb, BUCKET);
const {
  signPaths,
  signOne,
  fetchSigned,
  removeFiles: removeStorage
} = photoStore;
const TS = () => SV.serverTimestamp();

/* ── DB 연결 상태 ────────────────────────────────────────────────────
   조회가 실패하면(오프라인·로그인 만료·서버 오류) 예전에는 조용히 빈
   목록을 넣어서 모든 화면이 "아직 기록이 없어요" 라고 했다. 가족이
   "기록이 사라졌나" 하고 놀랄 수 있는 문구다. 이제 구독 훅들이 여기에
   알리고, 배너 하나가 "연결하지 못했어요 · 다시 시도" 를 띄운다. */
const dbHealth = createDbHealth();
const useDbHealth = () => React.useSyncExternalStore(dbHealth.subscribe, dbHealth.get);
/* 구독 훅용: 성공/실패를 알리고, 다시 시도 tick 을 돌려준다.
   unmount 되면 실패 목록에서 빠져 배너가 남지 않는다. */
const useDbWatch = key => {
  const {
    tick
  } = useDbHealth();
  useEffect(() => () => dbHealth.forget(key), [key]);
  return {
    tick,
    ok: () => dbHealth.ok(key),
    fail: e => {
      console.error(key, e);
      dbHealth.fail(key, e);
    }
  };
};
/* 오프라인 ↔ 온라인. 연결되면 자동으로 다시 조회한다. */
const useOnline = () => {
  const [on, setOn] = useState(typeof navigator === "undefined" || navigator.onLine !== false);
  useEffect(() => {
    const up = () => {
      setOn(true);
      dbHealth.retry();
    };
    const down = () => setOn(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return on;
};
const signOutApp = async () => {
  purgeLegacyCredentials();
  photoStore.clearSignedUrlCache(); // 다음 사람에게 남의 사진이 보이지 않게
  store.resetFamilyId(); // 다음 사람이 남의 가족 폴더에 올리지 않게
  return sb.auth.signOut();
};

/* ========================================================================
   2. 공용 UI 컴포넌트
   ======================================================================== */
const Spinner = ({
  label
}) => /*#__PURE__*/React.createElement("div", {
  className: "flex flex-col items-center justify-center gap-3 py-10",
  role: "status",
  "aria-live": "polite"
}, /*#__PURE__*/React.createElement("div", {
  className: "w-9 h-9 border-[3px] border-teal-400 border-t-transparent rounded-full animate-spin",
  "aria-hidden": "true"
}), label && /*#__PURE__*/React.createElement("p", {
  className: "text-sm text-slate-500 dark:text-slate-400"
}, label));
const Card = ({
  children,
  className = ""
}) => /*#__PURE__*/React.createElement("div", {
  className: `bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 ${className}`
}, children);
const Btn = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
  ...rest
}) => {
  const styles = {
    primary: "bg-teal-500 hover:bg-teal-600 text-white",
    lavender: "bg-violet-400 hover:bg-violet-500 text-white",
    ghost: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600",
    danger: "bg-rose-500 hover:bg-rose-600 text-white"
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    onClick: onClick,
    disabled: disabled,
    className: `rounded-xl font-medium px-4 py-3 text-base transition active:scale-[.98] disabled:opacity-50 disabled:active:scale-100 ${styles[variant]} ${className}`
  }, rest), children);
};

// 토스트 알림
const ToastCtx = createContext(null);
const useToast = () => useContext(ToastCtx);
const ToastProvider = ({
  children
}) => {
  const [toasts, setToasts] = useState([]);
  /* push("저장했어요", "success")
     push("기저귀 기록 추가", "success", { undo: () => 지우기 })
       → 8초 동안 "실행취소" 버튼이 함께 뜬다.
         한 손으로 쓰다가 잘못 눌렀을 때 되돌릴 수 있게. */
  const push = useCallback((msg, type = "info", opts = {}) => {
    const id = Date.now() + Math.random();
    const ms = opts.ms || (opts.undo ? 8000 : 3200);
    const drop = () => setToasts(t => t.filter(x => x.id !== id));
    setToasts(t => [...t, {
      id,
      msg,
      type,
      undo: opts.undo,
      drop
    }]);
    setTimeout(drop, ms);
  }, []);
  return /*#__PURE__*/React.createElement(ToastCtx.Provider, {
    value: push
  }, children, /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed left-1/2 -translate-x-1/2 z-[120] flex flex-col gap-2 w-[92%] max-w-[400px]",
    style: {
      top: "calc(env(safe-area-inset-top) + 1rem)"
    },
    "aria-live": "assertive"
  }, toasts.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    role: "alert",
    className: `fade-in flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm text-white ${t.type === "error" ? "bg-rose-500" : t.type === "success" ? "bg-teal-500" : "bg-slate-700"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex-1 min-w-0"
  }, t.msg), t.undo && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      t.drop();
      try {
        t.undo();
      } catch (e) {
        console.error(e);
      }
    },
    className: "shrink-0 -my-1 px-3 py-2 rounded-lg bg-white/25 font-bold whitespace-nowrap"
  }, "\uC2E4\uD589\uCDE8\uC18C"))))));
};

// 라벨 + 입력 묶음
const Field = ({
  label,
  children
}) => /*#__PURE__*/React.createElement("label", {
  className: "block"
}, /*#__PURE__*/React.createElement("span", {
  className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5"
}, label), children);
const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-400";

// 기록 시간 입력 (기본=지금, 직접 수정 가능)
const DateTimeField = ({
  value,
  onChange,
  label = "기록 시간"
}) => /*#__PURE__*/React.createElement(Field, {
  label: label
}, /*#__PURE__*/React.createElement("div", {
  className: "flex gap-2"
}, /*#__PURE__*/React.createElement("input", {
  className: inputCls,
  type: "datetime-local",
  value: value,
  onChange: e => onChange(e.target.value),
  "aria-label": label
}), /*#__PURE__*/React.createElement("button", {
  type: "button",
  onClick: () => onChange(toLocalInput(new Date())),
  className: "whitespace-nowrap px-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm"
}, "\uC9C0\uAE08")));

// 선택 칩 그룹 (큰 버튼, 한 손 조작)
const ChipGroup = ({
  options,
  value,
  onChange,
  label
}) => /*#__PURE__*/React.createElement("div", {
  role: "radiogroup",
  "aria-label": label
}, label && /*#__PURE__*/React.createElement("span", {
  className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5"
}, label), /*#__PURE__*/React.createElement("div", {
  className: "flex flex-wrap gap-2"
}, options.map(o => {
  const active = value === o.value;
  return /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": active,
    onClick: () => onChange(o.value),
    className: `px-4 min-h-[44px] rounded-full text-sm font-medium border transition ${active ? "bg-teal-500 border-teal-500 text-white" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"}`
  }, o.label);
})));

// 전체화면 오버레이를 body 최상위로 띄움(내부 스크롤 컨테이너에 갇히는 iOS 버그 회피)
const Portal = ({
  children
}) => ReactDOM.createPortal ? ReactDOM.createPortal(children, document.body) : children;

// 모달 셸
/* 초점이 모달 안에 머물게 한다.
   · 열면 모달 안 첫 요소로 초점을 옮긴다 (스크린리더가 제목부터 읽는다)
   · Tab 이 모달 밖으로 새지 않는다
   · 닫으면 열기 전에 보던 버튼으로 초점을 되돌린다 */
const useFocusTrap = (open, onClose) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const SEL = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    /* 숨겨진 요소인지 — 레이아웃을 보지 않고 속성과 계산된 스타일만 본다.
       예전에는 offsetParent 가 null 인지로 판단했는데, position: fixed 인
       요소는 브라우저가 offsetParent 를 null 로 주므로 보이는 버튼을 초점
       순서에서 빼 버릴 수 있었다. display 는 물려받지 않아 조상까지 올라간다. */
    const hidden = el => {
      if (el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true") return true;
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === "none" || cs.visibility === "hidden") return true;
      }
      return false;
    };
    const focusables = () => {
      const box = ref.current;
      return Array.from(box ? box.querySelectorAll(SEL) : []).filter(el => el === document.activeElement || !hidden(el));
    };
    const t = setTimeout(() => {
      const f = focusables();
      const target = f[0] || ref.current;
      if (target && target.focus) target.focus({
        preventScroll: true
      });
    }, 60);
    const onKey = e => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) {
        e.preventDefault();
        return;
      }
      const first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = "";
      // 열기 전 버튼이 사라졌을 수도 있으니 조용히 넘어간다
      if (prev && prev.focus) {
        try {
          prev.focus({
            preventScroll: true
          });
        } catch (e) {/* 무시 */}
      }
    };
  }, [open]);
  return ref;
};
const Modal = ({
  open,
  onClose,
  children,
  title,
  full
}) => {
  const boxRef = useFocusTrap(open, onClose);
  if (!open) return null;
  return /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center fade-in",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", _extends({
    ref: boxRef,
    tabIndex: -1,
    onClick: e => e.stopPropagation(),
    role: "dialog",
    "aria-modal": "true"
  }, title ? {
    "aria-labelledby": "modal-title"
  } : {
    "aria-label": "대화상자"
  }, {
    className: `slide-up bg-white dark:bg-slate-800 w-full outline-none ${full ? "h-full max-w-[430px]" : "max-w-[420px] rounded-t-3xl sm:rounded-3xl max-h-[92vh]"} overflow-y-auto`
  }), title && /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white dark:bg-slate-800 px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10"
  }, /*#__PURE__*/React.createElement("h2", {
    id: "modal-title",
    className: "text-lg font-bold text-slate-800 dark:text-white"
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "\uB2EB\uAE30",
    className: "text-2xl text-slate-400 hover:text-slate-600 w-11 h-11 -mr-2"
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "p-5"
  }, children))));
};

// 앱 내부 확인창 (iOS 홈화면 앱에선 window.confirm이 막혀서 자체 모달 사용)
const ConfirmCtx = createContext(m => Promise.resolve(typeof window !== "undefined" && window.confirm ? window.confirm(m) : true));
const useConfirm = () => useContext(ConfirmCtx);
const ConfirmProvider = ({
  children
}) => {
  const [st, setSt] = useState(null); // { message, opts, resolve }
  const confirm = useCallback((message, opts = {}) => new Promise(resolve => setSt({
    message,
    opts,
    resolve
  })), []);
  const done = v => {
    setSt(s => {
      if (s) s.resolve(v);
      return null;
    });
  };
  return /*#__PURE__*/React.createElement(ConfirmCtx.Provider, {
    value: confirm
  }, children, /*#__PURE__*/React.createElement(Modal, {
    open: !!st,
    onClose: () => done(false),
    title: st && st.opts.title || "확인"
  }, st && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap"
  }, st.message), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    className: "flex-1",
    onClick: () => done(false)
  }, "\uCDE8\uC18C"), /*#__PURE__*/React.createElement(Btn, {
    variant: st.opts.variant || "danger",
    className: "flex-1",
    onClick: () => done(true)
  }, st.opts.ok || "삭제")))));
};

// 의료 면책 배너 (육아 전문가 검토 #1)
const MedicalDisclaimer = () => /*#__PURE__*/React.createElement("div", {
  className: "text-[12px] leading-relaxed text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3"
}, "\uC774 \uC571\uC740 ", /*#__PURE__*/React.createElement("b", null, "\uC801\uC5B4\uB450\uB294 \uC218\uCCA9"), "\uC774\uC5D0\uC694. \uC5EC\uAE30 \uB098\uC624\uB294 \uBC94\uC704\uB294 \uC77C\uBC18\uC801\uC778 \uCC38\uACE0\uAC12\uC774\uB77C, \uC6B0\uB9AC \uC544\uAE30\uC5D0\uAC8C \uB9DE\uB294\uC9C0\uB294 \uC54C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uD310\uB2E8\uACFC \uCC98\uBC29\uC740 \uC758\uB8CC\uC9C4\uC5D0\uAC8C \uBC1B\uC544\uC8FC\uC138\uC694. \uAE09\uD574 \uBCF4\uC774\uBA74 \uAE30\uB2E4\uB9AC\uC9C0 \uB9D0\uACE0 \uC9C4\uB8CC\uBC1B\uB294 \uAC8C \uB9DE\uC2B5\uB2C8\uB2E4.");

/* ========================================================================
   3. 인증 컨텍스트
   ======================================================================== */
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);
const AuthProvider = ({
  children
}) => {
  const [user, setUser] = useState(undefined); // undefined=로딩, null=비로그인
  const [profile, setProfile] = useState(null); // users/{uid} 문서

  // 이메일이 ADMIN_EMAILS 에 있으면 무조건 관리자 (대소문자 무시)
  const isAdminEmail = email => !!email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async u => {
      setUser(u);
      if (!u) {
        setProfile(null);
        return;
      }
      // 프로필은 DB 트리거(handle_new_user)가 만든다. 프론트는 만들지 않는다.
      // 여기서 하는 일은 "오늘 들어왔다" 를 남기는 것 하나뿐이다.
      // role/approved/family_id/disabled 는 절대 쓰지 않는다 — DB 가 정한다.
      try {
        await sb.rpc("touch_login");
      } catch (e) {
        console.warn("접속 기록 실패(계속 진행):", e && e.message);
      }
    });
    return () => unsub();
  }, []);

  // 프로필 실시간 구독 (역할 변경 즉시 반영)
  useEffect(() => {
    if (!user) return;
    const unsub = COL.users().doc(user.uid).onSnapshot(s => setProfile(s.data() || null));
    return () => unsub(); // 언마운트 시 리스너 해제 (시니어 검토 #7)
  }, [user && user.uid]);

  // 권한은 DB 가 정한 것만 믿는다. 화면이 스스로 관리자라고 판단하지 않는다.
  const isAdmin = !!(profile && profile.role === "admin" && profile.approved !== false);
  const approved = !!(profile && profile.approved !== false);

  /* ADMIN_EMAILS 는 권한이 아니라 안내용이다.
     "관리자여야 하는데 DB 는 아니라고 한다" 면 조용히 넘기지 않고 알려준다.
     예전에는 여기서 화면이 관리자 메뉴를 열어줬는데, DB 가 거부해서
     눌러도 안 되는 버튼만 보이는 상태였다. */
  const adminMismatch = !!(user && profile && isAdminEmail(user.email) && !isAdmin);
  return /*#__PURE__*/React.createElement(AuthCtx.Provider, {
    value: {
      user,
      profile,
      isAdmin,
      approved,
      adminMismatch
    }
  }, children);
};

/* ========================================================================
   4. 설정(아기 정보) 컨텍스트 — 나이/주수 계산
   ======================================================================== */
const BabyCtx = createContext(null);
const useBaby = () => useContext(BabyCtx);
const BabyProvider = ({
  children
}) => {
  const [baby, setBaby] = useState(BABY_DEFAULTS);
  const w = useDbWatch("settings");
  useEffect(() => {
    const unsub = COL.settings().onSnapshot(s => {
      w.ok();
      if (s.exists) setBaby({
        ...BABY_DEFAULTS,
        ...s.data()
      });
    }, w.fail);
    return () => unsub();
  }, [w.tick]);
  return /*#__PURE__*/React.createElement(BabyCtx.Provider, {
    value: baby
  }, children);
};

// 단위 설정 (저장은 항상 ml, 표시/입력만 변환)
const OZ = 29.5735;
const useUnits = () => {
  const baby = useBaby();
  const vol = (baby && baby.units && baby.units.vol) === "oz" ? "oz" : "ml";
  return {
    vol,
    volLabel: vol === "oz" ? "oz" : "ml",
    volToMl: v => v === "" || v == null ? null : vol === "oz" ? Math.round(Number(v) * OZ) : Number(v),
    mlToVol: ml => ml == null ? null : vol === "oz" ? +(ml / OZ).toFixed(1) : Math.round(ml),
    fmtVol: ml => ml == null ? "" : vol === "oz" ? +(ml / OZ).toFixed(1) + "oz" : Math.round(ml) + "ml"
  };
};

/* 나이·주수 계산은 vendor/toto-core.js 한 벌만 쓴다.
   예전 사본은 Date.now() 에서 바로 빼서, 오후에 열면 하루가 틀어졌다.
   지금은 자정 기준으로 센다. 출생일이 미래면(오타) 임신 중으로 본다. */
const useBabyAge = () => {
  const baby = useBaby();
  const now = useNow(60000); // 자정을 넘기면 화면도 따라간다
  return useMemo(() => coreBabyAge(baby, new Date(now)), [baby, ymd(new Date(now))]);
};

/* ========================================================================
   5. records 컬렉션 실시간 구독 훅 (타입별)
   ======================================================================== */
// 현재 시각을 주기적으로 갱신 (경과시간 실시간 표시용)
const useNow = (intervalMs = 30000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
};
const useRecords = (type, max = 200) => {
  const [items, setItems] = useState(null);
  const w = useDbWatch("records:" + type);
  useEffect(() => {
    // 타입별 단일 필드 equality 쿼리(자동 색인, 복합 색인 불필요) → 해당 타입만 가져옴
    const unsub = COL.records().where("type", "==", type).limit(max).onSnapshot(snap => {
      w.ok();
      const arr = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      arr.sort((a, b) => (toDate(b.at) || 0) - (toDate(a.at) || 0)); // 최신순 클라이언트 정렬
      setItems(arr);
    },
    /* 빈 목록을 넣되 배너가 "불러오지 못함" 을 알린다 — 스피너가 영영
       돌지도, "없어요" 만 보이지도 않게 */
    err => {
      w.fail(err);
      setItems([]);
    });
    return () => unsub();
  }, [type, max, w.tick]);
  return items;
};
const addRecord = async (type, data, user, profile) => {
  return COL.records().add({
    type,
    ...data,
    createdBy: user.uid,
    creatorName: profile && profile.name || (user.email || "").split("@")[0],
    at: data.at || TS(),
    // 기록 대상 시각
    createdAt: TS() // 서버 생성 시각
  });
};
const deleteRecord = id => COL.records().doc(id).delete();

/* 한 번 누르면 바로 저장되는 기록(기저귀·직전수유 반복·수면 시작)은
   잘못 누르기 쉽다. 저장 후 8초 동안 "실행취소" 를 띄워, 누르면 지운다.
   확인창을 앞에 세우면 빠른 기록의 의미가 없으므로 뒤에 두었다. */
const addRecordUndoable = async (type, data, user, profile, toast, msg) => {
  const ref = await addRecord(type, data, user, profile);
  const id = ref && ref.id;
  toast(msg, "success", id ? {
    undo: async () => {
      try {
        await deleteRecord(id);
        toast("되돌렸어요.", "info");
      } catch (e) {
        toast("되돌리지 못했어요: " + errMsg(e), "error");
      }
    }
  } : undefined);
};
const updateRecordAt = (id, date) => COL.records().doc(id).update({
  at: date
});

/* ========================================================================
   6. 로그인 화면
   ======================================================================== */
const Login = () => {
  const toast = useToast();
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [remember, setRemember] = useState(localStorage.getItem("baby-remember") !== "0");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const autoTried = useRef(false);

  // 이메일만 기억한다. 비밀번호는 저장하지 않는다.
  // 로그인 유지는 Supabase 세션(persistSession + autoRefreshToken)이 담당한다.
  useEffect(() => {
    purgeLegacyCredentials(); // 예전 버전이 남긴 평문 비밀번호 제거
    const savedEmail = localStorage.getItem("toto-email");
    if (savedEmail) setEmail(savedEmail);
  }, []);
  const submit = async e => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setErr("닉네임을 입력해주세요.");
          setBusy(false);
          return;
        }
        // 초대코드를 넣었다면 먼저 존재하는 코드인지 확인한다.
        // (없는 코드로 가입하면 엉뚱한 새 가족이 만들어지므로 여기서 막는다)
        const codeIn = invite.trim().toUpperCase();
        if (codeIn) {
          const {
            data: ok,
            error: chkErr
          } = await sb.rpc("invite_code_exists", {
            p_code: codeIn
          });
          if (chkErr) throw chkErr;
          if (!ok) {
            setErr("초대코드를 찾을 수 없습니다. 가족에게 코드를 다시 확인해주세요.");
            setBusy(false);
            return;
          }
        }
        await auth.createUserWithEmailAndPassword(email.trim(), pw, {
          display_name: name.trim(),
          invite_code: codeIn
        });
        // ⚠️ role/approved/family_id/disabled 는 프론트에서 절대 건드리지 않는다.
        //    DB 트리거(handle_new_user)가 정하고, 여기서는 조회만 한다.
        toast(codeIn ? "가입 완료! 관리자 승인 후 이용할 수 있어요." : "가입 완료! 바로 사용하실 수 있어요.", "success");
      } else {
        await auth.signInWithEmailAndPassword(email.trim(), pw);
      }
      // 이메일만 기억 (비밀번호는 절대 저장하지 않음)
      if (remember) localStorage.setItem("toto-email", email.trim());else localStorage.removeItem("toto-email");
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };
  const resetPw = async () => {
    if (!email.trim()) {
      setErr("비밀번호를 재설정할 이메일을 입력하세요.");
      return;
    }
    try {
      await auth.sendPasswordResetEmail(email.trim());
      toast("재설정 메일을 보냈습니다.", "success");
    } catch (ex) {
      setErr(errMsg(ex));
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "app-shell justify-center px-6 py-10 bg-warm overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-3",
    "aria-hidden": "true"
  }, "\uD83C\uDF7C"), /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl font-bold text-slate-800 dark:text-white"
  }, "\uC544\uAE30\uC218\uCCA9"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-400 mt-1"
  }, "\uC6B0\uB9AC \uAC00\uC871\uC774 \uD568\uAED8 \uC4F0\uB294 \uC721\uC544 \uAE30\uB85D")), /*#__PURE__*/React.createElement(Card, {
    className: "p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mb-5 bg-slate-100 dark:bg-slate-700 rounded-xl p-1"
  }, [{
    v: "login",
    l: "로그인"
  }, {
    v: "signup",
    l: "회원가입"
  }].map(t => /*#__PURE__*/React.createElement("button", {
    key: t.v,
    type: "button",
    onClick: () => {
      setMode(t.v);
      setErr("");
    },
    className: `flex-1 min-h-[44px] rounded-lg text-sm font-medium ${mode === t.v ? "bg-white dark:bg-slate-800 text-teal-600 shadow-sm" : "text-slate-500"}`
  }, t.l))), /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    className: "space-y-4"
  }, mode === "signup" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, {
    label: "\uB2C9\uB124\uC784"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "\uC608: \uC774\uBAA8, \uC0BC\uCD0C",
    maxLength: 20
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uCD08\uB300\uCF54\uB4DC (\uC788\uB294 \uACBD\uC6B0\uC5D0\uB9CC)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls + " tracking-[0.3em] uppercase text-center font-bold",
    value: invite,
    onChange: e => setInvite(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)),
    placeholder: "______",
    maxLength: 6,
    autoCapitalize: "characters",
    autoCorrect: "off"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] leading-relaxed bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3 text-slate-600 dark:text-slate-300 -mt-1"
  }, invite.length === 6 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    className: "text-teal-600 dark:text-teal-400"
  }, "\uAC00\uC871\uC73C\uB85C \uD569\uB958\uD569\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("br", null), "\uCD08\uB300\uD55C \uBD84\uC774 \uC2B9\uC778\uD558\uBA74 \uC0AC\uC9C4\uACFC \uAE30\uB85D\uC744 \uBCFC \uC218 \uC788\uC5B4\uC694.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    className: "text-teal-600 dark:text-teal-400"
  }, "\uC6B0\uB9AC \uC544\uAE30 \uC218\uCCA9\uC744 \uC0C8\uB85C \uB9CC\uB4ED\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("br", null), "\uCD08\uB300\uCF54\uB4DC\uB97C \uBC1B\uC73C\uC168\uB2E4\uBA74 \uC704\uC5D0 \uC785\uB825\uD558\uC138\uC694. \uBE44\uC6CC\uB450\uBA74 \uB0B4 \uC544\uAE30 \uC804\uC6A9 \uACF5\uAC04\uC774 \uC0C8\uB85C \uC0DD\uAE30\uACE0, \uB2E4\uB978 \uAC00\uC871\uC758 \uAE30\uB85D\uACFC\uB294 \uC644\uC804\uD788 \uBD84\uB9AC\uB429\uB2C8\uB2E4."))), /*#__PURE__*/React.createElement(Field, {
    label: "\uC774\uBA54\uC77C"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "email",
    autoComplete: "username",
    inputMode: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "email@example.com",
    "aria-label": "\uC774\uBA54\uC77C"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uBE44\uBC00\uBC88\uD638"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "password",
    autoComplete: mode === "signup" ? "new-password" : "current-password",
    value: pw,
    onChange: e => setPw(e.target.value),
    placeholder: mode === "signup" ? "6자 이상" : "비밀번호",
    "aria-label": "\uBE44\uBC00\uBC88\uD638"
  })), mode === "login" && /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer select-none"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: remember,
    onChange: e => setRemember(e.target.checked),
    className: "w-5 h-5 rounded accent-teal-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-600 dark:text-slate-300"
  }, "\uC774\uBA54\uC77C \uAE30\uC5B5\uD558\uAE30")), err && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "text-sm text-rose-500 bg-rose-50 dark:bg-rose-900/30 rounded-lg px-3 py-2"
  }, "\u26A0\uFE0F ", err), /*#__PURE__*/React.createElement(Btn, {
    type: "submit",
    disabled: busy,
    className: "w-full"
  }, busy ? "처리 중..." : mode === "signup" ? invite.length === 6 ? "가족으로 합류하기" : "내 아기 수첩 만들기" : "로그인"), mode === "login" && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: resetPw,
    className: "w-full min-h-[44px] text-sm text-slate-400 hover:text-teal-500"
  }, "\uBE44\uBC00\uBC88\uD638\uB97C \uC78A\uC73C\uC168\uB098\uC694?"))), /*#__PURE__*/React.createElement("p", {
    className: "text-center text-xs text-slate-400 mt-6 leading-relaxed"
  }, mode === "signup" ? "가입하면 관리자 승인 후 사용할 수 있어요.\n처음엔 사진 관람만 가능하며, 관리자가 권한을 올려줄 수 있어요." : "이메일·비밀번호는 이 기기에 저장돼 다음에 자동 로그인됩니다."));
};

/* ========================================================================
   7. 헤더 + 다크모드
   ======================================================================== */
const useDarkMode = () => {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("baby-theme");
    if (saved) return saved === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("baby-theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark];
};

// 닉네임 변경 모달 (본인이 직접 설정)
const NicknameModal = ({
  open,
  onClose
}) => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setName(profile && profile.name || "");
  }, [open, profile && profile.name]);
  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast("닉네임을 입력해주세요.", "error");
      return;
    }
    setBusy(true);
    try {
      await COL.users().doc(user.uid).set({
        name: n
      }, {
        merge: true
      });
      toast("닉네임을 변경했어요.", "success");
      onClose();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: "\uB2C9\uB124\uC784 \uC124\uC815"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-400"
  }, "\uAE30\uB85D\xB7\uC0AC\uC9C4\xB7\uD3B8\uC9C0\uC5D0 \uD45C\uC2DC\uB420 \uB0B4 \uC774\uB984\uC774\uC5D0\uC694. \uC790\uC720\uB86D\uAC8C \uBC14\uAFC0 \uC218 \uC788\uC5B4\uC694."), /*#__PURE__*/React.createElement(Field, {
    label: "\uB2C9\uB124\uC784"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "\uC608: \uC5C4\uB9C8, \uC544\uBE60, \uC678\uD560\uBA38\uB2C8",
    maxLength: 20
  })), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "저장")));
};

// PWA 설치 유도 배너 (이미 설치/standalone이면 숨김)
const isStandalone = () => window.matchMedia && window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || "");
const InstallBanner = () => {
  const [bip, setBip] = useState(window.__bipEvent || null);
  const [dismissed, setDismissed] = useState(localStorage.getItem("baby-install-dismiss") === "1");
  useEffect(() => {
    const onBip = e => {
      e.preventDefault();
      window.__bipEvent = e;
      setBip(e);
    };
    const onInstalled = () => {
      setDismissed(true);
      window.__bipEvent = null;
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  if (isStandalone() || dismissed) return null;
  const close = () => {
    setDismissed(true);
    localStorage.setItem("baby-install-dismiss", "1");
  };
  const install = async () => {
    if (!bip) return;
    bip.prompt();
    try {
      await bip.userChoice;
    } catch (e) {}
    window.__bipEvent = null;
    setBip(null);
  };
  if (!bip && !isIOS()) return null; // 설치 불가 환경(데스크톱 브라우저 등)
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-50 dark:bg-slate-700/60 border-b border-teal-100 dark:border-slate-700 px-4 py-2.5 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, "\uD83D\uDCF2"), /*#__PURE__*/React.createElement("p", {
    className: "flex-1 text-xs text-slate-600 dark:text-slate-200 leading-snug"
  }, bip ? "홈 화면에 앱처럼 설치할 수 있어요." : "공유 버튼 → ‘홈 화면에 추가’로 앱처럼 쓸 수 있어요."), bip && /*#__PURE__*/React.createElement("button", {
    onClick: install,
    className: "text-xs px-3.5 min-h-[44px] rounded-lg bg-teal-500 text-white font-medium whitespace-nowrap"
  }, "\uC124\uCE58"), /*#__PURE__*/React.createElement("button", {
    onClick: close,
    "aria-label": "\uB2EB\uAE30",
    className: "text-slate-400 text-lg w-11 h-11 -mr-2 shrink-0"
  }, "\xD7"));
};
const Header = ({
  dark,
  setDark
}) => {
  const {
    profile
  } = useAuth();
  const baby = useBaby();
  const toast = useToast();
  return /*#__PURE__*/React.createElement("header", {
    className: "sticky top-0 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur border-b border-slate-100 dark:border-slate-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 h-14 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl",
    "aria-hidden": "true"
  }, "\uD83C\uDF7C"), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-slate-800 dark:text-white leading-tight truncate"
  }, baby.name), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 leading-tight"
  }, "\uC544\uAE30\uC218\uCCA9"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDark(!dark),
    "aria-label": dark ? "라이트 모드로 전환" : "다크 모드로 전환",
    className: "w-11 h-11 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-xl"
  }, dark ? "☀️" : "🌙"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium text-slate-600 dark:text-slate-300 leading-tight mr-1 truncate max-w-[90px]"
  }, profile ? profile.name : "..."), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      signOutApp();
      toast("로그아웃 되었습니다.");
    },
    "aria-label": "\uB85C\uADF8\uC544\uC6C3",
    className: "text-xs px-3 min-h-[44px] rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"
  }, "\uB85C\uADF8\uC544\uC6C3"))));
};

/* ========================================================================
   8. 대시보드
   ======================================================================== */
// 빠른 메모
const QuickMemoModal = ({
  open,
  onClose
}) => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setText("");
  }, [open]);
  const save = async () => {
    if (!text.trim()) {
      toast("메모를 입력하세요.", "error");
      return;
    }
    setBusy(true);
    try {
      await addRecord("memo", {
        text: text.trim(),
        at: TS()
      }, user, profile);
      toast("메모를 저장했어요.", "success");
      onClose();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: "\uD83D\uDCDD \uBE60\uB978 \uBA54\uBAA8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("textarea", {
    className: inputCls,
    rows: "4",
    value: text,
    onChange: e => setText(e.target.value),
    placeholder: "\uC608: \uD2B8\uB9BC \uC798\uD568 / \uCF67\uBB3C \uC57D\uAC04 / \uAE30\uBD84 \uC88B\uC74C",
    autoFocus: true
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "메모 저장")));
};

// 상세 통계 (수면 패턴 · 시간대별 수유 · 주간/월간 리포트)
const StatsModal = ({
  open,
  onClose
}) => {
  const feedings = useRecords("feeding", 400);
  const sleeps = useRecords("sleep", 400);
  const diapers = useRecords("diaper", 400);
  if (!open) return null;
  const clamp = r => Math.min(1440, Math.max(0, r.durationMin || 0));
  const cut14 = Date.now() - 14 * 86400000;
  const hourly = Array.from({
    length: 24
  }, (_, h) => ({
    h: h + "시",
    수유: 0
  }));
  (feedings || []).forEach(r => {
    const d = toDate(r.at);
    if (d && d.getTime() >= cut14) hourly[d.getHours()].수유++;
  });
  const done = (sleeps || []).filter(r => r.end);
  const napMin = done.filter(r => r.naptype !== "night").reduce((s, r) => s + clamp(r), 0);
  const nightMin = done.filter(r => r.naptype === "night").reduce((s, r) => s + clamp(r), 0);
  const nights = done.filter(r => r.naptype === "night");
  const avgHour = (arr, fn) => {
    const hs = arr.map(fn).filter(h => h != null);
    return hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : null;
  };
  const fmtHH = h => h == null ? "-" : `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round(h % 1 * 60) % 60).padStart(2, "0")}`;
  const avgBed = avgHour(nights, r => {
    const d = toDate(r.start);
    return d ? d.getHours() + d.getMinutes() / 60 : null;
  });
  const avgWake = avgHour(nights, r => {
    const d = toDate(r.end);
    return d ? d.getHours() + d.getMinutes() / 60 : null;
  });
  const napRatio = napMin + nightMin ? Math.round(napMin / (napMin + nightMin) * 100) : 0;
  const report = days => {
    const c = Date.now() - days * 86400000;
    const f = (feedings || []).filter(r => toDate(r.at) >= c).length;
    const dp = (diapers || []).filter(r => toDate(r.at) >= c).length;
    const sl = done.filter(r => toDate(r.at) >= c).reduce((s, r) => s + clamp(r), 0) / 60;
    return {
      f: (f / days).toFixed(1),
      dp: (dp / days).toFixed(1),
      sl: (sl / days).toFixed(1)
    };
  };
  const r7 = report(7),
    r30 = report(30);
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: "\uD83D\uDCCA \uC0C1\uC138 \uD1B5\uACC4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200 mb-2"
  }, "\uD558\uB8E8 \uD3C9\uADE0 (\uC8FC\uAC04 / \uC6D4\uAC04)"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 text-center"
  }, [["🍼 수유", r7.f + "회", r30.f + "회"], ["😴 수면", r7.sl + "h", r30.sl + "h"], ["👶 기저귀", r7.dp + "회", r30.dp + "회"]].map(([l, a, b]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    className: "bg-slate-50 dark:bg-slate-700/40 rounded-xl py-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, l), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-teal-600"
  }, a), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "\uC6D4 ", b))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200 mb-2"
  }, "\uD83D\uDE34 \uC218\uBA74 \uD328\uD134"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-600 dark:text-slate-300 space-y-1"
  }, /*#__PURE__*/React.createElement("p", null, "\uB0AE\uC7A0 ", hm(napMin), " \xB7 \uBC24\uC7A0 ", hm(nightMin), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400"
  }, "(\uB0AE\uC7A0 \uBE44\uC728 ", napRatio, "%)")), /*#__PURE__*/React.createElement("p", null, "\uD3C9\uADE0 \uCDE8\uCE68 ", /*#__PURE__*/React.createElement("b", null, fmtHH(avgBed)), " \xB7 \uD3C9\uADE0 \uAE30\uC0C1 ", /*#__PURE__*/React.createElement("b", null, fmtHH(avgWake))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200 mb-2"
  }, "\uD83C\uDF7C \uC2DC\uAC04\uB300\uBCC4 \uC218\uC720 (\uCD5C\uADFC 14\uC77C)"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 170
    }
  }, /*#__PURE__*/React.createElement(ResponsiveContainer, null, /*#__PURE__*/React.createElement(BarChart, {
    data: hourly,
    margin: {
      top: 5,
      right: 5,
      left: -24,
      bottom: 0
    }
  }, /*#__PURE__*/React.createElement(CartesianGrid, {
    strokeDasharray: "3 3",
    stroke: "#e2e8f0"
  }), /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "h",
    tick: {
      fontSize: 12
    },
    interval: 2
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {
      fontSize: 12
    },
    allowDecimals: false
  }), /*#__PURE__*/React.createElement(Tooltip, null), /*#__PURE__*/React.createElement(Bar, {
    dataKey: "\uC218\uC720",
    fill: "#14b8a6",
    radius: [3, 3, 0, 0]
  })))), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "\uC790\uC8FC \uBA39\uB294 \uC2DC\uAC04\uB300\uB97C \uD30C\uC545\uD574 \uC218\uC720 \uB9AC\uB4EC\uC744 \uC7A1\uC544\uBCF4\uC138\uC694."))));
};
const Dashboard = ({
  go
}) => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const units = useUnits();
  const [statsOpen, setStatsOpen] = useState(false);
  const feedings = useRecords("feeding");
  const sleeps = useRecords("sleep");
  const diapers = useRecords("diaper");
  const pumps = useRecords("pump", 50);
  const solids = useRecords("solid", 50);
  const meds = useRecords("med", 50);
  const prenatals = useRecords("prenatal", 20); // 출산 전 홈에 보여줄 초음파 기록
  const ageInfo = useBabyAge();
  const baby = useBaby();
  const now = useNow(30000);
  const [memoOpen, setMemoOpen] = useState(false);
  const [qbusy, setQbusy] = useState(false);

  // 홈 빠른 입력
  const quickDiaper = async t => {
    setQbusy(true);
    try {
      await addRecordUndoable("diaper", {
        diaperType: t,
        color: null,
        at: TS()
      }, user, profile, toast, "기저귀 기록 추가");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setQbusy(false);
    }
  };
  const quickRepeatFeed = async () => {
    const lf = feedings && feedings[0];
    if (!lf) {
      go("records", "feeding");
      return;
    }
    setQbusy(true);
    try {
      await addRecordUndoable("feeding", {
        kind: lf.kind,
        side: lf.side || null,
        amount: lf.amount || null,
        durationMin: lf.durationMin || null,
        at: TS()
      }, user, profile, toast, "직전 수유와 동일하게 기록");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setQbusy(false);
    }
  };
  if (!feedings || !sleeps || !diapers) return /*#__PURE__*/React.createElement(Spinner, {
    label: "\uBD88\uB7EC\uC624\uB294 \uC911..."
  });
  const today = new Date();
  const tF = feedings.filter(r => isSameDay(r.at, today));
  const tD = diapers.filter(r => isSameDay(r.at, today));
  // 자정 넘긴 밤잠도 포함: 시작 또는 종료가 오늘인 완료 수면
  const tS = sleeps.filter(r => r.end && (isSameDay(r.at, today) || isSameDay(r.end, today)));
  const clampMin = r => Math.min(24 * 60, Math.max(0, r.durationMin || 0)); // 잘못 저장된 값 보정
  const sleepMin = tS.reduce((s, r) => s + clampMin(r), 0);

  // 마지막 수유 & 다음 예상 (최근 간격 평균 기반)
  const lastFeed = feedings[0];
  const lastFeedDate = lastFeed ? toDate(lastFeed.at) : null;
  const intervals = [];
  for (let i = 0; i < Math.min(feedings.length - 1, 6); i++) {
    const d = toDate(feedings[i].at) - toDate(feedings[i + 1].at);
    if (d > 0) intervals.push(d);
  }
  const avgMs = intervals.length ? Math.max(5400000, intervals.reduce((a, b) => a + b, 0) / intervals.length) : 3 * 3600000;
  const nextFeed = lastFeedDate ? new Date(lastFeedDate.getTime() + avgMs) : null;
  const overdue = lastFeedDate && now - lastFeedDate.getTime() > 3 * 3600000; // 3시간 초과(임상 권고)

  // 최근 7일 통계
  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = ymd(d);
    const sl = sleeps.filter(r => r.end && (ymd(r.at) === key || r.end && ymd(r.end) === key)).reduce((s, r) => s + clampMin(r), 0) / 60;
    weekly.push({
      day: d.toLocaleDateString("ko-KR", {
        weekday: "short"
      }),
      수유: feedings.filter(r => ymd(r.at) === key).length,
      기저귀: diapers.filter(r => ymd(r.at) === key).length,
      수면: +sl.toFixed(1)
    });
  }
  const avg = k => weekly.reduce((s, d) => s + d[k], 0) / 7;
  const born = ageInfo.mode === "born";
  const lastUs = prenatals && prenatals.length ? prenatals[0] : null;

  /* ── 출산 전 홈 ──────────────────────────────────────────────────
     볼 게 D-day 와 초음파뿐인 시기다. 그 둘을 크게 앞에 둔다.
     수유·수면·기저귀 화면은 사라진 게 아니라 '기록' 탭에 그대로 있다. */
  if (!born) return /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-4 pb-safe"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sr-only"
  }, "\uD648"), /*#__PURE__*/React.createElement(Card, {
    className: "p-6 text-center bg-gradient-to-br from-violet-50 to-teal-50 dark:from-slate-800 dark:to-slate-800"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-400"
  }, baby.name), ageInfo.daysLeft > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-5xl font-black text-violet-500 mt-1 tabular-nums"
  }, "D-", ageInfo.daysLeft), /*#__PURE__*/React.createElement("p", {
    className: "text-base font-bold text-slate-700 dark:text-slate-200 mt-2"
  }, ageInfo.label), baby.dueDate && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 mt-1"
  }, fmtDate(new Date(baby.dueDate)), " \uCD9C\uC0B0 \uC608\uC815")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-black text-violet-500 mt-1"
  }, ageInfo.label), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 mt-2"
  }, "\uC608\uC815\uC77C\uC774 \uC9C0\uB0AC\uC5B4\uC694. \uACE7 \uB9CC\uB098\uC694 \uD83D\uDC9C"))), /*#__PURE__*/React.createElement("button", {
    className: "w-full text-left",
    onClick: () => go("records", "prenatal")
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4 active:scale-[.99] transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "\uD83D\uDD2C \uCD5C\uADFC \uCD08\uC74C\uD30C"), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-teal-600 dark:text-teal-400"
  }, "\uC804\uCCB4 \uBCF4\uAE30 \u203A")), lastUs ? /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, lastUs.week, "\uC8FC")), lastUs.efw != null && /*#__PURE__*/React.createElement("span", null, "\uCD94\uC815\uCCB4\uC911 ", lastUs.efw, "g"), lastUs.fhr != null && /*#__PURE__*/React.createElement("span", null, "\uC2EC\uBC15 ", lastUs.fhr, "bpm"), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400"
  }, fmtDate(lastUs.at))) : /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-400 mt-2"
  }, "\uC544\uC9C1 \uC5C6\uC5B4\uC694. \uAC80\uC9C4 \uB2E4\uB140\uC624\uBA74 \uC801\uC5B4\uB450\uBA74 \uC88B\uC544\uC694."))), /*#__PURE__*/React.createElement(Card, {
    className: "p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-slate-400 mb-2 px-1"
  }, "\u26A1 \uBE60\uB978 \uC785\uB825"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("records", "prenatal"),
    className: "flex flex-col items-center gap-1 py-3 rounded-xl bg-teal-50 dark:bg-teal-900/30 active:scale-95 transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, "\uD83D\uDD2C"), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-slate-600 dark:text-slate-300"
  }, "\uCD08\uC74C\uD30C")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMemoOpen(true),
    className: "flex flex-col items-center gap-1 py-3 rounded-xl bg-violet-50 dark:bg-violet-900/30 active:scale-95 transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-slate-600 dark:text-slate-300"
  }, "\uBA54\uBAA8")), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("letters"),
    className: "flex flex-col items-center gap-1 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 active:scale-95 transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, "\uD83D\uDC8C"), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-slate-600 dark:text-slate-300"
  }, "\uD3B8\uC9C0")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: () => go("records", "milestone")
  }, "\uD83D\uDCD6 \uB2E4\uC774\uC5B4\uB9AC"), /*#__PURE__*/React.createElement(Btn, {
    variant: "lavender",
    onClick: () => go("records", "health")
  }, "\uD83E\uDE7A \uAC74\uAC15 \uAE30\uB85D")), /*#__PURE__*/React.createElement(QuickMemoModal, {
    open: memoOpen,
    onClose: () => setMemoOpen(false)
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 text-center px-4 leading-relaxed"
  }, "\uC218\uC720\xB7\uC218\uBA74\xB7\uAE30\uC800\uADC0 \uAE30\uB85D\uC740 \uD0DC\uC5B4\uB09C \uB4A4 \uD648\uC5D0 \uB098\uD0C0\uB098\uC694.", /*#__PURE__*/React.createElement("br", null), "\uC9C0\uAE08\uB3C4 '\uAE30\uB85D' \uD0ED\uC5D0\uC11C \uBBF8\uB9AC \uC368\uBCFC \uC218 \uC788\uC5B4\uC694."));

  /* ── 출산 후 홈 ───────────────────────────────────────────────── */
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-4 pb-safe"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sr-only"
  }, "\uD648"), /*#__PURE__*/React.createElement(Card, {
    className: "p-5 bg-gradient-to-br from-teal-50 to-violet-50 dark:from-slate-800 dark:to-slate-800"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-400"
  }, baby.name), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-slate-800 dark:text-white mt-0.5"
  }, ageInfo.label), (() => {
    // 다가오는 기념일 D-day (100일/200일/돌/2돌)
    const ms = [{
      d: 100,
      n: "100일"
    }, {
      d: 200,
      n: "200일"
    }, {
      d: 365,
      n: "첫 돌"
    }, {
      d: 730,
      n: "두 돌"
    }];
    const up = ms.find(m => m.d >= ageInfo.days);
    return up ? /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-teal-600 mt-1 font-medium"
    }, "\uD83C\uDF82 ", up.n, "\uAE4C\uC9C0 D-", up.d - ageInfo.days) : null;
  })()), /*#__PURE__*/React.createElement(Card, {
    className: `p-4 ${overdue ? "ring-2 ring-amber-400" : ""}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-400"
  }, "\uB9C8\uC9C0\uB9C9 \uC218\uC720"), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-slate-800 dark:text-white"
  }, lastFeedDate ? ago(lastFeedDate) : "기록 없음")), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-400"
  }, "\uB2E4\uC74C \uC608\uC0C1"), /*#__PURE__*/React.createElement("p", {
    className: `font-bold ${overdue ? "text-amber-500" : "text-teal-500"}`
  }, nextFeed ? fmtTime(nextFeed) : "-"))), overdue && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg px-3 py-2"
  }, "\uB9C8\uC9C0\uB9C9 \uC218\uC720\uC5D0\uC11C 3\uC2DC\uAC04\uC774 \uC9C0\uB0AC\uC5B4\uC694. \uC2E0\uC0DD\uC544\uB294 \uBCF4\uD1B5 2~3\uC2DC\uAC04 \uAC04\uACA9\uC73C\uB85C \uBA39\uB294\uB2E4\uACE0 \uD574\uC694. \uC798 \uC790\uACE0 \uC788\uB2E4\uBA74 \uAE68\uC6B0\uC9C0 \uC54A\uC544\uB3C4 \uAD1C\uCC2E\uC2B5\uB2C8\uB2E4.")), /*#__PURE__*/React.createElement(Card, {
    className: "p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-slate-400 mb-2 px-1"
  }, "\u26A1 \uBE60\uB978 \uC785\uB825"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    disabled: qbusy,
    onClick: () => quickDiaper("pee"),
    className: "flex flex-col items-center gap-1 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-900/30 active:scale-95 transition disabled:opacity-50"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\uD83D\uDCA7"), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-slate-600 dark:text-slate-300"
  }, "\uC18C\uBCC0")), /*#__PURE__*/React.createElement("button", {
    disabled: qbusy,
    onClick: () => quickDiaper("poo"),
    className: "flex flex-col items-center gap-1 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 active:scale-95 transition disabled:opacity-50"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\uD83D\uDCA9"), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-slate-600 dark:text-slate-300"
  }, "\uB300\uBCC0")), /*#__PURE__*/React.createElement("button", {
    disabled: qbusy,
    onClick: quickRepeatFeed,
    className: "flex flex-col items-center gap-1 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 active:scale-95 transition disabled:opacity-50"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\uD83D\uDD01"), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-slate-600 dark:text-slate-300"
  }, "\uC218\uC720\uBC18\uBCF5")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMemoOpen(true),
    className: "flex flex-col items-center gap-1 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/30 active:scale-95 transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-slate-600 dark:text-slate-300"
  }, "\uBA54\uBAA8")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-3"
  }, [{
    icon: "🍼",
    n: tF.length,
    unit: "회",
    label: "수유",
    tab: "feeding"
  }, {
    icon: "😴",
    n: (sleepMin / 60).toFixed(1),
    unit: "시간",
    label: "수면",
    tab: "sleep"
  }, {
    icon: "👶",
    n: tD.length,
    unit: "회",
    label: "기저귀",
    tab: "diaper"
  }].map(s => /*#__PURE__*/React.createElement("button", {
    key: s.label,
    onClick: () => go("records", s.tab),
    "aria-label": `${s.label} 오늘 ${s.n}${s.unit}`
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-3 text-center active:scale-95 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl",
    "aria-hidden": "true"
  }, s.icon), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-slate-800 dark:text-white mt-1"
  }, s.n, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-normal text-slate-400 ml-0.5"
  }, s.unit)), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, s.label))))), (() => {
    const td = [...tF, ...tD, ...(pumps || []).filter(r => isSameDay(r.at, today)), ...(solids || []).filter(r => isSameDay(r.at, today)), ...(meds || []).filter(r => isSameDay(r.at, today)), ...tS].sort((a, b) => toDate(b.at) - toDate(a.at)).slice(0, 20);
    const line = r => {
      if (r.type === "feeding") return `${{
        breast: "모유",
        formula: "분유",
        mixed: "혼합"
      }[r.kind] || "수유"}${r.amount ? ` ${units.fmtVol(r.amount)}` : ""}`;
      if (r.type === "diaper") return {
        pee: "소변",
        poo: "대변",
        both: "소변+대변"
      }[r.diaperType] || "기저귀";
      if (r.type === "sleep") return `수면 ${r.durationMin ? hm(Math.min(1440, r.durationMin)) : ""}`;
      if (r.type === "pump") return `유축${r.amount ? ` ${units.fmtVol(r.amount)}` : ""}`;
      if (r.type === "solid") return `이유식 ${r.food || ""}`;
      if (r.type === "med") return `투약 ${r.name || ""}`;
      return REC_LABEL[r.type] || "기록";
    };
    return /*#__PURE__*/React.createElement(Card, {
      className: "p-4"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-bold text-slate-800 dark:text-white mb-2"
    }, "\uD83D\uDCCB \uC624\uB298 \uD0C0\uC784\uB77C\uC778"), td.length === 0 ? /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-400 text-center py-3"
    }, "\uC624\uB298 \uAE30\uB85D\uC774 \uC544\uC9C1 \uC5C6\uC5B4\uC694.") : /*#__PURE__*/React.createElement("ul", {
      className: "space-y-2"
    }, td.map(r => /*#__PURE__*/React.createElement("li", {
      key: r.type + "_" + r.id,
      className: "flex items-center gap-2.5 text-sm"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-400 tabular-nums w-12 shrink-0"
    }, fmtTime(r.at)), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, REC_ICON[r.type]), /*#__PURE__*/React.createElement("span", {
      className: "flex-1 text-slate-700 dark:text-slate-200 truncate"
    }, line(r))))));
  })(), /*#__PURE__*/React.createElement(QuickMemoModal, {
    open: memoOpen,
    onClose: () => setMemoOpen(false)
  }), /*#__PURE__*/React.createElement(StatsModal, {
    open: statsOpen,
    onClose: () => setStatsOpen(false)
  }), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "\uCD5C\uADFC 7\uC77C \uD1B5\uACC4"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStatsOpen(true),
    className: "text-xs text-teal-600 dark:text-teal-400 min-h-[44px] px-2 -mr-2"
  }, "\uD83D\uDCCA \uC0C1\uC138 \uD1B5\uACC4 \u203A")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 my-3 text-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-teal-500"
  }, avg("수유").toFixed(1)), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "\uD558\uB8E8 \uD3C9\uADE0 \uC218\uC720")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-violet-500"
  }, avg("수면").toFixed(1), "h"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "\uD558\uB8E8 \uD3C9\uADE0 \uC218\uBA74")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-amber-500"
  }, avg("기저귀").toFixed(1)), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "\uD558\uB8E8 \uD3C9\uADE0 \uAE30\uC800\uADC0"))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 160
    }
  }, /*#__PURE__*/React.createElement(ResponsiveContainer, null, /*#__PURE__*/React.createElement(BarChart, {
    data: weekly,
    margin: {
      top: 5,
      right: 5,
      left: -22,
      bottom: 0
    }
  }, /*#__PURE__*/React.createElement(CartesianGrid, {
    strokeDasharray: "3 3",
    stroke: "#e2e8f0"
  }), /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "day",
    tick: {
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(Tooltip, null), /*#__PURE__*/React.createElement(Legend, {
    wrapperStyle: {
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(Bar, {
    dataKey: "\uC218\uC720",
    fill: "#14b8a6",
    radius: [4, 4, 0, 0]
  }), /*#__PURE__*/React.createElement(Bar, {
    dataKey: "\uAE30\uC800\uADC0",
    fill: "#f59e0b",
    radius: [4, 4, 0, 0]
  }))))));
};

/* ========================================================================
   8-b. 활동로그 (기록 탭의 '활동로그' 서브메뉴 · 관리자 전용)
   ======================================================================== */
const REC_LABEL = {
  feeding: "수유 기록",
  sleep: "수면 기록",
  diaper: "기저귀 기록",
  pump: "유축 기록",
  solid: "이유식 기록",
  med: "투약 기록",
  growth: "성장 기록",
  health: "건강 기록",
  milestone: "다이어리",
  letter: "편지",
  photo: "사진",
  memo: "메모"
};
const REC_ICON = {
  feeding: "🍼",
  sleep: "😴",
  diaper: "👶",
  pump: "🤱",
  solid: "🥣",
  med: "💊",
  growth: "📏",
  health: "🩺",
  milestone: "🎉",
  letter: "💌",
  photo: "🖼️",
  memo: "📝"
};
const ActivityLog = ({
  limit = 60
}) => {
  const feedings = useRecords("feeding", 60);
  const sleeps = useRecords("sleep", 60);
  const diapers = useRecords("diaper", 60);
  const pumps = useRecords("pump", 30);
  const solids = useRecords("solid", 30);
  const meds = useRecords("med", 30);
  const growths = useRecords("growth", 40);
  const healths = useRecords("health", 40);
  const milestones = useRecords("milestone", 30);
  const letters = useRecords("letter", 40);
  const photos = usePhotos(40);
  const loading = !feedings || !sleeps || !diapers;
  const photoActs = (photos || []).map(p => ({
    ...p,
    type: "photo",
    at: p.createdAt,
    creatorName: p.uploaderName
  }));
  const feed = [...(feedings || []), ...(sleeps || []), ...(diapers || []), ...(pumps || []), ...(solids || []), ...(meds || []), ...(growths || []), ...(healths || []), ...(milestones || []), ...(letters || []), ...photoActs].sort((a, b) => toDate(b.createdAt || b.at) - toDate(a.createdAt || a.at)).slice(0, limit);
  const labelOf = r => REC_LABEL[r.type] || "기록";
  const iconOf = r => REC_ICON[r.type] || "📋";
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 px-1"
  }, "\uB204\uAC00 \uBB34\uC5C7\uC744 \uAE30\uB85D\uD588\uB294\uC9C0 \uD55C\uB208\uC5D0 (\uAD00\uB9AC\uC790 \uC804\uC6A9)"), loading ? /*#__PURE__*/React.createElement(Spinner, null) : feed.length === 0 ? /*#__PURE__*/React.createElement(Card, {
    className: "p-6 text-center text-sm text-slate-400"
  }, "\uC544\uC9C1 \uD65C\uB3D9\uC774 \uC5C6\uC5B4\uC694.") : /*#__PURE__*/React.createElement(Card, {
    className: "p-2"
  }, /*#__PURE__*/React.createElement("ul", {
    className: "divide-y divide-slate-100 dark:divide-slate-700"
  }, feed.map(r => /*#__PURE__*/React.createElement("li", {
    key: r.type + "_" + r.id,
    className: "flex items-center gap-3 px-2 py-2.5 text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg",
    "aria-hidden": "true"
  }, iconOf(r)), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 text-slate-700 dark:text-slate-200 truncate"
  }, /*#__PURE__*/React.createElement("b", null, r.creatorName), "\uB2D8 \xB7 ", labelOf(r)), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-slate-400 whitespace-nowrap"
  }, ago(r.createdAt || r.at)))))));
};

/* ========================================================================
   9. 수유 기록
   ======================================================================== */
const FeedingTracker = () => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const units = useUnits();
  const items = useRecords("feeding");
  const [kind, setKind] = useState("breast"); // breast/formula/mixed
  const [side, setSide] = useState("left");
  const [amount, setAmount] = useState("");
  const [dur, setDur] = useState("");
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await addRecord("feeding", {
        kind,
        side: kind === "breast" ? side : null,
        amount: amount ? units.volToMl(amount) : null,
        durationMin: dur ? Number(dur) : null,
        at: fromLocalInput(at)
      }, user, profile);
      setAmount("");
      setDur("");
      setAt(toLocalInput(new Date()));
      toast("수유 기록을 추가했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const now = useNow(30000); // 30초마다 경과시간 갱신
  const last = items && items[0];
  const lastDate = last && toDate(last.at);
  const elapsedMin = lastDate ? Math.floor((now - lastDate) / 60000) : null;
  const overdue = elapsedMin != null && elapsedMin > 180;
  const kindLabel = {
    breast: "모유",
    formula: "분유",
    mixed: "혼합"
  };

  // 좌/우 자동 추천: 지난 모유 수유 반대쪽 (모유 첫 선택 시)
  const lastBreast = items && items.find(r => r.kind === "breast" && r.side);
  const suggestSide = lastBreast ? lastBreast.side === "left" ? "right" : lastBreast.side === "right" ? "left" : "left" : null;
  useEffect(() => {
    if (kind === "breast" && suggestSide) setSide(suggestSide);
  }, [kind, suggestSide]);

  // 직전 수유와 동일하게 한 번 더 (야간 빠른 입력)
  const repeatLast = async () => {
    if (!last) return;
    setBusy(true);
    try {
      await addRecord("feeding", {
        kind: last.kind,
        side: last.side || null,
        amount: last.amount || null,
        durationMin: last.durationMin || null,
        at: TS()
      }, user, profile);
      toast("직전 수유와 동일하게 기록했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, lastDate && /*#__PURE__*/React.createElement(Card, {
    className: `p-4 text-center ${overdue ? "ring-2 ring-amber-400" : ""}`
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-400"
  }, "\uB9C8\uC9C0\uB9C9 \uC218\uC720 \uACBD\uACFC"), /*#__PURE__*/React.createElement("p", {
    className: `text-2xl font-bold ${overdue ? "text-amber-500" : "text-teal-500"}`
  }, hm(elapsedMin)), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, kindLabel[last.kind], last.amount ? ` ${units.fmtVol(last.amount)}` : "", " \xB7 ", fmtTime(last.at)), overdue && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-600 dark:text-amber-400 mt-1"
  }, "\u26A0\uFE0F 3\uC2DC\uAC04 \uCD08\uACFC \u2014 \uC218\uC720 \uC2DC\uAC04\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694"), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: repeatLast,
    disabled: busy,
    className: "w-full mt-3 text-sm py-2.5"
  }, "\uD83D\uDD01 \uC9C1\uC804\uACFC \uB3D9\uC77C\uD558\uAC8C \uD55C \uBC88 \uB354")), /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-4"
  }, /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uC218\uC720 \uC885\uB958",
    value: kind,
    onChange: setKind,
    options: [{
      value: "breast",
      label: "🤱 모유"
    }, {
      value: "formula",
      label: "🍼 분유"
    }, {
      value: "mixed",
      label: "🥛 혼합"
    }]
  }), kind === "breast" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uC218\uC720 \uC704\uCE58",
    value: side,
    onChange: setSide,
    options: [{
      value: "left",
      label: "왼쪽"
    }, {
      value: "right",
      label: "오른쪽"
    }, {
      value: "both",
      label: "양쪽"
    }]
  }), suggestSide && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-teal-500 mt-1"
  }, "\uD83D\uDCA1 \uC9C0\uB09C\uBC88 ", lastBreast.side === "left" ? "왼쪽" : lastBreast.side === "right" ? "오른쪽" : "양쪽", " \u2192 \uC774\uBC88\uC5D4 ", /*#__PURE__*/React.createElement("b", null, suggestSide === "left" ? "왼쪽" : "오른쪽"), " \uCD94\uCC9C")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(Field, {
    label: `수유량 (${units.volLabel})`
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: amount,
    onChange: e => setAmount(e.target.value),
    placeholder: units.vol === "oz" ? "4" : "120"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uC2DC\uAC04 (\uBD84)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "numeric",
    value: dur,
    onChange: e => setDur(e.target.value),
    placeholder: "15"
  }))), /*#__PURE__*/React.createElement(DateTimeField, {
    value: at,
    onChange: setAt
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "수유 기록 저장")), /*#__PURE__*/React.createElement(RecordList, {
    items: items,
    render: r => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "font-medium text-slate-800 dark:text-white"
    }, kindLabel[r.kind], r.side && ` · ${{
      left: "왼쪽",
      right: "오른쪽",
      both: "양쪽"
    }[r.side]}`), r.amount ? ` · ${units.fmtVol(r.amount)}` : "", r.durationMin ? ` · ${r.durationMin}분` : "")
  }));
};

/* ========================================================================
   10. 수면 기록 (원탭 시작/종료 + 7일 그래프)
   ======================================================================== */
const SleepTracker = () => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const items = useRecords("sleep");
  const now = useNow(20000); // 경과(분) 갱신용
  const [napKind, setNapKind] = useState("nap");
  const [busy, setBusy] = useState(false);
  // 직접 입력 모드
  const [manKind, setManKind] = useState("nap");
  const [manStart, setManStart] = useState(toLocalInput(new Date()));
  const [manEnd, setManEnd] = useState(toLocalInput(new Date()));
  const ongoing = items && items.find(r => !r.end);
  const manualSave = async () => {
    const s = fromLocalInput(manStart),
      e = fromLocalInput(manEnd);
    if (e <= s) {
      toast("일어난 시간이 잠든 시간보다 뒤여야 해요.", "error");
      return;
    }
    const min = Math.max(1, Math.round((e - s) / 60000));
    setBusy(true);
    try {
      await addRecord("sleep", {
        naptype: manKind,
        start: s,
        end: e,
        durationMin: min,
        at: s
      }, user, profile);
      toast(`수면 기록 추가 · ${hm(min)}`, "success");
      setManStart(toLocalInput(new Date()));
      setManEnd(toLocalInput(new Date()));
    } catch (ex) {
      toast(errMsg(ex), "error");
    } finally {
      setBusy(false);
    }
  };
  const start = async () => {
    setBusy(true);
    try {
      await addRecordUndoable("sleep", {
        naptype: napKind,
        start: TS(),
        end: null,
        at: TS()
      }, user, profile, toast, "수면을 시작했어요 😴");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const stop = async () => {
    if (!ongoing) return;
    const startD = toDate(ongoing.start);
    if (!startD) {
      toast("시작 시각 기록 중이에요. 잠시 후 다시 눌러주세요.", "error");
      return;
    }
    setBusy(true);
    try {
      // 잘못된 값 방지: 0~24시간 범위로 보정
      const min = Math.min(24 * 60, Math.max(1, Math.round((Date.now() - startD) / 60000)));
      await COL.records().doc(ongoing.id).update({
        end: TS(),
        durationMin: min
      });
      toast(`수면 종료 · ${hm(min)}`, "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  // 잘못된 값(이전 버그로 저장된 큰 수면시간) 방지: 0~24시간으로 보정
  const dur = r => Math.min(24 * 60, Math.max(0, r.durationMin || 0));
  // 최근 7일 합계
  const chartData = useMemo(() => {
    if (!items) return [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = ymd(d);
      const total = items.filter(r => r.end && ymd(r.at) === key).reduce((s, r) => s + dur(r), 0);
      days.push({
        day: d.toLocaleDateString("ko-KR", {
          weekday: "short"
        }),
        hours: +(total / 60).toFixed(1)
      });
    }
    return days;
  }, [items]);
  const todayMin = items ? items.filter(r => r.end && isSameDay(r.at, new Date())).reduce((s, r) => s + dur(r), 0) : 0;
  const todayH = todayMin / 60;
  // 수면 안전: 신생아 14~17시간 권장 (육아 전문가 검토 #3)
  const sleepWarn = todayH > 0 && (todayH < 11 ? "부족" : todayH > 19 ? "과다" : null);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-5 text-center"
  }, ongoing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-violet-500"
  }, "\uD83D\uDE34 \uC218\uBA74 \uC911 \xB7 ", napKindLabel(ongoing.naptype)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, fmtTime(ongoing.start), " \uC2DC\uC791"), (() => {
    const startD = toDate(ongoing.start);
    if (!startD) return /*#__PURE__*/React.createElement("p", {
      className: "text-2xl font-bold text-violet-400 my-3",
      "aria-live": "polite"
    }, "\uCE21\uC815 \uC2DC\uC791 \uC911\u2026");
    const min = Math.max(0, Math.floor((now - startD) / 60000));
    const h = Math.floor(min / 60),
      m = min % 60;
    return /*#__PURE__*/React.createElement("p", {
      className: "text-4xl font-bold text-violet-500 my-2 tabular-nums",
      "aria-live": "polite"
    }, h > 0 ? `${h}시간 ` : "", m, "\uBD84 \uACBD\uACFC");
  })(), /*#__PURE__*/React.createElement(Btn, {
    variant: "lavender",
    onClick: stop,
    disabled: busy,
    className: "w-full"
  }, "\uD83D\uDE0A \uAE30\uC0C1 (\uC218\uBA74 \uC885\uB8CC)")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ChipGroup, {
    value: napKind,
    onChange: setNapKind,
    options: [{
      value: "nap",
      label: "🌤️ 낮잠"
    }, {
      value: "night",
      label: "🌙 밤잠"
    }]
  }), /*#__PURE__*/React.createElement(Btn, {
    variant: "primary",
    onClick: start,
    disabled: busy,
    className: "w-full mt-3"
  }, "\uD83D\uDE34 \uC218\uBA74 \uC2DC\uC791 (\uD0C0\uC774\uBA38)"))), !ongoing && /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "\u23F1\uFE0F \uC2DC\uAC04 \uC9C1\uC811 \uC785\uB825"), /*#__PURE__*/React.createElement(ChipGroup, {
    value: manKind,
    onChange: setManKind,
    options: [{
      value: "nap",
      label: "🌤️ 낮잠"
    }, {
      value: "night",
      label: "🌙 밤잠"
    }]
  }), /*#__PURE__*/React.createElement(DateTimeField, {
    value: manStart,
    onChange: setManStart,
    label: "\uC7A0\uB4E0 \uC2DC\uAC04"
  }), /*#__PURE__*/React.createElement(DateTimeField, {
    value: manEnd,
    onChange: setManEnd,
    label: "\uC77C\uC5B4\uB09C \uC2DC\uAC04"
  }), /*#__PURE__*/React.createElement(Btn, {
    variant: "lavender",
    onClick: manualSave,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "수면 기록 저장")), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "\uC624\uB298 \uCD1D \uC218\uBA74"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-teal-500"
  }, hm(todayMin))), sleepWarn && /*#__PURE__*/React.createElement("p", {
    className: `text-xs rounded-lg px-3 py-2 mt-1 ${sleepWarn === "부족" ? "text-amber-600 bg-amber-50 dark:bg-amber-900/30" : "text-sky-600 bg-sky-50 dark:bg-sky-900/30"}`
  }, sleepWarn === "부족" ? "기록된 수면이 평균보다 적어요." : "기록된 수면이 평균보다 많아요.", " \uC2E0\uC0DD\uC544\uB294 \uBCF4\uD1B5 \uD558\uB8E8 14~17\uC2DC\uAC04 \uC794\uB2E4\uACE0 \uD574\uC694. \uC801\uC9C0 \uBABB\uD55C \uB0AE\uC7A0\uC774 \uC788\uC73C\uBA74 \uC2E4\uC81C\uC640 \uB2E4\uB97C \uC218 \uC788\uC2B5\uB2C8\uB2E4.")), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white mb-3"
  }, "\uCD5C\uADFC 7\uC77C \uC218\uBA74 (\uC2DC\uAC04)"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 180
    }
  }, /*#__PURE__*/React.createElement(ResponsiveContainer, null, /*#__PURE__*/React.createElement(BarChart, {
    data: chartData,
    margin: {
      top: 5,
      right: 5,
      left: -20,
      bottom: 0
    }
  }, /*#__PURE__*/React.createElement(CartesianGrid, {
    strokeDasharray: "3 3",
    stroke: "#e2e8f0"
  }), /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "day",
    tick: {
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(Tooltip, {
    formatter: v => [`${v}시간`, "수면"]
  }), /*#__PURE__*/React.createElement(ReferenceLine, {
    y: 14,
    stroke: "#34d399",
    strokeDasharray: "4 4",
    label: {
      value: "참고 14h",
      fontSize: 12,
      fill: "#34d399"
    }
  }), /*#__PURE__*/React.createElement(Bar, {
    dataKey: "hours",
    fill: "#a78bfa",
    radius: [6, 6, 0, 0]
  }))))), /*#__PURE__*/React.createElement(RecordList, {
    items: items,
    render: r => /*#__PURE__*/React.createElement(React.Fragment, null, napKindLabel(r.naptype), " \xB7 ", r.end ? hm(r.durationMin || 0) : /*#__PURE__*/React.createElement("span", {
      className: "text-violet-500"
    }, "\uC9C4\uD589 \uC911"))
  }));
};
const napKindLabel = t => t === "night" ? "🌙 밤잠" : "🌤️ 낮잠";

/* ========================================================================
   11. 기저귀 기록
   ======================================================================== */
const DiaperTracker = () => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const items = useRecords("diaper");
  const [type, setType] = useState("pee");
  const [color, setColor] = useState("");
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [busy, setBusy] = useState(false);

  // 눈여겨볼 색상/혈변 안내 키워드 (육아 전문가 검토 #6)
  const ABNORMAL = ["피", "혈", "빨강", "빨간", "검정", "검은", "흰", "하양", "회색"];
  const colorWarn = color && ABNORMAL.some(k => color.includes(k));
  const save = async () => {
    setBusy(true);
    try {
      await addRecord("diaper", {
        diaperType: type,
        color: color || null,
        at: fromLocalInput(at)
      }, user, profile);
      setColor("");
      setAt(toLocalInput(new Date()));
      toast("기저귀 기록을 추가했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const today = items ? items.filter(r => isSameDay(r.at, new Date())) : [];
  // 24시간 소변 없음 경고 (육아 전문가 검토 #6)
  const lastPee = items && items.find(r => r.diaperType === "pee" || r.diaperType === "both");
  const noPee24 = lastPee && Date.now() - toDate(lastPee.at) > 24 * 3600000;

  // 최근 7일 트렌드 (소변=pee+both, 대변=poo+both, 총합=전체)
  const trend = useMemo(() => {
    if (!items) return [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = ymd(d);
      const dayItems = items.filter(r => ymd(r.at) === key);
      days.push({
        day: d.toLocaleDateString("ko-KR", {
          weekday: "short"
        }),
        소변: dayItems.filter(r => r.diaperType === "pee" || r.diaperType === "both").length,
        대변: dayItems.filter(r => r.diaperType === "poo" || r.diaperType === "both").length,
        총합: dayItems.length
      });
    }
    return days;
  }, [items]);
  const peeCnt = today.filter(r => r.diaperType === "pee" || r.diaperType === "both").length;
  const pooCnt = today.filter(r => r.diaperType === "poo" || r.diaperType === "both").length;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-3 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "\uC624\uB298 \uC18C\uBCC0"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold text-sky-500"
  }, peeCnt, "\uD68C")), /*#__PURE__*/React.createElement(Card, {
    className: "p-3 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "\uC624\uB298 \uB300\uBCC0"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold text-amber-600"
  }, pooCnt, "\uD68C")), /*#__PURE__*/React.createElement(Card, {
    className: "p-3 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "\uCD1D\uD569"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold text-slate-800 dark:text-white"
  }, today.length, "\uD68C"))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white mb-2"
  }, "\uCD5C\uADFC 7\uC77C \uD2B8\uB80C\uB4DC"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 180
    }
  }, /*#__PURE__*/React.createElement(ResponsiveContainer, null, /*#__PURE__*/React.createElement(BarChart, {
    data: trend,
    margin: {
      top: 5,
      right: 5,
      left: -24,
      bottom: 0
    }
  }, /*#__PURE__*/React.createElement(CartesianGrid, {
    strokeDasharray: "3 3",
    stroke: "#e2e8f0"
  }), /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "day",
    tick: {
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {
      fontSize: 12
    },
    allowDecimals: false
  }), /*#__PURE__*/React.createElement(Tooltip, null), /*#__PURE__*/React.createElement(Legend, {
    wrapperStyle: {
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(Bar, {
    dataKey: "\uC18C\uBCC0",
    fill: "#38bdf8",
    radius: [3, 3, 0, 0]
  }), /*#__PURE__*/React.createElement(Bar, {
    dataKey: "\uB300\uBCC0",
    fill: "#d97706",
    radius: [3, 3, 0, 0]
  }), /*#__PURE__*/React.createElement(Bar, {
    dataKey: "\uCD1D\uD569",
    fill: "#a78bfa",
    radius: [3, 3, 0, 0]
  }))))), noPee24 && /*#__PURE__*/React.createElement("div", {
    role: "alert",
    className: "text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/30 rounded-xl px-3 py-2.5"
  }, "\u26A0\uFE0F 24\uC2DC\uAC04 \uB118\uAC8C \uC18C\uBCC0 \uAE30\uB85D\uC774 \uC5C6\uC5B4\uC694. \uC801\uB294 \uAC78 \uC78A\uC73C\uC2E0 \uAC8C \uC544\uB2C8\uB77C\uBA74 \uC18C\uC544\uACFC\uC5D0 \uBB38\uC758\uD574\uBCF4\uC138\uC694."), /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-4"
  }, /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uC885\uB958",
    value: type,
    onChange: setType,
    options: [{
      value: "pee",
      label: "💧 소변"
    }, {
      value: "poo",
      label: "💩 대변"
    }, {
      value: "both",
      label: "💧💩 둘 다"
    }]
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\uC0C9\uC0C1 \uBA54\uBAA8 (\uC120\uD0DD)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: color,
    onChange: e => setColor(e.target.value),
    placeholder: "\uB178\uB780\uC0C9, \uD669\uAE08\uC0C9 \uB4F1"
  })), colorWarn && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/30 rounded-lg px-3 py-2"
  }, "\u26A0\uFE0F \uB208\uC5EC\uACA8\uBCFC \uC0C9(\uBE68\uAC15\xB7\uD770\uC0C9\xB7\uAC80\uC740\uC0C9)\uC73C\uB85C \uC801\uD614\uC5B4\uC694. \uC0AC\uC9C4\uC744 \uCC0D\uC5B4\uB450\uACE0 \uC18C\uC544\uACFC\uC5D0 \uBCF4\uC5EC\uC8FC\uC138\uC694."), /*#__PURE__*/React.createElement(DateTimeField, {
    value: at,
    onChange: setAt
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "기저귀 기록")), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white mb-2"
  }, "\uD83D\uDCA9 \uB300\uBCC0 \uC0C9\uC0C1 \uAC00\uC774\uB4DC"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, [{
    c: "#caa15a",
    n: "노랑/황금색",
    s: "흔한 색 (모유)",
    ok: true
  }, {
    c: "#8a6d3b",
    n: "갈색/연갈색",
    s: "흔한 색 (분유·이유식)",
    ok: true
  }, {
    c: "#3b7a3b",
    n: "초록색",
    s: "자주 보이는 색 (전유/철분)",
    ok: true
  }, {
    c: "#9b1c1c",
    n: "빨강(혈변)",
    s: "⚠️ 진료 권함",
    ok: false
  }, {
    c: "#1a1a1a",
    n: "검정색",
    s: "⚠️ 진료 권함 (태변 이후)",
    ok: false
  }, {
    c: "#e5e5e5",
    n: "흰색/회색",
    s: "⚠️ 즉시 진료",
    ok: false
  }].map(g => /*#__PURE__*/React.createElement("div", {
    key: g.n,
    className: "flex items-center gap-2.5 text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600 shrink-0",
    style: {
      background: g.c
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-slate-700 dark:text-slate-200 w-24 shrink-0"
  }, g.n), /*#__PURE__*/React.createElement("span", {
    className: g.ok ? "text-slate-500 dark:text-slate-400" : "text-rose-600 font-medium"
  }, g.s)))), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 mt-2"
  }, "\uC0C9\uB9CC\uC73C\uB85C\uB294 \uC54C \uC218 \uC5C6\uC5B4\uC694. \uB208\uC5EC\uACA8\uBCFC \uC0C9\uC774 \uC774\uC5B4\uC9C0\uBA74 \uC18C\uC544\uACFC\uC5D0 \uBCF4\uC5EC\uC8FC\uC138\uC694.")), /*#__PURE__*/React.createElement(RecordList, {
    items: items,
    render: r => /*#__PURE__*/React.createElement(React.Fragment, null, {
      pee: "💧 소변",
      poo: "💩 대변",
      both: "💧💩 둘 다"
    }[r.diaperType], r.color && ` · ${r.color}`)
  }));
};

/* ========================================================================
   12. 성장 기록 (WHO 백분위 곡선 포함)
   ----------------------------------------------------------------------
   WHO Child Growth Standards 근사값 (월령: P3 / P50 / P97), 0~24개월. 참고용.
   ======================================================================== */
// [month, P3, P50, P97]
const WHO = {
  male: {
    weight: [[0, 2.5, 3.3, 4.4], [1, 3.4, 4.5, 5.8], [2, 4.3, 5.6, 7.1], [3, 5.0, 6.4, 8.0], [4, 5.6, 7.0, 8.7], [5, 6.0, 7.5, 9.3], [6, 6.4, 7.9, 9.8], [9, 7.1, 8.9, 11.0], [12, 7.7, 9.6, 12.0], [18, 8.8, 10.9, 13.7], [24, 9.7, 12.2, 15.3]],
    height: [[0, 46.3, 49.9, 53.4], [1, 51.1, 54.7, 58.4], [2, 54.7, 58.4, 62.2], [3, 57.6, 61.4, 65.3], [6, 63.3, 67.6, 71.9], [9, 67.5, 72.0, 76.5], [12, 71.0, 75.7, 80.5], [18, 76.9, 82.3, 87.7], [24, 81.7, 87.8, 93.9]]
  },
  female: {
    weight: [[0, 2.4, 3.2, 4.2], [1, 3.2, 4.2, 5.5], [2, 3.9, 5.1, 6.6], [3, 4.5, 5.8, 7.5], [4, 5.0, 6.4, 8.2], [5, 5.4, 6.9, 8.8], [6, 5.7, 7.3, 9.3], [9, 6.5, 8.2, 10.5], [12, 7.0, 8.9, 11.5], [18, 8.1, 10.2, 13.2], [24, 9.0, 11.5, 14.8]],
    height: [[0, 45.6, 49.1, 52.7], [1, 50.0, 53.7, 57.4], [2, 53.2, 57.1, 61.1], [3, 55.8, 59.8, 63.9], [6, 61.2, 65.7, 70.3], [9, 65.3, 70.1, 75.0], [12, 68.9, 74.0, 79.2], [18, 74.9, 80.7, 86.5], [24, 80.0, 86.4, 92.9]]
  }
};
// 선형보간으로 특정 월령의 [P3,P50,P97] 구하기
const whoAt = (rows, m) => {
  if (m <= rows[0][0]) return rows[0].slice(1);
  if (m >= rows[rows.length - 1][0]) return rows[rows.length - 1].slice(1);
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i],
      b = rows[i + 1];
    if (m >= a[0] && m <= b[0]) {
      const t = (m - a[0]) / (b[0] - a[0]);
      return [1, 2, 3].map(k => a[k] + (b[k] - a[k]) * t);
    }
  }
  return rows[rows.length - 1].slice(1);
};
// 측정값의 대략적 백분위 추정 (P3/P50/P97 구간 선형 근사)
const estPercentile = (rows, m, v) => {
  if (v == null) return null;
  const [p3, p50, p97] = whoAt(rows, m);
  let pct;
  if (v <= p3) pct = 3 * (v / p3);else if (v <= p50) pct = 3 + (50 - 3) * (v - p3) / (p50 - p3);else if (v <= p97) pct = 50 + (97 - 50) * (v - p50) / (p97 - p50);else pct = 97 + (v - p97) / p97 * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
};
const GrowthTracker = () => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const baby = useBaby();
  const items = useRecords("growth", 100);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [head, setHead] = useState("");
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [busy, setBusy] = useState(false);
  const [metric, setMetric] = useState("weight"); // weight | height

  const save = async () => {
    if (!height && !weight && !head) {
      toast("측정값을 하나 이상 입력하세요.", "error");
      return;
    }
    setBusy(true);
    try {
      await addRecord("growth", {
        height: height ? Number(height) : null,
        weight: weight ? Number(weight) : null,
        head: head ? Number(head) : null,
        at: fromLocalInput(at)
      }, user, profile);
      setHeight("");
      setWeight("");
      setHead("");
      setAt(toLocalInput(new Date()));
      toast("성장 기록을 추가했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  // 월령 계산 (출생일 기준)
  const ageMonthsAt = d => baby.birthDate ? (toDate(d) - new Date(baby.birthDate)) / (86400000 * 30.4375) : null;
  const whoRows = baby.sex && WHO[baby.sex] ? WHO[baby.sex][metric] : null;

  // 차트 데이터: WHO 곡선 점 + 아기 측정점을 월령(x) 기준으로 병합
  const chartData = useMemo(() => {
    if (!whoRows) return null;
    const rows = whoRows.map(r => ({
      m: r[0],
      p3: r[1],
      p50: r[2],
      p97: r[3]
    }));
    const pts = [];
    (items || []).forEach(r => {
      const v = r[metric];
      const m = ageMonthsAt(r.at);
      if (v != null && m != null && m >= 0 && m <= 24) pts.push({
        m: +m.toFixed(2),
        baby: v
      });
    });
    return [...rows, ...pts].sort((a, b) => a.m - b.m);
  }, [items, metric, whoRows, baby.birthDate]);

  // 최신 측정의 백분위
  const measured = items ? items.filter(r => r[metric] != null) : [];
  const latest = measured[0];
  const prev = measured[1];
  const trend = latest && prev ? +(latest[metric] - prev[metric]).toFixed(2) : null; // 직전 대비 변화
  const latestM = latest ? ageMonthsAt(latest.at) : null;
  const pct = whoRows && latest && latestM != null && latestM >= 0 && latestM <= 24 ? estPercentile(whoRows, latestM, latest[metric]) : null;

  // 백업: 성별/출생일 없을 때 날짜 기준 단순 그래프
  const simpleData = useMemo(() => items ? [...items].reverse().map(r => ({
    date: fmtDate(r.at),
    weight: r.weight,
    height: r.height
  })) : [], [items]);
  const unit = metric === "weight" ? "kg" : "cm";
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\uD0A4 (cm)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: height,
    onChange: e => setHeight(e.target.value),
    placeholder: "50"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uBAB8\uBB34\uAC8C (kg)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: weight,
    onChange: e => setWeight(e.target.value),
    placeholder: "3.4"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uBA38\uB9AC\uB458\uB808"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: head,
    onChange: e => setHead(e.target.value),
    placeholder: "35"
  }))), /*#__PURE__*/React.createElement(DateTimeField, {
    value: at,
    onChange: setAt,
    label: "\uCE21\uC815 \uC2DC\uAC04"
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "성장 기록 추가")), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "WHO \uC131\uC7A5 \uBC31\uBD84\uC704"), /*#__PURE__*/React.createElement(ChipGroup, {
    value: metric,
    onChange: setMetric,
    options: [{
      value: "weight",
      label: "몸무게"
    }, {
      value: "height",
      label: "키"
    }]
  })), !whoRows ? /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 my-2"
  }, "WHO \uBC31\uBD84\uC704 \uACE1\uC120\uC744 \uBCF4\uB824\uBA74 ", /*#__PURE__*/React.createElement("b", null, "\uC124\uC815 \u2192 \uC544\uAE30 \uC815\uBCF4"), "\uC5D0\uC11C ", /*#__PURE__*/React.createElement("b", null, "\uCD9C\uC0DD\uC77C"), "\uACFC ", /*#__PURE__*/React.createElement("b", null, "\uC131\uBCC4"), "\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.") : /*#__PURE__*/React.createElement(React.Fragment, null, pct != null && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 dark:text-slate-400 mb-2"
  }, "\uCD5C\uADFC ", metric === "weight" ? "몸무게" : "키", " ", /*#__PURE__*/React.createElement("b", null, latest[metric], unit), trend != null && /*#__PURE__*/React.createElement("b", {
    className: trend > 0 ? "text-teal-600" : trend < 0 ? "text-rose-500" : "text-slate-400"
  }, " ", trend > 0 ? "▲" : trend < 0 ? "▼" : "—", Math.abs(trend), unit), " · 또래 약 ", /*#__PURE__*/React.createElement("b", {
    className: "text-teal-600"
  }, pct, "\uBC31\uBD84\uC704"), (pct < 3 || pct > 97) && /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600"
  }, " \xB7 \uAC80\uC9C4 \uB54C \uD568\uAED8 \uBCF4\uC5EC\uC8FC\uC138\uC694")), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 mb-2"
  }, "\uD68C\uC0C9 \uACE1\uC120: WHO 3/50/97 \uBC31\uBD84\uC704(\uCC38\uACE0\uC6A9) \xB7 \uC810\uC120: \uC6B0\uB9AC \uC544\uAE30"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 220
    }
  }, /*#__PURE__*/React.createElement(ResponsiveContainer, null, /*#__PURE__*/React.createElement(LineChart, {
    data: chartData,
    margin: {
      top: 5,
      right: 8,
      left: -20,
      bottom: 0
    }
  }, /*#__PURE__*/React.createElement(CartesianGrid, {
    strokeDasharray: "3 3",
    stroke: "#e2e8f0"
  }), /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "m",
    type: "number",
    domain: [0, 24],
    ticks: [0, 3, 6, 9, 12, 18, 24],
    tick: {
      fontSize: 12
    },
    label: {
      value: "개월",
      position: "insideBottomRight",
      fontSize: 12,
      offset: -2
    }
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {
      fontSize: 12
    },
    domain: ["auto", "auto"]
  }), /*#__PURE__*/React.createElement(Tooltip, {
    formatter: (v, n) => [v + unit, {
      p3: "3백분위",
      p50: "50백분위",
      p97: "97백분위",
      baby: "우리아기"
    }[n] || n],
    labelFormatter: l => `${l}개월`
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "p97",
    stroke: "#cbd5e1",
    strokeWidth: 1,
    dot: false,
    connectNulls: true
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "p50",
    stroke: "#94a3b8",
    strokeWidth: 1,
    strokeDasharray: "4 3",
    dot: false,
    connectNulls: true
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "p3",
    stroke: "#cbd5e1",
    strokeWidth: 1,
    dot: false,
    connectNulls: true
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "baby",
    stroke: "#14b8a6",
    strokeWidth: 2.5,
    dot: {
      r: 4
    },
    connectNulls: true
  })))))), !whoRows && /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white mb-2"
  }, metric === "weight" ? "몸무게" : "키", " \uCD94\uC774 (", unit, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 180
    }
  }, /*#__PURE__*/React.createElement(ResponsiveContainer, null, /*#__PURE__*/React.createElement(LineChart, {
    data: simpleData,
    margin: {
      top: 5,
      right: 5,
      left: -20,
      bottom: 0
    }
  }, /*#__PURE__*/React.createElement(CartesianGrid, {
    strokeDasharray: "3 3",
    stroke: "#e2e8f0"
  }), /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "date",
    tick: {
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {
      fontSize: 12
    },
    domain: ["auto", "auto"]
  }), /*#__PURE__*/React.createElement(Tooltip, null), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: metric,
    stroke: "#14b8a6",
    strokeWidth: 2,
    dot: {
      r: 3
    },
    connectNulls: true
  }))))), /*#__PURE__*/React.createElement(RecordList, {
    items: items,
    render: r => /*#__PURE__*/React.createElement(React.Fragment, null, r.height ? `키 ${r.height}cm ` : "", r.weight ? `몸무게 ${r.weight}kg ` : "", r.head ? `머리 ${r.head}cm` : "")
  }));
};

/* ========================================================================
   13. 건강 기록 (체온 + 증상 + 예방접종)
   ======================================================================== */
/* 체온·심박·CRL 안내는 vendor/toto-core.js 한 벌만 쓴다.
   숫자 경계가 한 칸 밀리면 열이 나는 아기를 괜찮다고 보여주게 되므로
   경계마다 테스트를 붙였다 (38.0 이 '조금 높음' 이 되지 않는지 등). */

// 예방접종 표준 일정 (질병관리청 표준예방접종일정 기준 요약)
const VACCINES = [{
  age: "출생~4주",
  items: ["B형간염 1차", "BCG(결핵)"]
}, {
  age: "1개월",
  items: ["B형간염 2차"]
}, {
  age: "2개월",
  items: ["DTaP 1차", "IPV(폴리오) 1차", "Hib 1차", "폐렴구균 1차", "로타바이러스 1차"]
}, {
  age: "4개월",
  items: ["DTaP 2차", "IPV 2차", "Hib 2차", "폐렴구균 2차", "로타바이러스 2차"]
}, {
  age: "6개월",
  items: ["DTaP 3차", "IPV 3차", "Hib 3차", "폐렴구균 3차", "B형간염 3차", "로타바이러스 3차(해당 백신)", "인플루엔자(매년)"]
}, {
  age: "12~15개월",
  items: ["MMR 1차", "수두", "Hib 4차", "폐렴구균 4차", "A형간염 1차", "일본뇌염 1차"]
}, {
  age: "15~18개월",
  items: ["DTaP 4차"]
}, {
  age: "24~35개월",
  items: ["A형간염 2차", "일본뇌염 추가"]
}, {
  age: "만 4~6세",
  items: ["DTaP 5차", "IPV 4차", "MMR 2차"]
}];
const HealthLog = () => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const items = useRecords("health", 100);
  const [temp, setTemp] = useState("");
  const [symptom, setSymptom] = useState("");
  const [hospital, setHospital] = useState("");
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [busy, setBusy] = useState(false);
  const [vacDone, setVacDone] = useState({});

  // 예방접종 체크 상태 settings/baby 에 저장 (공유)
  useEffect(() => {
    const unsub = COL.settings().onSnapshot(s => setVacDone(s.data() && s.data().vaccines || {}));
    return () => unsub();
  }, []);
  const toggleVac = async name => {
    const next = {
      ...vacDone,
      [name]: !vacDone[name]
    };
    try {
      await COL.settings().set({
        vaccines: next
      }, {
        merge: true
      });
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  const stage = temp ? tempStage(Number(temp)) : null;
  const save = async () => {
    if (!temp && !symptom && !hospital) {
      toast("기록할 내용을 입력하세요.", "error");
      return;
    }
    setBusy(true);
    try {
      await addRecord("health", {
        temp: temp ? Number(temp) : null,
        symptom: symptom || null,
        hospital: hospital || null,
        at: fromLocalInput(at)
      }, user, profile);
      setTemp("");
      setSymptom("");
      setHospital("");
      setAt(toLocalInput(new Date()));
      toast("건강 기록을 추가했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(MedicalDisclaimer, null), /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\uCCB4\uC628 (\u2103)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    step: "0.1",
    value: temp,
    onChange: e => setTemp(e.target.value),
    placeholder: "36.8"
  })), stage && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: `text-sm rounded-lg px-3 py-2 ${stage.bg} ${stage.color}`
  }, /*#__PURE__*/React.createElement("b", null, stage.label), " \xB7 ", stage.msg), /*#__PURE__*/React.createElement(Field, {
    label: "\uC99D\uC0C1 \uBA54\uBAA8"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: symptom,
    onChange: e => setSymptom(e.target.value),
    placeholder: "\uCF67\uBB3C, \uAE30\uCE68 \uB4F1"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uBCD1\uC6D0 \uBC29\uBB38 \uAE30\uB85D"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: hospital,
    onChange: e => setHospital(e.target.value),
    placeholder: "\u25CB\u25CB\uC18C\uC544\uACFC \uBC29\uBB38, \uCC98\uBC29 \uB4F1"
  })), /*#__PURE__*/React.createElement(DateTimeField, {
    value: at,
    onChange: setAt,
    label: "\uAE30\uB85D \uC2DC\uAC04"
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "건강 기록 추가")), items && items.some(r => r.temp) && /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white mb-2"
  }, "\uCCB4\uC628 \uCD94\uC774 (\u2103)"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 170
    }
  }, /*#__PURE__*/React.createElement(ResponsiveContainer, null, /*#__PURE__*/React.createElement(LineChart, {
    data: [...items].filter(r => r.temp).reverse().map(r => ({
      date: fmtDate(r.at),
      temp: r.temp
    })),
    margin: {
      top: 5,
      right: 5,
      left: -20,
      bottom: 0
    }
  }, /*#__PURE__*/React.createElement(CartesianGrid, {
    strokeDasharray: "3 3",
    stroke: "#e2e8f0"
  }), /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "date",
    tick: {
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(YAxis, {
    domain: [35, 40],
    tick: {
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(Tooltip, null), /*#__PURE__*/React.createElement(ReferenceLine, {
    y: 38,
    stroke: "#f43f5e",
    strokeDasharray: "4 4",
    label: {
      value: "발열 38℃",
      fontSize: 12,
      fill: "#f43f5e"
    }
  }), /*#__PURE__*/React.createElement(ReferenceLine, {
    y: 37.5,
    stroke: "#f59e0b",
    strokeDasharray: "4 4"
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "temp",
    stroke: "#14b8a6",
    strokeWidth: 2,
    dot: {
      r: 3
    }
  }))))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white mb-1"
  }, "\uC608\uBC29\uC811\uC885 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 mb-3"
  }, "\uC9C8\uBCD1\uAD00\uB9AC\uCCAD \uD45C\uC900\uC608\uBC29\uC811\uC885\uC77C\uC815 \uAE30\uC900 (\uCC38\uACE0\uC6A9)"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, VACCINES.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.age
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-teal-600 dark:text-teal-400 mb-1.5"
  }, g.age), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, g.items.map(v => {
    const key = `${g.age}|${v}`;
    const done = !!vacDone[key];
    return /*#__PURE__*/React.createElement("label", {
      key: key,
      className: "flex items-center gap-2.5 cursor-pointer"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: done,
      onChange: () => toggleVac(key),
      className: "w-5 h-5 rounded accent-teal-500",
      "aria-label": `${v} 접종 완료`
    }), /*#__PURE__*/React.createElement("span", {
      className: `text-sm ${done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"}`
    }, v));
  })))))), /*#__PURE__*/React.createElement(RecordList, {
    items: items,
    render: r => /*#__PURE__*/React.createElement(React.Fragment, null, r.temp ? `🌡️ ${r.temp}℃ ` : "", r.symptom ? `· ${r.symptom} ` : "", r.hospital ? `· 🏥 ${r.hospital}` : "")
  }));
};

/* ========================================================================
   14. 임신 초기 기록 (초음파 + 검사 + 타임라인)
   ======================================================================== */
// CRL 유효 주수 안내 (육아 전문가 검토 #1)
/* ========================================================================
   13-b. 유축 / 투약 / 이유식 / 마일스톤 / 메모 (신규 기록 종류)
   ======================================================================== */
const PumpTracker = () => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const units = useUnits();
  const items = useRecords("pump", 100);
  const [side, setSide] = useState("both");
  const [amount, setAmount] = useState("");
  const [dur, setDur] = useState("");
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [busy, setBusy] = useState(false);
  const last = items && items[0];
  const save = async () => {
    setBusy(true);
    try {
      await addRecord("pump", {
        side,
        amount: amount ? units.volToMl(amount) : null,
        durationMin: dur ? Number(dur) : null,
        at: fromLocalInput(at)
      }, user, profile);
      setAmount("");
      setDur("");
      setAt(toLocalInput(new Date()));
      toast("유축 기록을 추가했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const sideL = {
    left: "왼쪽",
    right: "오른쪽",
    both: "양쪽"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uC720\uCD95 \uC704\uCE58",
    value: side,
    onChange: setSide,
    options: [{
      value: "left",
      label: "왼쪽"
    }, {
      value: "right",
      label: "오른쪽"
    }, {
      value: "both",
      label: "양쪽"
    }]
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(Field, {
    label: `유축량 (${units.volLabel})`
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: amount,
    onChange: e => setAmount(e.target.value),
    placeholder: units.vol === "oz" ? "3" : "80"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uC2DC\uAC04 (\uBD84)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "numeric",
    value: dur,
    onChange: e => setDur(e.target.value),
    placeholder: "15"
  }))), /*#__PURE__*/React.createElement(DateTimeField, {
    value: at,
    onChange: setAt
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "유축 기록 저장")), /*#__PURE__*/React.createElement(RecordList, {
    items: items,
    render: r => /*#__PURE__*/React.createElement(React.Fragment, null, "\uD83E\uDD31 ", sideL[r.side] || "", r.amount ? ` · ${units.fmtVol(r.amount)}` : "", r.durationMin ? ` · ${r.durationMin}분` : "")
  }));
};
const MedTracker = () => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const items = useRecords("med", 100);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [busy, setBusy] = useState(false);
  const presets = ["해열제(타이레놀)", "해열제(부루펜)", "항생제", "유산균", "비타민D", "감기약"];
  const save = async () => {
    if (!name.trim()) {
      toast("약 이름을 입력하세요.", "error");
      return;
    }
    setBusy(true);
    try {
      await addRecord("med", {
        name: name.trim(),
        dose: dose || null,
        at: fromLocalInput(at)
      }, user, profile);
      setName("");
      setDose("");
      setAt(toLocalInput(new Date()));
      toast("투약 기록을 추가했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  // 해열제 4시간 간격 안내
  const lastFever = items && items.find(r => /해열|타이레놀|부루펜/.test(r.name || ""));
  const feverGapH = lastFever ? (Date.now() - toDate(lastFever.at)) / 3600000 : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(MedicalDisclaimer, null), feverGapH != null && feverGapH < 4 && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 rounded-lg px-3 py-2"
  }, "\u23F1\uFE0F \uB9C8\uC9C0\uB9C9 \uD574\uC5F4\uC81C\uC5D0\uC11C ", feverGapH.toFixed(1), "\uC2DC\uAC04 \uC9C0\uB0AC\uC5B4\uC694. \uBCF4\uD1B5 4~6\uC2DC\uAC04 \uAC04\uACA9\uC73C\uB85C \uC4F4\uB2E4\uACE0 \uD558\uC9C0\uB9CC, \uAC04\uACA9\xB7\uC6A9\uB7C9\uC740 \uCC98\uBC29\uC744 \uB530\uB77C\uC8FC\uC138\uC694."), /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\uC57D \uC774\uB984"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "\uC608: \uD574\uC5F4\uC81C(\uD0C0\uC774\uB808\uB180)"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, presets.map(p => /*#__PURE__*/React.createElement("button", {
    key: p,
    type: "button",
    onClick: () => setName(p),
    className: "text-xs px-3 min-h-[44px] rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
  }, p))), /*#__PURE__*/React.createElement(Field, {
    label: "\uC6A9\uB7C9 (\uC120\uD0DD)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: dose,
    onChange: e => setDose(e.target.value),
    placeholder: "\uC608: 4ml, 1\uC815"
  })), /*#__PURE__*/React.createElement(DateTimeField, {
    value: at,
    onChange: setAt
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "투약 기록 저장")), /*#__PURE__*/React.createElement(RecordList, {
    items: items,
    render: r => /*#__PURE__*/React.createElement(React.Fragment, null, "\uD83D\uDC8A ", r.name, r.dose ? ` · ${r.dose}` : "")
  }));
};
const SolidTracker = () => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const items = useRecords("solid", 100);
  const [food, setFood] = useState("");
  const [amount, setAmount] = useState("");
  const [reaction, setReaction] = useState("none");
  const [note, setNote] = useState("");
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!food.trim()) {
      toast("음식 이름을 입력하세요.", "error");
      return;
    }
    setBusy(true);
    try {
      await addRecord("solid", {
        food: food.trim(),
        amount: amount || null,
        reaction,
        note: note || null,
        at: fromLocalInput(at)
      }, user, profile);
      setFood("");
      setAmount("");
      setReaction("none");
      setNote("");
      setAt(toLocalInput(new Date()));
      toast("이유식 기록을 추가했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\uC74C\uC2DD (\uC0C8 \uC74C\uC2DD\uC740 \uC54C\uB808\uB974\uAE30 \uAD00\uCC30)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: food,
    onChange: e => setFood(e.target.value),
    placeholder: "\uC608: \uC300\uBBF8\uC74C, \uC0AC\uACFC, \uACC4\uB780\uB178\uB978\uC790"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uC591 (\uC120\uD0DD)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: amount,
    onChange: e => setAmount(e.target.value),
    placeholder: "\uC608: 30g, 5\uC2A4\uD47C"
  })), /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uBC18\uC751(\uC54C\uB808\uB974\uAE30)",
    value: reaction,
    onChange: setReaction,
    options: [{
      value: "none",
      label: "👍 별일 없음"
    }, {
      value: "mild",
      label: "🟡 약간(발진 등)"
    }, {
      value: "bad",
      label: "🔴 심함"
    }]
  }), reaction !== "none" && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/30 rounded-lg px-3 py-2"
  }, "\u26A0\uFE0F \uADF8 \uC74C\uC2DD\uC744 \uC7A0\uC2DC \uBA48\uCD94\uACE0, \uC5B4\uB5A4 \uBC18\uC751\uC774\uC5C8\uB294\uC9C0 \uC801\uC5B4 \uC18C\uC544\uACFC\uC5D0 \uBCF4\uC5EC\uC8FC\uC138\uC694. \uC228\uC26C\uAE30\uAC00 \uD798\uB4E4\uC5B4 \uBCF4\uC774\uBA74 \uBC14\uB85C \uC751\uAE09\uC2E4\uB85C \uAC00\uC138\uC694."), /*#__PURE__*/React.createElement(Field, {
    label: "\uBA54\uBAA8 (\uC120\uD0DD)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "\uC798 \uBA39\uC74C / \uBC49\uC74C \uB4F1"
  })), /*#__PURE__*/React.createElement(DateTimeField, {
    value: at,
    onChange: setAt
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "이유식 기록 저장")), /*#__PURE__*/React.createElement(RecordList, {
    items: items,
    render: r => /*#__PURE__*/React.createElement(React.Fragment, null, "\uD83E\uDD63 ", r.food, r.amount ? ` · ${r.amount}` : "", r.reaction && r.reaction !== "none" ? r.reaction === "bad" ? " · 🔴알레르기" : " · 🟡반응" : "")
  }));
};

// 📖 첫돌 다이어리 슬롯 (처음 순간 + 귀여운 문구)
const DIARY_SLOTS = [{
  key: "born",
  icon: "🐣",
  title: "세상에 온 날",
  quote: "네가 우리에게 온 그날, 온 세상이 반짝였어 ✨"
}, {
  key: "smile",
  icon: "😊",
  title: "첫 미소",
  quote: "너의 첫 미소에 온 세상이 환해졌어 ☺️"
}, {
  key: "neck",
  icon: "🙆",
  title: "목 가누기",
  quote: "혼자 고개를 든 날, 참 대견했어 💪"
}, {
  key: "rollover",
  icon: "🔄",
  title: "첫 뒤집기",
  quote: "데굴— 세상을 뒤집은 날! 🌍"
}, {
  key: "tooth",
  icon: "🦷",
  title: "첫 이",
  quote: "하얀 이가 쏙, 앙증맞은 이앓이 🦷"
}, {
  key: "babble",
  icon: "💬",
  title: "첫 옹알이",
  quote: "옹알옹알, 너의 첫 이야기 🎵"
}, {
  key: "sit",
  icon: "🪑",
  title: "혼자 앉기",
  quote: "혼자 앉아 세상을 바라본 날 👀"
}, {
  key: "crawl",
  icon: "🐛",
  title: "기어다니기",
  quote: "온 집이 너의 놀이터가 됐어 🏠"
}, {
  key: "stand",
  icon: "🧍",
  title: "잡고 서기",
  quote: "두 발로 우뚝, 한 뼘 더 컸구나 🌱"
}, {
  key: "word",
  icon: "🗣️",
  title: "첫 단어",
  quote: "세상에서 가장 예쁜 첫 말 💛"
}, {
  key: "walk",
  icon: "👣",
  title: "첫 걸음",
  quote: "한 걸음, 두 걸음… 큰 세상으로 👣"
}, {
  key: "birthday",
  icon: "🎂",
  title: "첫 생일 (돌)",
  quote: "우리 아기, 첫 번째 생일 축하해 🎉"
}];
const DiaryEntryModal = ({
  entry,
  onClose
}) => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [image, setImage] = useState(null);
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  const slot = entry && entry.slot;
  const rec = entry && entry.record;
  useEffect(() => {
    if (!entry) return;
    setTitle(rec ? rec.title || "" : slot ? slot.title : "");
    setNote(rec ? rec.note || "" : "");
    setImage(rec ? rec.image || null : null);
    setAt(rec ? toLocalInput(rec.at) : toLocalInput(new Date()));
  }, [entry && (rec ? rec.id : slot ? slot.key : "free")]);
  const pickImage = async e => {
    const f = (e.target.files || [])[0];
    if (!f) return;
    try {
      setBusy(true);
      setImage(await compressToDataURL(f));
    } catch (ex) {
      toast(errMsg(ex), "error");
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!title.trim()) {
      toast("제목을 입력하세요.", "error");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        note: note || null,
        image: image || null,
        slot: slot ? slot.key : null,
        at: fromLocalInput(at)
      };
      if (rec) await COL.records().doc(rec.id).update(payload);else await addRecord("milestone", payload, user, profile);
      toast("다이어리에 담았어요 📖", "success");
      onClose();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: !!entry,
    onClose: onClose,
    title: slot ? `${slot.icon} ${slot.title}` : "🎉 순간 기록"
  }, entry && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, slot && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-violet-500 bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3"
  }, slot.quote), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    onChange: pickImage,
    className: "hidden"
  }), image ? /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    className: "w-full rounded-xl"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setImage(null),
    "aria-label": "\uC0AC\uC9C4 \uC81C\uAC70",
    className: "absolute top-0 right-0 w-11 h-11 flex items-center justify-center text-white text-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-full bg-black/50 flex items-center justify-center",
    "aria-hidden": "true"
  }, "\xD7"))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => fileRef.current.click(),
    className: "w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl py-6 text-slate-400 hover:border-teal-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl mb-1"
  }, "\uD83D\uDCF7"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, "\uC0AC\uC9C4 \uCD94\uAC00")), !slot && /*#__PURE__*/React.createElement(Field, {
    label: "\uC81C\uBAA9"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "\uC608: \uCCAB \uBB3C\uB180\uC774"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uD55C\uB9C8\uB514 (\uC120\uD0DD)"
  }, /*#__PURE__*/React.createElement("textarea", {
    className: inputCls,
    rows: "2",
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "\uADF8\uB0A0\uC758 \uAE30\uC5B5\uC744 \uB0A8\uACA8\uBCF4\uC138\uC694"
  })), /*#__PURE__*/React.createElement(DateTimeField, {
    value: at,
    onChange: setAt,
    label: "\uB0A0\uC9DC"
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "📖 다이어리에 담기")));
};
const DiaryTracker = () => {
  const {
    user
  } = useAuth();
  const toast = useToast();
  const baby = useBaby();
  const items = useRecords("milestone", 200);
  const [entry, setEntry] = useState(null);
  const bySlot = {};
  (items || []).forEach(r => {
    if (r.slot && !bySlot[r.slot]) bySlot[r.slot] = r;
  });
  const free = (items || []).filter(r => !r.slot);
  const ageAt = d => baby.birthDate ? Math.floor((toDate(d) - new Date(baby.birthDate)) / 86400000) : null;
  const doneCount = DIARY_SLOTS.filter(s => bySlot[s.key]).length;
  const printBook = () => {
    const filled = DIARY_SLOTS.map(sl => ({
      sl,
      r: bySlot[sl.key]
    })).filter(x => x.r);
    if (filled.length === 0) {
      toast("먼저 다이어리를 채워주세요 📖", "error");
      return;
    }
    const esc = s => String(s || "").replace(/[<>&]/g, c => ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;"
    })[c]);
    const pages = filled.map(({
      sl,
      r
    }) => {
      const age = ageAt(r.at);
      const media = r.image ? `<img src="${r.image}" style="width:100%;height:55vh;object-fit:cover;border-radius:18px"/>` : `<div style="font-size:130px;padding:80px 0">${sl.icon}</div>`;
      return `<div class="page">${media}<h2>${sl.icon} ${esc(sl.title)}</h2><p class="q">${esc(sl.quote)}</p><p class="d">${r.at ? fmtDate(r.at) : ""}${age != null ? ` · 생후 ${age}일` : ""}</p>${r.note ? `<p class="n">${esc(r.note)}</p>` : ""}</div>`;
    }).join("");
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(baby.name)} 첫돌 다이어리</title><style>@page{margin:0}body{font-family:'Noto Sans KR',sans-serif;margin:0;background:#fdfbf7;color:#334155}.cover{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#7dd3c0,#a78bfa);color:#fff;page-break-after:always}.cover h1{font-size:44px;margin:8px}.page{min-height:100vh;box-sizing:border-box;padding:32px;text-align:center;page-break-after:always;display:flex;flex-direction:column;justify-content:center}.page h2{font-size:26px;margin:18px 0 6px}.q{color:#7c3aed;font-size:16px;margin:0}.d{color:#64748b;font-size:14px;margin-top:8px}.n{margin-top:14px;font-size:15px;white-space:pre-wrap}</style></head><body><div class="cover"><div style="font-size:90px">🍼</div><h1>${esc(baby.name)}</h1><p style="font-size:22px">첫돌 다이어리</p></div>${pages}<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    } else toast("팝업이 차단됐어요. 허용해주세요.", "error");
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "\uD83D\uDCD6 \uCCAB\uB3CC \uB2E4\uC774\uC5B4\uB9AC"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "\uCC98\uC74C \uC21C\uAC04\uC744 \uC0AC\uC9C4\xB7\uD55C\uB9C8\uB514\uC640 \uD568\uAED8 \xB7 ", doneCount, "/", DIARY_SLOTS.length)), /*#__PURE__*/React.createElement(Btn, {
    onClick: printBook,
    variant: "lavender",
    className: "text-sm py-2 px-3"
  }, "\uD83D\uDCD6 \uCC45\uC73C\uB85C")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, DIARY_SLOTS.map(sl => {
    const r = bySlot[sl.key];
    return /*#__PURE__*/React.createElement("button", {
      key: sl.key,
      onClick: () => setEntry({
        slot: sl,
        record: r
      }),
      className: `text-left rounded-2xl border overflow-hidden active:scale-[.98] transition ${r ? "border-teal-200 dark:border-teal-800" : "border-dashed border-slate-200 dark:border-slate-700"}`
    }, r && r.image ? /*#__PURE__*/React.createElement("img", {
      src: r.image,
      alt: "",
      className: "w-full h-24 object-cover"
    }) : /*#__PURE__*/React.createElement("div", {
      className: `h-24 flex items-center justify-center text-3xl ${r ? "bg-teal-50 dark:bg-teal-900/20" : "bg-slate-50 dark:bg-slate-700/40"}`
    }, sl.icon), /*#__PURE__*/React.createElement("div", {
      className: "p-2"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm font-bold text-slate-700 dark:text-slate-200 truncate"
    }, sl.title), r ? /*#__PURE__*/React.createElement("p", {
      className: "text-[12px] text-teal-500"
    }, fmtDate(r.at), ageAt(r.at) != null ? ` · 생후 ${ageAt(r.at)}일` : "") : /*#__PURE__*/React.createElement("p", {
      className: "text-[12px] text-slate-400"
    }, "\uAE30\uB85D\uD558\uAE30 \u203A")));
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pt-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200"
  }, "\u2728 \uADF8 \uBC16\uC758 \uC21C\uAC04"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEntry({
      slot: null,
      record: null
    }),
    className: "text-xs text-teal-600 dark:text-teal-400"
  }, "+ \uCD94\uAC00")), free.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, free.map(r => /*#__PURE__*/React.createElement("button", {
    key: r.id,
    onClick: () => setEntry({
      slot: null,
      record: r
    }),
    className: "text-left rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden active:scale-[.98]"
  }, r.image ? /*#__PURE__*/React.createElement("img", {
    src: r.image,
    alt: "",
    className: "w-full h-24 object-cover"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "h-24 flex items-center justify-center text-3xl bg-slate-50 dark:bg-slate-700/40"
  }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("div", {
    className: "p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200 truncate"
  }, r.title), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-teal-500"
  }, fmtDate(r.at)))))), /*#__PURE__*/React.createElement(DiaryEntryModal, {
    entry: entry,
    onClose: () => setEntry(null)
  }));
};
const PrenatalTracker = ({
  openUpload
}) => {
  const {
    user,
    profile,
    isAdmin
  } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const items = useRecords("prenatal", 100);
  const photos = usePhotos(200);
  const usPhotos = (photos || []).filter(p => p.category === "ultrasound" && canSeePhoto(p, user.uid, isAdmin)).sort((a, b) => toDate(b.takenAt || b.createdAt) - toDate(a.takenAt || a.createdAt));
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    week: "",
    crl: "",
    bpd: "",
    hc: "",
    ac: "",
    fl: "",
    efw: "",
    fhr: "",
    afi: "",
    note: ""
  });
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(p => ({
    ...p,
    [k]: e.target.value
  }));
  const crl = crlGuide(f.week);
  const fhr = fhrCheck(f.fhr);
  const save = async () => {
    if (!f.week) {
      toast("임신 주수를 입력하세요.", "error");
      return;
    }
    setBusy(true);
    try {
      const data = {};
      Object.keys(f).forEach(k => {
        data[k] = f[k] === "" ? null : k === "note" ? f[k] : Number(f[k]);
      });
      await addRecord("prenatal", {
        ...data,
        at: fromLocalInput(at)
      }, user, profile);
      setOpen(false);
      setF({
        week: "",
        crl: "",
        bpd: "",
        hc: "",
        ac: "",
        fl: "",
        efw: "",
        fhr: "",
        afi: "",
        note: ""
      });
      setAt(toLocalInput(new Date()));
      toast("초음파 기록을 추가했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const sorted = items ? [...items].sort((a, b) => (a.week || 0) - (b.week || 0)) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(MedicalDisclaimer, null), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(Btn, {
    onClick: () => setOpen(true)
  }, "\uD83D\uDD2C \uCD08\uC74C\uD30C \uAE30\uB85D"), /*#__PURE__*/React.createElement(Btn, {
    variant: "lavender",
    onClick: openUpload
  }, "\uD83D\uDCF7 \uCD08\uC74C\uD30C \uC0AC\uC9C4")), usPhotos.length > 0 && /*#__PURE__*/React.createElement(Card, {
    className: "p-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 px-1"
  }, "\uD83D\uDDBC\uFE0F \uCD08\uC74C\uD30C \uC0AC\uC9C4 ", usPhotos.length, "\uC7A5"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, usPhotos.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => setDetail(i),
    className: "block",
    "aria-label": "\uCD08\uC74C\uD30C \uC0AC\uC9C4 \uC5F4\uAE30"
  }, /*#__PURE__*/React.createElement("img", {
    src: p.url,
    alt: p.caption || "초음파",
    loading: "lazy",
    className: "w-full aspect-square object-cover rounded-lg bg-slate-100 dark:bg-slate-700"
  }))))), detail != null && /*#__PURE__*/React.createElement(PhotoDetail, {
    list: usPhotos,
    index: detail,
    setIndex: setDetail,
    uid: user.uid,
    saved: new Set(),
    onClose: () => setDetail(null)
  }), !sorted ? /*#__PURE__*/React.createElement(Spinner, null) : sorted.length === 0 ? /*#__PURE__*/React.createElement(Card, {
    className: "p-6 text-center text-sm text-slate-400"
  }, "\uC544\uC9C1 \uCD08\uC74C\uD30C \uAE30\uB85D\uC774 \uC5C6\uC5B4\uC694.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, sorted.map(r => {
    const fc = fhrCheck(r.fhr);
    return /*#__PURE__*/React.createElement(Card, {
      key: r.id,
      className: "p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base font-bold text-violet-500"
    }, "\uC784\uC2E0 ", r.week, "\uC8FC"), /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-400"
    }, fmtDate(r.at), " \xB7 ", r.creatorName)), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-3 gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-300"
    }, r.crl != null && /*#__PURE__*/React.createElement("span", null, "CRL ", r.crl, "mm"), r.bpd != null && /*#__PURE__*/React.createElement("span", null, "BPD ", r.bpd, "mm"), r.hc != null && /*#__PURE__*/React.createElement("span", null, "HC ", r.hc, "mm"), r.ac != null && /*#__PURE__*/React.createElement("span", null, "AC ", r.ac, "mm"), r.fl != null && /*#__PURE__*/React.createElement("span", null, "FL ", r.fl, "mm"), r.fhr != null && /*#__PURE__*/React.createElement("span", null, "\uC2EC\uBC15 ", r.fhr, "bpm"), r.afi != null && /*#__PURE__*/React.createElement("span", null, "AFI ", r.afi), r.efw != null && /*#__PURE__*/React.createElement("span", {
      className: "col-span-3"
    }, "\uCD94\uC815\uCCB4\uC911 ", r.efw, "g ", /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] text-amber-500"
    }, "(\xB115~20% \uC624\uCC28)"))), fc && !fc.ok && /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-rose-500 mt-2"
    }, fc.msg), r.note && /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-500 dark:text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-700 pt-2"
    }, r.note), (isAdmin || r.createdBy === user.uid) && /*#__PURE__*/React.createElement("button", {
      onClick: async () => {
        if (await confirm("이 기록을 삭제할까요?")) deleteRecord(r.id);
      },
      className: "text-xs text-rose-400 mt-2"
    }, "\uC0AD\uC81C"));
  })), /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: () => setOpen(false),
    title: "\uD83D\uDD2C \uCD08\uC74C\uD30C \uAE30\uB85D \uCD94\uAC00"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement(DateTimeField, {
    value: at,
    onChange: setAt,
    label: "\uAC80\uC0AC \uB0A0\uC9DC\xB7\uC2DC\uAC04"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\uC784\uC2E0 \uC8FC\uC218 *"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "numeric",
    value: f.week,
    onChange: set("week"),
    placeholder: "12"
  })), crl && /*#__PURE__*/React.createElement("p", {
    className: `text-xs rounded-lg px-3 py-2 ${crl.ok ? "text-teal-600 bg-teal-50 dark:bg-teal-900/30" : "text-amber-600 bg-amber-50 dark:bg-amber-900/30"}`
  }, crl.msg), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "CRL (mm)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: f.crl,
    onChange: set("crl")
  })), /*#__PURE__*/React.createElement(Field, {
    label: "BPD (mm)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: f.bpd,
    onChange: set("bpd")
  })), /*#__PURE__*/React.createElement(Field, {
    label: "HC (mm)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: f.hc,
    onChange: set("hc")
  })), /*#__PURE__*/React.createElement(Field, {
    label: "AC (mm)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: f.ac,
    onChange: set("ac")
  })), /*#__PURE__*/React.createElement(Field, {
    label: "FL (mm)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: f.fl,
    onChange: set("fl")
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uCD94\uC815\uCCB4\uC911 (g)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: f.efw,
    onChange: set("efw")
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uC2EC\uBC15\uC218 (bpm)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "numeric",
    value: f.fhr,
    onChange: set("fhr")
  })), /*#__PURE__*/React.createElement(Field, {
    label: "AFI (\uC591\uC218)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    type: "number",
    inputMode: "decimal",
    value: f.afi,
    onChange: set("afi")
  }))), fhr && /*#__PURE__*/React.createElement("p", {
    className: `text-xs rounded-lg px-3 py-2 ${fhr.ok ? "text-teal-600 bg-teal-50 dark:bg-teal-900/30" : "text-rose-600 bg-rose-50 dark:bg-rose-900/30"}`
  }, fhr.msg), /*#__PURE__*/React.createElement(Field, {
    label: "\uC18C\uACAC / \uBA54\uBAA8"
  }, /*#__PURE__*/React.createElement("textarea", {
    className: inputCls,
    rows: "3",
    value: f.note,
    onChange: set("note"),
    placeholder: "\uAC80\uC0AC \uAE30\uB85D(\uD608\uC561\xB7\uAE30\uD615\uC544\xB7\uC784\uB2F9\uAC80\uC0AC \uACB0\uACFC \uB4F1)\uB3C4 \uD568\uAED8 \uB0A8\uACA8\uBCF4\uC138\uC694"
  })), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "기록 저장"))));
};

/* ========================================================================
   15. 공용 기록 리스트 (입력자/시각/삭제)
   ======================================================================== */
// 기록 종류별 수정 가능한 필드 정의
const numOrNull = v => v === "" || v == null ? null : Number(v);
const renderEditFields = (e, upd) => {
  const set = k => ev => upd({
    ...e,
    [k]: ev.target.value
  });
  switch (e.type) {
    case "feeding":
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ChipGroup, {
        label: "\uC218\uC720 \uC885\uB958",
        value: e.kind,
        onChange: v => upd({
          ...e,
          kind: v
        }),
        options: [{
          value: "breast",
          label: "🤱 모유"
        }, {
          value: "formula",
          label: "🍼 분유"
        }, {
          value: "mixed",
          label: "🥛 혼합"
        }]
      }), e.kind === "breast" && /*#__PURE__*/React.createElement(ChipGroup, {
        label: "\uC704\uCE58",
        value: e.side || "left",
        onChange: v => upd({
          ...e,
          side: v
        }),
        options: [{
          value: "left",
          label: "왼쪽"
        }, {
          value: "right",
          label: "오른쪽"
        }, {
          value: "both",
          label: "양쪽"
        }]
      }), /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-2 gap-3"
      }, /*#__PURE__*/React.createElement(Field, {
        label: "\uC218\uC720\uB7C9 (ml)"
      }, /*#__PURE__*/React.createElement("input", {
        className: inputCls,
        type: "number",
        value: e.amount ?? "",
        onChange: set("amount")
      })), /*#__PURE__*/React.createElement(Field, {
        label: "\uC2DC\uAC04 (\uBD84)"
      }, /*#__PURE__*/React.createElement("input", {
        className: inputCls,
        type: "number",
        value: e.durationMin ?? "",
        onChange: set("durationMin")
      }))));
    case "diaper":
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ChipGroup, {
        label: "\uC885\uB958",
        value: e.diaperType,
        onChange: v => upd({
          ...e,
          diaperType: v
        }),
        options: [{
          value: "pee",
          label: "💧 소변"
        }, {
          value: "poo",
          label: "💩 대변"
        }, {
          value: "both",
          label: "💧💩 둘 다"
        }]
      }), /*#__PURE__*/React.createElement(Field, {
        label: "\uC0C9\uC0C1 \uBA54\uBAA8"
      }, /*#__PURE__*/React.createElement("input", {
        className: inputCls,
        value: e.color ?? "",
        onChange: set("color")
      })));
    case "growth":
      return /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-3 gap-2"
      }, /*#__PURE__*/React.createElement(Field, {
        label: "\uD0A4 (cm)"
      }, /*#__PURE__*/React.createElement("input", {
        className: inputCls,
        type: "number",
        value: e.height ?? "",
        onChange: set("height")
      })), /*#__PURE__*/React.createElement(Field, {
        label: "\uBAB8\uBB34\uAC8C (kg)"
      }, /*#__PURE__*/React.createElement("input", {
        className: inputCls,
        type: "number",
        value: e.weight ?? "",
        onChange: set("weight")
      })), /*#__PURE__*/React.createElement(Field, {
        label: "\uBA38\uB9AC\uB458\uB808"
      }, /*#__PURE__*/React.createElement("input", {
        className: inputCls,
        type: "number",
        value: e.head ?? "",
        onChange: set("head")
      })));
    case "health":
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, {
        label: "\uCCB4\uC628 (\u2103)"
      }, /*#__PURE__*/React.createElement("input", {
        className: inputCls,
        type: "number",
        step: "0.1",
        value: e.temp ?? "",
        onChange: set("temp")
      })), /*#__PURE__*/React.createElement(Field, {
        label: "\uC99D\uC0C1 \uBA54\uBAA8"
      }, /*#__PURE__*/React.createElement("input", {
        className: inputCls,
        value: e.symptom ?? "",
        onChange: set("symptom")
      })), /*#__PURE__*/React.createElement(Field, {
        label: "\uBCD1\uC6D0 \uBC29\uBB38"
      }, /*#__PURE__*/React.createElement("input", {
        className: inputCls,
        value: e.hospital ?? "",
        onChange: set("hospital")
      })));
    case "sleep":
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ChipGroup, {
        label: "\uAD6C\uBD84",
        value: e.naptype || "nap",
        onChange: v => upd({
          ...e,
          naptype: v
        }),
        options: [{
          value: "nap",
          label: "🌤️ 낮잠"
        }, {
          value: "night",
          label: "🌙 밤잠"
        }]
      }), /*#__PURE__*/React.createElement(DateTimeField, {
        value: e.start || "",
        onChange: v => upd({
          ...e,
          start: v
        }),
        label: "\uC7A0\uB4E0 \uC2DC\uAC04"
      }), e.end !== undefined && /*#__PURE__*/React.createElement(DateTimeField, {
        value: e.end || "",
        onChange: v => upd({
          ...e,
          end: v
        }),
        label: "\uC77C\uC5B4\uB09C \uC2DC\uAC04"
      }));
    default:
      return null;
  }
};
const buildEditUpdate = e => {
  const at = fromLocalInput(e.at);
  switch (e.type) {
    case "feeding":
      return {
        at,
        kind: e.kind,
        side: e.kind === "breast" ? e.side || "left" : null,
        amount: numOrNull(e.amount),
        durationMin: numOrNull(e.durationMin)
      };
    case "diaper":
      return {
        at,
        diaperType: e.diaperType,
        color: e.color || null
      };
    case "growth":
      return {
        at,
        height: numOrNull(e.height),
        weight: numOrNull(e.weight),
        head: numOrNull(e.head)
      };
    case "health":
      return {
        at,
        temp: numOrNull(e.temp),
        symptom: e.symptom || null,
        hospital: e.hospital || null
      };
    case "sleep":
      {
        const s = e.start ? fromLocalInput(e.start) : at;
        const en = e.end ? fromLocalInput(e.end) : null;
        const durationMin = en ? Math.max(1, Math.round((en - s) / 60000)) : null;
        return {
          at: s,
          start: s,
          end: en,
          durationMin,
          naptype: e.naptype || "nap"
        };
      }
    default:
      return {
        at
      };
  }
};
const RecordList = ({
  items,
  render
}) => {
  const {
    user,
    isAdmin
  } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null); // 수정 중인 기록(복사본)
  if (!items) return /*#__PURE__*/React.createElement(Spinner, null);
  if (items.length === 0) return /*#__PURE__*/React.createElement(Card, {
    className: "p-6 text-center text-sm text-slate-400"
  }, "\uC544\uC9C1 \uAE30\uB85D\uC774 \uC5C6\uC5B4\uC694.");
  const saveEdit = async () => {
    try {
      await COL.records().doc(editing.id).update(buildEditUpdate(editing));
      toast("기록을 수정했어요.", "success");
      setEditing(null);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  return /*#__PURE__*/React.createElement(Card, {
    className: "p-2"
  }, /*#__PURE__*/React.createElement("ul", {
    className: "divide-y divide-slate-100 dark:divide-slate-700"
  }, items.slice(0, 50).map(r => {
    const mine = isAdmin || r.createdBy === user.uid;
    return /*#__PURE__*/React.createElement("li", {
      key: r.id,
      className: "flex items-center gap-2 px-2 py-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-700 dark:text-slate-200 truncate"
    }, render(r)), /*#__PURE__*/React.createElement("p", {
      className: "text-[12px] text-slate-400"
    }, fmtDateTime(r.at), " \xB7 ", r.creatorName)), mine && /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditing({
        ...r,
        at: toLocalInput(r.at),
        ...(r.start != null ? {
          start: toLocalInput(r.start)
        } : {}),
        ...(r.end != null ? {
          end: toLocalInput(r.end)
        } : {
          end: r.type === "sleep" ? "" : undefined
        })
      }),
      "aria-label": "\uAE30\uB85D \uC218\uC815",
      className: "text-slate-300 hover:text-teal-500 text-base px-1"
    }, "\u270F\uFE0F"), mine && /*#__PURE__*/React.createElement("button", {
      onClick: async () => {
        if (await confirm("삭제할까요?")) deleteRecord(r.id);
      },
      "aria-label": "\uAE30\uB85D \uC0AD\uC81C",
      className: "text-slate-300 hover:text-rose-500 text-base px-1"
    }, "\uD83D\uDDD1\uFE0F"));
  })), /*#__PURE__*/React.createElement(Modal, {
    open: !!editing,
    onClose: () => setEditing(null),
    title: "\uAE30\uB85D \uC218\uC815"
  }, editing && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, renderEditFields(editing, setEditing), editing.type !== "sleep" && /*#__PURE__*/React.createElement(DateTimeField, {
    value: editing.at,
    onChange: v => setEditing({
      ...editing,
      at: v
    })
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: saveEdit,
    className: "w-full"
  }, "\uC800\uC7A5"))));
};

/* ========================================================================
   16. 육아 기록 탭 (서브탭 라우팅)
   ======================================================================== */
/* 기록 종류는 11개나 된다. 전부 한 줄에 펼치면 세 줄로 접히고,
   지금 시기에 쓸 일 없는 것까지 섞여 무엇을 눌러야 할지 알기 어려웠다.
   그래서 시기에 맞는 3~4개만 앞에 두고, 나머지는 '＋ 다른 기록' 안에 넣었다.
   — 기능은 하나도 없애지 않았다. 주소(#/records/pump)도 그대로 동작한다. */
const REC_ALL = [{
  id: "feeding",
  label: "🍼 수유"
}, {
  id: "sleep",
  label: "😴 수면"
}, {
  id: "diaper",
  label: "👶 기저귀"
}, {
  id: "pump",
  label: "🤱 유축"
}, {
  id: "solid",
  label: "🥣 이유식"
}, {
  id: "med",
  label: "💊 투약"
}, {
  id: "growth",
  label: "📏 성장"
}, {
  id: "health",
  label: "🩺 건강"
}, {
  id: "milestone",
  label: "📖 다이어리"
}, {
  id: "prenatal",
  label: "🔬 임신"
}, {
  id: "activity",
  label: "📜 활동로그",
  adminOnly: true
}];
const REC_PRIMARY_BORN = ["feeding", "sleep", "diaper"];
const REC_PRIMARY_PREGNANT = ["prenatal", "health", "milestone"];
const Records = ({
  sub,
  setSub,
  openUpload
}) => {
  const {
    isAdmin
  } = useAuth();
  const baby = useBaby();
  const born = !!(baby && baby.birthDate);
  const [moreOpen, setMoreOpen] = useState(false);
  const all = REC_ALL.filter(t => !t.adminOnly || isAdmin);
  const primaryIds = born ? REC_PRIMARY_BORN : REC_PRIMARY_PREGNANT;
  // 관리자만 보던 활동로그를 비관리자가 주소로 열지 못하게 보정
  const cur = !sub || sub === "activity" && !isAdmin ? primaryIds[0] : sub;
  // 지금 보고 있는 것이 '다른 기록' 쪽이면 앞줄에 함께 보여준다
  const shownIds = primaryIds.includes(cur) ? primaryIds : [...primaryIds, cur];
  const tabs = shownIds.map(id => all.find(t => t.id === id)).filter(Boolean);
  const rest = all.filter(t => !shownIds.includes(t.id));
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-4 pb-safe"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sr-only"
  }, "\uAE30\uB85D"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5",
    role: "tablist",
    "aria-label": "\uC721\uC544 \uAE30\uB85D \uC885\uB958"
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    role: "tab",
    "aria-selected": cur === t.id,
    onClick: () => setSub(t.id),
    className: `whitespace-nowrap px-3.5 min-h-[44px] rounded-full text-sm font-medium transition ${cur === t.id ? "bg-teal-500 text-white" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`
  }, t.label)), rest.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setMoreOpen(true),
    "aria-haspopup": "dialog",
    className: "whitespace-nowrap px-3.5 min-h-[44px] rounded-full text-sm font-medium bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 border border-dashed border-teal-300 dark:border-teal-600"
  }, "\uFF0B \uB2E4\uB978 \uAE30\uB85D")), /*#__PURE__*/React.createElement(Modal, {
    open: moreOpen,
    onClose: () => setMoreOpen(false),
    title: "\uB2E4\uB978 \uAE30\uB85D"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, rest.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => {
      setSub(t.id);
      setMoreOpen(false);
    },
    className: "py-4 rounded-2xl bg-slate-50 dark:bg-slate-700 text-base font-medium text-slate-700 dark:text-slate-200"
  }, t.label))), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 mt-3"
  }, born ? "태어난 뒤 자주 쓰는 수유·수면·기저귀를 앞에 두었어요." : "출산 전에 자주 쓰는 임신·건강·다이어리를 앞에 두었어요.")), cur === "feeding" && /*#__PURE__*/React.createElement(FeedingTracker, null), cur === "sleep" && /*#__PURE__*/React.createElement(SleepTracker, null), cur === "diaper" && /*#__PURE__*/React.createElement(DiaperTracker, null), cur === "pump" && /*#__PURE__*/React.createElement(PumpTracker, null), cur === "solid" && /*#__PURE__*/React.createElement(SolidTracker, null), cur === "med" && /*#__PURE__*/React.createElement(MedTracker, null), cur === "growth" && /*#__PURE__*/React.createElement(GrowthTracker, null), cur === "health" && /*#__PURE__*/React.createElement(HealthLog, null), cur === "milestone" && /*#__PURE__*/React.createElement(DiaryTracker, null), cur === "prenatal" && /*#__PURE__*/React.createElement(PrenatalTracker, {
    openUpload: openUpload
  }), cur === "activity" && isAdmin && /*#__PURE__*/React.createElement(ActivityLog, null));
};

/* ========================================================================
   17. 이미지 압축 → base64 데이터URL (Firestore 무료 저장용) — 시니어 검토 #5
      Firestore 문서 1MB 한도 안에 들어가도록 화질/크기를 점진 축소
   ======================================================================== */
const MAX_PHOTO_BYTES = 900 * 1024; // base64 길이 상한 (1MB 한도 대비 여유)
const compressToDataURL = file => new Promise((resolve, reject) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url);
    const render = (maxDim, q) => {
      let {
        width,
        height
      } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round(height * maxDim / width);
          width = maxDim;
        } else {
          width = Math.round(width * maxDim / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height); // 투명 PNG 대비 흰 배경
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", q);
    };
    let maxDim = 1000,
      quality = 0.72;
    let dataUrl = render(maxDim, quality);
    // 1MB 안에 들어갈 때까지 점진적으로 줄이기
    let guard = 0;
    while (dataUrl.length > MAX_PHOTO_BYTES && guard < 10) {
      guard++;
      if (quality > 0.4) quality -= 0.1;else {
        maxDim = Math.round(maxDim * 0.85);
        quality = 0.6;
      }
      dataUrl = render(maxDim, quality);
    }
    if (dataUrl.length > MAX_PHOTO_BYTES) {
      reject(new Error("사진 용량이 너무 커요. 더 작은 사진을 사용해주세요."));
      return;
    }
    resolve(dataUrl);
  };
  // HEIC 등 브라우저가 못 읽는 형식
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error("이 사진 형식을 읽을 수 없어요. (HEIC라면 설정에서 '호환성 우선'으로 촬영하거나 JPG로 변환해주세요)"));
  };
  img.src = url;
});

/* ── 사진을 Storage 에 올리기 (원본 무손실 + 감상용 + 썸네일) ──────────
   원본은 재인코딩하지 않고 그대로 올립니다. 리사이즈본 생성이 실패해도
   (HEIC 등 브라우저가 못 여는 형식) 원본은 이미 안전하게 저장됩니다. */
const makeVariant = (file, maxSide, quality) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const w = img.naturalWidth,
      h = img.naturalHeight;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale)),
      ch = Math.max(1, Math.round(h * scale));
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    c.getContext("2d").drawImage(img, 0, 0, cw, ch);
    c.toBlob(b => b ? resolve({
      blob: b,
      width: w,
      height: h
    }) : reject(new Error("변환 실패")), "image/jpeg", quality);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error("이미지를 읽을 수 없어요"));
  };
  img.src = url;
});
const uploadPhotoFile = async (file, onStep) => {
  const now = new Date();
  // Storage 정책상 경로 첫 칸이 가족 id 여야 한다 (<familyId>/YYYY/MM/xxx)
  if (!store.familyId()) await loadFamily();
  const familyId = store.familyId();
  if (!familyId) throw new Error("가족 정보를 찾을 수 없어요. 다시 로그인해주세요.");
  const base = `${familyId}/${now.getFullYear()}/${pad2(now.getMonth() + 1)}/${(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now()).replace(/-/g, "").slice(0, 16)}`;
  const ext = ((file.name || "").split(".").pop() || "jpg").toLowerCase().slice(0, 5);
  const storagePath = `${base}_o.${ext}`;
  if (onStep) onStep(25);
  const up = await sb.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type || "image/jpeg"
  });
  if (up.error) throw up.error;
  let previewPath = null,
    thumbPath = null,
    width = null,
    height = null;
  try {
    if (onStep) onStep(55);
    const pv = await makeVariant(file, 1600, 0.88);
    width = pv.width;
    height = pv.height;
    const p = `${base}_p.jpg`;
    if (!(await sb.storage.from(BUCKET).upload(p, pv.blob, {
      contentType: "image/jpeg"
    })).error) previewPath = p;
    if (onStep) onStep(80);
    const th = await makeVariant(file, 400, 0.8);
    const t = `${base}_t.jpg`;
    if (!(await sb.storage.from(BUCKET).upload(t, th.blob, {
      contentType: "image/jpeg"
    })).error) thumbPath = t;
  } catch (e) {/* 원본은 이미 저장됨 — 리사이즈본만 생략 */}
  return {
    storagePath,
    previewPath,
    thumbPath,
    width,
    height,
    bytes: file.size,
    mime: file.type
  };
};

/* base64 dataURL → File (백업 가져오기에서 사용) */
const dataUrlToFile = (dataUrl, name) => {
  const [head, b64] = String(dataUrl).split(",");
  const mime = (head.match(/data:([^;]+)/) || [])[1] || "image/jpeg";
  const bin = atob(b64 || "");
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name || "photo.jpg", {
    type: mime
  });
};

/* ========================================================================
   17-b. 사진 EXIF에서 촬영일·GPS 추출 (없으면 null)
   ======================================================================== */
// exifr 지연 로드 (부팅 차단 방지). 실패하면 null 반환 → EXIF만 생략, 앱은 정상.
let _exifrPromise = null;
const loadExifr = () => {
  if (window.exifr) return Promise.resolve(window.exifr);
  if (_exifrPromise) return _exifrPromise;
  _exifrPromise = new Promise(resolve => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js";
    s.crossOrigin = "anonymous";
    s.onload = () => resolve(window.exifr || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return _exifrPromise;
};
const readPhotoMeta = async file => {
  const meta = {
    takenAt: null,
    gps: null
  };
  try {
    const exifr = await loadExifr();
    if (exifr) {
      const tags = await exifr.parse(file, {
        pick: ["DateTimeOriginal", "CreateDate"]
      }).catch(() => null);
      if (tags) meta.takenAt = tags.DateTimeOriginal || tags.CreateDate || null;
      const g = await exifr.gps(file).catch(() => null);
      if (g && g.latitude != null && g.longitude != null) {
        meta.gps = {
          lat: +g.latitude.toFixed(6),
          lng: +g.longitude.toFixed(6)
        };
      }
    }
  } catch (e) {/* EXIF 없거나 읽기 실패 시 무시 */}
  return meta;
};

/* ========================================================================
   18. 사진 업로드 모달
   ======================================================================== */
const ALL_CATS = [{
  value: "ultrasound",
  label: "초음파"
}, {
  value: "baby",
  label: "아기사진"
}, {
  value: "milestone",
  label: "성장기록"
}];
const UploadModal = ({
  open,
  onClose,
  defaultCategory = "baby"
}) => {
  const [albumId, setAlbumId] = useState(null);
  const [previews, setPreviews] = useState([]); // 선택한 파일 미리보기 URL
  // 초음파 업로드는 임신 페이지에서만 → 갤러리 업로드는 아기사진/성장기록만
  const catOptions = defaultCategory === "ultrasound" ? ALL_CATS.filter(c => c.value === "ultrasound") : ALL_CATS.filter(c => c.value !== "ultrasound");
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState(defaultCategory);
  const [caption, setCaption] = useState("");
  const [people, setPeople] = useState([]); // 함께한 사람 이름들
  const [personInput, setPersonInput] = useState("");
  const [place, setPlace] = useState(""); // 장소/지역 (검색용)
  const [takenAt, setTakenAt] = useState(""); // 촬영 시각 (EXIF 우선)
  const [gps, setGps] = useState(null); // {lat,lng}
  const [vis, setVis] = useState("public"); // public(전체공개) | private(나만보기)
  const [familyNames, setFamilyNames] = useState([]);
  const [progress, setProgress] = useState(null); // {done,total,pct}
  const inputRef = useRef();
  const camRef = useRef();
  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setCaption("");
    setCategory(defaultCategory);
    setProgress(null);
    setPeople([]);
    setPersonInput("");
    setPlace("");
    setTakenAt(toLocalInput(new Date()));
    setGps(null);
    setVis("public");
    // 가족 이름 후보 불러오기 (인물 태그용)
    COL.users().get().then(s => setFamilyNames(s.docs.map(d => d.data().name).filter(Boolean))).catch(() => setFamilyNames([]));
  }, [open]);

  // 미리보기 URL 은 파일이 바뀔 때만 만들고, 바뀌거나 닫힐 때 반드시 해제한다
  // (render 마다 만들면 URL 이 계속 쌓여 메모리를 잡아먹는다)
  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => {
      try {
        URL.revokeObjectURL(u);
      } catch (e) {}
    });
  }, [files]);
  const pick = async e => {
    const list = Array.from(e.target.files || []).slice(0, 5); // 최대 5장
    setFiles(list);
    if (list[0]) {
      // 첫 사진 EXIF에서 촬영일·GPS 자동 채우기
      const m = await readPhotoMeta(list[0]);
      if (m.takenAt) setTakenAt(toLocalInput(m.takenAt));
      if (m.gps) setGps(m.gps);
    }
  };
  const togglePerson = name => setPeople(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
  const addPerson = () => {
    const n = personInput.trim();
    if (n && !people.includes(n)) setPeople(p => [...p, n]);
    setPersonInput("");
  };
  const upload = async () => {
    if (files.length === 0) {
      toast("사진을 선택하세요.", "error");
      return;
    }
    setProgress({
      done: 0,
      total: files.length,
      pct: 0
    });
    const takenDate = fromLocalInput(takenAt);
    try {
      for (let i = 0; i < files.length; i++) {
        // 원본은 Storage 에 그대로, 화면용 축소본은 따로 생성
        let perMeta = {
          takenAt: takenDate,
          gps
        };
        if (files.length > 1) {
          const m = await readPhotoMeta(files[i]);
          if (m.takenAt) perMeta.takenAt = m.takenAt;
          if (m.gps) perMeta.gps = m.gps;
        }
        const up = await uploadPhotoFile(files[i], pct => setProgress({
          done: i,
          total: files.length,
          pct
        }));
        await COL.photos().add({
          uploadedBy: user.uid,
          uploaderName: profile && profile.name || (user.email || "").split("@")[0],
          caption: caption || "",
          category,
          albumId,
          people,
          place: place || "",
          gps: perMeta.gps || null,
          takenAt: perMeta.takenAt || takenDate,
          vis,
          createdAt: TS(),
          ...up
        });
        setProgress({
          done: i,
          total: files.length,
          pct: 100
        });
      }
      toast(`${files.length}장 업로드 완료!`, "success");
      onClose();
    } catch (e) {
      toast(errMsg(e), "error");
      setProgress(null);
    }
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: "\uD83D\uDCF7 \uC0AC\uC9C4 \uC5C5\uB85C\uB4DC"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: pick,
    className: "hidden"
  }), /*#__PURE__*/React.createElement("input", {
    ref: camRef,
    type: "file",
    accept: "image/*",
    capture: "environment",
    onChange: pick,
    className: "hidden"
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => inputRef.current.click(),
    className: "border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl py-6 text-center text-slate-400 hover:border-teal-400 hover:text-teal-500 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl mb-1",
    "aria-hidden": "true"
  }, "\uD83D\uDDBC\uFE0F"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, "\uC568\uBC94\uC5D0\uC11C \uC120\uD0DD")), /*#__PURE__*/React.createElement("button", {
    onClick: () => camRef.current.click(),
    className: "border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl py-6 text-center text-slate-400 hover:border-teal-400 hover:text-teal-500 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl mb-1",
    "aria-hidden": "true"
  }, "\uD83D\uDCF7"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, "\uC0AC\uC9C4 \uCD2C\uC601"))), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 text-center"
  }, "\uCD5C\uB300 5\uC7A5\uAE4C\uC9C0 \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uC5B4\uC694"), previews.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, previews.map((src, i) => /*#__PURE__*/React.createElement("img", {
    key: src,
    src: src,
    alt: `선택한 사진 ${i + 1}`,
    className: "w-full aspect-square object-cover rounded-lg"
  }))), catOptions.length > 1 ? /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uCE74\uD14C\uACE0\uB9AC",
    value: category,
    onChange: setCategory,
    options: catOptions
  }) : /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-400"
  }, "\uD83D\uDCC1 \uCE74\uD14C\uACE0\uB9AC: ", /*#__PURE__*/React.createElement("b", null, "\uCD08\uC74C\uD30C"), " (\uC784\uC2E0 \uAE30\uB85D \uC804\uC6A9)"), /*#__PURE__*/React.createElement(Field, {
    label: "\uCEA1\uC158"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: caption,
    onChange: e => setCaption(e.target.value),
    placeholder: "\uC0AC\uC9C4 \uC124\uBA85"
  })), /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uACF5\uAC1C \uBC94\uC704",
    value: vis,
    onChange: setVis,
    options: [{
      value: "public",
      label: "🌐 전체공개"
    }, {
      value: "private",
      label: "🔒 나만보기"
    }]
  }), /*#__PURE__*/React.createElement(AlbumPicker, {
    value: albumId,
    onChange: setAlbumId
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 -mt-1"
  }, "\uB098\uB9CC\uBCF4\uAE30\uB294 \uBCF8\uC778\uACFC \uAD00\uB9AC\uC790(\uC5C4\uB9C8\xB7\uC544\uBE60)\uB9CC \uBCFC \uC218 \uC788\uC5B4\uC694."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5"
  }, "\uD568\uAED8\uD55C \uC0AC\uB78C"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 mb-2"
  }, familyNames.map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    type: "button",
    onClick: () => togglePerson(n),
    className: `px-3 min-h-[44px] rounded-full text-sm border ${people.includes(n) ? "bg-violet-400 border-violet-400 text-white" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"}`
  }, people.includes(n) ? "✓ " : "", n))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: personInput,
    onChange: e => setPersonInput(e.target.value),
    onKeyDown: e => e.key === "Enter" && (e.preventDefault(), addPerson()),
    placeholder: "\uC9C1\uC811 \uCD94\uAC00 (\uC608: \uC774\uBAA8, \uC0BC\uCD0C)",
    "aria-label": "\uC0AC\uB78C \uC9C1\uC811 \uCD94\uAC00"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: addPerson,
    className: "whitespace-nowrap px-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm"
  }, "\uCD94\uAC00")), people.filter(n => !familyNames.includes(n)).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 mt-2"
  }, people.filter(n => !familyNames.includes(n)).map(n => /*#__PURE__*/React.createElement("span", {
    key: n,
    className: "px-3 min-h-[44px] rounded-full text-sm bg-violet-400 text-white inline-flex items-center gap-1"
  }, n, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => togglePerson(n),
    "aria-label": `${n} 제거`,
    className: "w-11 h-11 -mr-3 flex items-center justify-center text-base"
  }, "\xD7"))))), /*#__PURE__*/React.createElement(Field, {
    label: "\uC7A5\uC18C / \uC9C0\uC5ED"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: place,
    onChange: e => setPlace(e.target.value),
    placeholder: "\uC608: \uC11C\uC6B8 \uD560\uBA38\uB2C8\uB301, \uC81C\uC8FC \uC5EC\uD589"
  })), gps && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-teal-500"
  }, "\uD83D\uDCCD \uC0AC\uC9C4\uC5D0\uC11C \uC704\uCE58 \uC88C\uD45C\uB97C \uCC3E\uC558\uC5B4\uC694 (", gps.lat, ", ", gps.lng, ") \u2014 \uC9C0\uB3C4 \uAC80\uC0C9\uC5D0 \uD65C\uC6A9\uB429\uB2C8\uB2E4"), /*#__PURE__*/React.createElement(DateTimeField, {
    value: takenAt,
    onChange: setTakenAt,
    label: "\uCD2C\uC601 \uC2DC\uAC01"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "\uC5EC\uB7EC \uC7A5\uC740 \uAC01 \uC0AC\uC9C4\uC758 \uCD2C\uC601\uC815\uBCF4(EXIF)\uAC00 \uC788\uC73C\uBA74 \uC790\uB3D9 \uC801\uC6A9\uB3FC\uC694."), progress && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-xs text-slate-500 mb-1"
  }, /*#__PURE__*/React.createElement("span", null, "\uC5C5\uB85C\uB4DC \uC911 ", progress.done + 1, "/", progress.total), /*#__PURE__*/React.createElement("span", null, progress.pct, "%")), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-teal-500 transition-all",
    style: {
      width: `${progress.pct}%`
    },
    role: "progressbar",
    "aria-valuenow": progress.pct,
    "aria-valuemin": "0",
    "aria-valuemax": "100"
  }))), /*#__PURE__*/React.createElement(Btn, {
    onClick: upload,
    disabled: !!progress,
    className: "w-full"
  }, progress ? "업로드 중..." : "업로드")));
};

/* ========================================================================
   19. 좋아요 / 저장 훅 (트랜잭션, 계정별) — 시니어 검토 #2
   ======================================================================== */
// 좋아요는 사진 문서의 likedBy 배열로 관리 (색인/추가 규칙 불필요, 동시성 안전)
const isLikedBy = (photo, uid) => !!photo && (photo.likedBy || []).includes(uid);
/* 누구에게 무엇을 보여줄지도 vendor/toto-core.js 한 벌만 쓴다.
   진짜 차단은 DB(RLS)가 하고, 이건 화면 정리용이다.
   옮기면서 고쳐진 것: 로그인 전(uid 없음)에 올린 사람도 비어 있는
   나만보기 사진이 보일 수 있었다. 이제 막는다. */
// 공개 범위: 관리자/작성자/본인 또는 전체공개(기본)면 볼 수 있음 (이전 데이터는 vis 없음 → 공개 취급)
const isPrivate = x => x && x.vis === "private";
const useMySaved = uid => {
  const [saved, setSaved] = useState(new Set());
  const [docs, setDocs] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const unsub = COL.users().doc(uid).collection("savedPhotos").orderBy("savedAt", "desc").onSnapshot(snap => {
      setSaved(new Set(snap.docs.map(d => d.id)));
      setDocs(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
    });
    return () => unsub();
  }, [uid]);
  return {
    saved,
    docs
  };
};

// 좋아요 토글 — likedBy 배열에 arrayUnion/arrayRemove (원자적, 동시성 안전)
// 좋아요는 "남의 사진"에도 눌러야 하는데, media 수정 권한은 올린 사람에게만 있다.
// 그래서 DB 함수(toggle_like)를 통해 승인된 가족 누구나 누를 수 있게 한다.
const toggleLike = async (photo, uid) => {
  const {
    error
  } = await sb.rpc("toggle_like", {
    p_media: photo.id
  });
  if (error) throw error;
};
const toggleSave = async (photo, uid) => {
  const ref = COL.users().doc(uid).collection("savedPhotos").doc(photo.id);
  const snap = await ref.get();
  if (snap.exists) await ref.delete();else await ref.set({
    savedAt: TS(),
    photoRef: photo.id,
    url: photo.url,
    caption: photo.caption || "",
    category: photo.category
  });
};

/* ========================================================================
   20. 사진 카드 + 갤러리
   ======================================================================== */
const PhotoCard = ({
  photo,
  saved,
  uid,
  onOpen
}) => {
  const liked = isLikedBy(photo, uid);
  return /*#__PURE__*/React.createElement("div", {
    className: "relative group"
  }, isPrivate(photo) && /*#__PURE__*/React.createElement("span", {
    className: "absolute top-1 left-1 z-10 text-[12px] bg-black/55 text-white rounded-full px-1.5 py-0.5",
    title: "\uB098\uB9CC\uBCF4\uAE30"
  }, "\uD83D\uDD12"), /*#__PURE__*/React.createElement("button", {
    onClick: onOpen,
    className: "block w-full",
    "aria-label": `${photo.uploaderName}님의 사진 열기`
  }, /*#__PURE__*/React.createElement("img", {
    src: photo.url,
    alt: photo.caption || `${photo.uploaderName}님이 올린 사진`,
    loading: "lazy",
    className: "w-full aspect-square object-cover rounded-xl bg-slate-100 dark:bg-slate-700"
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-xl p-2 flex items-end justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-white/90 truncate"
  }, photo.uploaderName), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => toggleLike(photo, uid),
    "aria-label": liked ? "좋아요 취소" : "좋아요",
    className: "text-sm flex items-center justify-center gap-0.5 text-white min-w-[44px] min-h-[44px] -m-2.5 p-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, liked ? "❤️" : "🤍"), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px]"
  }, likeCountOf(photo))), /*#__PURE__*/React.createElement("button", {
    onClick: () => toggleSave(photo, uid),
    "aria-label": saved ? "저장 취소" : "저장",
    className: "text-base text-white flex items-center justify-center min-w-[44px] min-h-[44px] -m-2.5 p-2.5"
  }, saved ? "🔖" : "🏷️"))));
};

// 사진 컬렉션 실시간 구독 (갤러리/슬라이드쇼 공용)
/* 앨범 목록 (실시간) */
const useAlbums = () => {
  const [albums, setAlbums] = useState(null);
  useEffect(() => {
    const unsub = COL.albums().orderBy("sortOrder").limit(100).onSnapshot(snap => setAlbums(snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), e => {
      console.error(e);
      setAlbums([]);
    });
    return () => unsub();
  }, []);
  return albums;
};

/* 앨범 선택 드롭다운 (업로드·사진수정에서 공용) */
const AlbumPicker = ({
  value,
  onChange,
  label = "앨범"
}) => {
  const albums = useAlbums();
  return /*#__PURE__*/React.createElement(Field, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: inputCls,
    value: value || "",
    onChange: e => onChange(e.target.value || null)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\uC568\uBC94 \uC5C6\uC74C"), (albums || []).map(a => /*#__PURE__*/React.createElement("option", {
    key: a.id,
    value: a.id
  }, a.emoji, " ", a.title))));
};
const usePhotos = (max = 300) => {
  const [photos, setPhotos] = useState(null);
  const w = useDbWatch("photos");
  useEffect(() => {
    let alive = true;
    const unsub = COL.photos().orderBy("createdAt", "desc").limit(max).onSnapshot(async snap => {
      w.ok();
      const rows = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      // 비공개 버킷이라 표시용 서명 URL 을 따로 발급받아 붙인다
      const map = await signPaths(rows.flatMap(p => [p.thumbPath, p.previewPath, p.storagePath]));
      if (!alive) return;
      setPhotos(rows.map(p => ({
        ...p,
        url: map[p.previewPath] || map[p.storagePath] || map[p.thumbPath] || null,
        thumbUrl: map[p.thumbPath] || map[p.previewPath] || map[p.storagePath] || null
      })));
    }, e => {
      w.fail(e);
      if (alive) setPhotos([]);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [max, w.tick]);
  return photos;
};

/* ========================================================================
   20-c. 앨범 — 사진을 주제별로 묶어보기
   ======================================================================== */
const AlbumGrid = ({
  photos,
  onOpen,
  onBack
}) => {
  const {
    isAdmin,
    profile
  } = useAuth();
  const albums = useAlbums();
  const toast = useToast();
  const confirm = useConfirm();
  const canEdit = isAdmin || profile && profile.role === "member";
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [busy, setBusy] = useState(false);

  // 앨범별 사진 수 · 대표사진
  const stat = useMemo(() => {
    const m = {};
    (photos || []).forEach(p => {
      if (!p.albumId) return;
      if (!m[p.albumId]) m[p.albumId] = {
        n: 0,
        cover: null
      };
      m[p.albumId].n++;
      if (!m[p.albumId].cover) m[p.albumId].cover = p.thumbUrl || p.url;
    });
    return m;
  }, [photos]);
  const create = async () => {
    if (!title.trim()) {
      toast("앨범 이름을 입력하세요.", "error");
      return;
    }
    setBusy(true);
    try {
      await COL.albums().add({
        title: title.trim(),
        emoji: emoji || "📁",
        sortOrder: 50
      });
      toast("앨범을 만들었어요.", "success");
      setTitle("");
      setEmoji("📁");
      setCreating(false);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const remove = async a => {
    if (!(await confirm(`'${a.title}' 앨범을 지울까요?\n사진은 지워지지 않고 '앨범 없음'이 됩니다.`, {
      ok: "삭제"
    }))) return;
    try {
      await COL.albums().doc(a.id).delete();
      toast("앨범을 지웠어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  const unfiled = (photos || []).filter(p => !p.albumId).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "text-sm text-teal-600 dark:text-teal-400"
  }, "\u2190 \uC804\uCCB4 \uC0AC\uC9C4"), canEdit && /*#__PURE__*/React.createElement("button", {
    onClick: () => setCreating(c => !c),
    className: "text-sm text-teal-600 dark:text-teal-400"
  }, "\uFF0B \uC0C8 \uC568\uBC94")), creating && canEdit && /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls + " w-20 text-center",
    value: emoji,
    maxLength: 4,
    onChange: e => setEmoji(e.target.value),
    "aria-label": "\uC774\uBAA8\uC9C0"
  }), /*#__PURE__*/React.createElement("input", {
    className: inputCls + " flex-1",
    value: title,
    placeholder: "\uC568\uBC94 \uC774\uB984 (\uC608: \uCCAB \uD06C\uB9AC\uC2A4\uB9C8\uC2A4)",
    onChange: e => setTitle(e.target.value)
  })), /*#__PURE__*/React.createElement(Btn, {
    onClick: create,
    disabled: busy,
    className: "w-full"
  }, busy ? "만드는 중…" : "만들기")), !albums ? /*#__PURE__*/React.createElement(Spinner, null) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, albums.map(a => {
    const st = stat[a.id] || {
      n: 0,
      cover: null
    };
    return /*#__PURE__*/React.createElement("div", {
      key: a.id,
      className: "relative"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onOpen(a),
      className: "w-full text-left rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm active:scale-[.98] transition"
    }, /*#__PURE__*/React.createElement("div", {
      className: "aspect-square bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-4xl overflow-hidden"
    }, st.cover ? /*#__PURE__*/React.createElement("img", {
      src: st.cover,
      alt: "",
      className: "w-full h-full object-cover"
    }) : a.emoji), /*#__PURE__*/React.createElement("div", {
      className: "p-2.5"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm font-bold text-slate-700 dark:text-slate-200 truncate"
    }, a.emoji, " ", a.title), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-400"
    }, st.n, "\uC7A5"))), canEdit && /*#__PURE__*/React.createElement("button", {
      onClick: () => remove(a),
      "aria-label": "\uC568\uBC94 \uC0AD\uC81C",
      className: "absolute top-0 right-0 w-11 h-11 flex items-center justify-center group"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-6 h-6 rounded-full bg-black/25 group-hover:bg-black/60 text-white/70 group-hover:text-white text-xs leading-none flex items-center justify-center transition",
      "aria-hidden": "true"
    }, "\xD7")));
  }), unfiled > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(null),
    className: "text-left rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm active:scale-[.98] transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aspect-square bg-slate-50 dark:bg-slate-700/40 flex items-center justify-center text-4xl"
  }, "\uD83D\uDDC2\uFE0F"), /*#__PURE__*/React.createElement("div", {
    className: "p-2.5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200"
  }, "\uC568\uBC94 \uC5C6\uC74C"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, unfiled, "\uC7A5")))), albums && albums.length === 0 && /*#__PURE__*/React.createElement(Card, {
    className: "p-8 text-center text-sm text-slate-400"
  }, "\uC544\uC9C1 \uC568\uBC94\uC774 \uC5C6\uC5B4\uC694."));
};
const Gallery = ({
  openUpload,
  canUpload = true
}) => {
  const {
    user,
    isAdmin
  } = useAuth();
  const [lim, setLim] = useState(60); // 무한스크롤: 60장씩 늘려가며 로딩
  const photos = usePhotos(lim);
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("recent");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [uploader, setUploader] = useState("all"); // 관리자 업로더별 필터
  const [detail, setDetail] = useState(null); // index
  const [showSlide, setShowSlide] = useState(false);
  const [grouped, setGrouped] = useState(false); // 월별 묶어보기
  const [filterOpen, setFilterOpen] = useState(false); // 조건은 접어둔다
  const [albumView, setAlbumView] = useState(false); // 앨범 목록 보기
  const [album, setAlbum] = useState(undefined); // undefined=전체, null=앨범없음, {..}=특정앨범
  const {
    saved
  } = useMySaved(user.uid);
  const sentinel = useRef(null);
  const canMore = photos && photos.length >= lim; // 더 있을 가능성

  // 관리자용: 업로더 목록
  const uploaders = useMemo(() => {
    const m = new Map();
    (photos || []).forEach(p => {
      if (p.uploadedBy) m.set(p.uploadedBy, p.uploaderName || "이름없음");
    });
    return [...m.entries()];
  }, [photos]);

  // 바닥 근처에 닿으면 더 로딩
  useEffect(() => {
    if (!sentinel.current) return;
    const io = new IntersectionObserver(es => {
      if (es[0].isIntersecting && canMore) setLim(n => n + 60);
    }, {
      rootMargin: "300px"
    });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [canMore]);
  const list = useMemo(() => {
    if (!photos) return [];
    // 초음파는 임신 페이지에서 별도 관리 → 갤러리에서 제외 + 공개범위 필터
    let l = photos.filter(p => p.category !== "ultrasound" && canSeePhoto(p, user.uid, isAdmin));
    if (cat !== "all") l = l.filter(p => p.category === cat);
    if (isAdmin && uploader !== "all") l = l.filter(p => p.uploadedBy === uploader);
    if (album !== undefined) l = l.filter(p => album ? p.albumId === album.id : !p.albumId);
    const kw = q.trim().toLowerCase();
    if (kw) {
      l = l.filter(p => (p.caption || "").toLowerCase().includes(kw) || (p.place || "").toLowerCase().includes(kw) || (p.uploaderName || "").toLowerCase().includes(kw) || (p.people || []).some(n => (n || "").toLowerCase().includes(kw)));
    }
    const dayOf = p => toDate(p.takenAt || p.createdAt);
    if (from) l = l.filter(p => {
      const d = dayOf(p);
      return d && ymd(d) >= from;
    });
    if (to) l = l.filter(p => {
      const d = dayOf(p);
      return d && ymd(d) <= to;
    });
    if (sort === "likes") l = [...l].sort((a, b) => likeCountOf(b) - likeCountOf(a));else l = [...l].sort((a, b) => toDate(b.takenAt || b.createdAt) - toDate(a.takenAt || a.createdAt));
    return l;
  }, [photos, cat, sort, q, from, to, uploader, isAdmin, user.uid, album]);
  const cats = [{
    v: "all",
    l: "전체"
  }, {
    v: "baby",
    l: "아기사진"
  }, {
    v: "milestone",
    l: "성장기록"
  }];

  /* 조건을 접어두면 뭐가 걸려 있는지 잊는다. 개수를 버튼에 붙여 보여준다. */
  const activeCount = (cat !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0) + (sort !== "recent" ? 1 : 0) + (uploader !== "all" ? 1 : 0) + (grouped ? 1 : 0);
  const resetFilters = () => {
    setCat("all");
    setFrom("");
    setTo("");
    setSort("recent");
    setUploader("all");
    setGrouped(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-3 pb-safe"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sr-only"
  }, "\uC0AC\uC9C4"), albumView && /*#__PURE__*/React.createElement(AlbumGrid, {
    photos: photos,
    onBack: () => {
      setAlbumView(false);
      setAlbum(undefined);
    },
    onOpen: a => {
      setAlbum(a);
      setAlbumView(false);
    }
  }), !albumView && album !== undefined && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200 truncate"
  }, album ? `${album.emoji} ${album.title}` : "🗂️ 앨범 없음"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, list.length, "\uC7A5")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAlbum(undefined),
    className: "text-xs text-teal-600 dark:text-teal-400 whitespace-nowrap"
  }, "\uC804\uCCB4 \uC0AC\uC9C4 \u2192")), !albumView && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls + " flex-1",
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\uD83D\uDD0D \uC0AC\uB78C\xB7\uC7A5\uC18C\xB7\uC124\uBA85 \uAC80\uC0C9",
    "aria-label": "\uC0AC\uC9C4 \uAC80\uC0C9"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setFilterOpen(v => !v),
    "aria-expanded": filterOpen,
    "aria-label": `필터${activeCount ? ` (${activeCount}개 적용됨)` : ""}`,
    className: `whitespace-nowrap px-3.5 rounded-xl text-sm font-medium border ${activeCount ? "bg-teal-500 border-teal-500 text-white" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`
  }, "\uD544\uD130", activeCount ? ` ${activeCount}` : "")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setAlbumView(true),
    "aria-label": "\uC568\uBC94 \uBCF4\uAE30",
    className: "flex-1 min-h-[44px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium"
  }, "\uD83D\uDCDA \uC568\uBC94"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowSlide(true),
    "aria-label": "\uC2AC\uB77C\uC774\uB4DC\uC1FC \uC2DC\uC791",
    className: "flex-1 min-h-[44px] rounded-xl bg-violet-400 text-white text-sm font-medium"
  }, "\u25B6 \uC2AC\uB77C\uC774\uB4DC\uC1FC")), filterOpen && /*#__PURE__*/React.createElement(Card, {
    className: "p-3 space-y-3 fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 overflow-x-auto no-scrollbar",
    role: "tablist",
    "aria-label": "\uCE74\uD14C\uACE0\uB9AC \uD544\uD130"
  }, cats.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.v,
    role: "tab",
    "aria-selected": cat === c.v,
    onClick: () => setCat(c.v),
    className: `whitespace-nowrap px-3 py-2 rounded-full text-[12px] font-medium ${cat === c.v ? "bg-teal-500 text-white" : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600"}`
  }, c.l))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "date",
    className: inputCls + " py-2 text-sm",
    value: from,
    onChange: e => setFrom(e.target.value),
    "aria-label": "\uC2DC\uC791 \uB0A0\uC9DC"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400"
  }, "~"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    className: inputCls + " py-2 text-sm",
    value: to,
    onChange: e => setTo(e.target.value),
    "aria-label": "\uB05D \uB0A0\uC9DC"
  })), isAdmin && uploaders.length > 0 && /*#__PURE__*/React.createElement("select", {
    value: uploader,
    onChange: e => setUploader(e.target.value),
    "aria-label": "\uC5C5\uB85C\uB354\uBCC4 \uBCF4\uAE30",
    className: inputCls + " py-2 text-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "\uD83D\uDC65 \uC804\uCCB4 \uC5C5\uB85C\uB354"), uploaders.map(([uid, nm]) => /*#__PURE__*/React.createElement("option", {
    key: uid,
    value: uid
  }, nm))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSort(sort === "recent" ? "likes" : "recent"),
    className: "flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-sm font-medium"
  }, sort === "recent" ? "최신순 ↓" : "좋아요순 ❤️"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setGrouped(g => !g),
    className: "flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-sm font-medium"
  }, grouped ? "전체 보기" : "📅 월별 보기")), (activeCount > 0 || q) && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      resetFilters();
      setQ("");
    },
    className: "w-full py-2.5 rounded-xl text-sm text-slate-500 dark:text-slate-300"
  }, "\uC870\uAC74 \uBAA8\uB450 \uC9C0\uC6B0\uAE30")), !photos ? /*#__PURE__*/React.createElement(Spinner, null) : list.length === 0 ? /*#__PURE__*/React.createElement(Card, {
    className: "p-8 text-center text-sm text-slate-400"
  }, q || from || to ? "검색 결과가 없어요." : /*#__PURE__*/React.createElement(React.Fragment, null, "\uC544\uC9C1 \uC0AC\uC9C4\uC774 \uC5C6\uC5B4\uC694.", /*#__PURE__*/React.createElement("br", null), "\uC544\uB798 + \uBC84\uD2BC\uC73C\uB85C \uCD94\uAC00\uD574\uBCF4\uC138\uC694.")) : /*#__PURE__*/React.createElement(React.Fragment, null, grouped ? (() => {
    const g = [];
    let cur = null;
    list.forEach((p, i) => {
      const d = toDate(p.takenAt || p.createdAt);
      const key = d ? `${d.getFullYear()}년 ${d.getMonth() + 1}월` : "날짜 없음";
      if (!cur || cur.key !== key) {
        cur = {
          key,
          items: []
        };
        g.push(cur);
      }
      cur.items.push({
        p,
        i
      });
    });
    return g.map(grp => /*#__PURE__*/React.createElement("div", {
      key: grp.key,
      className: "mb-3"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5 px-1"
    }, grp.key, " ", /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-normal text-slate-400"
    }, "(", grp.items.length, ")")), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-3 gap-2"
    }, grp.items.map(({
      p,
      i
    }) => /*#__PURE__*/React.createElement(PhotoCard, {
      key: p.id,
      photo: p,
      uid: user.uid,
      saved: saved.has(p.id),
      onOpen: () => setDetail(i)
    })))));
  })() : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, list.map((p, i) => /*#__PURE__*/React.createElement(PhotoCard, {
    key: p.id,
    photo: p,
    uid: user.uid,
    saved: saved.has(p.id),
    onOpen: () => setDetail(i)
  }))), /*#__PURE__*/React.createElement("div", {
    ref: sentinel,
    className: "h-8 flex items-center justify-center"
  }, canMore && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400"
  }, "\uB354 \uBD88\uB7EC\uC624\uB294 \uC911\u2026")))), canUpload && /*#__PURE__*/React.createElement("button", {
    onClick: openUpload,
    "aria-label": "\uC0AC\uC9C4 \uC5C5\uB85C\uB4DC",
    className: "fixed bottom-24 right-1/2 translate-x-[195px] sm:right-[calc(50%-215px)] w-14 h-14 rounded-full bg-teal-500 text-white text-3xl shadow-lg flex items-center justify-center active:scale-95 z-20"
  }, "+"), detail != null && /*#__PURE__*/React.createElement(PhotoDetail, {
    list: list,
    index: detail,
    setIndex: setDetail,
    uid: user.uid,
    saved: saved,
    onClose: () => setDetail(null)
  }), showSlide && /*#__PURE__*/React.createElement(Slideshow, {
    photos: album !== undefined ? list : photos,
    onClose: () => setShowSlide(false)
  }));
};

/* ========================================================================
   20-b. 슬라이드쇼 · 디지털 액자 (가로모드 최적화)
   ------------------------------------------------------------------------
   · 레터박스를 같은 사진의 블러 확대본으로 채워 세로 사진도 가로 화면에서
     자연스럽게 보이도록 함 (사진은 크롭하지 않음)
   · 유리 컨트롤 바: 이전 / 재생·정지 / 다음 / 좋아요 / 원본 저장 /
     액자 모드 / 설정
   · Wake Lock 으로 재생 중 화면이 꺼지지 않게 하고, 앱을 나갔다 오면 재획득
   ======================================================================== */
const SS_SEC = [3, 5, 7, 10, 15, 30];
const SS_ORDER = [{
  v: "recent",
  l: "최신순"
}, {
  v: "old",
  l: "오래된순"
}, {
  v: "random",
  l: "랜덤"
}];
const ssGet = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch (e) {
    return d;
  }
};
const ssSet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};
const Slideshow = ({
  photos,
  onClose
}) => {
  const {
    user,
    isAdmin
  } = useAuth();
  const toast = useToast();
  const baby = useBaby();
  const [sec, setSec] = useState(() => ssGet("toto-ss-sec", 7));
  const [order, setOrder] = useState(() => ssGet("toto-ss-order", "recent"));
  const [fit, setFit] = useState(() => ssGet("toto-ss-fit", "contain"));
  const [frame, setFrame] = useState(false);
  const [panel, setPanel] = useState(false);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [prog, setProg] = useState(0);
  const [ui, setUi] = useState(true);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);
  const hideT = useRef(null);
  const wakeRef = useRef(null);

  // 전체공개 사진만 (초음파/나만보기 제외)
  const base = useMemo(() => (photos || []).filter(p => !isPrivate(p) && p.category !== "ultrasound" && p.url), [photos]);
  const deck = useMemo(() => {
    let l = [...base].sort((a, b) => toDate(b.takenAt || b.createdAt) - toDate(a.takenAt || a.createdAt));
    if (order === "old") l.reverse();else if (order === "random") {
      for (let i = l.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [l[i], l[j]] = [l[j], l[i]];
      }
    }
    return l.slice(0, 200);
  }, [base, order]);
  useEffect(() => {
    if (idx >= deck.length && deck.length) setIdx(0);
  }, [deck.length, idx]);
  const cur = deck[idx];

  // D-day (출생 전이면 D-, 출생 후면 D+)
  const ddayOf = when => {
    const d = toDate(when);
    if (!d) return "";
    if (baby.birthDate) {
      const n = Math.floor((d - new Date(baby.birthDate)) / 86400000);
      return n >= 0 ? `D+${n}` : "";
    }
    if (baby.dueDate) {
      const n = Math.ceil((new Date(baby.dueDate) - d) / 86400000);
      return n > 0 ? `D-${n}` : "";
    }
    return "";
  };
  const dotDate = v => {
    const d = toDate(v);
    return d ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}` : "";
  };
  const go = useCallback(d => {
    setIdx(i => (i + d + deck.length) % deck.length);
    setProg(0);
  }, [deck.length]);

  // 자동 전환 + 진행 게이지
  useEffect(() => {
    if (!playing || deck.length <= 1) return;
    const t0 = Date.now();
    const tick = setInterval(() => setProg(Math.min(1, (Date.now() - t0) / (sec * 1000))), 100);
    const next = setTimeout(() => go(1), sec * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(next);
    };
  }, [idx, playing, deck.length, sec, go]);

  // 다음 사진 미리 받아두기 (전환 시 흰 화면 방지)
  useEffect(() => {
    [1, 2, 3].forEach(d => {
      const p = deck[(idx + d) % (deck.length || 1)];
      if (p && p.url) {
        const im = new Image();
        im.src = p.url;
      }
    });
  }, [idx, deck]);

  // Wake Lock + 전체화면 + 키보드
  useEffect(() => {
    let cancelled = false;
    const acquire = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try {
        const l = await navigator.wakeLock.request("screen");
        if (cancelled) {
          l.release().catch(() => {});
          return;
        }
        wakeRef.current = l;
        l.addEventListener && l.addEventListener("release", () => {
          wakeRef.current = null;
        });
      } catch (e) {
        wakeRef.current = null;
      }
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === "visible" && !wakeRef.current) acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    const el = rootRef.current;
    try {
      if (el && el.requestFullscreen) el.requestFullscreen().catch(() => {});else if (el && el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (e) {}
    const onKey = e => {
      if (e.key === "Escape") onClose();else if (e.key === "ArrowRight") go(1);else if (e.key === "ArrowLeft") go(-1);else if (e.key === " ") {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.key.toLowerCase() === "f") setFrame(f => !f);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      document.body.style.overflow = "";
      const l = wakeRef.current;
      wakeRef.current = null;
      if (l) l.release().catch(() => {});
      try {
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (e) {}
    };
  }, [go, onClose]);

  // UI 자동 숨김
  const poke = useCallback(() => {
    setUi(true);
    clearTimeout(hideT.current);
    hideT.current = setTimeout(() => {
      setUi(false);
      setPanel(false);
    }, frame ? 3000 : 4500);
  }, [frame]);
  useEffect(() => {
    poke();
    return () => clearTimeout(hideT.current);
  }, [poke, idx]);
  const save = (k, v, setter) => {
    setter(v);
    ssSet(k, v);
  };
  const download = async () => {
    if (!cur) return;
    setBusy(true);
    try {
      const orig = cur.storagePath ? await signOne(cur.storagePath) : cur.url;
      if (!orig) throw new Error("원본을 찾을 수 없어요.");
      const ext = ((cur.storagePath || "x.jpg").split(".").pop() || "jpg").split("?")[0];
      const name = `${baby.name || "photo"}_${dotDate(cur.takenAt || cur.createdAt).replace(/\./g, "")}_${String(cur.id).slice(0, 6)}.${ext}`;
      try {
        const res = await fetch(orig);
        if (!res.ok) throw new Error("다운로드 실패");
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast("원본을 저장했어요 ⬇️", "success");
      } catch (e) {
        window.open(orig, "_blank");
        toast("새 탭에서 사진을 길게 눌러 저장해주세요.");
      }
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const like = async () => {
    if (!cur) return;
    try {
      await toggleLike(cur, user.uid);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  if (!photos) {
    return /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("div", {
      className: "ss-root"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ss-empty"
    }, /*#__PURE__*/React.createElement(Spinner, null))));
  }
  if (deck.length === 0 || !cur) {
    return /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("div", {
      className: "ss-root"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ss-empty"
    }, /*#__PURE__*/React.createElement("p", null, "\uD45C\uC2DC\uD560 \uC804\uCCB4\uACF5\uAC1C \uC0AC\uC9C4\uC774 \uC5C6\uC5B4\uC694."), /*#__PURE__*/React.createElement(Btn, {
      variant: "ghost",
      onClick: onClose
    }, "\uB2EB\uAE30"))));
  }
  const liked = isLikedBy(cur, user.uid);
  const RING = 97.4;
  const uiCls = ui ? "ss-ui" : "ss-ui ss-hide";
  return /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("div", {
    ref: rootRef,
    className: "ss-root",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "\uC2AC\uB77C\uC774\uB4DC\uC1FC",
    onMouseMove: poke,
    onTouchStart: poke,
    onClick: poke
  }, /*#__PURE__*/React.createElement("div", {
    className: "ss-backdrop",
    style: {
      backgroundImage: `url("${cur.url}")`
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "ss-vignette"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ss-photowrap"
  }, /*#__PURE__*/React.createElement("img", {
    key: cur.id,
    src: cur.url,
    alt: cur.caption || "사진",
    className: `ss-photo ss-enter${fit === "cover" ? " ss-fill" : ""}`
  })), /*#__PURE__*/React.createElement("div", {
    className: uiCls
  }, /*#__PURE__*/React.createElement("button", {
    className: "ss-close",
    onClick: onClose,
    "aria-label": "\uC2AC\uB77C\uC774\uB4DC\uC1FC \uB2EB\uAE30"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 6l12 12M18 6L6 18"
  }))), !frame && /*#__PURE__*/React.createElement("div", {
    className: "ss-counter"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ss-count"
  }, idx + 1, " / ", deck.length), /*#__PURE__*/React.createElement("svg", {
    className: "ss-ring",
    viewBox: "0 0 36 36"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "bg",
    cx: "18",
    cy: "18",
    r: "15.5"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "fg",
    cx: "18",
    cy: "18",
    r: "15.5",
    strokeDasharray: RING,
    strokeDashoffset: RING * (1 - prog)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ss-meta"
  }, cur.caption && /*#__PURE__*/React.createElement("p", {
    className: "ss-cap"
  }, cur.caption), /*#__PURE__*/React.createElement("div", {
    className: "ss-sub"
  }, ddayOf(cur.takenAt || cur.createdAt) && /*#__PURE__*/React.createElement("span", {
    className: "ss-dday"
  }, ddayOf(cur.takenAt || cur.createdAt)), /*#__PURE__*/React.createElement("span", null, dotDate(cur.takenAt || cur.createdAt)), cur.uploaderName && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, cur.uploaderName)))), !frame && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "ss-side l",
    onClick: e => {
      e.stopPropagation();
      go(-1);
    },
    "aria-label": "\uC774\uC804 \uC0AC\uC9C4"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M15 18l-6-6 6-6"
  }))), /*#__PURE__*/React.createElement("button", {
    className: "ss-side r",
    onClick: e => {
      e.stopPropagation();
      go(1);
    },
    "aria-label": "\uB2E4\uC74C \uC0AC\uC9C4"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 18l6-6-6-6"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ss-strip"
  }, deck.slice(0, 24).map((p, i) => /*#__PURE__*/React.createElement("img", {
    key: p.id,
    src: p.thumbUrl || p.url,
    alt: "",
    className: `ss-thumb${i === idx ? " cur" : ""}`,
    onClick: e => {
      e.stopPropagation();
      setIdx(i);
      setProg(0);
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "ss-bar",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    className: "ss-btn",
    onClick: () => go(-1),
    "aria-label": "\uC774\uC804"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M19 20L9 12l10-8zM5 19V5"
  }))), /*#__PURE__*/React.createElement("button", {
    className: "ss-btn play",
    onClick: () => setPlaying(p => !p),
    "aria-label": playing ? "일시정지" : "재생"
  }, playing ? /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 5.5h2.2v13H9zM12.8 5.5H15v13h-2.2z"
  })) : /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 5.2l11 6.8-11 6.8z"
  }))), /*#__PURE__*/React.createElement("button", {
    className: "ss-btn",
    onClick: () => go(1),
    "aria-label": "\uB2E4\uC74C"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 4l10 8-10 8zM19 5v14"
  }))), /*#__PURE__*/React.createElement("span", {
    className: "ss-sep"
  }), /*#__PURE__*/React.createElement("button", {
    className: `ss-btn${liked ? " on" : ""}`,
    onClick: like,
    "aria-label": liked ? "좋아요 취소" : "좋아요"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"
  }))), /*#__PURE__*/React.createElement("button", {
    className: "ss-btn",
    onClick: download,
    disabled: busy,
    "aria-label": "\uC6D0\uBCF8 \uC800\uC7A5"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
  }))), /*#__PURE__*/React.createElement("span", {
    className: "ss-sep"
  }), /*#__PURE__*/React.createElement("button", {
    className: `ss-btn${frame ? " act" : ""}`,
    onClick: () => {
      setFrame(f => !f);
      setPanel(false);
    },
    "aria-label": "\uC561\uC790 \uBAA8\uB4DC"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 15l5-5 4 4 3-3 6 6"
  }))), !frame && /*#__PURE__*/React.createElement("button", {
    className: "ss-btn",
    onClick: () => setPanel(s => !s),
    "aria-label": "\uC124\uC815"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H2a2 2 0 110-4h.09A1.65 1.65 0 004.6 8a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 3.68 1.65 1.65 0 0010 2.17V2a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 8c.14.36.4.66.74.85H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
  })))), panel && !frame && /*#__PURE__*/React.createElement("div", {
    className: "ss-panel",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h4", null, "\uC2AC\uB77C\uC774\uB4DC\uC1FC \uC124\uC815"), /*#__PURE__*/React.createElement("div", {
    className: "ss-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ss-lb"
  }, "\uC804\uD658 \uC2DC\uAC04"), /*#__PURE__*/React.createElement("div", {
    className: "ss-chips"
  }, SS_SEC.map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    className: `ss-chip${sec === v ? " sel" : ""}`,
    onClick: () => save("toto-ss-sec", v, setSec)
  }, v, "\uCD08")))), /*#__PURE__*/React.createElement("div", {
    className: "ss-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ss-lb"
  }, "\uC21C\uC11C"), /*#__PURE__*/React.createElement("div", {
    className: "ss-chips"
  }, SS_ORDER.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.v,
    className: `ss-chip${order === o.v ? " sel" : ""}`,
    onClick: () => {
      save("toto-ss-order", o.v, setOrder);
      setIdx(0);
    }
  }, o.l)))), /*#__PURE__*/React.createElement("div", {
    className: "ss-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ss-lb"
  }, "\uD654\uBA74 \uB9DE\uCDA4"), /*#__PURE__*/React.createElement("div", {
    className: "ss-chips"
  }, [{
    v: "contain",
    l: "전체 보기"
  }, {
    v: "cover",
    l: "채우기"
  }].map(o => /*#__PURE__*/React.createElement("button", {
    key: o.v,
    className: `ss-chip${fit === o.v ? " sel" : ""}`,
    onClick: () => save("toto-ss-fit", o.v, setFit)
  }, o.l)))), /*#__PURE__*/React.createElement("p", {
    className: "ss-note"
  }, "wakeLock" in navigator ? "✅ 재생 중에는 화면이 꺼지지 않아요." : "⚠️ 이 기기에서는 화면 자동 잠금 설정을 확인해주세요.")))));
};

/* ========================================================================
   21. 사진 상세 모달 (스와이프/이전·다음/다운로드/삭제)
   ======================================================================== */
const PhotoDetail = ({
  list,
  index,
  setIndex,
  uid,
  saved,
  onClose
}) => {
  const {
    user,
    isAdmin
  } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [editOpen, setEditOpen] = useState(false);
  const p = list[index];
  const touch = useRef(null);
  if (!p) return null;
  const canEdit = isAdmin || p.uploadedBy === user.uid; // 등록자 또는 관리자

  const prev = () => setIndex(i => i > 0 ? i - 1 : i);
  const next = () => setIndex(i => i < list.length - 1 ? i + 1 : i);
  const onTouchStart = e => touch.current = e.touches[0].clientX;
  const onTouchEnd = e => {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (dx > 50) prev();else if (dx < -50) next();
    touch.current = null;
  };
  const catLabel = {
    ultrasound: "초음파",
    baby: "아기사진",
    milestone: "성장기록"
  }[p.category] || p.category;
  const download = async () => {
    try {
      const res = await fetch(p.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `baby_${p.id}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(p.url, "_blank");
    }
  };
  const remove = async () => {
    if (!(await confirm("이 사진을 삭제할까요?"))) return;
    try {
      await removeStorage([p.storagePath, p.previewPath, p.thumbPath]);
      await COL.photos().doc(p.id).delete();
      toast("삭제되었습니다.", "success");
      onClose();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  return /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[90] bg-black flex flex-col fade-in",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "\uC0AC\uC9C4 \uC0C1\uC138",
    style: {
      paddingTop: "env(safe-area-inset-top)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center p-3 text-white"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, index + 1, " / ", list.length), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "\uB2EB\uAE30",
    className: "text-3xl w-11 h-11 bg-white/15 rounded-full flex items-center justify-center"
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-h-0 flex items-center justify-center relative",
    onTouchStart: onTouchStart,
    onTouchEnd: onTouchEnd
  }, /*#__PURE__*/React.createElement("button", {
    onClick: prev,
    "aria-label": "\uC774\uC804 \uC0AC\uC9C4",
    disabled: index === 0,
    className: "absolute left-2 text-white text-4xl w-12 h-12 disabled:opacity-20 z-10"
  }, "\u2039"), /*#__PURE__*/React.createElement("img", {
    src: p.url,
    alt: p.caption || "사진",
    className: "max-h-full max-w-full object-contain"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: next,
    "aria-label": "\uB2E4\uC74C \uC0AC\uC9C4",
    disabled: index === list.length - 1,
    className: "absolute right-2 text-white text-4xl w-12 h-12 disabled:opacity-20 z-10"
  }, "\u203A")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white dark:bg-slate-800 p-4 space-y-3 shrink-0 overflow-y-auto",
    style: {
      maxHeight: "42vh",
      paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-slate-800 dark:text-white"
  }, p.uploaderName, " \xB7 ", catLabel), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, fmtDateTime(p.createdAt))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => toggleLike(p, uid),
    "aria-label": isLikedBy(p, uid) ? "좋아요 취소" : "좋아요",
    className: "flex items-center gap-1 text-lg"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, isLikedBy(p, uid) ? "❤️" : "🤍"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-500"
  }, likeCountOf(p))), /*#__PURE__*/React.createElement("button", {
    onClick: () => toggleSave(p, uid),
    "aria-label": "\uC800\uC7A5",
    className: "text-lg",
    "aria-hidden": "true"
  }, saved.has(p.id) ? "🔖" : "🏷️"))), p.caption && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 dark:text-slate-300"
  }, p.caption), p.people && p.people.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-400"
  }, "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67 \uD568\uAED8: ", p.people.join(", ")), p.place && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-400"
  }, "\uD83D\uDCCD ", p.place, p.gps && /*#__PURE__*/React.createElement("a", {
    href: `https://maps.google.com/?q=${p.gps.lat},${p.gps.lng}`,
    target: "_blank",
    rel: "noopener",
    className: "text-teal-500 ml-1 underline"
  }, "\uC9C0\uB3C4")), p.takenAt && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "\uD83D\uDCC5 \uCD2C\uC601: ", fmtDateTime(p.takenAt)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: download,
    className: "flex-1 text-sm py-2.5"
  }, "\u2B07\uFE0F \uB2E4\uC6B4\uB85C\uB4DC"), canEdit && /*#__PURE__*/React.createElement(Btn, {
    variant: "lavender",
    onClick: () => setEditOpen(true),
    className: "flex-1 text-sm py-2.5"
  }, "\u270F\uFE0F \uC218\uC815"), canEdit && /*#__PURE__*/React.createElement(Btn, {
    variant: "danger",
    onClick: remove,
    className: "flex-1 text-sm py-2.5"
  }, "\uD83D\uDDD1\uFE0F \uC0AD\uC81C")), !canEdit && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 text-center"
  }, "\uC218\uC815\xB7\uC0AD\uC81C\uB294 \uC0AC\uC9C4\uC744 \uC62C\uB9B0 \uC0AC\uB78C \uB610\uB294 \uAD00\uB9AC\uC790\uB9CC \uD560 \uC218 \uC788\uC5B4\uC694.")), /*#__PURE__*/React.createElement(EditPhotoModal, {
    open: editOpen,
    onClose: () => setEditOpen(false),
    photo: p
  })));
};

/* ========================================================================
   21-b. 사진 정보 수정 모달 (등록자 또는 관리자)
   ======================================================================== */
const EditPhotoModal = ({
  open,
  onClose,
  photo
}) => {
  const toast = useToast();
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("baby");
  const [people, setPeople] = useState([]);
  const [personInput, setPersonInput] = useState("");
  const [place, setPlace] = useState("");
  const [vis, setVis] = useState("public");
  const [albumId, setAlbumId] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open || !photo) return;
    setCaption(photo.caption || "");
    setCategory(photo.category || "baby");
    setPeople(photo.people || []);
    setPersonInput("");
    setPlace(photo.place || "");
    setVis(photo.vis === "private" ? "private" : "public");
    setAlbumId(photo.albumId || null);
  }, [open, photo && photo.id]);
  const addPerson = () => {
    const n = personInput.trim();
    if (n && !people.includes(n)) setPeople(p => [...p, n]);
    setPersonInput("");
  };
  const save = async () => {
    setBusy(true);
    try {
      await COL.photos().doc(photo.id).update({
        caption,
        category,
        people,
        place,
        placeLower: (place || "").toLowerCase(),
        vis,
        albumId
      });
      toast("사진 정보를 수정했어요.", "success");
      onClose();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: "\u270F\uFE0F \uC0AC\uC9C4 \uC815\uBCF4 \uC218\uC815"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uACF5\uAC1C \uBC94\uC704",
    value: vis,
    onChange: setVis,
    options: [{
      value: "public",
      label: "🌐 전체공개"
    }, {
      value: "private",
      label: "🔒 나만보기"
    }]
  }), /*#__PURE__*/React.createElement(AlbumPicker, {
    value: albumId,
    onChange: setAlbumId
  }), /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uCE74\uD14C\uACE0\uB9AC",
    value: category,
    onChange: setCategory,
    options: [{
      value: "ultrasound",
      label: "초음파"
    }, {
      value: "baby",
      label: "아기사진"
    }, {
      value: "milestone",
      label: "성장기록"
    }]
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\uCEA1\uC158"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: caption,
    onChange: e => setCaption(e.target.value),
    placeholder: "\uC0AC\uC9C4 \uC124\uBA85"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5"
  }, "\uD568\uAED8\uD55C \uC0AC\uB78C"), people.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 mb-2"
  }, people.map(n => /*#__PURE__*/React.createElement("span", {
    key: n,
    className: "px-3 py-1.5 rounded-full text-sm bg-violet-400 text-white flex items-center gap-1"
  }, n, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setPeople(p => p.filter(x => x !== n)),
    "aria-label": `${n} 제거`,
    className: "w-11 h-11 -mr-3 flex items-center justify-center text-base"
  }, "\xD7")))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: personInput,
    onChange: e => setPersonInput(e.target.value),
    onKeyDown: e => e.key === "Enter" && (e.preventDefault(), addPerson()),
    placeholder: "\uC774\uB984 \uCD94\uAC00"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: addPerson,
    className: "whitespace-nowrap px-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm"
  }, "\uCD94\uAC00"))), /*#__PURE__*/React.createElement(Field, {
    label: "\uC7A5\uC18C / \uC9C0\uC5ED"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: place,
    onChange: e => setPlace(e.target.value),
    placeholder: "\uC608: \uC11C\uC6B8 \uD560\uBA38\uB2C8\uB301"
  })), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : "저장")));
};

/* ========================================================================
   22. 내 저장 탭
   ======================================================================== */
const Saved = () => {
  const {
    user,
    isAdmin
  } = useAuth();
  const {
    docs
  } = useMySaved(user.uid);
  const [photos, setPhotos] = useState({}); // id -> 최신 photo
  const [loaded, setLoaded] = useState(false);
  const [detail, setDetail] = useState(null);

  // 저장한 사진의 최신 메타(좋아요 수 등)를 photos에서 가져옴 (삭제/실패해도 멈추지 않게 .catch)
  useEffect(() => {
    let active = true;
    setLoaded(false);
    if (docs.length === 0) {
      setPhotos({});
      setLoaded(true);
      return;
    }
    Promise.all(docs.map(d => COL.photos().doc(d.photoRef || d.id).get().catch(() => null))).then(snaps => {
      if (!active) return;
      const m = {};
      snaps.forEach(s => {
        if (s && s.exists) m[s.id] = {
          id: s.id,
          ...s.data()
        };
      });
      setPhotos(m);
      setLoaded(true);
    }).catch(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [docs.map(d => d.id).join(",")]);
  const list = docs.map(d => photos[d.photoRef || d.id]).filter(Boolean).filter(p => p.category !== "ultrasound" && canSeePhoto(p, user.uid, isAdmin)); // 초음파는 임신 페이지에서만
  const savedSet = new Set(docs.map(d => d.id));
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-3 pb-safe"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sr-only"
  }, "\uC800\uC7A5\uD55C \uC0AC\uC9C4"), /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-lg text-slate-800 dark:text-white"
  }, "\uD83D\uDD16 \uB0B4 \uC800\uC7A5"), !loaded ? /*#__PURE__*/React.createElement(Spinner, null) : list.length === 0 ? /*#__PURE__*/React.createElement(Card, {
    className: "p-8 text-center text-sm text-slate-400"
  }, "\uC800\uC7A5\uD55C \uC0AC\uC9C4\uC774 \uC5C6\uC5B4\uC694.", /*#__PURE__*/React.createElement("br", null), "\uAC24\uB7EC\uB9AC\uC5D0\uC11C \uD83D\uDD16 \uBC84\uD2BC\uC73C\uB85C \uC800\uC7A5\uD574\uBCF4\uC138\uC694.") : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, list.map((p, i) => /*#__PURE__*/React.createElement(PhotoCard, {
    key: p.id,
    photo: p,
    uid: user.uid,
    saved: savedSet.has(p.id),
    onOpen: () => setDetail(i)
  }))), detail != null && /*#__PURE__*/React.createElement(PhotoDetail, {
    list: list,
    index: detail,
    setIndex: setDetail,
    uid: user.uid,
    saved: savedSet,
    onClose: () => setDetail(null)
  }));
};

// 관리자 답장 입력 (편지 작성자와 관리자만 답장을 봄)
const ReplyBox = ({
  letter,
  onSaved
}) => {
  const {
    profile
  } = useAuth();
  const toast = useToast();
  const [text, setText] = useState(letter.reply || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setText(letter.reply || "");
  }, [letter.id]);
  const save = async () => {
    if (!text.trim()) {
      toast("답장을 입력해주세요.", "error");
      return;
    }
    setBusy(true);
    try {
      const r = {
        reply: text.trim(),
        replyBy: profile && profile.name || "관리자",
        replyAt: TS()
      };
      await COL.records().doc(letter.id).update(r);
      toast("답장을 남겼어요 💜", "success");
      onSaved && onSaved({
        ...r,
        replyAt: new Date()
      });
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 dark:border-slate-700 pt-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-medium text-violet-500 mb-1.5"
  }, "\uD83D\uDC9C \uB2F5\uC7A5 \uC4F0\uAE30 (\uC791\uC131\uC790\uB9CC \uBCFC \uC218 \uC788\uC5B4\uC694)"), /*#__PURE__*/React.createElement("textarea", {
    className: inputCls,
    rows: "3",
    value: text,
    onChange: e => setText(e.target.value),
    placeholder: "\uB530\uB73B\uD55C \uB2F5\uC7A5\uC744 \uB0A8\uACA8\uBCF4\uC138\uC694..."
  }), /*#__PURE__*/React.createElement(Btn, {
    variant: "lavender",
    onClick: save,
    disabled: busy,
    className: "w-full mt-2 text-sm py-2.5"
  }, busy ? "저장 중..." : letter.reply ? "답장 수정" : "답장 보내기"));
};

/* ========================================================================
   22-b. 💌 편지 (아기에게 보내는 편지 + 이미지 첨부)
      records 컬렉션에 type:"letter" 로 저장 (보안규칙/리스너 재사용)
   ======================================================================== */
const Letters = () => {
  const {
    user,
    profile,
    isAdmin
  } = useAuth();
  const confirm = useConfirm();
  const all = useRecords("letter", 100);
  const visible = all && all.filter(l => canSeeLetter(l, user.uid, isAdmin)); // 공개 범위 필터
  const [who, setWho] = useState("all"); // 등록자별 필터
  const items = visible && (who === "all" ? visible : visible.filter(l => l.createdBy === who));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null); // 수정할 편지
  const [viewing, setViewing] = useState(null); // 열람할 편지

  // 등록자 목록 (보이는 편지 기준)
  const authors = useMemo(() => {
    const m = new Map();
    (visible || []).forEach(l => {
      if (l.createdBy) m.set(l.createdBy, l.creatorName || "이름없음");
    });
    return [...m.entries()];
  }, [visible]);
  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = l => {
    setEditing(l);
    setEditorOpen(true);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-4 pb-safe"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "sr-only"
  }, "\uD3B8\uC9C0"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-lg text-slate-800 dark:text-white"
  }, "\uD83D\uDC8C \uD3B8\uC9C0"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "\uC6B0\uB9AC \uC544\uAE30\uC5D0\uAC8C \uB9C8\uC74C\uC744 \uB0A8\uACA8\uBCF4\uC138\uC694")), /*#__PURE__*/React.createElement(Btn, {
    onClick: openNew,
    className: "text-sm py-2 px-3"
  }, "+ \uD3B8\uC9C0 \uC4F0\uAE30")), authors.length > 1 && /*#__PURE__*/React.createElement("select", {
    value: who,
    onChange: e => setWho(e.target.value),
    "aria-label": "\uB4F1\uB85D\uC790\uBCC4 \uBCF4\uAE30",
    className: inputCls + " py-2 text-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "\u270D\uFE0F \uC804\uCCB4 \uB4F1\uB85D\uC790"), authors.map(([uid, nm]) => /*#__PURE__*/React.createElement("option", {
    key: uid,
    value: uid
  }, nm))), !items ? /*#__PURE__*/React.createElement(Spinner, null) : items.length === 0 ? /*#__PURE__*/React.createElement(Card, {
    className: "p-8 text-center text-sm text-slate-400"
  }, "\uC544\uC9C1 \uD3B8\uC9C0\uAC00 \uC5C6\uC5B4\uC694.", /*#__PURE__*/React.createElement("br", null), "\uCCAB \uD3B8\uC9C0\uB97C \uB0A8\uACA8\uBCF4\uC138\uC694 \uD83D\uDC9B") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, items.map(l => /*#__PURE__*/React.createElement(Card, {
    key: l.id,
    className: "overflow-hidden active:scale-[.99] transition"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewing(l),
    className: "block w-full text-left"
  }, l.image && /*#__PURE__*/React.createElement("img", {
    src: l.image,
    alt: "",
    className: "w-full max-h-48 object-cover"
  }), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1 gap-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white truncate"
  }, isPrivate(l) && "🔒 ", l.title || "(제목 없음)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 shrink-0"
  }, l.reply && (isAdmin || l.createdBy === user.uid) && /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] bg-violet-100 text-violet-600 dark:bg-violet-900/40 rounded-full px-1.5 py-0.5"
  }, "\uD83D\uDC9C \uB2F5\uC7A5"), l.image && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-300"
  }, "\uD83D\uDDBC\uFE0F"))), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-300 line-clamp-2",
    style: {
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, l.body), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 mt-2"
  }, "\uD83D\uDC9B ", l.creatorName, " \xB7 ", fmtDateTime(l.at), isPrivate(l) && " · 나만보기")))))), /*#__PURE__*/React.createElement(Modal, {
    open: !!viewing,
    onClose: () => setViewing(null),
    title: "\uD83D\uDC8C \uD3B8\uC9C0"
  }, viewing && /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, viewing.image && /*#__PURE__*/React.createElement("img", {
    src: viewing.image,
    alt: "\uCCA8\uBD80 \uC774\uBBF8\uC9C0",
    className: "w-full rounded-xl"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-slate-800 dark:text-white"
  }, viewing.title || "(제목 없음)"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "\uD83D\uDC9B ", viewing.creatorName, " \xB7 ", fmtDateTime(viewing.at)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed"
  }, viewing.body), viewing.reply && (isAdmin || viewing.createdBy === user.uid) && /*#__PURE__*/React.createElement("div", {
    className: "bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-violet-500 mb-1"
  }, "\uD83D\uDC9C ", viewing.replyBy || "관리자", "\uC758 \uB2F5\uC7A5 \xB7 ", fmtDateTime(viewing.replyAt)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap"
  }, viewing.reply)), isAdmin && /*#__PURE__*/React.createElement(ReplyBox, {
    letter: viewing,
    onSaved: r => setViewing({
      ...viewing,
      ...r
    })
  }), (isAdmin || viewing.createdBy === user.uid) && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 pt-2"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "lavender",
    className: "flex-1 text-sm py-2.5",
    onClick: () => {
      const l = viewing;
      setViewing(null);
      openEdit(l);
    }
  }, "\u270F\uFE0F \uC218\uC815"), /*#__PURE__*/React.createElement(Btn, {
    variant: "danger",
    className: "flex-1 text-sm py-2.5",
    onClick: async () => {
      if (await confirm("이 편지를 삭제할까요?")) {
        deleteRecord(viewing.id);
        if (viewing.createdBy) COL.users().doc(viewing.createdBy).update({
          letterCount: SV.increment(-1)
        }).catch(() => {});
        setViewing(null);
      }
    }
  }, "\uD83D\uDDD1\uFE0F \uC0AD\uC81C")))), /*#__PURE__*/React.createElement(LetterEditor, {
    open: editorOpen,
    onClose: () => setEditorOpen(false),
    letter: editing
  }));
};

// 편지 작성/수정 모달
const LetterEditor = ({
  open,
  onClose,
  letter
}) => {
  const {
    user,
    profile
  } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState(null); // dataURL
  const [vis, setVis] = useState("private"); // 편지는 기본 나만보기
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  const camRef = useRef();
  useEffect(() => {
    if (!open) return;
    setTitle(letter && letter.title || "");
    setBody(letter && letter.body || "");
    setImage(letter && letter.image || null);
    setVis(letter ? letter.vis === "public" ? "public" : "private" : "private");
    setBusy(false);
  }, [open, letter && letter.id]);
  const pickImage = async e => {
    const f = (e.target.files || [])[0];
    if (!f) return;
    try {
      setBusy(true);
      setImage(await compressToDataURL(f));
    } catch (ex) {
      toast(errMsg(ex), "error");
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!body.trim() && !title.trim()) {
      toast("내용을 입력해주세요.", "error");
      return;
    }
    setBusy(true);
    try {
      if (letter) {
        await COL.records().doc(letter.id).update({
          title,
          body,
          image: image || null,
          vis
        });
        toast("편지를 수정했어요.", "success");
      } else {
        await addRecord("letter", {
          title,
          body,
          image: image || null,
          vis,
          at: TS()
        }, user, profile);
        // 편지 횟수 +1 (메달용)
        await COL.users().doc(user.uid).update({
          letterCount: SV.increment(1)
        }).catch(() => {});
        toast("편지를 남겼어요 💛", "success");
      }
      onClose();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: letter ? "✏️ 편지 수정" : "💌 편지 쓰기"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uACF5\uAC1C \uBC94\uC704",
    value: vis,
    onChange: setVis,
    options: [{
      value: "private",
      label: "🔒 나만보기"
    }, {
      value: "public",
      label: "🌐 전체공개"
    }]
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 -mt-1"
  }, "\uB098\uB9CC\uBCF4\uAE30\uB294 \uBCF8\uC778\uACFC \uAD00\uB9AC\uC790(\uC5C4\uB9C8\xB7\uC544\uBE60)\uB9CC \uBCFC \uC218 \uC788\uC5B4\uC694."), /*#__PURE__*/React.createElement(Field, {
    label: "\uC81C\uBAA9"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "\uC0AC\uB791\uD558\uB294 \uC6B0\uB9AC \uC544\uAE30\uC5D0\uAC8C"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uB0B4\uC6A9"
  }, /*#__PURE__*/React.createElement("textarea", {
    className: inputCls,
    rows: "7",
    value: body,
    onChange: e => setBody(e.target.value),
    placeholder: "\uC624\uB298 \uB108\uC5D0\uAC8C \uD558\uACE0 \uC2F6\uC740 \uC774\uC57C\uAE30\uB97C \uC801\uC5B4\uBCF4\uC138\uC694..."
  })), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    onChange: pickImage,
    className: "hidden"
  }), /*#__PURE__*/React.createElement("input", {
    ref: camRef,
    type: "file",
    accept: "image/*",
    capture: "environment",
    onChange: pickImage,
    className: "hidden"
  }), image ? /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "\uCCA8\uBD80 \uBBF8\uB9AC\uBCF4\uAE30",
    className: "w-full rounded-xl"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setImage(null),
    "aria-label": "\uC774\uBBF8\uC9C0 \uC81C\uAC70",
    className: "absolute top-0 right-0 w-11 h-11 flex items-center justify-center text-white text-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-full bg-black/50 flex items-center justify-center",
    "aria-hidden": "true"
  }, "\xD7"))) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => fileRef.current.click(),
    className: "border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl py-5 text-center text-slate-400 hover:border-teal-400 hover:text-teal-500 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl mb-1",
    "aria-hidden": "true"
  }, "\uD83D\uDDBC\uFE0F"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, "\uC0AC\uC9C4 \uCCA8\uBD80")), /*#__PURE__*/React.createElement("button", {
    onClick: () => camRef.current.click(),
    className: "border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl py-5 text-center text-slate-400 hover:border-teal-400 hover:text-teal-500 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl mb-1",
    "aria-hidden": "true"
  }, "\uD83D\uDCF7"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, "\uC0AC\uC9C4 \uCD2C\uC601"))), /*#__PURE__*/React.createElement(Btn, {
    onClick: save,
    disabled: busy,
    className: "w-full"
  }, busy ? "저장 중..." : letter ? "수정 저장" : "편지 남기기")));
};

/* ========================================================================
   22-d. 🏅 메달 (성과 배지)
   ======================================================================== */
const MedalGrid = ({
  u
}) => {
  const s = medalStats(u);
  return /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2",
    role: "list",
    "aria-label": `메달 · 접속 ${s.login}일 · 편지 ${s.letter}회`
  }, MEDALS.map(m => {
    const val = s[m.type];
    const got = val >= m.goal;
    const pct = Math.min(100, Math.round(val / m.goal * 100));
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      role: "listitem",
      className: `rounded-xl p-2 text-center border ${got ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" : "bg-slate-50 border-slate-100 dark:bg-slate-700/40 dark:border-slate-700"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl",
      "aria-hidden": "true",
      style: got ? {} : {
        filter: "grayscale(1)",
        opacity: 0.45
      }
    }, m.icon), /*#__PURE__*/React.createElement("p", {
      className: "text-[12px] font-medium text-slate-700 dark:text-slate-200 mt-0.5 leading-tight"
    }, m.name), /*#__PURE__*/React.createElement("p", {
      className: "text-[12px] text-slate-400"
    }, m.desc), /*#__PURE__*/React.createElement("div", {
      className: "h-1 bg-slate-200 dark:bg-slate-600 rounded mt-1 overflow-hidden",
      role: "progressbar",
      "aria-label": `${m.name} 진행`,
      "aria-valuemin": 0,
      "aria-valuemax": m.goal,
      "aria-valuenow": Math.min(val, m.goal)
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-full bg-amber-400",
      style: {
        width: pct + "%"
      }
    })), /*#__PURE__*/React.createElement("p", {
      className: "text-[12px] text-slate-400 mt-0.5"
    }, Math.min(val, m.goal), "/", m.goal));
  }));
};
// 새 메달 획득 시 축하 토스트 (모든 역할 공통)
const MedalWatcher = () => {
  const {
    profile
  } = useAuth();
  const toast = useToast();
  const seen = useRef(null);
  useEffect(() => {
    if (!profile) return;
    const ids = earnedMedals(profile).map(m => m.id);
    if (seen.current === null) {
      seen.current = new Set(ids);
      return;
    } // 최초 진입 시엔 알림 안 함
    earnedMedals(profile).forEach(m => {
      if (!seen.current.has(m.id)) toast(`🎉 새 메달 획득! ${m.icon} ${m.name}`, "success");
    });
    seen.current = new Set(ids);
  }, [profile && (profile.loginDays || []).length, profile && profile.letterCount]);
  return null;
};
const MyMedals = () => {
  const {
    profile
  } = useAuth();
  const s = medalStats(profile);
  return /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "\uD83C\uDFC5 \uB0B4 \uBA54\uB2EC"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400"
  }, "\uC811\uC18D ", s.login, "\uC77C \xB7 \uD3B8\uC9C0 ", s.letter, "\uD68C")), /*#__PURE__*/React.createElement(MedalGrid, {
    u: profile
  }));
};

// 사용자별 현황 (접속기록 + 활동기록)
const UserStatusModal = ({
  open,
  onClose,
  u
}) => {
  const [recs, setRecs] = useState(null);
  const [photoN, setPhotoN] = useState(0);
  useEffect(() => {
    if (!open || !u) return;
    setRecs(null);
    setPhotoN(0);
    Promise.all([COL.records().where("createdBy", "==", u.uid).limit(300).get(), COL.photos().where("uploadedBy", "==", u.uid).limit(300).get()]).then(([rs, ps]) => {
      setRecs(rs.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setPhotoN(ps.size);
    }).catch(() => setRecs([]));
  }, [open, u && u.uid]);
  if (!u) return null;
  const cnt = t => (recs || []).filter(r => r.type === t).length;
  const recentDays = (u.loginDays || []).slice().sort().reverse().slice(0, 14);
  const recent = [...(recs || [])].sort((a, b) => toDate(b.createdAt || b.at) - toDate(a.createdAt || a.at)).slice(0, 12);
  const TLABEL = {
    feeding: "🍼 수유",
    sleep: "😴 수면",
    diaper: "👶 기저귀",
    pump: "🤱 유축",
    solid: "🥣 이유식",
    med: "💊 투약",
    growth: "📏 성장",
    health: "🩺 건강",
    milestone: "📖 다이어리",
    letter: "💌 편지",
    prenatal: "🔬 초음파"
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: `${u.name} 현황`
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, u.email, " \xB7 ", roleLabel(u.role))), /*#__PURE__*/React.createElement(MedalGrid, {
    u: u
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200 mb-1"
  }, "\uD83D\uDDD3\uFE0F \uC811\uC18D \uAE30\uB85D \xB7 \uCD1D ", (u.loginDays || []).length, "\uC77C"), recentDays.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "\uAE30\uB85D \uC5C6\uC74C") : /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, recentDays.map(d => /*#__PURE__*/React.createElement("span", {
    key: d,
    className: "text-[12px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded px-1.5 py-0.5"
  }, d.slice(5))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200 mb-1"
  }, "\uD83D\uDCCA \uD65C\uB3D9 \uAE30\uB85D"), recs == null ? /*#__PURE__*/React.createElement(Spinner, null) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-2 text-center"
  }, [["feeding", "수유"], ["sleep", "수면"], ["diaper", "기저귀"], ["pump", "유축"], ["solid", "이유식"], ["med", "투약"], ["growth", "성장"], ["health", "건강"], ["milestone", "다이어리"], ["letter", "편지"]].map(([t, l]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    className: "bg-slate-50 dark:bg-slate-700/40 rounded-lg py-1.5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200"
  }, t === "letter" ? u.letterCount || cnt("letter") : cnt(t)), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 dark:bg-slate-700/40 rounded-lg py-1.5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200"
  }, photoN), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "\uC0AC\uC9C4"))), recent.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "mt-3 divide-y divide-slate-100 dark:divide-slate-700"
  }, recent.map(r => /*#__PURE__*/React.createElement("li", {
    key: r.id,
    className: "flex items-center justify-between py-1.5 text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600 dark:text-slate-300"
  }, TLABEL[r.type] || r.type), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400"
  }, fmtDateTime(r.createdAt || r.at)))))))));
};

/* ========================================================================
   23. 설정 탭 (관리자 계정 관리 + 아기 정보)
   ======================================================================== */
/* 새 버전이 준비되면 위에 띄우는 배너 — 사용자가 설정을 뒤지지 않아도 되게 */
const UpdateBanner = () => {
  const [ready, setReady] = useState(!!window.__swWaiting);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const on = () => setReady(true);
    window.addEventListener("toto:update-ready", on);
    return () => window.removeEventListener("toto:update-ready", on);
  }, []);
  if (!ready) return null;
  const apply = () => {
    setBusy(true);
    try {
      if (window.__swWaiting) window.__swWaiting.postMessage({
        type: "SKIP_WAITING"
      });else location.reload();
    } catch (e) {
      location.reload();
    }
    // 혹시 신호가 먹히지 않으면 직접 새로고침
    setTimeout(() => location.reload(), 2500);
  };
  return /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed left-0 right-0 z-[150] px-4",
    style: {
      top: "calc(env(safe-area-inset-top) + 10px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[430px] mx-auto flex items-center gap-3 rounded-2xl bg-slate-900/95 text-white px-4 py-3 shadow-lg backdrop-blur"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm flex-1"
  }, "\uC0C8 \uBC84\uC804\uC774 \uC788\uC2B5\uB2C8\uB2E4"), /*#__PURE__*/React.createElement("button", {
    onClick: apply,
    disabled: busy,
    className: "text-sm font-bold bg-teal-400 text-slate-900 rounded-xl px-3.5 min-h-[44px] disabled:opacity-60"
  }, busy ? "적용 중…" : "업데이트"))));
};

/* ── DB 연결 배너 ──────────────────────────────────────────────────
   조회가 하나라도 실패해 있으면 머리글 아래에 띄운다. 오프라인이면 그
   말을 하고, 연결되면 자동으로 다시 조회한다. 로그인 만료는 "다시 시도"
   로 안 풀리므로 로그아웃 버튼을 준다. */
const DbHealthBanner = () => {
  const {
    failedCount,
    lastError
  } = useDbHealth();
  const online = useOnline();
  if (failedCount === 0 && online) return null;
  const expired = failedCount > 0 && isAuthExpired(lastError);
  const text = !online ? "오프라인이에요. 연결되면 다시 불러올게요." : expired ? "로그인이 만료됐어요. 다시 로그인해 주세요." : "서버에 연결하지 못했어요. 보이는 기록이 전부가 아닐 수 있어요.";
  return /*#__PURE__*/React.createElement("div", {
    role: "alert",
    className: "shrink-0 px-4 pt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[430px] mx-auto flex items-center gap-3 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-2.5 text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, online ? "⚠️" : "📴"), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 leading-snug"
  }, text), online && (expired ? /*#__PURE__*/React.createElement("button", {
    onClick: () => signOutApp(),
    className: "font-bold text-amber-700 dark:text-amber-200 min-h-[44px] px-2 -mr-2 shrink-0"
  }, "\uB85C\uADF8\uC544\uC6C3") : /*#__PURE__*/React.createElement("button", {
    onClick: () => dbHealth.retry(),
    className: "font-bold text-amber-700 dark:text-amber-200 min-h-[44px] px-2 -mr-2 shrink-0"
  }, "\uB2E4\uC2DC \uC2DC\uB3C4"))));
};

/* ========================================================================
   D-day 위젯 — Scriptable 코드와 전체화면 링크를 우리 아기 값으로 만들어 준다
   ======================================================================== */
/* 아이폰에서 Supabase SQL 편집기에 긴 SQL 을 붙여넣으면 사파리가 버벅여
   아예 안 들어간다. GitHub 을 열어 텍스트를 선택하는 것도 고생이다.
   그래서 조각을 앱 안에 두고 한 번 눌러 복사하게 한다.
   SQL 자체는 공개 저장소에 있는 것과 같고 비밀값이 아니다. */
const SQL_DONE_KEY = "toto-sql-done";
const DbFixCard = () => {
  const toast = useToast();
  const pack = typeof window !== "undefined" && window.TotoSQL || null;
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(null); // 클립보드가 막혔을 때 보여줄 조각
  const [done, setDone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SQL_DONE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  });

  /* 적용 상태: null=확인중 · true=적용됨 · false=아직 · "unknown"=확인 실패
     '복사 버튼을 눌렀는지' 로 판단하면, 다른 기기에서 적용했을 때 거짓말을
     한다. 그래서 그 함수가 DB 에 있는지 직접 불러본다. */
  const [applied, setApplied] = useState({
    s004: null,
    s005: null
  });
  useEffect(() => {
    let alive = true;
    const probe = async (fn, args) => {
      try {
        const {
          error
        } = await sb.rpc(fn, args);
        if (!error) return true;
        const m = (error.message || "") + " " + (error.code || "");
        // 함수가 없을 때 PostgREST 는 PGRST202 / "Could not find the function" 로 답한다
        if (/PGRST202|could not find the function|does not exist/i.test(m)) return false;
        return "unknown"; // 권한·네트워크 문제는 '아직'이라고 단정하지 않는다
      } catch (e) {
        return "unknown";
      }
    };
    (async () => {
      const [s004, s005] = await Promise.all([probe("invite_code_exists", {
        p_code: ""
      }), probe("can_read_media_path", {
        p: ""
      })]);
      if (alive) setApplied({
        s004,
        s005
      });
    })();
    return () => {
      alive = false;
    };
  }, []);
  if (!pack || !pack.chunks || !pack.chunks.length) return null;
  const mark = n => {
    setDone(prev => {
      const next = prev.includes(n) ? prev : [...prev, n];
      try {
        localStorage.setItem(SQL_DONE_KEY, JSON.stringify(next));
      } catch (e) {/* 무시 */}
      return next;
    });
  };
  const copy = async chunk => {
    try {
      await navigator.clipboard.writeText(chunk.sql);
      mark(chunk.n);
      toast(chunk.title + " 복사했어요. Supabase 에 붙여넣고 RUN 하세요.", "success");
    } catch (e) {
      setShow(chunk);
      toast("아래 상자를 길게 눌러 전체 선택 후 복사해주세요.", "info");
    }
  };
  const checking = applied.s004 === null || applied.s005 === null;
  const bothApplied = applied.s004 === true && applied.s005 === true;
  const unknown = !checking && !bothApplied && applied.s004 !== false && applied.s005 !== false;
  return /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "\uD83D\uDEE0 DB \uBCF4\uC548 \uC218\uC815"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 mt-0.5 leading-relaxed"
  }, "\uC544\uC9C1 \uC801\uC6A9\uD558\uC9C0 \uC54A\uC740 \uBCF4\uC548 \uC218\uC815 \uB450 \uAC00\uC9C0\uAC00 \uC788\uC5B4\uC694. \uC870\uAC01\uC744 \uD558\uB098\uC529 \uBCF5\uC0AC\uD574 Supabase SQL \uD3B8\uC9D1\uAE30\uC5D0 \uBD99\uC5EC\uB123\uACE0 RUN \uD558\uBA74 \uB429\uB2C8\uB2E4. \uC5EC\uB7EC \uBC88 \uB20C\uB7EC\uB3C4, \uC911\uAC04\uC5D0 \uB04A\uACA8\uB3C4 \uC548\uC804\uD569\uB2C8\uB2E4.")), checking ? /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl p-2.5"
  }, "\uC801\uC6A9\uB410\uB294\uC9C0 DB \uC5D0 \uD655\uC778\uD558\uB294 \uC911\u2026") : bothApplied ? /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 rounded-xl p-2.5 leading-relaxed"
  }, "\u2705 ", /*#__PURE__*/React.createElement("b", null, "\uB450 \uAC00\uC9C0 \uBAA8\uB450 \uC801\uC6A9\uB3FC \uC788\uC5B4\uC694."), " \uB354 \uD558\uC2E4 \uC77C\uC740 \uC5C6\uC2B5\uB2C8\uB2E4.", /*#__PURE__*/React.createElement("br", null), "\uC61B \uC0AC\uC9C4 \uACBD\uB85C\uAC00 \uAC00\uC871\uBCC4\uB85C \uB098\uB258\uC5C8\uACE0, \uCD08\uB300\uCF54\uB4DC\uB97C \uD2C0\uB9AC\uBA74 \uAC00\uC785\uC774 \uB9C9\uD799\uB2C8\uB2E4.") : unknown ? /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 rounded-xl p-2.5 leading-relaxed"
  }, "\uC801\uC6A9\uB410\uB294\uC9C0 \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694(\uC5F0\uACB0 \uBB38\uC81C\uC77C \uC218 \uC788\uC5B4\uC694). \uC544\uB798 \uD655\uC778 \uCFFC\uB9AC\uB97C Supabase \uC5D0\uC11C \uC9C1\uC811 \uB3CC\uB824\uBCF4\uC2DC\uBA74 \uD655\uC2E4\uD569\uB2C8\uB2E4.") : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5 space-y-1.5 leading-relaxed"
  }, /*#__PURE__*/React.createElement("p", null, applied.s004 === false && applied.s005 === false ? "아직 둘 다 적용되지 않았어요." : applied.s004 === false ? "가입 보안 수정(004)이 아직 적용되지 않았어요." : "사진 권한 수정(005)이 아직 적용되지 않았어요."), applied.s004 === false && /*#__PURE__*/React.createElement("p", null, "\xB7 \uCD08\uB300\uCF54\uB4DC\uB97C \uD2C0\uB9AC\uAC8C \uC801\uACE0 \uAC00\uC785\uD558\uBA74 \uC5C9\uB6B1\uD55C \uC0C8 \uAC00\uC871\uC774 \uB9CC\uB4E4\uC5B4\uC9D1\uB2C8\uB2E4."), applied.s005 === false && /*#__PURE__*/React.createElement("p", null, "\xB7 \uB2E4\uB978 \uAC00\uC871\uC774 \uC6B0\uB9AC \uC9D1 \uC608\uC804 \uC0AC\uC9C4 \uACBD\uB85C\uB97C \uC5F4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.")), !bothApplied && /*#__PURE__*/React.createElement("a", {
    href: "https://supabase.com/dashboard/project/_/sql/new",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "block text-center py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium"
  }, "Supabase SQL \uD3B8\uC9D1\uAE30 \uC5F4\uAE30 \u2197"), /*#__PURE__*/React.createElement("div", {
    className: bothApplied ? "hidden" : "grid grid-cols-5 gap-1.5"
  }, pack.chunks.map(c => {
    const ok = done.includes(c.n);
    return /*#__PURE__*/React.createElement("button", {
      key: c.n,
      onClick: () => copy(c),
      "aria-label": c.title + " SQL 복사" + (ok ? " (복사했음)" : ""),
      className: `py-3 rounded-xl text-sm font-bold ${ok ? "bg-teal-500 text-white" : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200"}`
    }, ok ? "✓" : c.n);
  })), !bothApplied && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "1\uBC88\uBD80\uD130 \uC21C\uC11C\uB300\uB85C \uBCF5\uC0AC \u2192 \uBD99\uC5EC\uB123\uAE30 \u2192 RUN"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(v => !v),
    "aria-expanded": open,
    className: "w-full min-h-[44px] text-[12px] text-slate-500 dark:text-slate-300"
  }, open ? "접기" : bothApplied ? "그래도 SQL 을 보고 싶다면" : "한 번에 다 하기 · 직접 복사하기"), open && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => copy({
      n: 0,
      title: "전체",
      sql: pack.all
    }),
    className: "w-full py-3 rounded-xl bg-violet-400 text-white text-sm font-medium"
  }, "\uC804\uCCB4 \uD55C \uBC88\uC5D0 \uBCF5\uC0AC (\uBC84\uBC85\uC774\uBA74 \uC870\uAC01\uC73C\uB85C \uD558\uC138\uC694)"), done.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setDone([]);
      try {
        localStorage.removeItem(SQL_DONE_KEY);
      } catch (e) {}
    },
    className: "w-full py-2.5 text-[12px] text-slate-400"
  }, "\uBCF5\uC0AC \uD45C\uC2DC \uC9C0\uC6B0\uAE30")), show && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-500 dark:text-slate-300"
  }, show.title, " \u2014 \uAE38\uAC8C \uB20C\uB7EC \uC804\uCCB4 \uC120\uD0DD \uD6C4 \uBCF5\uC0AC"), /*#__PURE__*/React.createElement("textarea", {
    readOnly: true,
    value: show.sql,
    onFocus: e => e.target.select(),
    className: "w-full h-40 text-[12px] font-mono p-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      mark(show.n);
      setShow(null);
    },
    className: "w-full py-2.5 text-[12px] text-slate-500 dark:text-slate-300"
  }, "\uBCF5\uC0AC\uD588\uC5B4\uC694")));
};
const DdayWidgetCard = () => {
  const baby = useBaby();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const appUrl = location.origin + location.pathname;
  const ddayUrl = appUrl.replace(/[^/]*$/, "dday.html") + "?name=" + encodeURIComponent(baby.name || "아기") + "&due=" + encodeURIComponent(baby.dueDate || "") + "&birth=" + encodeURIComponent(baby.birthDate || "");
  const code = useMemo(() => WIDGET_SRC.split("__NAME__").join((baby.name || "아기").replace(/"/g, "")).split("__DUE__").join(baby.dueDate || "").split("__BIRTH__").join(baby.birthDate || "").split("__APPURL__").join(appUrl), [baby.name, baby.dueDate, baby.birthDate, appUrl]);
  const copy = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg, "success");
    } catch (e) {
      // 클립보드가 막힌 경우: 선택해서 직접 복사하도록 보여준다
      setOpen(true);
      toast("아래 상자를 길게 눌러 전체 선택 후 복사해주세요.", "info");
    }
  };
  const noDate = !baby.dueDate && !baby.birthDate;
  return /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "\uD83D\uDCF1 D-day \uC704\uC82F"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 mt-0.5"
  }, "\uD3F0\xB7\uD0DC\uBE14\uB9BF \uD648\uD654\uBA74\uC5D0 ", /*#__PURE__*/React.createElement("b", null, baby.name || "아기"), " D-day \uB97C \uB744\uC6C1\uB2C8\uB2E4. \uC6B0\uB9AC \uC544\uAE30 \uB0A0\uC9DC\uAC00 \uC774\uBBF8 \uCC44\uC6CC\uC838 \uC788\uC5B4\uC694.")), noDate && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5"
  }, "\u26A0\uFE0F \uC704\uCABD ", /*#__PURE__*/React.createElement("b", null, "\uC544\uAE30 \uC815\uBCF4"), "\uC5D0\uC11C \uCD9C\uC0B0\uC608\uC815\uC77C(\uB610\uB294 \uCD9C\uC0DD\uC77C)\uC744 \uBA3C\uC800 \uC785\uB825\uD574\uC8FC\uC138\uC694."), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "lavender",
    className: "text-sm py-2.5",
    onClick: () => copy(code, "복사했어요! Scriptable 에 붙여넣으세요 📋")
  }, "\uD83D\uDCCB \uC704\uC82F \uCF54\uB4DC \uBCF5\uC0AC"), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    className: "text-sm py-2.5",
    onClick: () => copy(ddayUrl, "링크를 복사했어요 🔗")
  }, "\uD83D\uDD17 \uC804\uCCB4\uD654\uBA74 \uB9C1\uD06C")), /*#__PURE__*/React.createElement("details", {
    className: "text-[12px] text-slate-500 dark:text-slate-400"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer select-none py-1 text-teal-600 dark:text-teal-400"
  }, "\uC124\uCE58 \uBC29\uBC95 \uBCF4\uAE30"), /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal pl-4 space-y-1 mt-2 leading-relaxed"
  }, /*#__PURE__*/React.createElement("li", null, "App Store \uC5D0\uC11C ", /*#__PURE__*/React.createElement("b", null, "Scriptable"), " \uC124\uCE58 (\uBB34\uB8CC)"), /*#__PURE__*/React.createElement("li", null, "\uC571 \uC5F4\uACE0 \uC624\uB978\uCABD \uC704 ", /*#__PURE__*/React.createElement("b", null, "\uFF0B"), " \u2192 \uC704\uC5D0\uC11C \uBCF5\uC0AC\uD55C \uCF54\uB4DC ", /*#__PURE__*/React.createElement("b", null, "\uBD99\uC5EC\uB123\uAE30")), /*#__PURE__*/React.createElement("li", null, "\uC67C\uCABD \uC704 \u2699\uFE0F \u2192 Name \uC5D0 ", /*#__PURE__*/React.createElement("b", null, baby.name || "아기", " D-day"), " \uC785\uB825 \u2192 Done"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "\uD648\uD654\uBA74"), " \uBE48 \uACF3 \uAE38\uAC8C \uB204\uB974\uAE30 \u2192 ", /*#__PURE__*/React.createElement("b", null, "\uFF0B"), " \u2192 Scriptable \uAC80\uC0C9"), /*#__PURE__*/React.createElement("li", null, "\uC88C\uC6B0\uB85C \uBC00\uC5B4 ", /*#__PURE__*/React.createElement("b", null, "\uC81C\uC77C \uD070 \uD06C\uAE30"), " \uC120\uD0DD \u2192 \uC704\uC82F \uCD94\uAC00"), /*#__PURE__*/React.createElement("li", null, "\uCD94\uAC00\uB41C \uC704\uC82F \uAE38\uAC8C \uB204\uB974\uAE30 \u2192 ", /*#__PURE__*/React.createElement("b", null, "\uC704\uC82F \uD3B8\uC9D1"), " \u2192 Script \uB97C \uBC29\uAE08 \uB9CC\uB4E0 \uAC83\uC73C\uB85C")), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-slate-400"
  }, "\xB7 \uC7A0\uAE08\uD654\uBA74 \uC704\uC82F\uC740 iOS \uAC00 \uD06C\uAE30\uB97C \uACE0\uC815\uD574\uC11C \uC791\uAC8C \uB098\uC635\uB2C8\uB2E4. \uD06C\uAC8C \uBCF4\uB824\uBA74 \uD648\uD654\uBA74\uC5D0 \uC62C\uB9AC\uC138\uC694.", /*#__PURE__*/React.createElement("br", null), "\xB7 \uC544\uAE30\uAC00 \uD0DC\uC5B4\uB098\uBA74 \uC571 ", /*#__PURE__*/React.createElement("b", null, "\uC544\uAE30 \uC815\uBCF4"), "\uC5D0 \uCD9C\uC0DD\uC77C\uC744 \uB123\uACE0 \uCF54\uB4DC\uB97C \uB2E4\uC2DC \uBCF5\uC0AC\uD574 \uBD99\uC5EC\uB123\uC73C\uBA74 D+ \uB85C \uBC14\uB01D\uB2C8\uB2E4.", /*#__PURE__*/React.createElement("br", null), "\xB7 ", /*#__PURE__*/React.createElement("b", null, "\uC804\uCCB4\uD654\uBA74 \uB9C1\uD06C"), "\uB294 Safari \uB85C \uC5F4\uACE0 [\uACF5\uC720 \u2192 \uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00] \uD558\uBA74 \uD654\uBA74 \uC804\uCCB4\uB97C D-day \uAC00 \uCC44\uC6C1\uB2C8\uB2E4.")), open && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "\uC544\uB798 \uC0C1\uC790\uB97C \uAE38\uAC8C \uB20C\uB7EC ", /*#__PURE__*/React.createElement("b", null, "\uC804\uCCB4 \uC120\uD0DD \u2192 \uBCF5\uC0AC"), " \uD558\uC138\uC694."), /*#__PURE__*/React.createElement("textarea", {
    readOnly: true,
    value: code,
    onFocus: e => e.target.select(),
    className: inputCls + " font-mono text-[12px] leading-snug h-40"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(false),
    className: "text-xs text-slate-400"
  }, "\uB2EB\uAE30")));
};

/* focus 가 주어지면 그 섹션만 보여준다 (더보기에서 들어온 경우).
   focus 가 없으면 예전처럼 전부 보여준다. */
const Settings = ({
  focus = null,
  dark: darkProp,
  setDark: setDarkProp
} = {}) => {
  const {
    user,
    profile,
    isAdmin
  } = useAuth();
  const show = name => !focus || focus === name;
  const toast = useToast();
  const confirm = useConfirm();
  const baby = useBaby();
  const [users, setUsers] = useState(null);
  const [babyForm, setBabyForm] = useState({
    name: baby.name,
    birthDate: baby.birthDate || "",
    dueDate: baby.dueDate || "",
    sex: baby.sex || "",
    unitsVol: baby.units && baby.units.vol || "ml"
  });
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupProg, setBackupProg] = useState(null);
  const [nickOpen, setNickOpen] = useState(false);
  const [statusUser, setStatusUser] = useState(null); // 현황보기 대상

  useEffect(() => setBabyForm({
    name: baby.name,
    birthDate: baby.birthDate || "",
    dueDate: baby.dueDate || "",
    sex: baby.sex || "",
    unitsVol: baby.units && baby.units.vol || "ml"
  }), [baby]);
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = COL.users().onSnapshot(snap => setUsers(snap.docs.map(d => ({
      uid: d.id,
      ...d.data()
    }))));
    return () => unsub();
  }, [isAdmin]);
  const saveBaby = async () => {
    try {
      const {
        unitsVol,
        ...rest
      } = babyForm;
      await COL.settings().set({
        ...rest,
        units: {
          vol: unitsVol || "ml"
        }
      }, {
        merge: true
      });
      toast("아기 정보를 저장했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  const setRole = async (u, role) => {
    try {
      await COL.users().doc(u.uid).update({
        role
      });
      toast(`${u.name}님을 ${roleLabel(role)}(으)로 변경했어요.`, "success");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  const toggleDisabled = async u => {
    // 관리자 계정은 차단 불가 (잠금 방지)
    if (u.role === "admin" && !u.disabled) {
      toast("관리자 계정은 차단할 수 없어요.", "error");
      return;
    }
    // 클라이언트 SDK로는 Auth disabled 직접 변경 불가 → Firestore 플래그로 표시(앱 차단용)
    try {
      await COL.users().doc(u.uid).update({
        disabled: !u.disabled
      });
      toast(u.disabled ? "차단 해제했어요." : "차단했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  const resetPw = async u => {
    try {
      await auth.sendPasswordResetEmail(u.email);
      toast(`${u.name}님께 재설정 메일 발송`, "success");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  const deleteUser = async u => {
    if (u.uid === user.uid) {
      toast("본인 계정은 여기서 삭제할 수 없어요.", "error");
      return;
    }
    if (!(await confirm(`'${u.name}' (${u.email}) 계정을 삭제할까요?\n앱 목록에서 제거됩니다. (로그인 자체는 Firebase 콘솔에서 삭제)`, {
      ok: "삭제"
    }))) return;
    try {
      await COL.users().doc(u.uid).delete();
      toast("계정을 삭제했어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  const approveUser = async (u, role) => {
    try {
      await COL.users().doc(u.uid).update({
        approved: true,
        disabled: false,
        role: role || u.role || "viewer"
      });
      toast(`${u.name}님을 승인했어요.`, "success");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  // 데이터 내보내기/백업
  const download = (content, filename, mime) => {
    const blob = new Blob([content], {
      type: mime
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const fetchAllRecords = async () => {
    const snap = await COL.records().limit(3000).get();
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })).sort((a, b) => toDate(a.at) - toDate(b.at));
  };
  const detailOf = r => {
    switch (r.type) {
      case "feeding":
        return `${{
          breast: "모유",
          formula: "분유",
          mixed: "혼합"
        }[r.kind] || ""}${r.side ? "/" + {
          left: "왼쪽",
          right: "오른쪽",
          both: "양쪽"
        }[r.side] : ""}${r.amount ? " " + r.amount + "ml" : ""}${r.durationMin ? " " + r.durationMin + "분" : ""}`;
      case "sleep":
        return `${r.naptype === "night" ? "밤잠" : "낮잠"} ${r.durationMin ? Math.min(1440, r.durationMin) + "분" : ""}`;
      case "diaper":
        return {
          pee: "소변",
          poo: "대변",
          both: "소변+대변"
        }[r.diaperType] || "";
      case "pump":
        return `${{
          left: "왼쪽",
          right: "오른쪽",
          both: "양쪽"
        }[r.side] || ""}${r.amount ? " " + r.amount + "ml" : ""}`;
      case "solid":
        return `${r.food || ""}${r.amount ? " " + r.amount : ""}${r.reaction && r.reaction !== "none" ? " [반응:" + r.reaction + "]" : ""}`;
      case "med":
        return `${r.name || ""}${r.dose ? " " + r.dose : ""}`;
      case "growth":
        return `${r.height ? "키" + r.height + "cm " : ""}${r.weight ? "몸무게" + r.weight + "kg " : ""}${r.head ? "머리" + r.head + "cm" : ""}`;
      case "health":
        return `${r.temp ? r.temp + "℃ " : ""}${r.symptom || ""} ${r.hospital || ""}`.trim();
      case "milestone":
        return `${r.title || ""} ${r.note || ""}`.trim();
      case "letter":
        return `${r.title || ""}`;
      case "memo":
        return r.text || "";
      default:
        return "";
    }
  };
  const exportCSV = async () => {
    try {
      const recs = await fetchAllRecords();
      const rows = [["종류", "날짜", "시간", "입력자", "상세"]];
      recs.forEach(r => {
        const d = toDate(r.at);
        rows.push([REC_LABEL[r.type] || r.type, d ? ymd(d) : "", d ? fmtTime(d) : "", r.creatorName || "", detailOf(r).replace(/[\n,]/g, " ")]);
      });
      const csv = "﻿" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      download(csv, `아기수첩_${ymd(new Date())}.csv`, "text/csv;charset=utf-8");
      toast("CSV로 내보냈어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  /* 사진 한 장의 원본을 받아 base64 로 만든다 (Storage → data URL) */
  const fetchPhotoData = async p => {
    const path = p.storagePath || p.previewPath || p.thumbPath;
    if (!path) return null;
    // fetchSigned 는 주소가 만료되면 한 번 새로 받아 다시 시도한다.
    // 사진이 많아 백업이 오래 걸리면 도중에 만료되기 때문이다.
    const res = await fetchSigned(path);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error("읽기 실패"));
      fr.readAsDataURL(blob);
    });
  };
  const backupJSON = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupProg({
      label: "준비 중",
      done: 0,
      total: 0
    });
    try {
      const [recs, photoSnap, userSnap, albumSnap] = await Promise.all([fetchAllRecords(), COL.photos().limit(3000).get(), COL.users().get().catch(() => ({
        docs: []
      })), COL.albums().limit(200).get().catch(() => ({
        docs: []
      }))]);
      const metas = photoSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => toDate(a.createdAt) - toDate(b.createdAt));
      const users = userSnap.docs.map(d => ({
        uid: d.id,
        ...d.data()
      }));
      const albums = albumSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // 사진 원본을 하나씩 받아 담는다 (이게 없으면 복원할 때 사진이 사라진다)
      const photos = [];
      const failed = [];
      for (let i = 0; i < metas.length; i++) {
        setBackupProg({
          label: "사진 담는 중",
          done: i,
          total: metas.length
        });
        const p = metas[i];
        try {
          const dataUrl = await fetchPhotoData(p);
          if (dataUrl) photos.push({
            ...p,
            url: dataUrl
          });else failed.push(p.id);
        } catch (e) {
          failed.push(p.id);
        }
      }
      setBackupProg({
        label: "파일 만드는 중",
        done: metas.length,
        total: metas.length
      });
      const data = {
        exportedAt: new Date().toISOString(),
        version: 3,
        baby,
        records: recs,
        photos,
        users,
        albums,
        summary: {
          records: recs.length,
          photos: photos.length,
          photosExpected: metas.length,
          albums: albums.length,
          users: users.length,
          failedPhotoIds: failed
        }
      };
      const json = JSON.stringify(data);
      download(json, `또또백업_${ymd(new Date())}.json`, "application/json");

      // 무결성 확인 — 담긴 수가 DB 수와 맞는지 비교해서 그대로 알려준다
      const mb = (json.length / 1048576).toFixed(1);
      if (failed.length) {
        toast(`⚠️ 사진 ${photos.length}/${metas.length}장만 담겼어요. ${failed.length}장 실패 — 다시 시도해주세요.`, "error");
      } else {
        toast(`백업 완료 · 기록 ${recs.length}건 · 사진 ${photos.length}/${metas.length}장 · 앨범 ${albums.length}개 (${mb}MB)`, "success");
      }
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBackupBusy(false);
      setBackupProg(null);
    }
  };
  const printSummary = async () => {
    try {
      const recs = await fetchAllRecords();
      const rowsHtml = recs.slice(-500).reverse().map(r => {
        const d = toDate(r.at);
        return `<tr><td>${REC_LABEL[r.type] || r.type}</td><td>${d ? ymd(d) + " " + fmtTime(d) : ""}</td><td>${r.creatorName || ""}</td><td>${detailOf(r)}</td></tr>`;
      }).join("");
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>아기수첩 기록</title><style>body{font-family:sans-serif;padding:16px}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f1f5f9}</style></head><body><h1>🍼 ${baby.name} 육아 기록 (${ymd(new Date())})</h1><table><thead><tr><th>종류</th><th>일시</th><th>입력자</th><th>상세</th></tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>`;
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
      } else toast("팝업이 차단됐어요. 허용해주세요.", "error");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-4 pb-safe"
  }, show("settings") && /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white mb-2"
  }, "\uB0B4 \uACC4\uC815"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNickOpen(true),
    className: "text-xs px-3 min-h-[44px] rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
  }, "\u270F\uFE0F \uB2C9\uB124\uC784 \uBCC0\uACBD")), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 dark:text-slate-200"
  }, /*#__PURE__*/React.createElement("b", null, profile && profile.name), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400"
  }, "(\uB2C9\uB124\uC784)")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-0.5"
  }, user.email), /*#__PURE__*/React.createElement("span", {
    className: `inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full ${isAdmin ? "bg-violet-100 text-violet-600 dark:bg-violet-900/40" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`
  }, isAdmin ? "관리자" : roleLabel(profile && profile.role))), /*#__PURE__*/React.createElement(NicknameModal, {
    open: nickOpen,
    onClose: () => setNickOpen(false)
  }), !focus && /*#__PURE__*/React.createElement(MyMedals, null), show("baby") && /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "\uC544\uAE30 \uC815\uBCF4 ", isAdmin ? "" : "(관리자만 수정)"), /*#__PURE__*/React.createElement(Field, {
    label: "\uC774\uB984"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls,
    value: babyForm.name,
    disabled: !isAdmin,
    onChange: e => setBabyForm({
      ...babyForm,
      name: e.target.value
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uCD9C\uC0B0 \uC608\uC815\uC77C"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls + " w-full",
    type: "date",
    value: babyForm.dueDate,
    disabled: !isAdmin,
    onChange: e => setBabyForm({
      ...babyForm,
      dueDate: e.target.value
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\uCD9C\uC0DD\uC77C (\uD0DC\uC5B4\uB09C \uB4A4 \uC785\uB825)"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls + " w-full",
    type: "date",
    value: babyForm.birthDate,
    disabled: !isAdmin,
    onChange: e => setBabyForm({
      ...babyForm,
      birthDate: e.target.value
    })
  })), isAdmin ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uC131\uBCC4 (WHO \uC131\uC7A5\uACE1\uC120\uC6A9)",
    value: babyForm.sex,
    onChange: v => setBabyForm({
      ...babyForm,
      sex: v
    }),
    options: [{
      value: "male",
      label: "👦 남아"
    }, {
      value: "female",
      label: "👧 여아"
    }]
  }), /*#__PURE__*/React.createElement(ChipGroup, {
    label: "\uC218\uC720\uB7C9 \uB2E8\uC704",
    value: babyForm.unitsVol,
    onChange: v => setBabyForm({
      ...babyForm,
      unitsVol: v
    }),
    options: [{
      value: "ml",
      label: "ml"
    }, {
      value: "oz",
      label: "oz (온스)"
    }]
  })) : /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-500 dark:text-slate-400"
  }, "\uC131\uBCC4: ", babyForm.sex === "male" ? "남아" : babyForm.sex === "female" ? "여아" : "미설정", " \xB7 \uC218\uC720\uB7C9: ", babyForm.unitsVol), isAdmin && /*#__PURE__*/React.createElement(Btn, {
    onClick: saveBaby,
    className: "w-full"
  }, "\uC800\uC7A5")), isAdmin && show("backup") && /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "\uB370\uC774\uD130 \uB0B4\uBCF4\uB0B4\uAE30"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "\uC18C\uC544\uACFC \uC9C4\uB8CC\xB7\uAE30\uB85D \uBCF4\uAD00\uC6A9\uC73C\uB85C \uB0B4\uBCF4\uB0BC \uC218 \uC788\uC5B4\uC694."), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: exportCSV,
    className: "text-sm py-2.5"
  }, "\uD83D\uDCC4 CSV"), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: printSummary,
    className: "text-sm py-2.5"
  }, "\uD83D\uDDA8\uFE0F \uC778\uC1C4/PDF"), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: backupJSON,
    disabled: backupBusy,
    className: "text-sm py-2.5"
  }, backupBusy ? "백업 중…" : "💾 백업"), isAdmin && /*#__PURE__*/React.createElement(Btn, {
    variant: "lavender",
    onClick: () => setImportOpen(true),
    className: "text-sm py-2.5"
  }, "\uD83D\uDCE5 \uAC00\uC838\uC624\uAE30")), backupProg && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 space-y-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500"
  }, backupProg.label, " ", backupProg.total ? `${backupProg.done} / ${backupProg.total}` : ""), /*#__PURE__*/React.createElement("div", {
    className: "h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-teal-500 transition-all",
    style: {
      width: `${backupProg.total ? backupProg.done / backupProg.total * 100 : 5}%`
    }
  }))), isAdmin && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 mt-2"
  }, "\uD83D\uDCE5 \uAC00\uC838\uC624\uAE30 \u2014 \uBC31\uC5C5(JSON)\uC744 \uC774\uACF3\uC73C\uB85C \uB418\uC0B4\uB9BD\uB2C8\uB2E4. \uBC31\uC5C5\uC5D0\uB294 \uC0AC\uC9C4 \uC6D0\uBCF8\uC774 \uD568\uAED8 \uB2F4\uAE41\uB2C8\uB2E4.")), /*#__PURE__*/React.createElement(ImportModal, {
    open: importOpen,
    onClose: () => setImportOpen(false)
  }), isAdmin && show("dbfix") && /*#__PURE__*/React.createElement(DbFixCard, null), show("widget") && /*#__PURE__*/React.createElement(DdayWidgetCard, null), show("settings") && /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-600 dark:text-slate-300"
  }, "\uC571 \uBC84\uC804"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-teal-600 dark:text-teal-400"
  }, APP_VERSION)), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400"
  }, "\uD654\uBA74\uC774 \uC608\uC804 \uADF8\uB300\uB85C\uBA74 \uC544\uB798 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC800\uC7A5\uB41C \uD654\uBA74\uC744 \uC9C0\uC6B0\uACE0 \uC0C8\uB85C \uBC1B\uC544\uC624\uC138\uC694."), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    className: "w-full text-sm py-2.5",
    onClick: async () => {
      try {
        if (window.caches) {
          const ks = await caches.keys();
          await Promise.all(ks.map(k => caches.delete(k)));
        }
        if (navigator.serviceWorker) {
          const rs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(rs.map(r => r.unregister()));
        }
      } catch (e) {/* 무시 */}
      location.reload(true);
    }
  }, "\uD83D\uDD04 \uCD5C\uC2E0\uC73C\uB85C \uC0C8\uB85C\uACE0\uCE68")), isAdmin && show("family") && /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-slate-800 dark:text-white"
  }, "\uACC4\uC815 \uAD00\uB9AC ", /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-normal text-slate-400"
  }, "(\uCD1D\uAD00\uB9AC\uC790=\uC5C4\uB9C8\xB7\uC544\uBE60)")), /*#__PURE__*/React.createElement(Btn, {
    onClick: () => setAddOpen(true),
    className: "text-sm py-2 px-3"
  }, "\uD83D\uDC8C \uAC00\uC871 \uCD08\uB300")), !users ? /*#__PURE__*/React.createElement(Spinner, null) : /*#__PURE__*/React.createElement("ul", {
    className: "space-y-2"
  }, [...users].sort((a, b) => (a.approved === false ? -1 : 1) - (b.approved === false ? -1 : 1)).map(u => {
    const pending = u.approved === false && u.role !== "admin";
    return /*#__PURE__*/React.createElement("li", {
      key: u.uid,
      className: `border rounded-xl p-3 ${pending ? "border-amber-300 bg-amber-50/50 dark:bg-amber-900/20" : "border-slate-100 dark:border-slate-700"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-medium text-slate-800 dark:text-white truncate"
    }, u.name, " ", u.uid === user.uid && /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] text-teal-500"
    }, "(\uB098)"), " ", u.disabled && /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-rose-400"
    }, "(\uCC28\uB2E8\uB428)")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-400 truncate"
    }, u.email, " ", /*#__PURE__*/React.createElement("span", {
      className: "text-slate-300"
    }, "#", (u.uid || "").slice(-4)))), /*#__PURE__*/React.createElement("span", {
      className: `text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${pending ? "bg-amber-200 text-amber-700" : u.role === "admin" ? "bg-violet-100 text-violet-600 dark:bg-violet-900/40" : u.role === "viewer" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`
    }, pending ? "승인대기" : roleLabel(u.role))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mt-1"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[12px] text-slate-400"
    }, "\uD83C\uDFC5 \uC811\uC18D ", medalStats(u).login, "\uC77C \xB7 \u270D\uFE0F \uD3B8\uC9C0 ", medalStats(u).letter, "\uD68C \xB7 ", earnedMedals(u).map(m => m.icon).join(" ") || "메달 없음"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setStatusUser(u),
      className: "text-[12px] text-teal-600 dark:text-teal-400 whitespace-nowrap shrink-0 min-h-[44px] px-2 -mr-2"
    }, "\uD604\uD669\uBCF4\uAE30 \u203A")), pending ? /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5 mt-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => approveUser(u, "viewer"),
      className: "text-xs px-3 min-h-[44px] rounded-lg bg-teal-500 text-white font-medium"
    }, "\u2713 \uAD00\uB78C\uC804\uC6A9 \uC2B9\uC778"), /*#__PURE__*/React.createElement("button", {
      onClick: () => approveUser(u, "member"),
      className: "text-xs px-3 min-h-[44px] rounded-lg bg-violet-400 text-white font-medium"
    }, "\u2713 \uAD6C\uC131\uC6D0 \uC2B9\uC778"), /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleDisabled(u),
      className: "text-xs px-3 min-h-[44px] rounded-lg bg-amber-100 text-amber-600"
    }, "\uAC70\uC808(\uCC28\uB2E8)"), u.uid !== user.uid && /*#__PURE__*/React.createElement("button", {
      onClick: () => deleteUser(u),
      className: "text-xs px-3 min-h-[44px] rounded-lg bg-rose-100 text-rose-600"
    }, "\uD83D\uDDD1\uFE0F \uC0AD\uC81C")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "mt-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block text-[12px] text-slate-400 mb-1"
    }, "\uB4F1\uAE09"), u.role === "admin" ? /*#__PURE__*/React.createElement("span", {
      className: "inline-block text-xs px-3 py-1.5 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40"
    }, "\uD83D\uDC51 \uAD00\uB9AC\uC790 (\uACE0\uC815)") : /*#__PURE__*/React.createElement("div", {
      className: "flex gap-1.5"
    }, ["viewer", "member", "admin"].map(r => /*#__PURE__*/React.createElement("button", {
      key: r,
      onClick: () => setRole(u, r),
      className: `text-xs px-3 min-h-[44px] rounded-lg border ${u.role === r ? "bg-teal-500 border-teal-500 text-white" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"}`
    }, roleLabel(r))))), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5 mt-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => resetPw(u),
      className: "text-xs px-3 min-h-[44px] rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
    }, "\uBE44\uBC88 \uC7AC\uC124\uC815"), (u.role !== "admin" || u.disabled) && /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleDisabled(u),
      className: "text-xs px-3 min-h-[44px] rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
    }, u.disabled ? "차단 해제" : "차단"), u.uid !== user.uid && /*#__PURE__*/React.createElement("button", {
      onClick: () => deleteUser(u),
      className: "text-xs px-3 min-h-[44px] rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/40"
    }, "\uD83D\uDDD1\uFE0F \uC0AD\uC81C"))));
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 leading-relaxed"
  }, "\u203B \uACC4\uC815 ", /*#__PURE__*/React.createElement("b", null, "\uC644\uC804 \uC0AD\uC81C"), "\uC640 Auth ", /*#__PURE__*/React.createElement("b", null, "disabled"), " \uCC98\uB9AC\uB294 \uBCF4\uC548\uC0C1 \uD074\uB77C\uC774\uC5B8\uD2B8 SDK\uC5D0\uC11C \uBD88\uAC00\uD569\uB2C8\uB2E4. \uC2E4\uC81C \uBE44\uD65C\uC131\uD654/\uC0AD\uC81C\uB294 Firebase \uCF58\uC194 \uB610\uB294 Admin SDK(\uC11C\uBC84)\uC5D0\uC11C \uC218\uD589\uD558\uC138\uC694. \uC5EC\uAE30\uC11C\uB294 \uC571 \uC811\uADFC \uCC28\uB2E8\uC6A9 \uD50C\uB798\uADF8\uB9CC \uC124\uC815\uB429\uB2C8\uB2E4.")), /*#__PURE__*/React.createElement(AddAccountModal, {
    open: addOpen,
    onClose: () => setAddOpen(false)
  }), /*#__PURE__*/React.createElement(UserStatusModal, {
    open: !!statusUser,
    onClose: () => setStatusUser(null),
    u: statusUser
  }));
};

// 가족 초대 모달
//  Supabase 는 클라이언트에서 남의 계정을 만들 수 없습니다(세션이 바뀜).
//  대신 가족이 직접 가입하고 관리자가 승인하는 흐름을 씁니다.
const AddAccountModal = ({
  open,
  onClose
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const url = location.origin + location.pathname;
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    sb.rpc("my_invite_code").then(({
      data
    }) => setCode(data || null)).catch(() => setCode(null));
  }, [open]);
  const reset = async () => {
    if (!(await confirm("초대코드를 새로 만들까요?\n예전 코드는 더 이상 쓸 수 없게 됩니다.", {
      ok: "새로 만들기",
      variant: "primary"
    }))) return;
    setBusy(true);
    try {
      const {
        data,
        error
      } = await sb.rpc("reset_invite_code");
      if (error) throw error;
      setCode(data);
      toast("새 초대코드를 만들었어요.", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const msg = `또또 가족 앱에 초대합니다 👶\n\n${url}\n\n1) 위 주소 열고 [가입하기]\n2) 초대코드 입력: ${code || "(코드를 받아주세요)"}\n3) 이메일·비밀번호 정하고 가입\n\n가입 후 제가 승인하면 바로 사진을 보실 수 있어요.`;
  const copy = async t => {
    try {
      await navigator.clipboard.writeText(t);
      toast("복사했어요. 붙여넣기 하세요!", "success");
    } catch (e) {
      toast("복사가 안 되면 주소를 길게 눌러 복사해주세요.", "error");
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "또또 가족 앱",
          text: msg
        });
        return;
      } catch (e) {/* 취소 */}
    }
    copy(msg);
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: "\uAC00\uC871 \uCD08\uB300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-teal-700 dark:text-teal-300 mb-1"
  }, "\uCD08\uB300\uB294 3\uB2E8\uACC4\uC608\uC694"), /*#__PURE__*/React.createElement("ol", {
    className: "text-sm text-slate-600 dark:text-slate-300 space-y-1 list-decimal pl-4"
  }, /*#__PURE__*/React.createElement("li", null, "\uC544\uB798 \uBC84\uD2BC\uC73C\uB85C \uC8FC\uC18C\uB97C \uBCF4\uB0B4\uC8FC\uC138\uC694"), /*#__PURE__*/React.createElement("li", null, "\uAC00\uC871\uC774 ", /*#__PURE__*/React.createElement("b", null, "\uAC00\uC785\uD558\uAE30"), " \u2192 ", /*#__PURE__*/React.createElement("b", null, "\uCD08\uB300\uCF54\uB4DC \uC785\uB825"), " \u2192 \uC774\uBA54\uC77C\xB7\uBE44\uBC00\uBC88\uD638 \uB4F1\uB85D"), /*#__PURE__*/React.createElement("li", null, "\uC5EC\uAE30 ", /*#__PURE__*/React.createElement("b", null, "\uACC4\uC815 \uAD00\uB9AC"), " \uC5D0\uC11C ", /*#__PURE__*/React.createElement("b", null, "\uC2B9\uC778"), " \uD558\uACE0 \uB4F1\uAE09 \uC9C0\uC815"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900 dark:bg-slate-950 rounded-2xl p-4 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 mb-1.5"
  }, "\uC6B0\uB9AC \uAC00\uC871 \uCD08\uB300\uCF54\uB4DC"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold tracking-[0.35em] text-teal-300 pl-[0.35em]"
  }, code || "······"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 justify-center mt-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => code && copy(code),
    disabled: !code,
    className: "text-xs px-3 min-h-[44px] rounded-lg bg-white/10 text-white disabled:opacity-40"
  }, "\uCF54\uB4DC \uBCF5\uC0AC"), /*#__PURE__*/React.createElement("button", {
    onClick: reset,
    disabled: busy,
    className: "text-xs px-3 min-h-[44px] rounded-lg bg-white/10 text-white/70 disabled:opacity-40"
  }, "\uC0C8\uB85C \uB9CC\uB4E4\uAE30"))), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 leading-relaxed -mt-1"
  }, "\uC774 \uCF54\uB4DC\uB97C \uB123\uACE0 \uAC00\uC785\uD574\uC57C ", /*#__PURE__*/React.createElement("b", null, "\uC6B0\uB9AC \uC544\uAE30"), " \uAE30\uB85D\uC5D0 \uD569\uB958\uD569\uB2C8\uB2E4. \uCF54\uB4DC \uC5C6\uC774 \uAC00\uC785\uD558\uBA74 \uADF8\uBD84\uC758 ", /*#__PURE__*/React.createElement("b", null, "\uC0C8 \uC544\uAE30 \uC218\uCCA9"), "\uC774 \uB530\uB85C \uB9CC\uB4E4\uC5B4\uC838\uC694."), /*#__PURE__*/React.createElement(Field, {
    label: "\uC571 \uC8FC\uC18C"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    className: inputCls + " flex-1 text-xs",
    value: url,
    readOnly: true,
    onFocus: e => e.target.select()
  }), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    className: "px-3 text-sm",
    onClick: () => copy(url)
  }, "\uBCF5\uC0AC"))), /*#__PURE__*/React.createElement(Btn, {
    onClick: share,
    className: "w-full"
  }, "\uD83D\uDC8C \uCD08\uB300 \uBA54\uC2DC\uC9C0 \uBCF4\uB0B4\uAE30"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-slate-400 leading-relaxed"
  }, "\uAC00\uC871\uC774 \uBE44\uBC00\uBC88\uD638\uB97C \uC9C1\uC811 \uC815\uD558\uB2C8 \uB354 \uC548\uC804\uD574\uC694. \uAC00\uC785\uD558\uBA74 ", /*#__PURE__*/React.createElement("b", null, "\uAD00\uB78C\uC804\uC6A9 \xB7 \uC2B9\uC778\uB300\uAE30"), " \uC0C1\uD0DC\uB85C \uC2DC\uC791\uD558\uACE0, \uC2B9\uC778 \uC804\uC5D0\uB294 \uC0AC\uC9C4\uC774 \uD55C \uC7A5\uB3C4 \uBCF4\uC774\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.")));
};

/* ========================================================================
   24. 하단 네비게이션
   ======================================================================== */
/* 주소창에 현재 화면을 남긴다.
   · 모바일 Safari 에서 뒤로가기가 앱을 벗어나지 않고 이전 탭으로 간다
   · 새로고침해도 보던 화면이 그대로 열린다
   예) #/records/feeding, #/gallery, #/more/saved */
const useHashRoute = (fallback = "/dashboard") => {
  const read = () => (location.hash || "#" + fallback).slice(1) || fallback;
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => setPath(read());
    window.addEventListener("hashchange", on);
    if (!location.hash) history.replaceState(null, "", "#" + fallback);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const nav = useCallback((p, {
    replace = false
  } = {}) => {
    const next = "#" + (p.startsWith("/") ? p : "/" + p);
    if (location.hash === next) {
      setPath(next.slice(1));
      return;
    }
    if (replace) {
      history.replaceState(null, "", next);
      setPath(next.slice(1));
    } else location.hash = next;
  }, []);
  const parts = path.split("/").filter(Boolean);
  return {
    path,
    nav,
    tab: parts[0] || fallback.slice(1),
    sub: parts[1] || null
  };
};

/* 하단 메뉴는 5개까지만 둔다. 430px 에서 6개는 글자가 너무 작아진다.
   나머지는 '더보기' 안으로 — 기능을 없애지는 않는다. */
const MORE_ITEMS = [{
  id: "saved",
  icon: "🔖",
  label: "저장한 사진",
  desc: "나중에 볼 사진 모음"
}, {
  id: "medals",
  icon: "🏅",
  label: "메달",
  desc: "접속·편지 기록"
}, {
  id: "family",
  icon: "👥",
  label: "가족 관리",
  desc: "승인 · 권한 · 초대",
  adminOnly: true
}, {
  id: "baby",
  icon: "👶",
  label: "아기 정보",
  desc: "이름 · 출산예정일"
}, {
  id: "widget",
  icon: "📱",
  label: "D-day 위젯",
  desc: "홈화면에 띄우기"
}, {
  id: "backup",
  icon: "💾",
  label: "데이터 백업",
  desc: "내보내기 · 가져오기",
  adminOnly: true
}, {
  id: "dbfix",
  icon: "🛠",
  label: "DB 보안 수정",
  desc: "Supabase 에 붙여넣을 SQL",
  adminOnly: true
}, {
  id: "settings",
  icon: "⚙️",
  label: "설정",
  desc: "화면 · 단위 · 계정"
}];
const MoreMenu = ({
  nav
}) => {
  const {
    isAdmin,
    profile
  } = useAuth();
  const items = MORE_ITEMS.filter(m => !m.adminOnly || isAdmin);
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-4 pb-safe"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-1"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold text-slate-800 dark:text-white"
  }, "\uB354\uBCF4\uAE30"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-0.5"
  }, profile && profile.name || "", "\uB2D8")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, items.map(m => /*#__PURE__*/React.createElement("button", {
    key: m.id,
    onClick: () => nav("/more/" + m.id),
    className: "w-full flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm active:scale-[.99] transition text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl w-9 text-center",
    "aria-hidden": "true"
  }, m.icon), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-base font-bold text-slate-800 dark:text-white"
  }, m.label), /*#__PURE__*/React.createElement("span", {
    className: "block text-sm text-slate-400 mt-0.5"
  }, m.desc)), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-300 text-lg",
    "aria-hidden": "true"
  }, "\u203A")))));
};
const BottomNav = ({
  tab,
  setTab
}) => {
  const navs = [{
    id: "dashboard",
    icon: "🏠",
    label: "홈"
  }, {
    id: "records",
    icon: "📋",
    label: "기록"
  }, {
    id: "gallery",
    icon: "🖼️",
    label: "사진"
  }, {
    id: "letters",
    icon: "💌",
    label: "편지"
  }, {
    id: "more",
    icon: "⋯",
    label: "더보기"
  }];
  return /*#__PURE__*/React.createElement("nav", {
    className: "shrink-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-t border-slate-100 dark:border-slate-700 nav-safe",
    "aria-label": "\uC8FC\uC694 \uBA54\uB274"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[430px] mx-auto flex"
  }, navs.map(n => {
    const active = tab === n.id;
    return /*#__PURE__*/React.createElement("button", {
      key: n.id,
      onClick: () => setTab(n.id),
      "aria-current": active ? "page" : undefined,
      className: `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] ${active ? "text-teal-500" : "text-slate-500 dark:text-slate-400"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[22px] leading-none",
      "aria-hidden": "true"
    }, n.icon), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-medium"
    }, n.label));
  })));
};

/* ========================================================================
   24-b. 관람전용 앱 셸 (갤러리 / 편지 / 메달)
   ======================================================================== */
const ViewerApp = ({
  dark,
  setDark
}) => {
  const [tab, setTab] = useState("gallery");
  const navs = [{
    id: "gallery",
    icon: "🖼️",
    label: "갤러리"
  }, {
    id: "letters",
    icon: "💌",
    label: "편지"
  }, {
    id: "medals",
    icon: "🏅",
    label: "메달"
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "app-shell bg-warm"
  }, /*#__PURE__*/React.createElement(Header, {
    dark: dark,
    setDark: setDark
  }), /*#__PURE__*/React.createElement(MedalWatcher, null), /*#__PURE__*/React.createElement(DbHealthBanner, null), /*#__PURE__*/React.createElement("main", {
    className: "app-main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "\uAD00\uB78C \uACC4\uC815 \xB7 \uC0AC\uC9C4 \uAC10\uC0C1 \u2764\uFE0F \xB7 \uD3B8\uC9C0 \uC791\uC131 \xB7 \uBA54\uB2EC \uC218\uC9D1\uC774 \uAC00\uB2A5\uD574\uC694")), tab === "gallery" && /*#__PURE__*/React.createElement(Gallery, {
    canUpload: false,
    openUpload: () => {}
  }), tab === "letters" && /*#__PURE__*/React.createElement(Letters, null), tab === "medals" && /*#__PURE__*/React.createElement("div", {
    className: "p-4 pb-safe"
  }, /*#__PURE__*/React.createElement(MyMedals, null))), /*#__PURE__*/React.createElement("nav", {
    className: "shrink-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-t border-slate-100 dark:border-slate-700 nav-safe",
    "aria-label": "\uC8FC\uC694 \uBA54\uB274"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[430px] mx-auto flex"
  }, navs.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    onClick: () => setTab(n.id),
    "aria-current": tab === n.id ? "page" : undefined,
    className: `flex-1 flex flex-col items-center gap-0.5 py-2.5 ${tab === n.id ? "text-teal-500" : "text-slate-400"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, n.icon), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-medium"
  }, n.label))))));
};

/* ========================================================================
   백업 가져오기 — 기존 Firebase 백업(JSON)을 Supabase 로 옮긴다.
   · 기록/설정은 그대로, 사진은 base64 를 Storage 에 업로드
   · 원래 작성자 이름(creatorName)은 보존하고 소유권만 현재 관리자에게 귀속
     (예전 계정 admin@baby.app 등은 실제 도메인이 아니라 재가입이 불가)
   ======================================================================== */
const fsTime = v => {
  if (!v) return null;
  if (typeof v === "object" && v.seconds != null) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
};
const ImportModal = ({
  open,
  onClose
}) => {
  const {
    user,
    profile,
    isAdmin
  } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const [prog, setProg] = useState(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef();
  const say = m => setLog(l => [...l, m]);
  const pick = async e => {
    const f = (e.target.files || [])[0];
    if (!f) return;
    setErr("");
    setData(null);
    setLog([]);
    setDone(false);
    try {
      const j = JSON.parse(await f.text());
      if (!j || !Array.isArray(j.records) && !Array.isArray(j.photos)) throw new Error("형식이 맞지 않아요.");
      if (!Array.isArray(j.photos)) {
        setErr("이 백업에는 사진이 없습니다(구버전). 육아수첩에서 백업을 다시 받아주세요.");
      }
      setData(j);
    } catch (ex) {
      setErr("파일을 읽지 못했어요: " + (ex.message || ex));
    }
  };
  const run = async () => {
    if (!data || !user) return;
    setBusy(true);
    setLog([]);
    setDone(false);
    let okR = 0,
      okP = 0,
      skip = 0,
      bad = 0;
    try {
      // 1) 아기 설정 — 실패해도 기록·사진 가져오기는 계속한다
      if (data.baby) {
        try {
          const bb = {
            ...data.baby
          };
          delete bb.units;
          await COL.settings().set(bb, {
            merge: true
          });
          say(`✅ 아기 정보 (${bb.name || "이름없음"}) 반영`);
        } catch (e) {
          say(`⚠️ 아기 정보 반영 실패 (계속 진행): ${errMsg(e)}`);
        }
      }

      // 2) 기록
      const recs = (data.records || []).filter(r => r && r.type);
      for (let i = 0; i < recs.length; i++) {
        const r = recs[i];
        setProg({
          label: "기록",
          done: i,
          total: recs.length
        });
        try {
          const {
            id,
            type,
            at,
            createdAt,
            createdBy,
            creatorName,
            ...rest
          } = r;
          // 날짜형 필드를 Date 로 되살린다
          Object.keys(rest).forEach(k => {
            if (rest[k] && typeof rest[k] === "object" && rest[k].seconds != null) rest[k] = fsTime(rest[k]);
          });
          await COL.records().add({
            type,
            ...rest,
            at: fsTime(at) || new Date(),
            createdAt: fsTime(createdAt) || fsTime(at) || new Date(),
            createdBy: user.uid,
            // 소유권은 현재 계정
            creatorName: creatorName || "가족" // 표시 이름은 원본 유지
          });
          okR++;
        } catch (e) {
          bad++;
        }
      }
      say(`✅ 기록 ${okR}건 가져옴${bad ? ` (실패 ${bad}건)` : ""}`);

      // 3) 사진 (base64 → Storage)
      const photos = (data.photos || []).filter(p => p && typeof p.url === "string" && p.url.startsWith("data:"));
      const noData = (data.photos || []).length - photos.length;
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        setProg({
          label: "사진",
          done: i,
          total: photos.length
        });
        try {
          const file = dataUrlToFile(p.url, `${p.id || "photo"}.jpg`);
          const up = await uploadPhotoFile(file);
          await COL.photos().add({
            uploadedBy: user.uid,
            uploaderName: p.uploaderName || "가족",
            caption: p.caption || "",
            category: p.category || "baby",
            people: p.people || [],
            place: p.place || "",
            gps: p.gps || null,
            vis: p.vis || "public",
            takenAt: fsTime(p.takenAt) || fsTime(p.createdAt) || new Date(),
            createdAt: fsTime(p.createdAt) || new Date(),
            ...up
          });
          okP++;
        } catch (e) {
          bad++;
        }
      }
      say(`✅ 사진 ${okP}장 가져옴${noData ? ` (원본 없는 ${noData}장 건너뜀)` : ""}`);
      if (skip) say(`⏭️ ${skip}건 건너뜀`);
      setProg(null);
      setDone(true);
      toast(`가져오기 완료 · 기록 ${okR}건 · 사진 ${okP}장`, "success");
    } catch (e) {
      say("❌ " + errMsg(e));
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
      setProg(null);
    }
  };
  if (!isAdmin) return null;
  const nRec = data ? (data.records || []).length : 0;
  const nPho = data ? (data.photos || []).length : 0;
  const nUsr = data ? (data.users || []).length : 0;
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: busy ? () => {} : onClose,
    title: "\uBC31\uC5C5 \uAC00\uC838\uC624\uAE30"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, !data && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 dark:text-slate-300"
  }, "\uAE30\uC874 \uC721\uC544\uC218\uCCA9\uC5D0\uC11C \uBC1B\uC740 ", /*#__PURE__*/React.createElement("b", null, "JSON \uBC31\uC5C5"), "\uC744 \uC120\uD0DD\uD558\uBA74 \uAE30\uB85D\xB7\uC0AC\uC9C4\xB7\uC544\uAE30 \uC815\uBCF4\uB97C \uC774\uACF3\uC73C\uB85C \uC62E\uAE41\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "application/json,.json",
    onChange: pick,
    className: "hidden"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => fileRef.current && fileRef.current.click(),
    className: "w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl py-8 text-slate-400 hover:border-teal-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl mb-1"
  }, "\uD83D\uDCC2"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, "\uBC31\uC5C5 \uD30C\uC77C \uC120\uD0DD"))), err && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3"
  }, err), data && !done && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-1 bg-slate-50 dark:bg-slate-700/40"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-slate-700 dark:text-slate-200"
  }, "\uAC00\uC838\uC62C \uB0B4\uC6A9"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 dark:text-slate-300"
  }, "\uD83D\uDCCB \uAE30\uB85D ", nRec, "\uAC74 \xB7 \uD83D\uDCF7 \uC0AC\uC9C4 ", nPho, "\uC7A5 \xB7 \uD83D\uDC65 \uACC4\uC815 ", nUsr, "\uAC1C"), data.baby && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "\uC544\uAE30: ", data.baby.name, data.baby.dueDate ? ` · 출산예정 ${data.baby.dueDate}` : ""), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "\uB0B4\uBCF4\uB0B8 \uB0A0\uC9DC: ", data.exportedAt ? fmtDateTime(data.exportedAt) : "-")), /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1"
  }, /*#__PURE__*/React.createElement("p", null, "\xB7 \uD3B8\uC9C0\xB7\uC0AC\uC9C4\uC758 ", /*#__PURE__*/React.createElement("b", null, "\uC6D0\uB798 \uC791\uC131\uC790 \uC774\uB984\uC740 \uADF8\uB300\uB85C"), " \uBCF4\uC785\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("p", null, "\xB7 \uB2E4\uB9CC \uC218\uC815\xB7\uC0AD\uC81C \uAD8C\uD55C\uC740 ", /*#__PURE__*/React.createElement("b", null, profile && profile.name || "현재 계정"), " \uC5D0\uAC8C \uADC0\uC18D\uB429\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("p", null, "\xB7 \uC5EC\uB7EC \uBC88 \uB204\uB974\uBA74 ", /*#__PURE__*/React.createElement("b", null, "\uC911\uBCF5\uC73C\uB85C \uB4E4\uC5B4\uAC11\uB2C8\uB2E4."), " \uD55C \uBC88\uB9CC \uC2E4\uD589\uD558\uC138\uC694.")), /*#__PURE__*/React.createElement(Btn, {
    onClick: run,
    disabled: busy,
    className: "w-full tap-lg"
  }, busy ? "가져오는 중…" : `⬆️ ${nRec + nPho}건 가져오기`)), prog && /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500"
  }, prog.label, " ", prog.done, " / ", prog.total), /*#__PURE__*/React.createElement("div", {
    className: "h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-teal-500 transition-all",
    style: {
      width: `${prog.total ? prog.done / prog.total * 100 : 0}%`
    }
  }))), log.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 space-y-1"
  }, log.map((l, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-xs text-slate-600 dark:text-slate-300"
  }, l))), done && /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: onClose,
    className: "w-full tap-lg"
  }, "\uB2EB\uAE30")));
};

/* Scriptable 위젯 원본 (scriptable/toto-dday.js 에서 자동 생성).
   __NAME__ 등 자리표시자를 우리 아기 값으로 바꿔서 복사해 준다. */
const WIDGET_SRC = `// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: baby-carriage;
/* ===========================================================================
   또또 D-day 위젯 · Scriptable (iOS / iPadOS)
   ---------------------------------------------------------------------------
   아이패드·아이폰 홈화면에 또또 출산까지 남은 날을 띄웁니다.
   태어난 뒤에는 birthDate 만 채우면 자동으로 "생후 N일 (D+N)" 로 바뀝니다.

   [설치]
   1) App Store 에서 Scriptable 설치 (무료)
   2) Scriptable 앱 → 우측 상단 + → 이 파일 내용 전체 붙여넣기
   3) 이름을 "또또 D-day" 로 저장
   4) ★ 크게 보려면 반드시 [홈화면] 에 추가하세요.
      홈화면 빈 곳 길게 누르기 → 왼쪽 위 + → Scriptable →
      좌우로 밀어서 [제일 큰 것] 선택 → 위젯 추가
      · 아이패드: 가로로 아주 긴 것(extraLarge)이 제일 큽니다
      · 잠금화면 위젯은 iOS 가 크기를 고정해서 못 키웁니다(작게 나오는 게 정상)
   5) 추가된 위젯 길게 누르기 → "위젯 편집" → Script = 또또 D-day
      (Run Script 로 두면 탭했을 때 앱이 열립니다)
   =========================================================================== */

// ── 처음 값 (Scriptable 앱에서 ▶︎ 실행하면 화면에서 바꿀 수 있습니다) ────────
const DEFAULTS = {
  name: "__NAME__",
  dueDate: "__DUE__",
  birthDate: "__BIRTH__",
  appUrl: "__APPURL__",
};
// ───────────────────────────────────────────────────────────────────────────

/* 저장된 설정 — 앱에서 ▶︎ 로 실행해 입력하면 기기에 보관되고,
   위젯은 그 값을 씁니다. 아기가 태어나면 출생일만 다시 넣으면 D+ 로 바뀝니다. */
const STORE_KEY = "toto-dday-config";

const loadConfig = () => {
  try {
    if (Keychain.contains(STORE_KEY)) {
      const saved = JSON.parse(Keychain.get(STORE_KEY));
      return { ...DEFAULTS, ...saved };
    }
  } catch (e) { /* 저장값이 깨졌으면 기본값 사용 */ }
  return { ...DEFAULTS };
};
const saveConfig = (c) => {
  try { Keychain.set(STORE_KEY, JSON.stringify(c)); return true; }
  catch (e) { return false; }
};

const BABY = loadConfig();

/* YYYY-MM-DD 인지, 진짜 존재하는 날짜인지 확인 */
const isValidDate = (s) => {
  if (!s) return true;                       // 비워두는 건 허용(출생일)
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

/* 앱에서 ▶︎ 실행했을 때 뜨는 입력 화면 */
async function editConfig() {
  const a = new Alert();
  a.title = "D-day 위젯 설정";
  a.message = "날짜는 2026-12-14 처럼 입력하세요.\\n아기가 태어났으면 출생일을 채우면 D+ 로 바뀝니다.";
  a.addTextField("아기 이름", BABY.name || "");
  a.addTextField("출산 예정일 (YYYY-MM-DD)", BABY.dueDate || "");
  a.addTextField("출생일 (없으면 비워두기)", BABY.birthDate || "");
  a.addAction("저장");
  a.addCancelAction("취소");

  const picked = await a.present();
  if (picked !== 0) return false;            // 취소

  const name = (a.textFieldValue(0) || "").trim().slice(0, 20) || "아기";
  const due = (a.textFieldValue(1) || "").trim();
  const birth = (a.textFieldValue(2) || "").trim();

  if (!isValidDate(due) || !isValidDate(birth)) {
    const e = new Alert();
    e.title = "날짜 형식을 확인해주세요";
    e.message = "2026-12-14 형식이어야 합니다.\\n입력한 값: " +
      (isValidDate(due) ? birth : due);
    e.addAction("확인");
    await e.present();
    return await editConfig();               // 다시 입력받기
  }
  if (!due && !birth) {
    const e = new Alert();
    e.title = "날짜가 필요해요";
    e.message = "출산 예정일 또는 출생일 중 하나는 입력해주세요.";
    e.addAction("확인");
    await e.present();
    return await editConfig();
  }

  BABY.name = name; BABY.dueDate = due; BABY.birthDate = birth;
  const ok = saveConfig({ name, dueDate: due, birthDate: birth, appUrl: BABY.appUrl });
  if (!ok) {
    const e = new Alert();
    e.title = "저장하지 못했어요";
    e.message = "이번 실행에만 반영됩니다. 다시 시도해주세요.";
    e.addAction("확인");
    await e.present();
  }
  return true;
}

const C = {
  from: new Color("#7dd3c0"),
  to: new Color("#a78bfa"),
  white: new Color("#ffffff"),
  soft: new Color("#ffffff", 0.72),
  faint: new Color("#ffffff", 0.34),
  track: new Color("#ffffff", 0.22),
};

/* 자정 기준으로 날짜 차이를 센다 (시각 때문에 하루 틀어지는 것 방지) */
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => Math.round((midnight(b) - midnight(a)) / 86400000);

function computeState() {
  const today = new Date();

  if (BABY.birthDate) {
    const born = new Date(BABY.birthDate + "T00:00:00");
    const days = daysBetween(born, today);
    if (days >= 0) {
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30.44);
      return {
        mode: "born",
        big: \`D+\${days}\`,
        sub: \`생후 \${days}일\`,
        detail: days === 0 ? "오늘 태어났어요 🎉"
              : months >= 1 ? \`\${weeks}주 · 약 \${months}개월\`
              : \`\${weeks}주 \${days % 7}일\`,
        foot: \`\${BABY.birthDate.replace(/-/g, ".")} 출생\`,
        progress: Math.min(1, days / 365),
        progressLabel: days === 365 ? "첫 생일 🎂"
                     : days < 365 ? \`첫 생일까지 \${365 - days}일\`
                     : "",
      };
    }
  }

  if (BABY.dueDate) {
    const due = new Date(BABY.dueDate + "T00:00:00");
    const left = daysBetween(today, due);
    const gaDays = 280 - left;               // 임신 주수 = 40주(280일) - 남은 일수
    const w = Math.floor(gaDays / 7), d = gaDays % 7;
    return {
      mode: "pregnant",
      big: left > 0 ? \`D-\${left}\` : left === 0 ? "D-DAY" : \`D+\${-left}\`,
      sub: gaDays > 0 ? \`임신 \${w}주 \${d}일\` : "곧 만나요",
      detail: left > 0 ? \`출산까지 \${left}일\` : left === 0 ? "오늘이 예정일이에요" : \`예정일 \${-left}일 지남\`,
      foot: \`\${BABY.dueDate.replace(/-/g, ".")} 예정\`,
      progress: Math.max(0, Math.min(1, gaDays / 280)),
      progressLabel: \`\${Math.min(100, Math.round((gaDays / 280) * 100))}%\`,
    };
  }

  return { mode: "unknown", big: "—", sub: "날짜를 설정하세요", detail: "", foot: "", progress: 0, progressLabel: "" };
}

/* 진행 막대를 이미지로 그린다 (Scriptable 에 프로그레스 뷰가 없어서) */
function progressBar(ratio, width, height) {
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const r = height / 2;
  ctx.setFillColor(C.track);
  ctx.fillPath(roundedRectPath(0, 0, width, height, r));

  const w = Math.max(height, width * Math.max(0, Math.min(1, ratio)));
  ctx.setFillColor(C.white);
  ctx.fillPath(roundedRectPath(0, 0, w, height, r));

  return ctx.getImage();
}
function roundedRectPath(x, y, w, h, r) {
  const p = new Path();
  p.addRoundedRect(new Rect(x, y, w, h), r, r);
  return p;
}

/* ── 잠금화면 위젯 (accessory*) ─────────────────────────────────────────────
   iOS 가 크기를 고정하고 색도 단색으로 강제하므로, 여기서는 배경/색을 쓰지 않고
   글자만 최대한 크게 넣는다. 크게 보고 싶으면 홈화면 위젯을 쓰세요. */
function buildAccessory(size) {
  const s = computeState();
  const w = new ListWidget();
  w.url = BABY.appUrl;
  w.setPadding(0, 0, 0, 0);

  if (size === "accessoryInline") {
    // 시계 위 한 줄 — 아이콘+텍스트만 가능
    w.addText(\`🍼 \${BABY.name} \${s.big} · \${s.sub}\`);
    return w;
  }

  if (size === "accessoryCircular") {
    // 원형 — 숫자만
    const st = w.addStack();
    st.layoutVertically();
    st.centerAlignContent();
    const n = st.addText(s.big.replace("D", ""));   // "-88"
    n.font = Font.boldSystemFont(20);
    n.centerAlignText();
    n.minimumScaleFactor = 0.5;
    n.lineLimit = 1;
    const l = st.addText("또또");
    l.font = Font.systemFont(9);
    l.centerAlignText();
    return w;
  }

  // accessoryRectangular — 잠금화면에서 제일 큰 것 (약 160x72pt)
  const t1 = w.addText(\`🍼 \${BABY.name}\`);
  t1.font = Font.semiboldSystemFont(12);
  t1.lineLimit = 1;
  const t2 = w.addText(s.big);
  t2.font = Font.boldSystemFont(30);
  t2.lineLimit = 1;
  t2.minimumScaleFactor = 0.5;
  const t3 = w.addText(s.sub);
  t3.font = Font.systemFont(11);
  t3.lineLimit = 1;
  t3.minimumScaleFactor = 0.7;
  return w;
}

/* 크기별 타이포 — 숫자를 최대한 크게.
   가로로 긴 위젯(medium / extraLarge)은 [큰 숫자 | 설명] 가로 배치로 바꿔서
   높이를 숫자에 전부 몰아준다. (iPad 위젯 pt: small 141 · medium 305x141 ·
   large 305x305 · extraLarge 634x305) */
const SIZING = {
  small:      { pad: 12, wide: false, head: 17, big: 56,  sub: 15, det: 0,  foot: 0,  bar: 0,   barH: 0 },
  medium:     { pad: 14, wide: true,  head: 20, big: 78,  sub: 19, det: 14, foot: 12, bar: 0,   barH: 0 },
  large:      { pad: 20, wide: false, head: 30, big: 128, sub: 30, det: 19, foot: 14, bar: 250, barH: 10 },
  extraLarge: { pad: 26, wide: true,  head: 40, big: 190, sub: 42, det: 26, foot: 18, bar: 300, barH: 13 },
};

function buildWidget(size) {
  const s = computeState();
  const z = SIZING[size] || SIZING.medium;
  const w = new ListWidget();

  const g = new LinearGradient();
  g.colors = [C.from, C.to];
  g.locations = [0, 1];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(1, 1);
  w.backgroundGradient = g;
  w.url = BABY.appUrl;
  w.setPadding(z.pad, z.pad + 2, z.pad, z.pad + 2);

  const bigText = (host) => {
    const t = host.addText(s.big);
    t.font = Font.boldSystemFont(z.big);
    t.textColor = C.white;
    t.minimumScaleFactor = 0.45;
    t.lineLimit = 1;
    return t;
  };
  const nameRow = (host, big) => {
    const r = host.addStack();
    r.centerAlignContent();
    const i = r.addText("🍼");
    i.font = Font.systemFont(z.head);
    r.addSpacer(6);
    const n = r.addText(BABY.name);
    n.font = Font.boldSystemFont(z.head);
    n.textColor = C.white;
    n.lineLimit = 1;
    n.minimumScaleFactor = 0.6;
    if (big) {
      r.addSpacer();
      const b = r.addText(s.mode === "pregnant" ? "임신 중" : "육아 중");
      b.font = Font.systemFont(Math.max(11, z.head * 0.5));
      b.textColor = C.faint;
    }
    return r;
  };

  if (z.wide) {
    // ── 가로 배치: [ 큰 숫자 ][ 이름/부제/상세 ] ──
    const row = w.addStack();
    row.centerAlignContent();

    const left = row.addStack();
    left.layoutVertically();
    left.centerAlignContent();
    bigText(left);

    row.addSpacer(size === "extraLarge" ? 28 : 14);

    const right = row.addStack();
    right.layoutVertically();
    nameRow(right, false);
    right.addSpacer(size === "extraLarge" ? 8 : 3);
    const sub = right.addText(s.sub);
    sub.font = Font.mediumSystemFont(z.sub);
    sub.textColor = C.soft;
    sub.lineLimit = 1;
    sub.minimumScaleFactor = 0.6;
    if (z.det && s.detail) {
      const det = right.addText(s.detail);
      det.font = Font.systemFont(z.det);
      det.textColor = C.faint;
      det.lineLimit = 1;
      det.minimumScaleFactor = 0.7;
    }
    if (z.bar) {
      right.addSpacer(10);
      const bar = right.addImage(progressBar(s.progress, z.bar * 3, z.barH * 3));
      bar.imageSize = new Size(z.bar, z.barH);
      bar.cornerRadius = z.barH / 2;
    }
    if (z.foot) {
      right.addSpacer(6);
      const f = right.addText(s.foot + (s.progressLabel ? "  ·  " + s.progressLabel : ""));
      f.font = Font.systemFont(z.foot);
      f.textColor = C.faint;
      f.lineLimit = 1;
      f.minimumScaleFactor = 0.7;
    }
    row.addSpacer();
    return w;
  }

  // ── 세로 배치 (small / large) ──
  nameRow(w, size !== "small");
  w.addSpacer(size === "small" ? 2 : 6);
  bigText(w);
  const sub = w.addText(s.sub);
  sub.font = Font.mediumSystemFont(z.sub);
  sub.textColor = C.soft;
  sub.lineLimit = 1;
  sub.minimumScaleFactor = 0.6;
  if (z.det && s.detail) {
    const det = w.addText(s.detail);
    det.font = Font.systemFont(z.det);
    det.textColor = C.faint;
    det.lineLimit = 1;
  }
  if (z.bar) {
    w.addSpacer();
    const bar = w.addImage(progressBar(s.progress, z.bar * 3, z.barH * 3));
    bar.imageSize = new Size(z.bar, z.barH);
    bar.cornerRadius = z.barH / 2;
  } else {
    w.addSpacer();
  }
  if (z.foot) {
    w.addSpacer(7);
    const foot = w.addStack();
    const f1 = foot.addText(s.foot);
    f1.font = Font.systemFont(z.foot);
    f1.textColor = C.faint;
    f1.lineLimit = 1;
    if (s.progressLabel) {
      foot.addSpacer();
      const f2 = foot.addText(s.progressLabel);
      f2.font = Font.systemFont(z.foot);
      f2.textColor = C.faint;
      f2.lineLimit = 1;
    }
  }
  return w;
}

// ── 실행 ────────────────────────────────────────────────────────────────────
const family = config.widgetFamily || "medium";
const isAccessory = String(family).indexOf("accessory") === 0;   // 잠금화면 위젯

if (config.runsInWidget) {
  // 홈/잠금화면 위젯: 저장된 값으로 그리기만 한다
  Script.setWidget(isAccessory ? buildAccessory(family) : buildWidget(family));
} else {
  // Scriptable 앱에서 ▶︎ 로 실행: 설정을 고칠 수 있게 물어본 뒤 미리보기
  const menu = new Alert();
  menu.title = BABY.name + " D-day";
  menu.message = (function () {
    const s = computeState();
    return s.big + " · " + s.sub + "\\n" +
      (BABY.birthDate ? "출생일 " + BABY.birthDate : "출산예정일 " + (BABY.dueDate || "미설정"));
  })();
  menu.addAction("✏️ 날짜 수정");
  menu.addAction("👀 미리보기");
  menu.addCancelAction("닫기");

  const pick = await menu.present();
  if (pick === 0) {
    const changed = await editConfig();
    if (changed) {
      const done = new Alert();
      const s = computeState();
      done.title = "저장했어요";
      done.message = BABY.name + " · " + s.big + "\\n" + s.sub +
        "\\n\\n홈화면 위젯은 잠시 뒤 자동으로 바뀝니다.";
      done.addAction("확인");
      await done.present();
    }
  }
  if (pick === 0 || pick === 1) {
    const w = isAccessory ? buildAccessory(family) : buildWidget(family);
    if (family === "small") await w.presentSmall();
    else if (family === "large" || family === "extraLarge") await w.presentLarge();
    else await w.presentMedium();
  }
}
Script.complete();
`;

/* ========================================================================
   25. 메인 앱 셸
   ======================================================================== */
/* 더보기 하위 화면. 기존 Settings 안의 카드들을 주제별로 나눠 보여준다.
   기능을 없애지 않고 위치만 정리한 것이다. */
const MoreDetail = ({
  section,
  nav,
  dark,
  setDark
}) => {
  const item = MORE_ITEMS.find(m => m.id === section);
  const title = item ? `${item.icon} ${item.label}` : "더보기";
  return /*#__PURE__*/React.createElement("div", {
    className: "pb-safe"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-4 pt-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => nav("/more"),
    "aria-label": "\uB354\uBCF4\uAE30\uB85C \uB3CC\uC544\uAC00\uAE30",
    className: "w-11 h-11 -ml-2 flex items-center justify-center text-2xl text-slate-500 dark:text-slate-300"
  }, "\u2039"), /*#__PURE__*/React.createElement("h1", {
    className: "text-lg font-bold text-slate-800 dark:text-white"
  }, title)), section === "saved" && /*#__PURE__*/React.createElement(Saved, null), section === "medals" && /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement(MyMedals, null)), (section === "family" || section === "baby" || section === "widget" || section === "backup" || section === "dbfix" || section === "settings") && /*#__PURE__*/React.createElement(Settings, {
    focus: section,
    dark: dark,
    setDark: setDark
  }));
};
const MainApp = () => {
  const {
    profile,
    isAdmin,
    approved
  } = useAuth();
  const [dark, setDark] = useDarkMode();
  const {
    nav,
    tab,
    sub
  } = useHashRoute("/dashboard");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCat, setUploadCat] = useState("baby");

  // 기본 하위탭은 Records 가 시기(출산 전/후)에 맞게 고른다
  const recSub = tab === "records" ? sub : null;
  const setRecSub = v => nav("/records/" + v);
  const setTab = t => nav("/" + t);
  const go = (t, s2) => nav("/" + t + (s2 ? "/" + s2 : ""));
  const openUpload = (cat = "baby") => {
    setUploadCat(cat);
    setUploadOpen(true);
  };

  // 비활성화된 계정 차단 (관리자는 차단되지 않음 → 잠금 방지)
  if (profile && profile.disabled && !isAdmin) {
    return /*#__PURE__*/React.createElement("div", {
      className: "app-shell items-center justify-center text-center p-8 bg-warm overflow-y-auto"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-5xl mb-3"
    }, "\uD83D\uDEAB"), /*#__PURE__*/React.createElement("p", {
      className: "text-slate-700 dark:text-white font-bold"
    }, "\uBE44\uD65C\uC131\uD654\uB41C \uACC4\uC815\uC785\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-400 mt-1"
    }, "\uAD00\uB9AC\uC790\uC5D0\uAC8C \uBB38\uC758\uD558\uC138\uC694."), /*#__PURE__*/React.createElement(Btn, {
      variant: "ghost",
      className: "mt-5",
      onClick: () => signOutApp()
    }, "\uB85C\uADF8\uC544\uC6C3"));
  }

  // 승인 대기 (자가 회원가입 후 관리자 승인 전)
  if (profile && !approved) {
    return /*#__PURE__*/React.createElement("div", {
      className: "app-shell items-center justify-center text-center p-8 bg-warm overflow-y-auto"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-5xl mb-3"
    }, "\u23F3"), /*#__PURE__*/React.createElement("p", {
      className: "text-slate-700 dark:text-white font-bold"
    }, "\uC2B9\uC778 \uB300\uAE30 \uC911\uC774\uC5D0\uC694"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-400 mt-2 leading-relaxed"
    }, "\uAD00\uB9AC\uC790(\uC5C4\uB9C8\xB7\uC544\uBE60)\uAC00 \uC2B9\uC778\uD558\uBA74", /*#__PURE__*/React.createElement("br", null), "\uBC14\uB85C \uC0AC\uC6A9\uD560 \uC218 \uC788\uC5B4\uC694.", /*#__PURE__*/React.createElement("br", null), "\uC2B9\uC778 \uD6C4 \uB2E4\uC2DC \uB4E4\uC5B4\uC624\uBA74 \uB429\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-400 mt-3"
    }, profile.name, " \xB7 ", profile.email), /*#__PURE__*/React.createElement(Btn, {
      variant: "ghost",
      className: "mt-5",
      onClick: () => signOutApp()
    }, "\uB85C\uADF8\uC544\uC6C3"));
  }

  // 관람전용(이모·삼촌): 갤러리 + 편지 + 메달
  const isViewer = profile && profile.role === "viewer" && !isAdmin;
  if (isViewer) return /*#__PURE__*/React.createElement(ViewerApp, {
    dark: dark,
    setDark: setDark
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "app-shell bg-warm"
  }, /*#__PURE__*/React.createElement(Header, {
    dark: dark,
    setDark: setDark
  }), /*#__PURE__*/React.createElement(MedalWatcher, null), /*#__PURE__*/React.createElement(InstallBanner, null), /*#__PURE__*/React.createElement(DbHealthBanner, null), /*#__PURE__*/React.createElement("main", {
    className: "app-main"
  }, tab === "dashboard" && /*#__PURE__*/React.createElement(Dashboard, {
    go: go
  }), tab === "records" && /*#__PURE__*/React.createElement(Records, {
    sub: recSub,
    setSub: setRecSub,
    openUpload: () => openUpload("ultrasound")
  }), tab === "gallery" && /*#__PURE__*/React.createElement(Gallery, {
    openUpload: () => openUpload("baby")
  }), tab === "letters" && /*#__PURE__*/React.createElement(Letters, null), tab === "more" && !sub && /*#__PURE__*/React.createElement(MoreMenu, {
    nav: nav
  }), tab === "more" && sub && /*#__PURE__*/React.createElement(MoreDetail, {
    section: sub,
    nav: nav,
    dark: dark,
    setDark: setDark
  }), tab === "saved" && /*#__PURE__*/React.createElement(Saved, null), tab === "settings" && /*#__PURE__*/React.createElement(Settings, null)), /*#__PURE__*/React.createElement(BottomNav, {
    tab: tab,
    setTab: setTab
  }), /*#__PURE__*/React.createElement(UploadModal, {
    open: uploadOpen,
    onClose: () => setUploadOpen(false),
    defaultCategory: uploadCat
  }));
};

/* ========================================================================
   26. 루트 게이트 (설정 미입력 / 로그인 분기)
   ======================================================================== */
/* 무엇이 잘못됐는지 말해준다. 예전에는 원인과 무관하게 같은 문구만 떴고,
   안내도 Firebase 시절 그대로여서 어디를 봐야 하는지 알 수 없었다. */
const ConfigNeeded = () => /*#__PURE__*/React.createElement("div", {
  className: "app-shell items-center justify-center text-center p-8 bg-warm overflow-y-auto"
}, /*#__PURE__*/React.createElement("div", {
  className: "text-6xl mb-4"
}, "\u2699\uFE0F"), /*#__PURE__*/React.createElement("h1", {
  className: "text-xl font-bold text-slate-800 dark:text-white"
}, "\uC811\uC18D \uC124\uC815\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694"), CFG_PROBLEM && /*#__PURE__*/React.createElement("p", {
  className: `mt-3 text-sm font-medium ${CFG_PROBLEM.code === "secret-key" ? "text-rose-600" : "text-amber-700 dark:text-amber-300"}`
}, CFG_PROBLEM.msg), /*#__PURE__*/React.createElement("p", {
  className: "text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed"
}, /*#__PURE__*/React.createElement("code", {
  className: "bg-slate-100 dark:bg-slate-700 px-1 rounded"
}, "supabase-config.js"), " \uC758", /*#__PURE__*/React.createElement("br", null), "\uC8FC\uC18C\uC640 ", /*#__PURE__*/React.createElement("b", null, "anon"), " \uD0A4\uB97C \uCC44\uC6CC\uC8FC\uC138\uC694."), /*#__PURE__*/React.createElement("p", {
  className: "text-[12px] text-slate-400 mt-4 leading-relaxed"
}, "Supabase \uB300\uC2DC\uBCF4\uB4DC \u2192 Project Settings \u2192 API", /*#__PURE__*/React.createElement("br", null), "\xB7 Project URL \u2192 ", /*#__PURE__*/React.createElement("code", null, "SUPABASE_URL"), /*#__PURE__*/React.createElement("br", null), "\xB7 anon / publishable \uD0A4 \u2192 ", /*#__PURE__*/React.createElement("code", null, "SUPABASE_ANON_KEY"), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("b", null, "service_role \uD0A4\uB294 \uC808\uB300 \uB123\uC9C0 \uB9C8\uC138\uC694."), " \uADF8 \uD0A4\uB294 \uBAA8\uB4E0 \uAC00\uC871\uC758 \uC0AC\uC9C4\uACFC \uAE30\uB85D\uC744 \uC5F4 \uC218 \uC788\uC2B5\uB2C8\uB2E4."));
const Root = () => {
  const {
    user
  } = useAuth();
  if (user === undefined) return /*#__PURE__*/React.createElement("div", {
    className: "app-shell items-center justify-center bg-warm"
  }, /*#__PURE__*/React.createElement(Spinner, {
    label: "\uBD88\uB7EC\uC624\uB294 \uC911..."
  }));
  if (!user) return /*#__PURE__*/React.createElement(Login, null);
  return /*#__PURE__*/React.createElement(BabyProvider, null, /*#__PURE__*/React.createElement(MainApp, null));
};

/* ========================================================================
   27. 렌더
   ======================================================================== */
// 한 화면의 오류가 앱 전체를 끄지 않도록 보호
class ErrorBoundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = {
      err: null
    };
  }
  static getDerivedStateFromError(err) {
    return {
      err
    };
  }
  componentDidCatch(err, info) {
    console.error("ErrorBoundary:", err, info);
  }
  render() {
    if (this.state.err) {
      return /*#__PURE__*/React.createElement("div", {
        className: "app-shell items-center justify-center text-center p-8 bg-warm overflow-y-auto",
        style: {
          minHeight: "100vh"
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-5xl mb-3"
      }, "\uD83D\uDE4F"), /*#__PURE__*/React.createElement("p", {
        className: "font-bold text-slate-800 dark:text-white"
      }, "\uC77C\uC2DC\uC801\uC778 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694"), /*#__PURE__*/React.createElement("pre", {
        className: "text-[12px] text-slate-400 mt-2 whitespace-pre-wrap max-w-full overflow-auto"
      }, this.state.err && (this.state.err.message || String(this.state.err))), /*#__PURE__*/React.createElement("button", {
        onClick: () => this.setState({
          err: null
        }),
        className: "mt-4 px-5 py-3 rounded-xl bg-teal-500 text-white"
      }, "\uB2E4\uC2DC \uC2DC\uB3C4"), /*#__PURE__*/React.createElement("button", {
        onClick: () => location.reload(),
        className: "mt-2 px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm"
      }, "\uC0C8\uB85C\uACE0\uCE68"));
    }
    return this.props.children;
  }
}

/* "관리자 이메일인데 DB 는 관리자가 아니라고 한다" 를 알려준다.
   예전에는 화면이 스스로 관리자 권한을 줘 버려서, 눌러도 안 되는 버튼만
   보이고 왜 안 되는지 알 수 없었다. 이제는 무엇을 해야 하는지 적어준다. */
const AdminMismatchBanner = () => {
  const {
    adminMismatch,
    profile
  } = useAuth();
  if (!adminMismatch) return null;
  const role = profile && profile.role || "알 수 없음";
  return /*#__PURE__*/React.createElement("div", {
    role: "alert",
    className: "mx-4 mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-3 text-[12px] leading-relaxed text-amber-800 dark:text-amber-200"
  }, /*#__PURE__*/React.createElement("b", null, "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uC11C\uBC84\uC5D0 \uBC18\uC601\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."), " \uC9C0\uAE08 \uAD8C\uD55C\uC740 ", /*#__PURE__*/React.createElement("b", null, role), " \uC774\uC5D0\uC694.", /*#__PURE__*/React.createElement("br", null), "\uD654\uBA74\uB9CC \uAD00\uB9AC\uC790\uB85C \uBCF4\uC774\uAC8C \uD558\uBA74 \uB20C\uB7EC\uB3C4 \uB3D9\uC791\uD558\uC9C0 \uC54A\uC73C\uBBC0\uB85C, \uADF8\uB807\uAC8C \uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uB2E4\uB978 \uAD00\uB9AC\uC790\uC5D0\uAC8C \uAD8C\uD55C \uBCC0\uACBD\uC744 \uC694\uCCAD\uD558\uAC70\uB098, Supabase \uC5D0\uC11C profiles \uC758 role \uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.");
};
const App = () => {
  if (!sbReady) return /*#__PURE__*/React.createElement(ToastProvider, null, /*#__PURE__*/React.createElement(ConfigNeeded, null));
  return /*#__PURE__*/React.createElement(ErrorBoundary, null, /*#__PURE__*/React.createElement(ToastProvider, null, /*#__PURE__*/React.createElement(ConfirmProvider, null, /*#__PURE__*/React.createElement(AuthProvider, null, /*#__PURE__*/React.createElement(UpdateBanner, null), /*#__PURE__*/React.createElement(AdminMismatchBanner, null), /*#__PURE__*/React.createElement(Root, null)))));
};
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
;window.__TOTO_PRECOMPILED = true;

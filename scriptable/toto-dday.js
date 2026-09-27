// Variables used by Scriptable.
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
  name: "또또",
  dueDate: "2026-12-14",   // 출산 예정일
  birthDate: "",           // 태어나면 채우세요 → 자동으로 D+ 로 전환
  appUrl: "https://scott910512-source.github.io/toto/app.html", // 위젯 탭하면 열릴 주소
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

/* 앱에서 ▶︎ 실행했을 때 뜨는 입력 화면 */
async function editConfig() {
  const a = new Alert();
  a.title = "D-day 위젯 설정";
  a.message = "날짜는 2026-12-14 처럼 입력하세요.\n아기가 태어났으면 출생일을 채우면 D+ 로 바뀝니다.";
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
    e.message = "2026-12-14 형식이어야 합니다.\n입력한 값: " +
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
        big: `D+${days}`,
        sub: `생후 ${days}일`,
        detail: days === 0 ? "오늘 태어났어요 🎉"
              : months >= 1 ? `${weeks}주 · 약 ${months}개월`
              : `${weeks}주 ${days % 7}일`,
        foot: `${BABY.birthDate.replace(/-/g, ".")} 출생`,
        progress: Math.min(1, days / 365),
        progressLabel: days === 365 ? "첫 생일 🎂"
                     : days < 365 ? `첫 생일까지 ${365 - days}일`
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
      big: left > 0 ? `D-${left}` : left === 0 ? "D-DAY" : `D+${-left}`,
      sub: gaDays > 0 ? `임신 ${w}주 ${d}일` : "곧 만나요",
      detail: left > 0 ? `출산까지 ${left}일` : left === 0 ? "오늘이 예정일이에요" : `예정일 ${-left}일 지남`,
      foot: `${BABY.dueDate.replace(/-/g, ".")} 예정`,
      progress: Math.max(0, Math.min(1, gaDays / 280)),
      progressLabel: `${Math.min(100, Math.round((gaDays / 280) * 100))}%`,
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
    w.addText(`🍼 ${BABY.name} ${s.big} · ${s.sub}`);
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
  const t1 = w.addText(`🍼 ${BABY.name}`);
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
    return s.big + " · " + s.sub + "\n" +
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
      done.message = BABY.name + " · " + s.big + "\n" + s.sub +
        "\n\n홈화면 위젯은 잠시 뒤 자동으로 바뀝니다.";
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

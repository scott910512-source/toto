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
   4) 홈화면 빈 곳 길게 누르기 → + → Scriptable → 위젯 크기 선택 → 추가
   5) 추가된 위젯 길게 누르기 → "위젯 편집" → Script = 또또 D-day
      (Run Script 로 두면 탭했을 때 앱이 열립니다)
   =========================================================================== */

// ── 여기만 고치세요 ─────────────────────────────────────────────────────────
const BABY = {
  name: "또또",
  dueDate: "2026-12-14",   // 출산 예정일
  birthDate: "",           // 태어나면 "2026-12-14" 처럼 채우세요 → 자동으로 D+ 로 전환
  appUrl: "https://scott910512-source.github.io/toto/app.html", // 위젯 탭하면 열릴 주소
};
// ───────────────────────────────────────────────────────────────────────────

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

function buildWidget(size) {
  const s = computeState();
  const w = new ListWidget();

  const g = new LinearGradient();
  g.colors = [C.from, C.to];
  g.locations = [0, 1];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(1, 1);
  w.backgroundGradient = g;
  w.url = BABY.appUrl;

  const small = size === "small";
  w.setPadding(small ? 14 : 18, small ? 14 : 20, small ? 14 : 18, small ? 14 : 20);

  // 상단: 🍼 또또
  const head = w.addStack();
  head.centerAlignContent();
  const icon = head.addText("🍼");
  icon.font = Font.systemFont(small ? 13 : 15);
  head.addSpacer(5);
  const name = head.addText(BABY.name);
  name.font = Font.semiboldSystemFont(small ? 13 : 15);
  name.textColor = C.white;
  if (!small) {
    head.addSpacer();
    const badge = head.addText(s.mode === "pregnant" ? "임신 중" : "육아 중");
    badge.font = Font.systemFont(11);
    badge.textColor = C.faint;
  }

  w.addSpacer(small ? 6 : 10);

  // 큰 숫자
  const big = w.addText(s.big);
  big.font = Font.boldSystemFont(small ? 38 : size === "large" ? 62 : 46);
  big.textColor = C.white;
  big.minimumScaleFactor = 0.6;
  big.lineLimit = 1;

  // 부제
  const sub = w.addText(s.sub);
  sub.font = Font.mediumSystemFont(small ? 12 : 15);
  sub.textColor = C.soft;
  sub.lineLimit = 1;
  sub.minimumScaleFactor = 0.7;

  if (!small && s.detail) {
    const det = w.addText(s.detail);
    det.font = Font.systemFont(12);
    det.textColor = C.faint;
    det.lineLimit = 1;
  }

  w.addSpacer();

  // 진행 막대
  const barW = small ? 110 : size === "large" ? 300 : 250;
  const bar = w.addImage(progressBar(s.progress, barW * 3, 18));
  bar.imageSize = new Size(barW, 6);
  bar.cornerRadius = 3;

  w.addSpacer(small ? 5 : 7);

  const foot = w.addStack();
  const f1 = foot.addText(s.foot);
  f1.font = Font.systemFont(small ? 9.5 : 11);
  f1.textColor = C.faint;
  f1.lineLimit = 1;
  if (s.progressLabel) {
    foot.addSpacer();
    const f2 = foot.addText(s.progressLabel);
    f2.font = Font.systemFont(small ? 9.5 : 11);
    f2.textColor = C.faint;
    f2.lineLimit = 1;
  }

  return w;
}

// ── 실행 ────────────────────────────────────────────────────────────────────
const family = config.widgetFamily || "medium";
const widget = buildWidget(family);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  // 앱에서 직접 실행하면 미리보기
  if (family === "small") await widget.presentSmall();
  else if (family === "large") await widget.presentLarge();
  else await widget.presentMedium();
}
Script.complete();

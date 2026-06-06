/* =========================================================================
 * 올리브식권 간편식 신청 도우미 — 로직
 *  - 요일별 × 끼니별(아침/점심/저녁) 체크 + 목록선택바(드롭다운)로 메뉴 선택
 *  - 날짜 범위를 지정하면 그 기간의 신청 계획표를 자동 생성
 *  - 설정/메뉴는 이 브라우저(localStorage)에 저장
 * ===================================================================== */
(function () {
  "use strict";

  const DAYS = window.OLIVE_DAYS;
  const MEALS = window.OLIVE_MEALS;
  const CONFIG_KEY = "olive_config_v1";
  const MENU_KEY = "olive_menu_v1";

  // 현재 설정 상태: { mon: { breakfast: {enabled, menu}, ... }, ... }
  let config = emptyConfig();

  function emptyConfig() {
    const c = {};
    DAYS.forEach((d) => {
      c[d.key] = {};
      MEALS.forEach((m) => (c[d.key][m.key] = { enabled: false, menu: "" }));
    });
    return c;
  }

  // ── 메뉴 데이터 (기본값 + 저장된 편집본 병합) ─────────────
  function getMenu() {
    const stored = localStorage.getItem(MENU_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch (_) {}
    }
    return window.OLIVE_MENU;
  }

  // 메뉴를 텍스트(한 줄에 "그룹: a, b, c")로 직렬화
  function menuToText(menu) {
    return menu.map((g) => `${g.group}: ${g.items.join(", ")}`).join("\n");
  }

  // 텍스트를 메뉴 구조로 파싱
  function textToMenu(text) {
    const groups = [];
    text.split("\n").forEach((raw) => {
      const line = raw.trim();
      if (!line) return;
      const idx = line.indexOf(":");
      if (idx > -1) {
        const group = line.slice(0, idx).trim() || "메뉴";
        const items = line.slice(idx + 1).split(",").map((s) => s.trim()).filter(Boolean);
        if (items.length) groups.push({ group, items });
      } else {
        // 콜론 없는 줄은 "기타" 그룹의 단일 항목
        let etc = groups.find((g) => g.group === "기타");
        if (!etc) { etc = { group: "기타", items: [] }; groups.push(etc); }
        etc.items.push(line);
      }
    });
    return groups;
  }

  // 모든 메뉴 항목을 평평하게 (유효성 검사용)
  function allMenuItems() {
    return getMenu().flatMap((g) => g.items);
  }

  // ── 요일 그리드 만들기 ────────────────────────────────
  function buildSelect(dayKey, mealKey) {
    const sel = document.createElement("select");
    sel.className = "mealrow__select";
    sel.dataset.day = dayKey;
    sel.dataset.meal = mealKey;
    sel.disabled = true;

    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "— 메뉴 선택 —";
    sel.appendChild(blank);

    getMenu().forEach((g) => {
      const og = document.createElement("optgroup");
      og.label = g.group;
      g.items.forEach((item) => {
        const o = document.createElement("option");
        o.value = item;
        o.textContent = item;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    return sel;
  }

  function buildGrid() {
    const grid = document.getElementById("weekGrid");
    grid.innerHTML = "";

    DAYS.forEach((d) => {
      const card = document.createElement("div");
      card.className = "daycard";
      card.dataset.day = d.key;

      const head = document.createElement("div");
      head.className = "daycard__head";
      head.innerHTML =
        `<span class="daycard__day">${d.label}</span>` +
        `<span class="daycard__count" data-count="${d.key}"></span>`;
      card.appendChild(head);

      MEALS.forEach((m) => {
        const row = document.createElement("div");
        row.className = "mealrow";

        const label = document.createElement("label");
        label.className = "mealrow__check";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.day = d.key;
        cb.dataset.meal = m.key;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(`${m.emoji} ${m.label}`));

        const sel = buildSelect(d.key, m.key);

        cb.addEventListener("change", () => {
          config[d.key][m.key].enabled = cb.checked;
          sel.disabled = !cb.checked;
          refreshDayState(d.key);
        });
        sel.addEventListener("change", () => {
          config[d.key][m.key].menu = sel.value;
        });

        row.appendChild(label);
        row.appendChild(sel);
        card.appendChild(row);
      });

      grid.appendChild(card);
    });
  }

  // 카드 활성 상태/카운트 갱신
  function refreshDayState(dayKey) {
    const card = document.querySelector(`.daycard[data-day="${dayKey}"]`);
    const enabledMeals = MEALS.filter((m) => config[dayKey][m.key].enabled);
    card.classList.toggle("is-active", enabledMeals.length > 0);
    const countEl = card.querySelector(`[data-count="${dayKey}"]`);
    countEl.textContent = enabledMeals.length
      ? `${enabledMeals.length}끼 신청`
      : "";
  }

  // config 상태를 화면 입력요소에 반영
  function syncFormFromConfig() {
    DAYS.forEach((d) => {
      MEALS.forEach((m) => {
        const slot = config[d.key][m.key];
        const cb = document.querySelector(
          `input[type="checkbox"][data-day="${d.key}"][data-meal="${m.key}"]`
        );
        const sel = document.querySelector(
          `select[data-day="${d.key}"][data-meal="${m.key}"]`
        );
        if (cb) cb.checked = !!slot.enabled;
        if (sel) {
          sel.disabled = !slot.enabled;
          // 저장된 메뉴가 현재 목록에 있으면 선택, 없으면 비움
          sel.value = allMenuItems().includes(slot.menu) ? slot.menu : "";
          slot.menu = sel.value;
        }
      });
      refreshDayState(d.key);
    });
  }

  // ── 날짜 유틸 ────────────────────────────────────────
  function fmtInput(date) {
    return date.toLocaleDateString("sv-SE"); // YYYY-MM-DD (현지 기준)
  }
  function parseInput(str) {
    const [y, mo, d] = str.split("-").map(Number);
    return new Date(y, mo - 1, d);
  }
  function dowKey(date) {
    const found = DAYS.find((d) => d.dow === date.getDay());
    return found ? found.key : null;
  }
  function dowLabel(date) {
    const found = DAYS.find((d) => d.dow === date.getDay());
    return found ? found.label : "";
  }

  // 빠른 기간 선택
  function setQuickRange(kind) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let end = new Date(today);

    if (kind === "thisweek" || kind === "nextweek") {
      // 이번 주 월요일 찾기 (일=0 보정)
      const offset = (today.getDay() + 6) % 7;
      start = new Date(today);
      start.setDate(today.getDate() - offset);
      if (kind === "nextweek") start.setDate(start.getDate() + 7);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (kind === "thismonth") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (kind === "14") {
      end = new Date(today);
      end.setDate(today.getDate() + 13);
    }

    document.getElementById("startDate").value = fmtInput(start);
    document.getElementById("endDate").value = fmtInput(end);
  }

  // ── 계획표 생성 ──────────────────────────────────────
  function generatePlan() {
    const startStr = document.getElementById("startDate").value;
    const endStr = document.getElementById("endDate").value;

    if (!startStr || !endStr) {
      renderMessage("📅 먼저 <strong>신청 기간</strong>(시작일·종료일)을 정해 주세요.");
      return;
    }
    const start = parseInput(startStr);
    const end = parseInput(endStr);
    if (start > end) {
      renderMessage("📅 시작일이 종료일보다 늦어요. 기간을 다시 확인해 주세요.");
      return;
    }

    // 메뉴 없이 체크만 된 칸 경고용 수집
    const missing = [];
    const plan = []; // { date, dowLabel, meal, menu }
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = dowKey(d);
      if (!key) continue;
      MEALS.forEach((m) => {
        const slot = config[key][m.key];
        if (!slot.enabled) return;
        if (!slot.menu) missing.push(`${dowLabel(d)} ${m.label}`);
        plan.push({
          date: new Date(d),
          dow: dowLabel(d),
          meal: m,
          menu: slot.menu || "(메뉴 미선택)",
        });
      });
    }

    if (plan.length === 0) {
      renderMessage(
        "✅ 신청할 끼니가 없어요.<br><small>②에서 요일·끼니를 체크하고 메뉴를 골라 주세요.</small>"
      );
      return;
    }

    renderPlan(plan, missing);
  }

  function renderPlan(plan, missing) {
    const results = document.getElementById("results");

    // 날짜별 묶기
    const byDate = new Map();
    plan.forEach((p) => {
      const k = fmtInput(p.date);
      if (!byDate.has(k)) byDate.set(k, []);
      byDate.get(k).push(p);
    });

    let html =
      `<div class="results__head">` +
      `<h2>📋 신청 계획표</h2>` +
      `<button type="button" class="btn btn--small" id="copyPlan">📑 복사</button>` +
      `</div>` +
      `<p class="results__count">총 <strong>${plan.length}끼</strong> · ${byDate.size}일</p>`;

    if (missing.length) {
      html +=
        `<p class="message" style="text-align:left">⚠️ 메뉴를 아직 안 고른 칸이 있어요: ` +
        `<strong>${[...new Set(missing)].join(", ")}</strong></p>`;
    }

    byDate.forEach((items, dateStr) => {
      const dow = items[0].dow;
      html += `<div class="plan-day">`;
      html += `<p class="plan-day__date">${dateStr} <span class="dow">(${dow})</span></p>`;
      items
        .slice()
        .sort((a, b) => MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal))
        .forEach((p) => {
          html +=
            `<div class="plan-item">` +
            `<span class="plan-item__meal">${p.meal.emoji} ${p.meal.label}</span>` +
            `<span class="plan-item__menu">${escapeHtml(p.menu)}</span>` +
            `</div>`;
        });
      html += `</div>`;
    });

    results.innerHTML = html;
    document.getElementById("copyPlan").addEventListener("click", () => copyPlan(plan));
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function copyPlan(plan) {
    const lines = ["[올리브식권 간편식 신청 계획]"];
    let lastDate = "";
    plan.forEach((p) => {
      const dateStr = fmtInput(p.date);
      if (dateStr !== lastDate) {
        lines.push("");
        lines.push(`■ ${dateStr} (${p.dow})`);
        lastDate = dateStr;
      }
      lines.push(`  - ${p.meal.label}: ${p.menu}`);
    });
    const text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => flash("copyPlan", "✅ 복사됨"),
        () => fallbackCopy(text)
      );
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); flash("copyPlan", "✅ 복사됨"); }
    catch (_) { alert(text); }
    document.body.removeChild(ta);
  }
  function flash(id, msg) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = msg;
    setTimeout(() => (btn.textContent = orig), 1500);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])
    );
  }

  function renderMessage(html) {
    document.getElementById("results").innerHTML = `<p class="message">${html}</p>`;
  }

  // ── 저장 / 불러오기 ──────────────────────────────────
  function saveConfig() {
    const payload = {
      config,
      startDate: document.getElementById("startDate").value,
      endDate: document.getElementById("endDate").value,
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(payload));
    flash("save", "💾 저장됨");
  }
  function loadConfig() {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      if (payload.config) {
        // 기존 구조에 안전하게 병합
        DAYS.forEach((d) => {
          MEALS.forEach((m) => {
            const saved = payload.config?.[d.key]?.[m.key];
            if (saved) config[d.key][m.key] = { enabled: !!saved.enabled, menu: saved.menu || "" };
          });
        });
      }
      if (payload.startDate) document.getElementById("startDate").value = payload.startDate;
      if (payload.endDate) document.getElementById("endDate").value = payload.endDate;
    } catch (_) {}
  }

  function resetAll() {
    if (!confirm("설정을 모두 초기화할까요? (저장된 내용도 지워집니다)")) return;
    config = emptyConfig();
    localStorage.removeItem(CONFIG_KEY);
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    syncFormFromConfig();
    document.getElementById("results").innerHTML = "";
  }

  // ── 메뉴 관리 ────────────────────────────────────────
  function openMenuEditor() {
    document.getElementById("menuEditor").value = menuToText(getMenu());
  }
  function applyMenu() {
    const text = document.getElementById("menuEditor").value;
    const menu = textToMenu(text);
    if (!menu.length) { alert("메뉴가 비어 있어요. 한 줄에 하나씩 적어 주세요."); return; }
    localStorage.setItem(MENU_KEY, JSON.stringify(menu));
    rebuildAfterMenuChange();
    alert("✅ 메뉴를 적용했어요. 목록선택바가 갱신됐습니다.");
  }
  function restoreMenu() {
    if (!confirm("기본 메뉴로 되돌릴까요? (편집한 메뉴는 사라집니다)")) return;
    localStorage.removeItem(MENU_KEY);
    openMenuEditor();
    rebuildAfterMenuChange();
  }
  // 메뉴가 바뀌면 드롭다운을 다시 만들고 기존 선택을 복원
  function rebuildAfterMenuChange() {
    buildGrid();
    syncFormFromConfig();
  }

  // ── 초기화 ──────────────────────────────────────────
  function init() {
    buildGrid();
    loadConfig();
    syncFormFromConfig();
    openMenuEditor();

    document.getElementById("generate").addEventListener("click", generatePlan);
    document.getElementById("save").addEventListener("click", saveConfig);
    document.getElementById("reset").addEventListener("click", resetAll);
    document.getElementById("menuApply").addEventListener("click", applyMenu);
    document.getElementById("menuRestore").addEventListener("click", restoreMenu);

    document.querySelectorAll(".quickrange .chip").forEach((chip) => {
      chip.addEventListener("click", () => setQuickRange(chip.dataset.range));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

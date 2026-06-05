/* 주말 활동 추천 로직 */
(function () {
  "use strict";

  // 칩 그룹별 선택 상태 저장
  const selections = {
    region: new Set(),
    duration: new Set(),
    theme: new Set(),
    constraint: new Set(),
  };

  // 코드 → 한글 라벨 (결과 표시용)
  const LABELS = {
    region: {
      seoul: "서울", gyeonggi: "경기·인천", gangwon: "강원",
      chungcheong: "충청", jeolla: "전라", gyeongsang: "경상",
      busan: "부산", jeju: "제주",
    },
    duration: { half: "반나절", day: "당일치기", overnight: "1박 2일" },
    theme: {
      nature: "자연·힐링", active: "액티비티", food: "맛집·카페",
      culture: "문화·예술", shopping: "쇼핑·도심", healing: "휴식·온천",
    },
    constraint: {
      budget: "저예산", kids: "아이 동반", pet: "반려동물 동반",
      transit: "대중교통", indoor: "실내 위주", lowEnergy: "체력 적게",
    },
  };

  // ── 칩 토글 동작 연결 ──────────────────────────────
  document.querySelectorAll(".chips").forEach((group) => {
    const name = group.dataset.group;
    const multi = group.dataset.multi === "true";

    group.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const value = chip.dataset.value;

      if (chip.classList.contains("is-selected")) {
        chip.classList.remove("is-selected");
        selections[name].delete(value);
      } else {
        if (!multi) {
          // 단일 선택: 같은 그룹의 다른 선택 해제
          group.querySelectorAll(".chip.is-selected").forEach((c) => c.classList.remove("is-selected"));
          selections[name].clear();
        }
        chip.classList.add("is-selected");
        selections[name].add(value);
      }
    });
  });

  // ── 추천 매칭 로직 ────────────────────────────────
  function scoreActivity(act) {
    const region = [...selections.region];
    const duration = [...selections.duration];
    const themes = [...selections.theme];
    const constraints = [...selections.constraint];

    // 필수 조건: 지역
    if (region.length && !region.some((r) => act.region.includes(r))) return null;
    // 필수 조건: 기간
    if (duration.length && !duration.some((d) => act.duration.includes(d))) return null;
    // 필수 조건: 제한사항은 모두 충족해야 함 (AND)
    if (constraints.length && !constraints.every((c) => act.friendly.includes(c))) return null;

    // 점수: 테마 일치 개수 (테마 미선택 시 모두 동점)
    let score = 1;
    if (themes.length) {
      const matched = themes.filter((t) => act.theme.includes(t)).length;
      if (matched === 0) return null; // 테마를 골랐는데 하나도 안 맞으면 제외
      score += matched * 2;
    }
    return score;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function recommend() {
    if (selections.region.size === 0) {
      renderMessage("📍 먼저 <strong>지역</strong>을 하나 선택해 주세요.");
      return;
    }

    const scored = [];
    window.ACTIVITIES.forEach((act) => {
      const s = scoreActivity(act);
      if (s !== null) scored.push({ act, score: s });
    });

    if (scored.length === 0) {
      renderMessage("😢 조건에 맞는 활동을 찾지 못했어요. 제한사항이나 테마를 줄여보세요.");
      return;
    }

    // 점수 높은 순 정렬, 동점은 랜덤. 상위 3개 추천.
    shuffle(scored);
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3).map((x) => x.act);
    renderResults(top, scored.length);
  }

  // ── 렌더링 ────────────────────────────────────────
  function selectedSummary() {
    const tags = [];
    selections.region.forEach((v) => tags.push(LABELS.region[v]));
    selections.duration.forEach((v) => tags.push(LABELS.duration[v]));
    selections.theme.forEach((v) => tags.push(LABELS.theme[v]));
    selections.constraint.forEach((v) => tags.push(LABELS.constraint[v]));
    return tags;
  }

  function renderResults(list, total) {
    const results = document.getElementById("results");
    const summary = selectedSummary()
      .map((t) => `<span class="tag">${t}</span>`)
      .join("");

    const cards = list
      .map(
        (act) => `
        <article class="card">
          <h3 class="card__title">${act.title}</h3>
          <p class="card__desc">${act.desc}</p>
          <div class="card__meta">
            ${act.theme.map((t) => `<span class="tag tag--theme">${LABELS.theme[t]}</span>`).join("")}
          </div>
        </article>`
      )
      .join("");

    results.innerHTML = `
      <div class="results__head">
        <h2>추천 결과</h2>
        <div class="results__tags">${summary}</div>
        <p class="results__count">조건에 맞는 활동 ${total}개 중 추천 ${list.length}개</p>
      </div>
      <div class="cards">${cards}</div>
      <button type="button" class="btn btn--ghost" id="reroll">🎲 다른 추천 보기</button>
    `;

    document.getElementById("reroll").addEventListener("click", recommend);
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderMessage(html) {
    document.getElementById("results").innerHTML = `<p class="message">${html}</p>`;
  }

  // ── 폼 이벤트 ─────────────────────────────────────
  document.getElementById("selector").addEventListener("submit", (e) => {
    e.preventDefault();
    recommend();
  });

  document.getElementById("reset").addEventListener("click", () => {
    Object.values(selections).forEach((s) => s.clear());
    document.querySelectorAll(".chip.is-selected").forEach((c) => c.classList.remove("is-selected"));
    document.getElementById("results").innerHTML = "";
  });

  // ── AI 추천 (Google Gemini API · 무료) ─────────────
  const KEY_STORAGE = "weekend_gemini_key";
  const GEMINI_MODEL = "gemini-2.5-flash"; // 무료 사용량이 있는 모델
  const EMBEDDED_KEY = (window.GEMINI_API_KEY || "").trim(); // config.js에 내장한 키
  const apiKeyInput = document.getElementById("apiKey");
  const saveKeyCheckbox = document.getElementById("saveKey");

  if (EMBEDDED_KEY) {
    // 코드에 키가 내장돼 있으면 사용자 입력 UI는 필요 없음 — 숨김
    const aiConfig = document.querySelector(".ai-config");
    if (aiConfig) aiConfig.style.display = "none";
  } else {
    // 저장된 키 불러오기 (없으면 설정을 펼쳐 안내, 저장은 기본 ON)
    const storedKey = localStorage.getItem(KEY_STORAGE);
    if (storedKey) {
      apiKeyInput.value = storedKey;
      saveKeyCheckbox.checked = true;
    } else {
      saveKeyCheckbox.checked = true; // 처음 입력한 키가 바로 저장되도록
      const aiConfig = document.querySelector(".ai-config");
      if (aiConfig) aiConfig.open = true;
    }
    saveKeyCheckbox.addEventListener("change", () => {
      if (!saveKeyCheckbox.checked) localStorage.removeItem(KEY_STORAGE);
    });
  }

  // ── 사용 제한 (기기별 / localStorage 기반) ─────────
  // 주의: 진짜 IP별 제한은 서버가 필요합니다. 이건 이 브라우저 기준이라
  //       시크릿창·캐시삭제로 우회될 수 있습니다.
  const LIMIT_STORAGE = "weekend_ai_usage";
  const DAILY_LIMIT = 5; // 하루 5회
  const COOLDOWN_MS = 30 * 60 * 1000; // 초과 시 30분 대기

  function todayStr() {
    return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (현지 기준)
  }
  function loadUsage() {
    let u;
    try {
      u = JSON.parse(localStorage.getItem(LIMIT_STORAGE)) || {};
    } catch {
      u = {};
    }
    if (u.date !== todayStr()) u = { date: todayStr(), count: 0, cooldownUntil: 0 };
    return u;
  }
  function saveUsage(u) {
    localStorage.setItem(LIMIT_STORAGE, JSON.stringify(u));
  }
  // 호출 가능 여부 확인 — { allowed, msg }
  function checkLimit() {
    const u = loadUsage();
    const now = Date.now();
    if (u.cooldownUntil && now < u.cooldownUntil) {
      const mins = Math.ceil((u.cooldownUntil - now) / 60000);
      return {
        allowed: false,
        msg: `오늘 AI 추천 ${DAILY_LIMIT}회를 모두 사용했어요.\n약 ${mins}분 후에 다시 시도할 수 있어요.`,
      };
    }
    return { allowed: true };
  }
  // 성공한 호출 1회 기록
  function recordUse() {
    const u = loadUsage();
    u.count = (u.count || 0) + 1;
    if (u.count >= DAILY_LIMIT) u.cooldownUntil = Date.now() + COOLDOWN_MS;
    saveUsage(u);
  }

  function buildPrompt() {
    const tags = selectedSummary();
    return (
      "다음 조건에 맞는 한국 주말 나들이 '코스(동선)'를 3개 추천해 주세요.\n\n" +
      "조건: " + (tags.length ? tags.join(", ") : "조건 없음") + "\n\n" +
      "각 코스는 시간 순서대로 이어지는 간단한 흐름으로 구성하세요. " +
      "예) 성심당 → 엑스포타워 → 맛집 → 기념품가게\n" +
      "- flow: 4~6개의 장소·활동을 순서대로 나열 (실제 존재하는 구체적인 장소명 사용)\n" +
      "- 맛집 단계는 인기·유명하거나 최신 유행하는 식당의 실제 상호명을 넣어 주세요\n" +
      "- title: 코스를 한마디로 부르는 이름\n" +
      "- desc: 이 코스를 한 줄로 요약\n" +
      "한국어로 답해 주세요."
    );
  }

  // Gemini 구조화 출력 스키마 (타입은 대문자)
  const GEMINI_SCHEMA = {
    type: "OBJECT",
    properties: {
      recommendations: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            flow: { type: "ARRAY", items: { type: "STRING" } },
            desc: { type: "STRING" },
          },
          required: ["title", "flow", "desc"],
        },
      },
    },
    required: ["recommendations"],
  };

  // 브라우저에서 Gemini 직접 호출 — 본인 키 필요(개인용)
  async function fetchGemini(apiKey) {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      GEMINI_MODEL +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);
    return fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "당신은 한국의 주말 나들이를 추천하는 친절한 도우미입니다. " +
                "사용자가 고른 지역·기간·테마·제한사항에 실제로 맞는 활동만 제안하세요.",
            },
          ],
        },
        contents: [{ parts: [{ text: buildPrompt() }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_SCHEMA,
        },
      }),
    });
  }

  async function recommendAi() {
    const apiKey = EMBEDDED_KEY || apiKeyInput.value.trim();

    if (!apiKey) {
      renderMessage("🔑 아래 <strong>AI 설정</strong>을 열고 Gemini API 키를 입력해 주세요.");
      return;
    }
    if (selections.region.size === 0) {
      renderMessage("📍 먼저 <strong>지역</strong>을 하나 선택해 주세요.");
      return;
    }

    // 사용 제한 확인 (초과 시 경고창 + 30분 대기)
    const limit = checkLimit();
    if (!limit.allowed) {
      alert("⚠️ " + limit.msg);
      renderMessage("⏳ " + limit.msg.replace(/\n/g, "<br>"));
      return;
    }

    if (!EMBEDDED_KEY && saveKeyCheckbox.checked) localStorage.setItem(KEY_STORAGE, apiKey);

    renderMessage("🤖 AI가 추천을 고르는 중...");

    try {
      const res = await fetchGemini(apiKey);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API ${res.status}: ${errText}`);
      }

      recordUse(); // 성공한 호출만 카운트

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("응답에서 텍스트를 찾지 못했어요.");
      const parsed = JSON.parse(text);
      renderAiResults(parsed.recommendations || []);
    } catch (err) {
      renderMessage(
        "😢 AI 추천에 실패했어요.<br><small>" +
          String(err.message || err).replace(/</g, "&lt;") +
          "</small>"
      );
    }
  }

  function renderAiResults(list) {
    const results = document.getElementById("results");
    if (!list.length) {
      renderMessage("😢 AI가 조건에 맞는 활동을 찾지 못했어요.");
      return;
    }
    const summary = selectedSummary()
      .map((t) => `<span class="tag">${t}</span>`)
      .join("");
    const esc = (s) => String(s == null ? "" : s).replace(/</g, "&lt;");
    const cards = list
      .map((act) => {
        const steps = (act.flow || [])
          .map((s) => `<span class="flow__step">${esc(s)}</span>`)
          .join('<span class="flow__arrow">→</span>');
        return `
        <article class="card">
          <h3 class="card__title">${esc(act.title)}</h3>
          ${act.desc ? `<p class="card__desc">${esc(act.desc)}</p>` : ""}
          <div class="flow">${steps}</div>
        </article>`;
      })
      .join("");
    results.innerHTML = `
      <div class="results__head">
        <h2>🤖 AI 추천 결과</h2>
        <div class="results__tags">${summary}</div>
      </div>
      <div class="cards">${cards}</div>
    `;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("recommendAi").addEventListener("click", recommendAi);
})();

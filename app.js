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
  const apiKeyInput = document.getElementById("apiKey");
  const saveKeyCheckbox = document.getElementById("saveKey");

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

  function buildPrompt() {
    const tags = selectedSummary();
    return (
      "다음 조건에 맞는 한국 주말 활동을 추천해 주세요.\n\n" +
      "조건: " + (tags.length ? tags.join(", ") : "조건 없음") + "\n\n" +
      "실제로 가능한 구체적인 장소·활동 5개를 제안하고, 각 활동마다 한 줄 설명과 " +
      "어울리는 테마 키워드를 1~3개 붙여 주세요. 한국어로 답해 주세요."
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
            desc: { type: "STRING" },
            themes: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["title", "desc", "themes"],
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
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      renderMessage("🔑 아래 <strong>AI 설정</strong>을 열고 Gemini API 키를 입력해 주세요.");
      return;
    }
    if (selections.region.size === 0) {
      renderMessage("📍 먼저 <strong>지역</strong>을 하나 선택해 주세요.");
      return;
    }

    if (saveKeyCheckbox.checked) localStorage.setItem(KEY_STORAGE, apiKey);

    renderMessage("🤖 AI가 추천을 고르는 중...");

    try {
      const res = await fetchGemini(apiKey);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API ${res.status}: ${errText}`);
      }

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
    const cards = list
      .map(
        (act) => `
        <article class="card">
          <h3 class="card__title">${(act.title || "").replace(/</g, "&lt;")}</h3>
          <p class="card__desc">${(act.desc || "").replace(/</g, "&lt;")}</p>
          <div class="card__meta">
            ${(act.themes || [])
              .map((t) => `<span class="tag tag--theme">${String(t).replace(/</g, "&lt;")}</span>`)
              .join("")}
          </div>
        </article>`
      )
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

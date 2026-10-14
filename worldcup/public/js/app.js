'use strict';

/* ----------------------------- 테마(다크모드) ----------------------------- */
const THEME_KEY = 'wc_theme';
function applyTheme(t) {
  document.documentElement.setAttribute('data-bs-theme', t);
  document.getElementById('themeToggle').textContent = t === 'dark' ? '☀️' : '🌙';
}
function initTheme() {
  let t = localStorage.getItem(THEME_KEY);
  if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(t);
}
document.getElementById('themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-bs-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});
initTheme();

/* --------------------------------- 상태 --------------------------------- */
const USER_KEY = 'wc_user';
let user = null; // { dept, name }
let modal = null;
let currentMatch = null;

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) user = JSON.parse(raw);
  } catch (_) {
    user = null;
  }
}
function saveUser(u) {
  user = u;
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}

/* --------------------------------- 토스트 -------------------------------- */
let toastTimer = null;
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* --------------------------------- 화면 전환 ------------------------------ */
function show(view) {
  document.getElementById('setupView').classList.toggle('d-none', view !== 'setup');
  document.getElementById('matchView').classList.toggle('d-none', view !== 'match');
  const badge = document.getElementById('userBadge');
  if (user && view === 'match') {
    badge.textContent = `${user.dept} ${user.name}`;
    badge.classList.remove('d-none');
  } else {
    badge.classList.add('d-none');
  }
}

/* --------------------------- 최초 정보 입력 ------------------------------- */
document.getElementById('setupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const dept = document.getElementById('deptInput').value.trim();
  const name = document.getElementById('nameInput').value.trim();
  const err = document.getElementById('setupError');
  if (!dept || !name) {
    err.textContent = '팀과 이름을 모두 입력하세요.';
    err.classList.remove('d-none');
    return;
  }
  err.classList.add('d-none');
  saveUser({ dept, name });
  start();
});

document.getElementById('changeUser').addEventListener('click', () => {
  document.getElementById('deptInput').value = user ? user.dept : '';
  document.getElementById('nameInput').value = user ? user.name : '';
  show('setup');
});

/* --------------------------- 경기 목록 렌더링 ----------------------------- */
function fmtKickoff(k) {
  // "2026-06-18T21:00" -> "2026-06-18 21:00"
  return String(k).replace('T', ' ').slice(0, 16);
}

async function loadMatches() {
  const q = new URLSearchParams({ dept: user.dept, name: user.name });
  const res = await fetch('/api/matches?' + q.toString());
  const data = await res.json();
  renderMatches(data.matches || []);
}

function renderMatches(matches) {
  const list = document.getElementById('matchList');
  const empty = document.getElementById('matchEmpty');
  list.innerHTML = '';
  empty.classList.toggle('d-none', matches.length > 0);

  for (const m of matches) {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4';

    const submitted = !!m.myPrediction;
    let statusHtml;
    if (m.closed) {
      statusHtml = '<span class="badge text-bg-secondary">마감</span>';
    } else if (submitted) {
      statusHtml = '<span class="badge text-bg-success">제출완료 ✓</span>';
    } else {
      statusHtml = '<span class="badge text-bg-warning">미제출</span>';
    }

    const mineHtml = submitted
      ? `<div class="mt-2 fw-bold">내 예측: ${m.home_team} ${m.myPrediction.home_score} : ${m.myPrediction.away_score} ${m.away_team}</div>`
      : '';

    col.innerHTML = `
      <div class="card match-card shadow-sm ${m.closed ? 'closed' : ''}" data-id="${m.id}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <h2 class="h5 mb-1">${escapeHtml(m.home_team)} <span class="text-secondary">vs</span> ${escapeHtml(m.away_team)}</h2>
            ${statusHtml}
          </div>
          <div class="text-secondary small">🕘 ${fmtKickoff(m.kickoff)} 시작 · 시작 시 자동 마감</div>
          ${mineHtml}
          <div class="mt-3">
            <span class="btn btn-sm ${m.closed ? 'btn-outline-secondary disabled' : (submitted ? 'btn-outline-primary' : 'btn-primary')}">
              ${m.closed ? '예측 보기' : (submitted ? '예측 수정' : '예측하기')}
            </span>
          </div>
        </div>
      </div>`;

    col.querySelector('.match-card').addEventListener('click', () => openPredict(m));
    list.appendChild(col);
  }
}

/* ------------------------------ 예측 모달 -------------------------------- */
function openPredict(m) {
  currentMatch = m;
  document.getElementById('predictTitle').textContent = `${m.home_team} vs ${m.away_team}`;
  document.getElementById('predictKickoff').textContent = `🕘 ${fmtKickoff(m.kickoff)} 시작`;
  document.getElementById('homeLabel').textContent = m.home_team;
  document.getElementById('awayLabel').textContent = m.away_team;

  const home = document.getElementById('homeScore');
  const away = document.getElementById('awayScore');
  home.value = m.myPrediction ? m.myPrediction.home_score : '';
  away.value = m.myPrediction ? m.myPrediction.away_score : '';

  const closed = m.closed;
  document.getElementById('predictClosed').classList.toggle('d-none', !closed);
  home.disabled = closed;
  away.disabled = closed;
  const submit = document.getElementById('predictSubmit');
  submit.disabled = closed;
  submit.textContent = m.myPrediction ? '예측 수정' : '예측 저장';
  document.getElementById('predictError').classList.add('d-none');

  modal.show();
}

document.getElementById('predictForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentMatch) return;
  const err = document.getElementById('predictError');
  const hs = parseInt(document.getElementById('homeScore').value, 10);
  const as = parseInt(document.getElementById('awayScore').value, 10);
  if (!Number.isInteger(hs) || !Number.isInteger(as) || hs < 0 || as < 0) {
    err.textContent = '두 팀의 점수를 0 이상으로 입력하세요.';
    err.classList.remove('d-none');
    return;
  }
  err.classList.add('d-none');

  const submit = document.getElementById('predictSubmit');
  submit.disabled = true;
  try {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: currentMatch.id,
        dept: user.dept,
        name: user.name,
        home_score: hs,
        away_score: as,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      err.textContent = data.error || '저장에 실패했습니다.';
      err.classList.remove('d-none');
      submit.disabled = false;
      return;
    }
    modal.hide();
    toast(data.updated ? '예측을 수정했습니다.' : '예측을 저장했습니다.');
    await loadMatches();
  } catch (_) {
    err.textContent = '서버와 통신 중 오류가 발생했습니다.';
    err.classList.remove('d-none');
    submit.disabled = false;
  }
});

/* ------------------------------- 유틸 ----------------------------------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ------------------------------- 시작 ----------------------------------- */
function start() {
  show('match');
  loadMatches();
}

modal = new bootstrap.Modal(document.getElementById('predictModal'));
loadUser();
if (user && user.dept && user.name) {
  start();
} else {
  show('setup');
}

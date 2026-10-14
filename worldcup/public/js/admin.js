'use strict';

/* ----------------------------- 테마(다크모드) ----------------------------- */
const THEME_KEY = 'wc_theme';
function applyTheme(t) {
  document.documentElement.setAttribute('data-bs-theme', t);
  document.getElementById('themeToggle').textContent = t === 'dark' ? '☀️' : '🌙';
}
(function initTheme() {
  let t = localStorage.getItem(THEME_KEY);
  if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(t);
})();
document.getElementById('themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-bs-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

/* --------------------------------- 상태 --------------------------------- */
const TOKEN_KEY = 'wc_admin_token';
let token = localStorage.getItem(TOKEN_KEY) || '';
let allRows = [];

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

/* ----------------------------- API 헬퍼 --------------------------------- */
async function api(path, opts = {}) {
  const headers = Object.assign(
    { Authorization: 'Bearer ' + token },
    opts.headers || {}
  );
  const res = await fetch(path, Object.assign({}, opts, { headers }));
  if (res.status === 401) {
    logout();
    throw new Error('인증 만료');
  }
  return res;
}

/* ------------------------------ 로그인 ---------------------------------- */
function showLogin() {
  document.getElementById('loginView').classList.remove('d-none');
  document.getElementById('dashView').classList.add('d-none');
  document.getElementById('logoutBtn').classList.add('d-none');
}
function showDash() {
  document.getElementById('loginView').classList.add('d-none');
  document.getElementById('dashView').classList.remove('d-none');
  document.getElementById('logoutBtn').classList.remove('d-none');
  loadAll();
  loadStats();
  loadMatches();
}
function logout() {
  token = '';
  localStorage.removeItem(TOKEN_KEY);
  showLogin();
}
document.getElementById('logoutBtn').addEventListener('click', logout);

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('pwInput').value;
  const err = document.getElementById('loginError');
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (!res.ok) {
      err.textContent = data.error || '로그인 실패';
      err.classList.remove('d-none');
      return;
    }
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    document.getElementById('pwInput').value = '';
    err.classList.add('d-none');
    showDash();
  } catch (_) {
    err.textContent = '서버 오류';
    err.classList.remove('d-none');
  }
});

/* ------------------------------ 탭 전환 --------------------------------- */
document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
    document.getElementById('tab-' + tab).classList.remove('d-none');
  });
});

/* --------------------------- 전체 조회 ---------------------------------- */
function fmtKickoff(k) {
  return String(k).replace('T', ' ').slice(0, 16);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function loadAll() {
  const res = await api('/api/admin/predictions');
  const data = await res.json();
  allRows = data.predictions || [];
  renderAll();
}
function renderAll() {
  const filter = document.getElementById('allFilter').value.trim().toLowerCase();
  const rows = filter
    ? allRows.filter((r) =>
        (r.dept + r.name + r.match).toLowerCase().includes(filter))
    : allRows;
  document.getElementById('allCount').textContent = `${rows.length}건`;
  const body = document.getElementById('allBody');
  if (rows.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">데이터가 없습니다.</td></tr>';
    return;
  }
  body.innerHTML = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.dept)}</td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.match)}</td>
        <td class="fw-bold">${r.score}</td>
        <td class="text-secondary small">${escapeHtml(r.updated_at || '')}</td>
      </tr>`
    )
    .join('');
}
document.getElementById('allFilter').addEventListener('input', renderAll);

document.getElementById('exportBtn').addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/export');
    if (!res.ok) {
      toast('다운로드 실패', true);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `worldcup_predictions_${stamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('엑셀 파일을 다운로드했습니다.');
  } catch (_) {
    toast('다운로드 중 오류', true);
  }
});

/* --------------------------- 경기별 통계 -------------------------------- */
async function loadStats() {
  const res = await api('/api/admin/stats');
  const data = await res.json();
  const box = document.getElementById('statsBox');
  const stats = data.stats || [];
  if (stats.length === 0) {
    box.innerHTML = '<p class="text-secondary">등록된 경기가 없습니다.</p>';
    return;
  }
  box.innerHTML = stats
    .map((s) => {
      const max = s.scores.reduce((m, x) => Math.max(m, x.count), 0) || 1;
      const bars =
        s.scores.length === 0
          ? '<p class="text-secondary small mb-0">아직 예측이 없습니다.</p>'
          : s.scores
              .map(
                (x) => `<div class="d-flex align-items-center gap-2 mb-1">
                  <div class="fw-bold text-end" style="width:64px">${x.score}</div>
                  <div class="stat-bar" style="width:${(x.count / max) * 100}%"></div>
                  <div class="small text-secondary">${x.count}명</div>
                </div>`
              )
              .join('');
      return `<div class="card shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h3 class="h6 mb-0">${escapeHtml(s.label)}
              ${s.closed ? '<span class="badge text-bg-secondary ms-1">마감</span>' : '<span class="badge text-bg-warning ms-1">진행중</span>'}
            </h3>
            <span class="text-secondary small">총 ${s.total}명 · ${fmtKickoff(s.kickoff)}</span>
          </div>
          ${bars}
        </div>
      </div>`;
    })
    .join('');
}

/* --------------------------- 경기 설정 ---------------------------------- */
async function loadMatches() {
  const res = await api('/api/admin/matches');
  const data = await res.json();
  const list = document.getElementById('matchAdminList');
  const matches = data.matches || [];
  if (matches.length === 0) {
    list.innerHTML = '<p class="text-secondary">등록된 경기가 없습니다.</p>';
    return;
  }
  list.innerHTML = matches
    .map(
      (m) => `<div class="card shadow-sm">
        <div class="card-body py-2 d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-bold">${escapeHtml(m.label)}
              ${m.closed ? '<span class="badge text-bg-secondary ms-1">마감</span>' : '<span class="badge text-bg-success ms-1">접수중</span>'}
            </div>
            <div class="text-secondary small">🕘 ${fmtKickoff(m.kickoff)} · 예측 ${m.count}건</div>
          </div>
          <button class="btn btn-outline-danger btn-sm" data-del="${m.id}">삭제</button>
        </div>
      </div>`
    )
    .join('');
  list.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => deleteMatch(btn.dataset.del));
  });
}

async function deleteMatch(id) {
  if (!confirm('이 경기를 삭제하면 관련 예측도 모두 삭제됩니다. 계속할까요?')) return;
  const res = await api('/api/admin/matches/' + id, { method: 'DELETE' });
  if (res.ok) {
    toast('경기를 삭제했습니다.');
    loadMatches();
    loadAll();
    loadStats();
  } else {
    toast('삭제 실패', true);
  }
}

document.getElementById('matchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('matchError');
  const home_team = document.getElementById('homeTeam').value.trim() || '대한민국';
  const away_team = document.getElementById('awayTeam').value.trim();
  const kickoff = document.getElementById('kickoff').value; // "2026-06-18T21:00"
  if (!away_team || !kickoff) {
    err.textContent = '상대팀과 경기일시를 입력하세요.';
    err.classList.remove('d-none');
    return;
  }
  err.classList.add('d-none');
  const res = await api('/api/admin/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ home_team, away_team, kickoff }),
  });
  const data = await res.json();
  if (!res.ok) {
    err.textContent = data.error || '추가 실패';
    err.classList.remove('d-none');
    return;
  }
  document.getElementById('awayTeam').value = '';
  document.getElementById('kickoff').value = '';
  toast('경기를 추가했습니다.');
  loadMatches();
  loadStats();
});

/* ------------------------------- 시작 ----------------------------------- */
if (token) {
  showDash();
} else {
  showLogin();
}

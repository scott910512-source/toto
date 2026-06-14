'use strict';

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const ExcelJS = require('exceljs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
// 관리자 비밀번호: 환경변수로 덮어쓸 수 있음. 운영 시 반드시 변경하세요.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
// 한국 표준시(KST) 기준으로 경기 시작/마감을 판정합니다.
const KST_OFFSET = '+09:00';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------------------------------------------------------ *
 *  유틸
 * ------------------------------------------------------------------ */

// "2026-06-18T21:00" -> Date (KST 기준). 마감 여부 판정에 사용.
function kickoffDate(kickoff) {
  let s = String(kickoff).trim();
  // 초가 없으면 보정
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s += ':00';
  return new Date(s + KST_OFFSET);
}

function isClosed(kickoff) {
  const d = kickoffDate(kickoff);
  if (isNaN(d.getTime())) return false;
  return Date.now() >= d.getTime();
}

function matchLabel(m) {
  return `${m.home_team} vs ${m.away_team}`;
}

function validScore(v) {
  return Number.isInteger(v) && v >= 0 && v <= 99;
}

/* ------------------------------------------------------------------ *
 *  관리자 인증 (간단 토큰)
 * ------------------------------------------------------------------ */

const adminTokens = new Map(); // token -> expiresAt(ms)
const TOKEN_TTL = 1000 * 60 * 60 * 8; // 8시간

function issueToken() {
  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.set(token, Date.now() + TOKEN_TTL);
  return token;
}

function requireAdmin(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const exp = adminTokens.get(token);
  if (!exp || exp < Date.now()) {
    if (exp) adminTokens.delete(token);
    return res.status(401).json({ error: '관리자 인증이 필요합니다.' });
  }
  next();
}

/* ------------------------------------------------------------------ *
 *  공개 API
 * ------------------------------------------------------------------ */

// 경기 목록 (+ dept/name 주면 본인 제출 내역 포함)
app.get('/api/matches', (req, res) => {
  const dept = (req.query.dept || '').trim();
  const name = (req.query.name || '').trim();

  const matches = db.prepare('SELECT * FROM matches ORDER BY kickoff ASC').all();

  let mine = {};
  if (dept && name) {
    const rows = db
      .prepare('SELECT * FROM predictions WHERE dept = ? AND name = ?')
      .all(dept, name);
    for (const r of rows) mine[r.match_id] = r;
  }

  const result = matches.map((m) => {
    const p = mine[m.id];
    return {
      id: m.id,
      home_team: m.home_team,
      away_team: m.away_team,
      kickoff: m.kickoff,
      closed: isClosed(m.kickoff),
      label: matchLabel(m),
      myPrediction: p
        ? { home_score: p.home_score, away_score: p.away_score, updated_at: p.updated_at }
        : null,
    };
  });

  res.json({ matches: result });
});

// 예측 저장/수정 (동일 경기 + dept + name 조합은 1행만 유지)
app.post('/api/predictions', (req, res) => {
  const { match_id, dept, name, home_score, away_score } = req.body || {};
  const mid = Number(match_id);
  const d = (dept || '').trim();
  const n = (name || '').trim();
  const hs = Number(home_score);
  const as = Number(away_score);

  if (!mid || !d || !n) {
    return res.status(400).json({ error: '팀(부서)·이름·경기를 모두 입력하세요.' });
  }
  if (!validScore(hs) || !validScore(as)) {
    return res.status(400).json({ error: '점수는 0~99 사이의 정수여야 합니다.' });
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(mid);
  if (!match) return res.status(404).json({ error: '존재하지 않는 경기입니다.' });
  if (isClosed(match.kickoff)) {
    return res.status(403).json({ error: '경기가 시작되어 예측이 마감되었습니다.' });
  }

  const existing = db
    .prepare('SELECT * FROM predictions WHERE match_id = ? AND dept = ? AND name = ?')
    .get(mid, d, n);

  if (existing) {
    db.prepare(
      `UPDATE predictions
         SET home_score = ?, away_score = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(hs, as, existing.id);
  } else {
    db.prepare(
      `INSERT INTO predictions (match_id, dept, name, home_score, away_score)
       VALUES (?, ?, ?, ?, ?)`
    ).run(mid, d, n, hs, as);
  }

  res.json({ ok: true, updated: !!existing });
});

/* ------------------------------------------------------------------ *
 *  관리자 API
 * ------------------------------------------------------------------ */

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  }
  res.json({ token: issueToken() });
});

// 전체 조회
app.get('/api/admin/predictions', requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.id, p.dept, p.name, p.home_score, p.away_score, p.updated_at,
              m.id AS match_id, m.home_team, m.away_team, m.kickoff
         FROM predictions p
         JOIN matches m ON m.id = p.match_id
        ORDER BY m.kickoff ASC, p.dept ASC, p.name ASC`
    )
    .all();

  res.json({
    predictions: rows.map((r) => ({
      id: r.id,
      dept: r.dept,
      name: r.name,
      match_id: r.match_id,
      match: `${r.home_team} vs ${r.away_team}`,
      home_team: r.home_team,
      away_team: r.away_team,
      home_score: r.home_score,
      away_score: r.away_score,
      score: `${r.home_score}:${r.away_score}`,
      updated_at: r.updated_at,
    })),
  });
});

// 경기별 통계 (스코어별 인원수, 많은 순)
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const matches = db.prepare('SELECT * FROM matches ORDER BY kickoff ASC').all();
  const stats = matches.map((m) => {
    const rows = db
      .prepare(
        `SELECT home_score, away_score, COUNT(*) AS cnt
           FROM predictions
          WHERE match_id = ?
          GROUP BY home_score, away_score
          ORDER BY cnt DESC, home_score DESC, away_score DESC`
      )
      .all(m.id);
    const total = rows.reduce((s, r) => s + r.cnt, 0);
    return {
      match_id: m.id,
      label: matchLabel(m),
      home_team: m.home_team,
      away_team: m.away_team,
      kickoff: m.kickoff,
      closed: isClosed(m.kickoff),
      total,
      scores: rows.map((r) => ({
        score: `${r.home_score}:${r.away_score}`,
        home_score: r.home_score,
        away_score: r.away_score,
        count: r.cnt,
      })),
    };
  });
  res.json({ stats });
});

// 엑셀(xlsx) 전체 다운로드
app.get('/api/admin/export', requireAdmin, async (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.dept, p.name, m.home_team, m.away_team, p.home_score, p.away_score,
              m.kickoff, p.updated_at
         FROM predictions p
         JOIN matches m ON m.id = p.match_id
        ORDER BY m.kickoff ASC, p.dept ASC, p.name ASC`
    )
    .all();

  const wb = new ExcelJS.Workbook();
  wb.creator = '월드컵 예측 이벤트';
  const ws = wb.addWorksheet('예측 전체');

  ws.columns = [
    { header: '팀(부서)', key: 'dept', width: 16 },
    { header: '이름', key: 'name', width: 14 },
    { header: '경기', key: 'match', width: 28 },
    { header: '예측 스코어', key: 'score', width: 14 },
    { header: '경기일시', key: 'kickoff', width: 20 },
    { header: '제출/수정시각', key: 'updated_at', width: 22 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const r of rows) {
    ws.addRow({
      dept: r.dept,
      name: r.name,
      match: `${r.home_team} vs ${r.away_team}`,
      score: `${r.home_score}:${r.away_score}`,
      kickoff: r.kickoff,
      updated_at: r.updated_at,
    });
  }

  // 경기별 통계 시트
  const ws2 = wb.addWorksheet('경기별 통계');
  ws2.columns = [
    { header: '경기', key: 'match', width: 28 },
    { header: '스코어', key: 'score', width: 12 },
    { header: '인원수', key: 'count', width: 10 },
  ];
  ws2.getRow(1).font = { bold: true };
  const matches = db.prepare('SELECT * FROM matches ORDER BY kickoff ASC').all();
  for (const m of matches) {
    const srows = db
      .prepare(
        `SELECT home_score, away_score, COUNT(*) AS cnt
           FROM predictions WHERE match_id = ?
          GROUP BY home_score, away_score ORDER BY cnt DESC`
      )
      .all(m.id);
    if (srows.length === 0) {
      ws2.addRow({ match: matchLabel(m), score: '-', count: 0 });
    } else {
      for (const s of srows) {
        ws2.addRow({
          match: matchLabel(m),
          score: `${s.home_score}:${s.away_score}`,
          count: s.cnt,
        });
      }
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="worldcup_predictions_${stamp}.xlsx"`
  );
  await wb.xlsx.write(res);
  res.end();
});

// 경기 추가
app.post('/api/admin/matches', requireAdmin, (req, res) => {
  const { home_team, away_team, kickoff } = req.body || {};
  const home = (home_team || '대한민국').trim();
  const away = (away_team || '').trim();
  const ko = (kickoff || '').trim();

  if (!away || !ko) {
    return res.status(400).json({ error: '상대팀과 경기일시를 입력하세요.' });
  }
  if (isNaN(kickoffDate(ko).getTime())) {
    return res.status(400).json({ error: '경기일시 형식이 올바르지 않습니다.' });
  }

  const info = db
    .prepare('INSERT INTO matches (home_team, away_team, kickoff) VALUES (?, ?, ?)')
    .run(home, away, ko);
  res.json({ ok: true, id: info.lastInsertRowid });
});

// 경기 목록 (관리자용 - 마감 여부 포함)
app.get('/api/admin/matches', requireAdmin, (req, res) => {
  const matches = db.prepare('SELECT * FROM matches ORDER BY kickoff ASC').all();
  res.json({
    matches: matches.map((m) => {
      const cnt = db
        .prepare('SELECT COUNT(*) AS c FROM predictions WHERE match_id = ?')
        .get(m.id).c;
      return {
        id: m.id,
        label: matchLabel(m),
        home_team: m.home_team,
        away_team: m.away_team,
        kickoff: m.kickoff,
        closed: isClosed(m.kickoff),
        count: cnt,
      };
    }),
  });
});

// 경기 삭제 (관련 예측도 함께 삭제됨)
app.delete('/api/admin/matches/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM matches WHERE id = ?').run(id);
  res.json({ ok: true, deleted: info.changes });
});

app.listen(PORT, () => {
  console.log(`월드컵 예측 이벤트 서버 실행 중: http://localhost:${PORT}`);
});

'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'predictions.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team   TEXT NOT NULL DEFAULT '대한민국',
    away_team   TEXT NOT NULL,
    -- 경기 시작 시각: ISO 문자열 (예: 2026-06-18T21:00). 로컬(KST) 기준 입력.
    kickoff     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id     INTEGER NOT NULL,
    dept         TEXT NOT NULL,
    name         TEXT NOT NULL,
    home_score   INTEGER NOT NULL,
    away_score   INTEGER NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (match_id, dept, name),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
`);

module.exports = db;

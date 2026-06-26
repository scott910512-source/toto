'use strict';

const fs = require('fs');
const path = require('path');
const { parseCsv, stringifyCsv } = require('./csv');
const { DATA_DIR } = require('../config');

// 각 테이블(CSV 파일)의 컬럼 정의. 저장 순서를 고정한다.
const TABLES = {
  users: ['id', 'passwordHash', 'name', 'role', 'status', 'createdAt', 'approvedAt', 'approvedBy'],
  // 품목 마스터(원/부재료 공통): 안전재고 목표값을 품목 단위로 관리(관리자 전용)
  items: ['id', 'category', 'name', 'unit', 'safetyStock', 'note', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt'],
  // 원재료: Lot 단위로 개별 관리(품목으로 취합)
  raw_materials: ['id', 'itemName', 'lotNo', 'quantity', 'unit', 'vendor', 'receivedDate', 'note', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt'],
  sub_materials: ['id', 'name', 'receivedDate', 'lotNo', 'vendor', 'unit', 'initialWeight', 'weight', 'note', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt'],
  // Canister: 현재 내용물(제품)+무게 보유, 반입/반출로 수불
  canisters: ['id', 'canisterNo', 'size', 'sizeEtc', 'location', 'locationEtc', 'status', 'statusEtc', 'content', 'weight', 'note', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt'],
  canister_history: ['id', 'canisterId', 'canisterNo', 'date', 'type', 'content', 'weight', 'location', 'status', 'note', 'createdBy', 'createdAt'],
  transactions: ['id', 'materialType', 'materialId', 'materialName', 'lotNo', 'content', 'type', 'quantity', 'unit', 'balanceAfter', 'note', 'createdBy', 'createdAt'],
  settings: ['key', 'value'],
};

function headersOf(name) {
  const h = TABLES[name];
  if (!h) throw new Error(`Unknown table: ${name}`);
  return h;
}

function filePath(name) {
  return path.join(DATA_DIR, `${name}.csv`);
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 파일별 비동기 뮤텍스: 읽기-수정-쓰기 충돌을 직렬화한다.
const locks = new Map();
function withLock(name, fn) {
  const prev = locks.get(name) || Promise.resolve();
  let release;
  const gate = new Promise((res) => {
    release = res;
  });
  // 다음 호출자는 이 gate가 해제될 때까지 대기한다.
  locks.set(name, prev.then(() => gate));
  // 이전 작업이 끝난 뒤 fn 실행(이전 작업 오류는 순서 보장 목적상 무시).
  const run = prev.catch(() => {}).then(() => fn());
  // fn이 끝나면 gate를 풀어 다음 호출자가 진행하도록 한다.
  run.then(
    () => release(),
    () => release(),
  );
  return run;
}

function readSync(name) {
  headersOf(name);
  if (!fs.existsSync(filePath(name))) return [];
  return parseCsv(fs.readFileSync(filePath(name), 'utf8'));
}

function writeSync(name, rows) {
  ensureDataDir();
  fs.writeFileSync(filePath(name), stringifyCsv(headersOf(name), rows), 'utf8');
}

/** 테이블 전체를 읽어 객체 배열로 반환한다. */
function readTable(name) {
  return withLock(name, () => readSync(name));
}

/** 테이블을 통째로 덮어쓴다. */
function writeTable(name, rows) {
  return withLock(name, () => {
    writeSync(name, rows);
    return rows;
  });
}

/**
 * 읽기-수정-쓰기를 원자적으로 수행한다. fn(rows)에서 rows를 직접 변형하면 저장된다.
 * fn의 반환값이 그대로 mutate의 반환값이 된다.
 */
function mutate(name, fn) {
  return withLock(name, () => {
    const rows = readSync(name);
    const result = fn(rows);
    writeSync(name, rows);
    return result === undefined ? rows : result;
  });
}

module.exports = {
  TABLES,
  headersOf,
  filePath,
  ensureDataDir,
  readTable,
  writeTable,
  mutate,
  _readSync: readSync,
  _writeSync: writeSync,
};

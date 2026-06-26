'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'chem-test-'));
process.env.DATA_DIR = TMP;
process.env.SESSION_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { createApp } = require('../src/app');
const { ensureSeed } = require('../src/lib/seed');

let app;
let admin;
let user;

beforeAll(async () => {
  ensureSeed({ force: true });
  app = createApp();
  admin = request.agent(app);
  user = request.agent(app);
  await admin.post('/api/auth/login').send({ id: 'admin', password: 'admin1234' }).expect(200);
  await user.post('/api/auth/login').send({ id: 'user1', password: 'user1234' }).expect(200);
});

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe('인증/품목', () => {
  test('미인증 401', async () => {
    await request(app).get('/api/raw-materials').expect(401);
  });
  test('관리자 품목 등록 / 사용자 불가', async () => {
    await admin.post('/api/items').send({ category: 'raw', name: '아세톤', unit: 'L', safetyStock: 100, vendor: 'A상사' }).expect(201);
    await user.post('/api/items').send({ category: 'raw', name: '메탄올', unit: 'L' }).expect(403);
  });
});

describe('원재료 필수값/완료숨김', () => {
  let acetoneId;
  test('입고일 누락 시 400(필수값)', async () => {
    await admin.post('/api/raw-materials').send({ itemName: '아세톤', lotNo: 'AC-1', quantity: 100, unit: 'L' }).expect(400);
  });
  test('정상 등록', async () => {
    const res = await admin.post('/api/raw-materials').send({ itemName: '아세톤', lotNo: 'AC-1', quantity: 100, unit: 'L', receivedDate: '2026-06-25' }).expect(201);
    acetoneId = res.body.item.id;
  });
  test('단일 Lot 출고는 선입선출 위반 아님', async () => {
    await admin.post(`/api/raw-materials/${acetoneId}/transaction`).send({ type: '출고', quantity: 100 }).expect(201);
  });
  test('잔량 0 Lot은 목록에서 숨김, all=1에는 표시', async () => {
    const def = await admin.get('/api/raw-materials?q=AC-1').expect(200);
    expect(def.body.items.some((r) => r.id === acetoneId)).toBe(false);
    const all = await admin.get('/api/raw-materials?q=AC-1&all=1').expect(200);
    expect(all.body.items.some((r) => r.id === acetoneId)).toBe(true);
  });
});

describe('선입선출(FIFO) 경고/이상발생', () => {
  let lateId;
  beforeAll(async () => {
    const list = await admin.get('/api/raw-materials?all=1').expect(200);
    lateId = list.body.items.find((r) => r.lotNo === 'T-2026-002').id; // 06-15 (더 늦은 Lot)
  });
  test('더 빠른 Lot 존재 시 출고는 409 경고', async () => {
    const res = await admin.post(`/api/raw-materials/${lateId}/transaction`).send({ type: '출고', quantity: 10 }).expect(409);
    expect(res.body.fifoWarning).toBe(true);
    expect(res.body.earliest.lotNo).toBe('T-2026-001');
  });
  test('force=true 강제사용 시 처리 + 이상발생 기록', async () => {
    await admin.post(`/api/raw-materials/${lateId}/transaction`).send({ type: '출고', quantity: 10, force: true }).expect(201);
    const an = await admin.get('/api/anomalies').expect(200);
    expect(an.body.items.some((a) => a.type === '선입선출 오류' && a.itemName === '톨루엔')).toBe(true);
  });
});

describe('경고/대시보드', () => {
  test('대시보드 요약(상태 포함)', async () => {
    const res = await admin.get('/api/dashboard').expect(200);
    expect(res.body.rawSummary.find((r) => r.name === '촉매펠릿').state).toBe('부족');
    expect(Array.isArray(res.body.canisterSummary)).toBe(true);
  });
  test('활성 경고 + 확인(ack)', async () => {
    const w = await admin.get('/api/warnings').expect(200);
    expect(w.body.items.length).toBeGreaterThanOrEqual(1);
    const key = w.body.items[0].key;
    await admin.post('/api/warnings/ack').send({ key, content: w.body.items[0].content }).expect(200);
    const w2 = await admin.get('/api/warnings').expect(200);
    expect(w2.body.items.find((x) => x.key === key).ackedByMe).toBe(true);
  });
});

describe('Task 관리', () => {
  let taskId;
  test('등록(담당자 목록 조회 포함)', async () => {
    const opt = await user.get('/api/users/options').expect(200);
    expect(opt.body.items.length).toBeGreaterThanOrEqual(1);
    const res = await user.post('/api/tasks').send({ title: '라인 점검', category: '공정', priority: '상', assignee: 'user1', dueDate: '2026-07-01', status: '대기' }).expect(201);
    taskId = res.body.item.id;
  });
  test('완료 처리 시 기본 목록에서 숨김, all=1에 표시', async () => {
    await user.patch(`/api/tasks/${taskId}`).send({ status: '완료' }).expect(200);
    const def = await user.get('/api/tasks').expect(200);
    expect(def.body.items.some((t) => t.id === taskId)).toBe(false);
    const all = await user.get('/api/tasks?all=1').expect(200);
    expect(all.body.items.some((t) => t.id === taskId)).toBe(true);
  });
});

describe('트렌드', () => {
  test('품목별 입출고 집계', async () => {
    const res = await admin.get('/api/trends?category=raw&period=month').expect(200);
    expect(res.body.period).toBe('month');
    expect(res.body.items.some((i) => i.name === '톨루엔')).toBe(true);
  });
});

describe('권한(삭제=관리자)', () => {
  test('사용자 등록 가능 / 삭제는 관리자', async () => {
    const res = await user.post('/api/raw-materials').send({ itemName: '톨루엔', lotNo: 'U-9', quantity: 3, unit: 'kg', receivedDate: '2026-06-26' }).expect(201);
    await user.delete(`/api/raw-materials/${res.body.item.id}`).expect(403);
    await admin.delete(`/api/raw-materials/${res.body.item.id}`).expect(200);
  });
});

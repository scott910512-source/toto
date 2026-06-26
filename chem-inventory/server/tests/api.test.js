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

describe('헬스/인증', () => {
  test('health', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.ok).toBe(true);
  });
  test('미인증 401', async () => {
    await request(app).get('/api/raw-materials').expect(401);
  });
  test('가입 pending → 로그인 불가', async () => {
    await request(app).post('/api/auth/signup').send({ id: 'tester', password: 'pass12', name: '테스터' }).expect(201);
    await request(app).post('/api/auth/login').send({ id: 'tester', password: 'pass12' }).expect(400);
  });
});

describe('품목 마스터 (관리자 전용)', () => {
  test('관리자는 품목 등록', async () => {
    await admin.post('/api/items').send({ category: 'raw', name: '아세톤', unit: 'L', safetyStock: 100 }).expect(201);
  });
  test('일반 사용자는 품목 등록 불가(403)', async () => {
    await user.post('/api/items').send({ category: 'raw', name: '메탄올', unit: 'L', safetyStock: 50 }).expect(403);
  });
  test('품목 목록(category 필터)', async () => {
    const res = await admin.get('/api/items?category=raw').expect(200);
    expect(res.body.items.every((i) => i.category === 'raw')).toBe(true);
    expect(res.body.items.some((i) => i.name === '톨루엔')).toBe(true);
  });
});

describe('원재료 (Lot 단위)', () => {
  let id;
  test('Lot 등록 + 목록', async () => {
    const res = await admin.post('/api/raw-materials').send({ itemName: '톨루엔', lotNo: 'T-TEST', quantity: 100, unit: 'kg', vendor: 'A상사', receivedDate: '2026-06-25' }).expect(201);
    id = res.body.item.id;
    const list = await admin.get('/api/raw-materials').expect(200);
    expect(list.body.items.some((r) => r.id === id)).toBe(true);
  });
  test('출고 초과 → 400', async () => {
    const res = await admin.post(`/api/raw-materials/${id}/transaction`).send({ type: '출고', quantity: 99999 }).expect(400);
    expect(res.body.error).toMatch(/초과/);
  });
  test('정상 출고 → 잔량 차감', async () => {
    await admin.post(`/api/raw-materials/${id}/transaction`).send({ type: '출고', quantity: 30 }).expect(201);
    const list = await admin.get('/api/raw-materials').expect(200);
    expect(Number(list.body.items.find((r) => r.id === id).quantity)).toBe(70);
  });
  test('품목별 현황 요약(재고수준%/최근사용)', async () => {
    const res = await admin.get('/api/raw-materials/summary').expect(200);
    const tol = res.body.items.find((s) => s.name === '톨루엔');
    expect(tol).toBeTruthy();
    expect(tol.level).not.toBeNull();
    expect(tol.lastUsed).not.toBe('');
  });
  test('CSV Export BOM', async () => {
    const res = await admin.get('/api/raw-materials/export').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
  });
});

describe('부재료 품목별 내역현황', () => {
  test('품목 묶음 + Lot 입고일 정렬', async () => {
    const res = await admin.get('/api/sub-materials/by-item').expect(200);
    const padd = res.body.items.find((g) => g.name === '실링패드');
    expect(padd.lots).toBeGreaterThanOrEqual(2);
    const dates = padd.items.map((i) => i.receivedDate);
    expect(dates).toEqual([...dates].sort());
  });
});

describe('Canister 내용물 수불', () => {
  test('단건 조회(내용물/무게)', async () => {
    const res = await admin.get('/api/canisters/cn_0001').expect(200);
    expect(res.body.item.content).toBe('톨루엔');
    expect(Number(res.body.item.weight)).toBe(180);
  });
  test('반출 시 무게 차감 + 이력(내용물 포함)', async () => {
    await admin.post('/api/canisters/cn_0001/move').send({ type: '반출', weight: 50, unit: 'kg', note: '공정 사용' }).expect(201);
    const c = await admin.get('/api/canisters/cn_0001').expect(200);
    expect(Number(c.body.item.weight)).toBe(130);
    const hist = await admin.get('/api/canisters/cn_0001/history').expect(200);
    expect(hist.body.items[0].type).toBe('반출');
    expect(hist.body.items[0].content).toBe('톨루엔');
  });
  test('반출 초과 → 400', async () => {
    await admin.post('/api/canisters/cn_0001/move').send({ type: '반출', weight: 99999 }).expect(400);
  });
  test('Canister 등록 시 반입 이력 자동 생성', async () => {
    const res = await admin.post('/api/canisters').send({ canisterNo: 'CN-900', size: '100L', location: '2공장현장', status: '수령', content: '벤젠', weight: 20 }).expect(201);
    const hist = await admin.get(`/api/canisters/${res.body.item.id}/history`).expect(200);
    expect(hist.body.items[0].type).toBe('반입');
    expect(hist.body.items[0].content).toBe('벤젠');
  });
});

describe('수불내역 (전체)', () => {
  test('원·부·Canister가 모두 포함된다', async () => {
    const res = await admin.get('/api/transactions').expect(200);
    const types = new Set(res.body.items.map((t) => t.materialType));
    expect(types.has('raw')).toBe(true);
    expect(types.has('sub')).toBe(true);
    expect(types.has('canister')).toBe(true);
  });
  test('Canister 필터', async () => {
    const res = await admin.get('/api/transactions?materialType=canister').expect(200);
    expect(res.body.items.every((t) => t.materialType === 'canister')).toBe(true);
  });
});

describe('대시보드/설정', () => {
  test('안전재고 미달(원재료) 카운트', async () => {
    const res = await admin.get('/api/dashboard').expect(200);
    expect(res.body.rawMaterials.belowCount).toBeGreaterThanOrEqual(1);
    expect(res.body.subMaterials.items.length).toBeGreaterThanOrEqual(1);
  });
  test('안전재고 비율(%) 변경은 관리자만', async () => {
    await admin.patch('/api/settings').send({ safetyRatioPercent: 110 }).expect(200);
    await user.patch('/api/settings').send({ safetyRatioPercent: 50 }).expect(403);
  });
});

describe('권한 (수정=모두 / 삭제=관리자)', () => {
  let rmId;
  beforeAll(async () => {
    const res = await admin.post('/api/raw-materials').send({ itemName: '톨루엔', lotNo: 'DEL-1', quantity: 5, unit: 'kg' }).expect(201);
    rmId = res.body.item.id;
  });
  test('사용자도 등록 가능', async () => {
    await user.post('/api/raw-materials').send({ itemName: '톨루엔', lotNo: 'U-1', quantity: 3, unit: 'kg' }).expect(201);
  });
  test('사용자도 수정 가능', async () => {
    await user.patch(`/api/raw-materials/${rmId}`).send({ note: '사용자 수정' }).expect(200);
  });
  test('삭제는 관리자만', async () => {
    await user.delete(`/api/raw-materials/${rmId}`).expect(403);
    await admin.delete(`/api/raw-materials/${rmId}`).expect(200);
  });
  test('관리자 승인 흐름', async () => {
    await admin.post('/api/users/tester/approve').send({ role: 'user' }).expect(200);
    await request(app).post('/api/auth/login').send({ id: 'tester', password: 'pass12' }).expect(200);
  });
});

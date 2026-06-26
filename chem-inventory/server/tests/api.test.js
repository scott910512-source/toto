'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

// 테스트 전용 임시 데이터 폴더를 config 로드 전에 지정한다.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'chem-test-'));
process.env.DATA_DIR = TMP;
process.env.SESSION_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { createApp } = require('../src/app');
const { ensureSeed } = require('../src/lib/seed');

let app;
let admin;

beforeAll(async () => {
  ensureSeed({ force: true });
  app = createApp();
  admin = request.agent(app);
  await admin.post('/api/auth/login').send({ id: 'admin', password: 'admin1234' }).expect(200);
});

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe('헬스/인증', () => {
  test('health', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.ok).toBe(true);
  });

  test('미인증 접근은 401', async () => {
    await request(app).get('/api/raw-materials').expect(401);
  });

  test('가입은 pending, 승인 전 로그인 불가', async () => {
    await request(app).post('/api/auth/signup').send({ id: 'tester', password: 'pass12', name: '테스터' }).expect(201);
    const res = await request(app).post('/api/auth/login').send({ id: 'tester', password: 'pass12' }).expect(400);
    expect(res.body.error).toMatch(/승인/);
  });

  test('중복 아이디 가입 거절', async () => {
    await request(app).post('/api/auth/signup').send({ id: 'admin', password: 'pass12' }).expect(400);
  });

  test('잘못된 비밀번호 로그인 실패', async () => {
    await request(app).post('/api/auth/login').send({ id: 'admin', password: 'wrong' }).expect(400);
  });
});

describe('원재료', () => {
  let id;
  test('등록 + 목록', async () => {
    const res = await admin
      .post('/api/raw-materials')
      .send({ name: '아세톤', quantity: 100, unit: 'L', safetyStock: 50, receivedDate: '2026-06-25' })
      .expect(201);
    id = res.body.item.id;
    const list = await admin.get('/api/raw-materials').expect(200);
    expect(list.body.items.some((r) => r.id === id)).toBe(true);
  });

  test('출고가 재고를 초과하면 400', async () => {
    const res = await admin.post(`/api/raw-materials/${id}/transaction`).send({ type: '출고', quantity: 99999 }).expect(400);
    expect(res.body.error).toMatch(/초과/);
  });

  test('정상 출고 후 잔량 차감 + 수불 내역 생성', async () => {
    await admin.post(`/api/raw-materials/${id}/transaction`).send({ type: '출고', quantity: 30 }).expect(201);
    const list = await admin.get('/api/raw-materials').expect(200);
    const item = list.body.items.find((r) => r.id === id);
    expect(Number(item.quantity)).toBe(70);
    const tx = await admin.get('/api/transactions?materialType=raw').expect(200);
    expect(tx.body.items.some((t) => t.materialId === id && t.type === '출고')).toBe(true);
  });

  test('CSV Export는 BOM과 text/csv', async () => {
    const res = await admin.get('/api/raw-materials/export').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    expect(res.text).toContain('아세톤');
  });
});

describe('부재료 품목별 내역현황', () => {
  test('동일 품목이 묶여서 집계된다', async () => {
    const res = await admin.get('/api/sub-materials/by-item').expect(200);
    const padd = res.body.items.find((g) => g.name === '실링패드');
    expect(padd).toBeTruthy();
    expect(padd.lots).toBeGreaterThanOrEqual(2);
  });
});

describe('Canister 용기이력카드', () => {
  let id;
  test('등록 시 반입 이력 자동 생성', async () => {
    const res = await admin
      .post('/api/canisters')
      .send({ canisterNo: 'CN-999', size: '100L', location: '2공장현장', status: '수령' })
      .expect(201);
    id = res.body.item.id;
    const hist = await admin.get(`/api/canisters/${id}/history`).expect(200);
    expect(hist.body.items[0].type).toBe('반입');
  });

  test('단건 조회 — /summary 등 literal 경로와 충돌하지 않는다', async () => {
    const res = await admin.get(`/api/canisters/${id}`).expect(200);
    expect(res.body.item.canisterNo).toBe('CN-999');
    expect(res.body.item.sizeLabel).toBe('100L');
  });

  test('반출 처리 시 위치/상태 갱신 + 이력 추가', async () => {
    await admin
      .post(`/api/canisters/${id}/move`)
      .send({ type: '반출', location: '3류창고', status: '사용중', note: '라인 투입' })
      .expect(201);
    const hist = await admin.get(`/api/canisters/${id}/history`).expect(200);
    expect(hist.body.items.length).toBeGreaterThanOrEqual(2);
    expect(hist.body.items[0].type).toBe('반출');
  });

  test('중복 Canister No. 거절', async () => {
    await admin.post('/api/canisters').send({ canisterNo: 'CN-999', size: '50L', location: '4류창고', status: '수령' }).expect(400);
  });

  test('집계(위치/사이즈/상태)', async () => {
    const res = await admin.get('/api/canisters/summary').expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(4);
    expect(typeof res.body.byLocation).toBe('object');
  });
});

describe('메타(선택지)', () => {
  test('폼 선택지 enum 제공', async () => {
    const res = await admin.get('/api/meta').expect(200);
    expect(res.body.units).toEqual(expect.arrayContaining(['kg', 'ea', 'L', '기타']));
    expect(res.body.canisterSizes).toEqual(expect.arrayContaining(['5gal', '50L', '100L', '200L', '기타']));
    expect(res.body.canisterStatuses).toEqual(expect.arrayContaining(['수령', '사용중', '세정의뢰', '사용금지']));
  });
});

describe('대시보드/설정', () => {
  test('안전재고 미달 품목 카운트', async () => {
    const res = await admin.get('/api/dashboard').expect(200);
    expect(res.body.rawMaterials.belowCount).toBeGreaterThanOrEqual(1);
  });

  test('안전재고 비율(%) 변경(관리자)', async () => {
    const res = await admin.patch('/api/settings').send({ safetyRatioPercent: 120 }).expect(200);
    expect(res.body.settings.safetyRatioPercent).toBe('120');
  });
});

describe('권한 분기', () => {
  let user;
  let rmId;
  beforeAll(async () => {
    user = request.agent(app);
    await user.post('/api/auth/login').send({ id: 'user1', password: 'user1234' }).expect(200);
    const res = await admin.post('/api/raw-materials').send({ name: '삭제테스트', quantity: 1, unit: 'kg' }).expect(201);
    rmId = res.body.item.id;
  });

  test('등록자는 추가 가능', async () => {
    await user.post('/api/raw-materials').send({ name: '등록자추가', quantity: 5, unit: 'kg' }).expect(201);
  });

  test('등록자는 삭제 불가(403)', async () => {
    await user.delete(`/api/raw-materials/${rmId}`).expect(403);
  });

  test('관리자는 삭제 가능', async () => {
    await admin.delete(`/api/raw-materials/${rmId}`).expect(200);
  });

  test('관리자 사용자 승인 흐름', async () => {
    const list = await admin.get('/api/users').expect(200);
    expect(list.body.items.some((u) => u.id === 'tester' && u.status === 'pending')).toBe(true);
    await admin.post('/api/users/tester/approve').send({ role: 'user' }).expect(200);
    await request(app).post('/api/auth/login').send({ id: 'tester', password: 'pass12' }).expect(200);
  });
});

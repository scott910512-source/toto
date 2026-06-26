'use strict';

const fs = require('fs');
const bcrypt = require('bcryptjs');
const { TABLES, filePath, ensureDataDir, _writeSync } = require('./store');

// 결정적인 시드 데이터를 위해 고정 타임스탬프를 사용한다.
const T = '2026-06-01T00:00:00.000Z';

function hash(pw) {
  return bcrypt.hashSync(pw, 10);
}

function seedRows() {
  return {
    users: [
      { id: 'admin', passwordHash: hash('admin1234'), name: '관리자', role: 'admin', status: 'approved', createdAt: T, approvedAt: T, approvedBy: 'system' },
      { id: 'user1', passwordHash: hash('user1234'), name: '홍길동', role: 'user', status: 'approved', createdAt: T, approvedAt: T, approvedBy: 'admin' },
      { id: 'user2', passwordHash: hash('user1234'), name: '김영희', role: 'user', status: 'pending', createdAt: T, approvedAt: '', approvedBy: '' },
    ],
    // 품목 마스터(관리자 등록) — 안전재고 목표값 포함
    items: [
      { id: 'it_r01', category: 'raw', name: '톨루엔', unit: 'kg', safetyStock: '1000', vendor: '(주)한솔케미칼', product: 'A제품', defaultQty: '800', lotPattern: 'T-{YYYY}-', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'it_r02', category: 'raw', name: '촉매펠릿', unit: 'ea', safetyStock: '400', vendor: '동성하이켐', product: 'A제품', defaultQty: '300', lotPattern: 'C-{YYYY}-', note: '안전재고 미달 예시', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'it_r03', category: 'raw', name: '황산', unit: 'L', safetyStock: '300', vendor: '대정화학', product: 'B제품', defaultQty: '500', lotPattern: 'S-{YYYY}-', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'it_s01', category: 'sub', name: '실링패드', unit: 'kg', safetyStock: '40', vendor: '(주)한솔케미칼', product: '공통', defaultQty: '25', lotPattern: 'L-{YYYY}-', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'it_s02', category: 'sub', name: '활성탄', unit: 'kg', safetyStock: '60', vendor: '대정화학', product: '공통', defaultQty: '50', lotPattern: 'L-{YYYY}-', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
    ],
    // 원재료: Lot 단위 (품목으로 취합)
    raw_materials: [
      { id: 'rm_0001', itemName: '톨루엔', lotNo: 'T-2026-001', quantity: '800', unit: 'kg', vendor: '(주)한솔케미칼', receivedDate: '2026-06-01', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'rm_0002', itemName: '톨루엔', lotNo: 'T-2026-002', quantity: '400', unit: 'kg', vendor: '대정화학', receivedDate: '2026-06-15', note: '동일 품목 다른 Lot', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'rm_0003', itemName: '촉매펠릿', lotNo: 'C-2026-001', quantity: '300', unit: 'ea', vendor: '동성하이켐', receivedDate: '2026-06-10', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
    ],
    sub_materials: [
      { id: 'sm_0001', name: '실링패드', receivedDate: '2026-06-05', lotNo: 'L-2026-001', vendor: '(주)한솔케미칼', unit: 'kg', initialWeight: '25', weight: '25', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'sm_0002', name: '활성탄', receivedDate: '2026-06-12', lotNo: 'L-2026-014', vendor: '대정화학', unit: 'kg', initialWeight: '50', weight: '50', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'sm_0003', name: '실링패드', receivedDate: '2026-06-18', lotNo: 'L-2026-027', vendor: '동성하이켐', unit: 'kg', initialWeight: '20', weight: '20', note: '동일 품목 다른 Lot', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
    ],
    // Canister: 현재 내용물+무게 보유
    canisters: [
      { id: 'cn_0001', canisterNo: 'CN-001', size: '200L', sizeEtc: '', location: '2공장현장', locationEtc: '', status: '사용중', statusEtc: '', content: '톨루엔', weight: '180', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'cn_0002', canisterNo: 'CN-002', size: '50L', sizeEtc: '', location: '3류창고', locationEtc: '', status: '세정의뢰', statusEtc: '', content: '', weight: '0', note: '비어있음', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'cn_0003', canisterNo: 'CN-003', size: '5gal', sizeEtc: '', location: '4류창고', locationEtc: '', status: '수령', statusEtc: '', content: '황산', weight: '15', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
    ],
    canister_history: [
      { id: 'ch_0001', canisterId: 'cn_0001', canisterNo: 'CN-001', date: '2026-06-01', type: '반입', content: '톨루엔', weight: '180', location: '2공장현장', status: '사용중', note: '내용물 충전', createdBy: 'admin', createdAt: T },
      { id: 'ch_0002', canisterId: 'cn_0003', canisterNo: 'CN-003', date: '2026-06-01', type: '반입', content: '황산', weight: '15', location: '4류창고', status: '수령', note: '내용물 충전', createdBy: 'admin', createdAt: T },
      { id: 'ch_0003', canisterId: 'cn_0002', canisterNo: 'CN-002', date: '2026-06-02', type: '반출', content: '', weight: '0', location: '3류창고', status: '세정의뢰', note: '비우고 세정의뢰', createdBy: 'admin', createdAt: '2026-06-02T00:00:00.000Z' },
    ],
    transactions: [
      { id: 'tx_0001', materialType: 'raw', materialId: 'rm_0001', materialName: '톨루엔', lotNo: 'T-2026-001', content: '', type: '입고', quantity: '800', unit: 'kg', balanceAfter: '800', note: '초기 입고', createdBy: 'admin', createdAt: T },
      { id: 'tx_0002', materialType: 'sub', materialId: 'sm_0001', materialName: '실링패드', lotNo: 'L-2026-001', content: '', type: '입고', quantity: '25', unit: 'kg', balanceAfter: '25', note: '초기 입고', createdBy: 'admin', createdAt: T },
      { id: 'tx_0003', materialType: 'canister', materialId: 'cn_0001', materialName: 'CN-001', lotNo: '', content: '톨루엔', type: '반입', quantity: '180', unit: 'kg', balanceAfter: '180', note: '내용물 충전', createdBy: 'admin', createdAt: T },
    ],
    settings: [
      { key: 'safetyRatioPercent', value: '100' },
      { key: 'canisterDefaultSize', value: '50L' },
      { key: 'canisterDefaultLocation', value: '2공장현장' },
      { key: 'canisterDefaultStatus', value: '수령' },
    ],
    anomalies: [
      { id: 'an_0001', type: '선입선출 오류', itemName: '톨루엔', lotInfo: 'T-2026-002 (입고 2026-06-15)', account: 'admin', note: '입고일이 더 빠른 Lot(T-2026-001) 존재 — 강제 사용', createdAt: '2026-06-20T01:00:00.000Z' },
    ],
    tasks: [
      { id: 'tk_0001', title: '3류창고 Canister 세정 의뢰 확인', category: '현장관리', categoryEtc: '', priority: '중', assignee: 'user1', dueDate: '2026-06-30', status: '진행중', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'tk_0002', title: '촉매펠릿 안전재고 보충 발주', category: '원부재료', categoryEtc: '', priority: '상', assignee: 'admin', dueDate: '2026-06-27', status: '대기', note: '안전재고 미달', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
    ],
    warning_acks: [],
    warning_dismissed: [],
  };
}

/**
 * 데이터 파일을 보장한다. 파일이 없으면 시드한다.
 * @param {{force?: boolean}} [opts] force=true면 기존 파일도 덮어쓴다.
 */
function ensureSeed(opts = {}) {
  ensureDataDir();
  const data = seedRows();
  const created = [];
  for (const name of Object.keys(TABLES)) {
    const exists = fs.existsSync(filePath(name));
    if (!exists || opts.force) {
      _writeSync(name, data[name] || []);
      created.push(name);
    }
  }
  return created;
}

module.exports = { ensureSeed, seedRows };

// CLI 실행: `node src/lib/seed.js [--force]`
if (require.main === module) {
  const force = process.argv.includes('--force');
  const created = ensureSeed({ force });
  // eslint-disable-next-line no-console
  console.log(`[seed] ${force ? '강제 재생성' : '초기화'} 완료:`, created.join(', ') || '(변경 없음)');
}

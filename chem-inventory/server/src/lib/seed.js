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
    raw_materials: [
      { id: 'rm_0001', name: '톨루엔', quantity: '1200', unit: 'kg', safetyStock: '500', receivedDate: '2026-06-01', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'rm_0002', name: '촉매펠릿', quantity: '300', unit: 'ea', safetyStock: '400', receivedDate: '2026-06-10', note: '안전재고 미달 예시', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'rm_0003', name: '황산', quantity: '500', unit: 'L', safetyStock: '300', receivedDate: '2026-06-20', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
    ],
    sub_materials: [
      { id: 'sm_0001', name: '실링패드', receivedDate: '2026-06-05', lotNo: 'L-2026-001', vendor: '(주)한솔케미칼', unit: 'kg', initialWeight: '25', weight: '25', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'sm_0002', name: '활성탄', receivedDate: '2026-06-12', lotNo: 'L-2026-014', vendor: '대정화학', unit: 'kg', initialWeight: '50', weight: '50', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'sm_0003', name: '실링패드', receivedDate: '2026-06-18', lotNo: 'L-2026-027', vendor: '동성하이켐', unit: 'kg', initialWeight: '20', weight: '20', note: '동일 품목 다른 Lot', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
    ],
    canisters: [
      { id: 'cn_0001', canisterNo: 'CN-001', size: '200L', sizeEtc: '', location: '2공장현장', locationEtc: '', status: '사용중', statusEtc: '', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'cn_0002', canisterNo: 'CN-002', size: '50L', sizeEtc: '', location: '3류창고', locationEtc: '', status: '세정의뢰', statusEtc: '', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
      { id: 'cn_0003', canisterNo: 'CN-003', size: '5gal', sizeEtc: '', location: '4류창고', locationEtc: '', status: '수령', statusEtc: '', note: '', createdBy: 'admin', createdAt: T, updatedBy: 'admin', updatedAt: T },
    ],
    canister_history: [
      { id: 'ch_0001', canisterId: 'cn_0001', canisterNo: 'CN-001', date: '2026-06-01', type: '반입', location: '2공장현장', status: '사용중', note: '초기 등록', createdBy: 'admin', createdAt: T },
      { id: 'ch_0002', canisterId: 'cn_0002', canisterNo: 'CN-002', date: '2026-06-01', type: '반입', location: '3류창고', status: '세정의뢰', note: '초기 등록', createdBy: 'admin', createdAt: T },
      { id: 'ch_0003', canisterId: 'cn_0003', canisterNo: 'CN-003', date: '2026-06-01', type: '반입', location: '4류창고', status: '수령', note: '초기 등록', createdBy: 'admin', createdAt: T },
    ],
    transactions: [
      { id: 'tx_0001', materialType: 'raw', materialId: 'rm_0001', materialName: '톨루엔', lotNo: '', type: '입고', quantity: '1200', unit: 'kg', balanceAfter: '1200', note: '초기 입고', createdBy: 'admin', createdAt: T },
      { id: 'tx_0002', materialType: 'raw', materialId: 'rm_0002', materialName: '촉매펠릿', lotNo: '', type: '입고', quantity: '300', unit: 'ea', balanceAfter: '300', note: '초기 입고', createdBy: 'admin', createdAt: T },
      { id: 'tx_0003', materialType: 'sub', materialId: 'sm_0001', materialName: '실링패드', lotNo: 'L-2026-001', type: '입고', quantity: '25', unit: 'kg', balanceAfter: '25', note: '초기 입고', createdBy: 'admin', createdAt: T },
    ],
    settings: [
      { key: 'safetyRatioPercent', value: '100' },
    ],
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

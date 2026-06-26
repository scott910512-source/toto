'use strict';

const express = require('express');
const { mutate, readTable, headersOf } = require('../lib/store');
const { asyncHandler, str, badRequest, notFound, sendCsv } = require('../lib/http');
const { newId, now } = require('../lib/ids');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const SIZES = ['5gal', '50L', '100L', '200L', '기타'];
const LOCATIONS = ['2공장현장', '3류창고', '4류창고', '기타'];
const STATUSES = ['수령', '사용중', '사용완료', '세정의뢰', '사용금지', '기타'];
const MOVE_TYPES = ['반입', '반출', '상태변경'];

router.use(requireAuth);

/** enum + Etc 텍스트를 표시값으로 합친다. */
function disp(value, etc) {
  return value === '기타' ? (etc || '기타') : value;
}

function decorate(r) {
  return {
    ...r,
    sizeLabel: disp(r.size, r.sizeEtc),
    locationLabel: disp(r.location, r.locationEtc),
    statusLabel: disp(r.status, r.statusEtc),
  };
}

function filterRows(rows, query) {
  const q = str(query.q).toLowerCase();
  const size = str(query.size);
  const location = str(query.location);
  const status = str(query.status);
  return rows.filter((r) => {
    if (q && !`${r.canisterNo}`.toLowerCase().includes(q)) return false;
    if (size && r.size !== size) return false;
    if (location && r.location !== location) return false;
    if (status && r.status !== status) return false;
    return true;
  });
}

function validateEnum(label, value, allowed) {
  if (!allowed.includes(value)) throw badRequest(`${label} 값이 올바르지 않습니다.`);
}

// 목록
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await readTable('canisters');
    res.json({ items: filterRows(rows, req.query).map(decorate) });
  }),
);

// 집계(개수): 위치별/사이즈별/상태별
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const rows = await readTable('canisters');
    const count = (keyFn) => {
      const m = {};
      for (const r of rows) {
        const k = keyFn(r);
        m[k] = (m[k] || 0) + 1;
      }
      return m;
    };
    res.json({
      total: rows.length,
      byLocation: count((r) => disp(r.location, r.locationEtc)),
      bySize: count((r) => disp(r.size, r.sizeEtc)),
      byStatus: count((r) => disp(r.status, r.statusEtc)),
    });
  }),
);

// CSV Export(마스터)
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const rows = await readTable('canisters');
    sendCsv(res, headersOf('canisters'), filterRows(rows, req.query), 'Canister목록');
  }),
);

// 단건 조회
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const rows = await readTable('canisters');
    const r = rows.find((x) => x.id === req.params.id);
    if (!r) throw notFound('Canister를 찾을 수 없습니다.');
    res.json({ item: decorate(r) });
  }),
);

// 특정 Canister 이력(용기이력카드)
router.get(
  '/:id/history',
  asyncHandler(async (req, res) => {
    const all = await readTable('canister_history');
    const items = all
      .filter((h) => h.canisterId === req.params.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    res.json({ items });
  }),
);

// 특정 Canister 이력 CSV Export
router.get(
  '/:id/history/export',
  asyncHandler(async (req, res) => {
    const all = await readTable('canister_history');
    const items = all.filter((h) => h.canisterId === req.params.id);
    sendCsv(res, headersOf('canister_history'), items, `Canister이력_${req.params.id}`);
  }),
);

// 등록(+ 반입 이력 자동 적재)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const canisterNo = str(req.body.canisterNo);
    const size = str(req.body.size);
    const location = str(req.body.location);
    const status = str(req.body.status) || '수령';
    if (!canisterNo) throw badRequest('Canister No.를 입력하세요.');
    validateEnum('용기 사이즈', size, SIZES);
    validateEnum('위치', location, LOCATIONS);
    validateEnum('상태', status, STATUSES);

    const me = req.session.user.id;
    const item = await mutate('canisters', (rows) => {
      if (rows.some((r) => r.canisterNo === canisterNo)) throw badRequest('이미 등록된 Canister No.입니다.');
      const row = {
        id: newId('cn'),
        canisterNo,
        size,
        sizeEtc: str(req.body.sizeEtc),
        location,
        locationEtc: str(req.body.locationEtc),
        status,
        statusEtc: str(req.body.statusEtc),
        note: str(req.body.note),
        createdBy: me,
        createdAt: now(),
        updatedBy: me,
        updatedAt: now(),
      };
      rows.push(row);
      return row;
    });
    await mutate('canister_history', (rows) => {
      rows.push({
        id: newId('ch'),
        canisterId: item.id,
        canisterNo: item.canisterNo,
        date: now().slice(0, 10),
        type: '반입',
        location: disp(item.location, item.locationEtc),
        status: disp(item.status, item.statusEtc),
        note: '신규 등록',
        createdBy: me,
        createdAt: now(),
      });
    });
    res.status(201).json({ item: decorate(item) });
  }),
);

// 수정(메타)
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const me = req.session.user.id;
    const item = await mutate('canisters', (rows) => {
      const r = rows.find((x) => x.id === req.params.id);
      if (!r) throw notFound('Canister를 찾을 수 없습니다.');
      if (req.body.canisterNo !== undefined) {
        const cn = str(req.body.canisterNo);
        if (!cn) throw badRequest('Canister No.를 입력하세요.');
        if (rows.some((x) => x.canisterNo === cn && x.id !== r.id)) throw badRequest('이미 등록된 Canister No.입니다.');
        r.canisterNo = cn;
      }
      if (req.body.size !== undefined) {
        validateEnum('용기 사이즈', str(req.body.size), SIZES);
        r.size = str(req.body.size);
        r.sizeEtc = str(req.body.sizeEtc);
      }
      if (req.body.note !== undefined) r.note = str(req.body.note);
      r.updatedBy = me;
      r.updatedAt = now();
      return r;
    });
    res.json({ item: decorate(item) });
  }),
);

// 반입/반출/상태변경 → 위치·상태 갱신 + 이력 적재
router.post(
  '/:id/move',
  asyncHandler(async (req, res) => {
    const type = str(req.body.type);
    if (!MOVE_TYPES.includes(type)) throw badRequest('구분은 반입/반출/상태변경 중 하나여야 합니다.');

    const me = req.session.user.id;
    let snapshot;
    const item = await mutate('canisters', (rows) => {
      const r = rows.find((x) => x.id === req.params.id);
      if (!r) throw notFound('Canister를 찾을 수 없습니다.');
      if (req.body.location !== undefined && req.body.location !== '') {
        validateEnum('위치', str(req.body.location), LOCATIONS);
        r.location = str(req.body.location);
        r.locationEtc = str(req.body.locationEtc);
      }
      if (req.body.status !== undefined && req.body.status !== '') {
        validateEnum('상태', str(req.body.status), STATUSES);
        r.status = str(req.body.status);
        r.statusEtc = str(req.body.statusEtc);
      }
      r.updatedBy = me;
      r.updatedAt = now();
      snapshot = r;
      return r;
    });
    const history = await mutate('canister_history', (rows) => {
      const row = {
        id: newId('ch'),
        canisterId: item.id,
        canisterNo: item.canisterNo,
        date: str(req.body.date) || now().slice(0, 10),
        type,
        location: disp(snapshot.location, snapshot.locationEtc),
        status: disp(snapshot.status, snapshot.statusEtc),
        note: str(req.body.note),
        createdBy: me,
        createdAt: now(),
      };
      rows.push(row);
      return row;
    });
    res.status(201).json({ item: decorate(item), history });
  }),
);

// 삭제(관리자) - 이력도 함께 삭제
router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await mutate('canisters', (rows) => {
      const idx = rows.findIndex((x) => x.id === req.params.id);
      if (idx < 0) throw notFound('Canister를 찾을 수 없습니다.');
      rows.splice(idx, 1);
    });
    await mutate('canister_history', (rows) => {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].canisterId === req.params.id) rows.splice(i, 1);
      }
    });
    res.json({ ok: true });
  }),
);

module.exports = { router, SIZES, LOCATIONS, STATUSES, MOVE_TYPES };

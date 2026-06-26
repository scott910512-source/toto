'use strict';

const express = require('express');
const { mutate, readTable } = require('../lib/store');
const { asyncHandler, str, num, badRequest, notFound, sendCsv } = require('../lib/http');
const { newId, now } = require('../lib/ids');
const { appendTransaction } = require('../lib/tx');
const { headersOf } = require('../lib/store');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const UNITS = ['kg', 'ea', 'L', '기타'];

router.use(requireAuth);

/** 쿼리 조건으로 원재료 목록을 필터링한다. */
function filterRows(rows, query) {
  const q = str(query.q).toLowerCase();
  const unit = str(query.unit);
  return rows.filter((r) => {
    if (q && !(`${r.name}`.toLowerCase().includes(q))) return false;
    if (unit && r.unit !== unit) return false;
    return true;
  });
}

function validateUnit(unit) {
  // kg/ea/L 외에는 '기타(직접작성)'을 허용하므로 빈 값만 막는다.
  if (!unit) throw badRequest('단위를 입력하세요.');
}

// 목록
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await readTable('raw_materials');
    res.json({ items: filterRows(rows, req.query) });
  }),
);

// CSV Export (필터 적용)
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const rows = await readTable('raw_materials');
    sendCsv(res, headersOf('raw_materials'), filterRows(rows, req.query), '원재료목록');
  }),
);

// 등록
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = str(req.body.name);
    const unit = str(req.body.unit);
    const quantity = num(req.body.quantity);
    const safetyStock = req.body.safetyStock === undefined || req.body.safetyStock === '' ? 0 : num(req.body.safetyStock);
    if (!name) throw badRequest('품목명을 입력하세요.');
    validateUnit(unit);
    if (Number.isNaN(quantity) || quantity < 0) throw badRequest('수량은 0 이상의 숫자여야 합니다.');
    if (Number.isNaN(safetyStock) || safetyStock < 0) throw badRequest('안전재고 기준수량은 0 이상의 숫자여야 합니다.');

    const me = req.session.user.id;
    const item = await mutate('raw_materials', (rows) => {
      const row = {
        id: newId('rm'),
        name,
        quantity: String(quantity),
        unit,
        safetyStock: String(safetyStock),
        receivedDate: str(req.body.receivedDate),
        note: str(req.body.note),
        createdBy: me,
        createdAt: now(),
        updatedBy: me,
        updatedAt: now(),
      };
      rows.push(row);
      return row;
    });
    if (quantity > 0) {
      await appendTransaction({
        materialType: 'raw', materialId: item.id, materialName: item.name,
        type: '입고', quantity, unit, balanceAfter: quantity, note: '신규 등록', user: me,
      });
    }
    res.status(201).json({ item });
  }),
);

// 수정(메타 정보)
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const me = req.session.user.id;
    const item = await mutate('raw_materials', (rows) => {
      const r = rows.find((x) => x.id === req.params.id);
      if (!r) throw notFound('원재료를 찾을 수 없습니다.');
      if (req.body.name !== undefined) {
        const name = str(req.body.name);
        if (!name) throw badRequest('품목명을 입력하세요.');
        r.name = name;
      }
      if (req.body.unit !== undefined) {
        validateUnit(str(req.body.unit));
        r.unit = str(req.body.unit);
      }
      if (req.body.safetyStock !== undefined) {
        const s = num(req.body.safetyStock);
        if (Number.isNaN(s) || s < 0) throw badRequest('안전재고 기준수량은 0 이상의 숫자여야 합니다.');
        r.safetyStock = String(s);
      }
      if (req.body.receivedDate !== undefined) r.receivedDate = str(req.body.receivedDate);
      if (req.body.note !== undefined) r.note = str(req.body.note);
      r.updatedBy = me;
      r.updatedAt = now();
      return r;
    });
    res.json({ item });
  }),
);

// 수불(입고/출고) → 수량 증감 + 내역 기록
router.post(
  '/:id/transaction',
  asyncHandler(async (req, res) => {
    const type = str(req.body.type);
    const qty = num(req.body.quantity);
    const note = str(req.body.note);
    if (!['입고', '출고'].includes(type)) throw badRequest('수불 구분은 입고 또는 출고여야 합니다.');
    if (Number.isNaN(qty) || qty <= 0) throw badRequest('수량은 0보다 큰 숫자여야 합니다.');

    const me = req.session.user.id;
    const item = await mutate('raw_materials', (rows) => {
      const r = rows.find((x) => x.id === req.params.id);
      if (!r) throw notFound('원재료를 찾을 수 없습니다.');
      const cur = num(r.quantity) || 0;
      const next = type === '입고' ? cur + qty : cur - qty;
      if (next < 0) throw badRequest(`출고 수량이 현재 재고(${cur}${r.unit})를 초과합니다.`);
      r.quantity = String(next);
      r.updatedBy = me;
      r.updatedAt = now();
      return r;
    });
    const txn = await appendTransaction({
      materialType: 'raw', materialId: item.id, materialName: item.name,
      type, quantity: qty, unit: item.unit, balanceAfter: item.quantity, note, user: me,
    });
    res.status(201).json({ item, transaction: txn });
  }),
);

// 삭제(관리자)
router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await mutate('raw_materials', (rows) => {
      const idx = rows.findIndex((x) => x.id === req.params.id);
      if (idx < 0) throw notFound('원재료를 찾을 수 없습니다.');
      rows.splice(idx, 1);
    });
    res.json({ ok: true });
  }),
);

module.exports = { router, UNITS };

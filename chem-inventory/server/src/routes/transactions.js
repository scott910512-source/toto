'use strict';

const express = require('express');
const { readTable, headersOf } = require('../lib/store');
const { asyncHandler, str, sendCsv } = require('../lib/http');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function filterRows(rows, query) {
  const type = str(query.materialType); // raw | sub
  const kind = str(query.type); // 입고 | 출고
  const q = str(query.q).toLowerCase();
  const from = str(query.from);
  const to = str(query.to);
  return rows
    .filter((r) => {
      if (type && r.materialType !== type) return false;
      if (kind && r.type !== kind) return false;
      if (q && !`${r.materialName} ${r.lotNo}`.toLowerCase().includes(q)) return false;
      const day = (r.createdAt || '').slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// 수불 내역 목록
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await readTable('transactions');
    res.json({ items: filterRows(rows, req.query) });
  }),
);

// 수불 내역 CSV Export (필터 적용)
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const rows = await readTable('transactions');
    sendCsv(res, headersOf('transactions'), filterRows(rows, req.query), '수불내역');
  }),
);

module.exports = { router };

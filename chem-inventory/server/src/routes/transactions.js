'use strict';

const express = require('express');
const { readTable, headersOf } = require('../lib/store');
const { asyncHandler, str, sendCsv } = require('../lib/http');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const TYPE_ORDER = { raw: 0, sub: 1, canister: 2 };

function filterRows(rows, query) {
  const type = str(query.materialType); // raw | sub | canister
  const kind = str(query.type); // 입고 | 출고 | 반입 | 반출
  const q = str(query.q).toLowerCase();
  const from = str(query.from);
  const to = str(query.to);
  const sort = str(query.sort) || 'category'; // category | date
  const list = rows.filter((r) => {
    if (type && r.materialType !== type) return false;
    if (kind && r.type !== kind) return false;
    if (q && !`${r.materialName} ${r.lotNo} ${r.content}`.toLowerCase().includes(q)) return false;
    const day = (r.createdAt || '').slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
  if (sort === 'date') {
    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } else {
    // 대분류(원>부>Canister) > 제품/품목명 > 최신순
    list.sort((a, b) => {
      const ta = TYPE_ORDER[a.materialType] ?? 9;
      const tb = TYPE_ORDER[b.materialType] ?? 9;
      if (ta !== tb) return ta - tb;
      if (a.materialName !== b.materialName) return a.materialName.localeCompare(b.materialName);
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }
  return list;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await readTable('transactions');
    res.json({ items: filterRows(rows, req.query) });
  }),
);

router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const rows = await readTable('transactions');
    sendCsv(res, headersOf('transactions'), filterRows(rows, req.query), '수불내역');
  }),
);

module.exports = { router };

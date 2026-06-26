'use strict';

const express = require('express');
const { mutate, readTable } = require('../lib/store');
const { asyncHandler, str, num, badRequest } = require('../lib/http');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const DEFAULTS = {
  safetyRatioPercent: '100',
  canisterDefaultSize: '50L',
  canisterDefaultLocation: '2공장현장',
  canisterDefaultStatus: '수령',
};
const STRING_KEYS = ['canisterDefaultSize', 'canisterDefaultLocation', 'canisterDefaultStatus'];

async function readSettings() {
  const rows = await readTable('settings');
  const map = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}

function setKey(rows, key, value) {
  const row = rows.find((r) => r.key === key);
  if (row) row.value = String(value);
  else rows.push({ key, value: String(value) });
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ settings: await readSettings() });
  }),
);

router.patch(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await mutate('settings', (rows) => {
      if (req.body.safetyRatioPercent !== undefined) {
        const p = num(req.body.safetyRatioPercent);
        if (Number.isNaN(p) || p < 0 || p > 1000) throw badRequest('안전재고 비율(%)은 0~1000 사이여야 합니다.');
        setKey(rows, 'safetyRatioPercent', p);
      }
      for (const k of STRING_KEYS) {
        if (req.body[k] !== undefined) setKey(rows, k, str(req.body[k]));
      }
    });
    res.json({ settings: await readSettings() });
  }),
);

module.exports = { router, readSettings };

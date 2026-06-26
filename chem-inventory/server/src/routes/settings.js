'use strict';

const express = require('express');
const { mutate, readTable } = require('../lib/store');
const { asyncHandler, num, badRequest } = require('../lib/http');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const DEFAULTS = { safetyRatioPercent: '100' };

async function readSettings() {
  const rows = await readTable('settings');
  const map = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}

// 설정 조회(로그인 사용자)
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ settings: await readSettings() });
  }),
);

// 설정 변경(관리자) — 안전재고 경고 비율(%)
router.patch(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (req.body.safetyRatioPercent !== undefined) {
      const p = num(req.body.safetyRatioPercent);
      if (Number.isNaN(p) || p < 0 || p > 1000) throw badRequest('안전재고 비율(%)은 0~1000 사이여야 합니다.');
      await mutate('settings', (rows) => {
        const row = rows.find((r) => r.key === 'safetyRatioPercent');
        if (row) row.value = String(p);
        else rows.push({ key: 'safetyRatioPercent', value: String(p) });
      });
    }
    res.json({ settings: await readSettings() });
  }),
);

module.exports = { router, readSettings };

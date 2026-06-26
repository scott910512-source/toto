'use strict';

const express = require('express');
const { readTable } = require('../lib/store');
const { asyncHandler, num } = require('../lib/http');
const { requireAuth } = require('../middleware/auth');
const { readSettings } = require('./settings');

const router = express.Router();
router.use(requireAuth);

function disp(value, etc) {
  return value === '기타' ? (etc || '기타') : value;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [raws, subs, canisters, settings] = await Promise.all([
      readTable('raw_materials'),
      readTable('sub_materials'),
      readTable('canisters'),
      readSettings(),
    ]);

    const ratioThreshold = num(settings.safetyRatioPercent) || 100;

    const rawStatus = raws.map((r) => {
      const qty = num(r.quantity) || 0;
      const safety = num(r.safetyStock) || 0;
      const ratio = safety > 0 ? Math.round((qty / safety) * 100) : null;
      const below = safety > 0 && qty < safety * (ratioThreshold / 100);
      return { id: r.id, name: r.name, unit: r.unit, quantity: qty, safetyStock: safety, ratio, below };
    });
    const belowCount = rawStatus.filter((r) => r.below).length;

    const count = (rows, keyFn) => {
      const m = {};
      for (const r of rows) {
        const k = keyFn(r);
        m[k] = (m[k] || 0) + 1;
      }
      return m;
    };

    res.json({
      settings: { safetyRatioPercent: ratioThreshold },
      rawMaterials: {
        totalItems: raws.length,
        belowCount,
        totalQuantity: rawStatus.reduce((s, r) => s + r.quantity, 0),
        items: rawStatus,
      },
      subMaterials: {
        totalLots: subs.length,
        totalWeight: subs.reduce((s, r) => s + (num(r.weight) || 0), 0),
        distinctItems: new Set(subs.map((s) => s.name)).size,
      },
      canisters: {
        total: canisters.length,
        byLocation: count(canisters, (r) => disp(r.location, r.locationEtc)),
        bySize: count(canisters, (r) => disp(r.size, r.sizeEtc)),
        byStatus: count(canisters, (r) => disp(r.status, r.statusEtc)),
      },
    });
  }),
);

module.exports = { router };

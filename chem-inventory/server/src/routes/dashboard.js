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

/** 품목 마스터 + 재고 행으로 품목별 안전재고 현황을 계산한다. */
function buildSafety(masters, getName, getQty, rows, threshold) {
  const names = new Set([...masters.map((m) => m.name), ...rows.map(getName)]);
  return Array.from(names).map((name) => {
    const master = masters.find((m) => m.name === name);
    const total = rows.filter((r) => getName(r) === name).reduce((s, r) => s + (getQty(r) || 0), 0);
    const safety = master ? num(master.safetyStock) || 0 : 0;
    const unit = master ? master.unit : '';
    const level = safety > 0 ? Math.round((total / safety) * 100) : null;
    const below = safety > 0 && total < safety * (threshold / 100);
    return { name, unit, quantity: total, safetyStock: safety, level, below };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [items, raws, subs, canisters, settings] = await Promise.all([
      readTable('items'),
      readTable('raw_materials'),
      readTable('sub_materials'),
      readTable('canisters'),
      readSettings(),
    ]);
    const threshold = num(settings.safetyRatioPercent) || 100;

    const rawSafety = buildSafety(items.filter((i) => i.category === 'raw'), (r) => r.itemName, (r) => num(r.quantity), raws, threshold);
    const subSafety = buildSafety(items.filter((i) => i.category === 'sub'), (r) => r.name, (r) => num(r.weight), subs, threshold);

    const count = (rows, keyFn) => {
      const m = {};
      for (const r of rows) {
        const k = keyFn(r);
        m[k] = (m[k] || 0) + 1;
      }
      return m;
    };

    res.json({
      settings: { safetyRatioPercent: threshold },
      rawMaterials: {
        totalItems: rawSafety.length,
        totalLots: raws.length,
        belowCount: rawSafety.filter((r) => r.below).length,
        totalQuantity: rawSafety.reduce((s, r) => s + r.quantity, 0),
        items: rawSafety,
      },
      subMaterials: {
        totalItems: subSafety.length,
        totalLots: subs.length,
        belowCount: subSafety.filter((r) => r.below).length,
        totalWeight: subSafety.reduce((s, r) => s + r.quantity, 0),
        items: subSafety,
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

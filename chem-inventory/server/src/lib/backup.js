'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config');

/**
 * 데이터(CSV)를 타임스탬프 폴더로 복사해 백업한다.
 * - 기존 데이터는 읽기만 하므로 절대 변경되지 않는다.
 * - 최근 keep개만 남기고 오래된 백업은 정리한다.
 * @returns {string|null} 생성된 백업 폴더 경로(없으면 null)
 */
function backupData(keep = 20) {
  if (!fs.existsSync(DATA_DIR)) return null;
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.csv'));
  if (!files.length) return null;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); // YYYY-MM-DDTHH-mm-ss
  const root = path.join(DATA_DIR, '..', 'backups');
  const dest = path.join(root, `data-${stamp}`);
  fs.mkdirSync(dest, { recursive: true });
  for (const f of files) {
    fs.copyFileSync(path.join(DATA_DIR, f), path.join(dest, f));
  }

  // 오래된 백업 정리(최근 keep개 유지)
  try {
    const all = fs
      .readdirSync(root)
      .filter((d) => d.startsWith('data-'))
      .sort();
    while (all.length > keep) {
      const old = all.shift();
      fs.rmSync(path.join(root, old), { recursive: true, force: true });
    }
  } catch {
    /* 정리 실패는 무시 */
  }
  return dest;
}

module.exports = { backupData };

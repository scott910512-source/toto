'use strict';

const { createApp } = require('./app');
const { ensureSeed } = require('./lib/seed');
const { PORT, DATA_DIR } = require('./config');

// 데이터 파일이 없으면 초기 시드 생성
const created = ensureSeed();
if (created.length) {
  // eslint-disable-next-line no-console
  console.log(`[seed] 초기 데이터 생성: ${created.join(', ')}`);
}

const app = createApp();
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`\n  화학공장 수불관리 시스템 서버 실행 중`);
  console.log(`  - 주소: http://localhost:${PORT}`);
  console.log(`  - 데이터 폴더: ${DATA_DIR}`);
  console.log(`  - 기본 관리자 계정: admin / admin1234 (최초 로그인 후 비밀번호 변경 권장)\n`);
});

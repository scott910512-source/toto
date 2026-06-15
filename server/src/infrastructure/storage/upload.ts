import multer from 'multer';
import path from 'path';

const ALLOWED = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];

// 메모리 스토리지: 파일을 Buffer 로 받아 R2 에 직접 업로드
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB/장
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED.includes(ext)) cb(null, true);
    else cb(new Error('지원하지 않는 이미지 형식입니다.'));
  },
});

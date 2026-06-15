import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { env } from '../../config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 업로드 정적 제공
  fs.mkdirSync(env.uploadDir, { recursive: true });
  app.use('/uploads', express.static(env.uploadDir));

  // API
  app.use('/api', apiRouter);

  // 프로덕션: 빌드된 프론트엔드 정적 서빙 (단일 컨테이너 배포 지원)
  const clientDist = path.resolve(process.cwd(), 'public');
  if (fs.existsSync(clientDist)) {
    // 해시가 붙은 에셋(js/css)은 장기 캐시, index.html 은 캐시 금지
    // → 재배포 시 사용자가 항상 최신 화면을 즉시 받음
    app.use(
      express.static(clientDist, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else if (/\/assets\//.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

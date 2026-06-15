import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import { env } from '../../config/env';

export function isFirebaseConfigured(): boolean {
  return !!(env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey && env.firebaseStorageBucket);
}

function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0]!;
  return initializeApp({
    credential: cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      // env var에서 \n이 이스케이프된 경우 실제 줄바꿈으로 복원
      privateKey: env.firebasePrivateKey.replace(/\\n/g, '\n'),
    }),
    storageBucket: env.firebaseStorageBucket,
  });
}

/** 버퍼를 Firebase Storage에 업로드하고 공개 URL 반환 */
export async function uploadToFirebase(
  buffer: Buffer,
  originalName: string,
  mimetype: string,
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const key = `photos/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  const bucket = getStorage(getFirebaseApp()).bucket();
  const file = bucket.file(key);

  await file.save(buffer, { contentType: mimetype });
  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${key}`;
}

/** Firebase Storage에서 사진 삭제 */
export async function deleteFromFirebase(imageUrl: string): Promise<void> {
  if (!imageUrl.startsWith('https://storage.googleapis.com/')) return;
  try {
    const bucket = getStorage(getFirebaseApp()).bucket();
    const prefix = `https://storage.googleapis.com/${bucket.name}/`;
    const key = imageUrl.replace(prefix, '');
    await bucket.file(key).delete();
  } catch {
    /* 파일이 없어도 무시 */
  }
}

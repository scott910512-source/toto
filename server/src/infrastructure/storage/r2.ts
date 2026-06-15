import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { env } from '../../config/env';

export function isR2Configured(): boolean {
  return !!(
    env.r2AccountId &&
    env.r2AccessKeyId &&
    env.r2SecretAccessKey &&
    env.r2BucketName &&
    env.r2PublicUrl
  );
}

function getClient(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });
}

/** 버퍼를 R2에 업로드하고 공개 URL 반환 */
export async function uploadToR2(
  buffer: Buffer,
  originalName: string,
  mimetype: string,
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const key = `photos/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: env.r2BucketName,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    }),
  );

  return `${env.r2PublicUrl}/${key}`;
}

/** R2에서 사진 삭제 (로컬 경로는 무시) */
export async function deleteFromR2(imageUrl: string): Promise<void> {
  if (!imageUrl.startsWith('http')) return; // 레거시 로컬 경로 무시
  const key = imageUrl.replace(`${env.r2PublicUrl}/`, '');
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: env.r2BucketName, Key: key }));
  } catch {
    /* 파일이 없어도 무시 */
  }
}

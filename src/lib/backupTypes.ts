/* 백업 파일 형태. 순수 검사 쪽과 실제 만드는 쪽이 함께 쓴다. */
import type { Album, BabyInfo, BabyRecord, Photo, Profile } from "@/types/models";
export type { BabyInfo };

export const BACKUP_VERSION = 3;

export interface BackupSummary {
  records: number;
  photos: number;
  photosExpected: number;
  albums: number;
  users: number;
  failedPhotoIds: string[];
}

export interface BackupFile {
  exportedAt: string;
  version: number;
  baby: BabyInfo;
  records: BabyRecord[];
  photos: Array<Photo & { url: string }>;
  albums: Album[];
  users: Array<Partial<Profile>>;
  summary: BackupSummary;
}


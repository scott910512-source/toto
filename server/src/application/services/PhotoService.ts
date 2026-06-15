import type {
  IPhotoRepository,
  IVisitRepository,
  PhotoRecord,
} from '../../domain/repositories';
import { env } from '../../config/env';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { uploadToR2, deleteFromR2, isR2Configured } from '../../infrastructure/storage/r2';

export class PhotoService {
  constructor(
    private readonly photos: IPhotoRepository,
    private readonly visits: IVisitRepository,
  ) {}

  /** 사진 추가 (방문당 최대 maxPhotosPerVisit 장 제한) */
  async add(
    userId: string,
    visitId: string,
    buffer: Buffer,
    mimetype: string,
    originalName: string,
    caption?: string,
  ): Promise<PhotoRecord> {
    const visit = await this.visits.findById(visitId);
    if (!visit) throw new NotFoundError('방문 기록을 찾을 수 없습니다.');
    if (visit.userId !== userId) throw new ForbiddenError('본인의 기록에만 사진을 추가할 수 있습니다.');

    const count = await this.photos.countByVisit(visitId);
    if (count >= env.maxPhotosPerVisit) {
      throw new BadRequestError(`사진은 방문당 최대 ${env.maxPhotosPerVisit}장까지 등록할 수 있습니다.`);
    }

    if (!isR2Configured()) {
      throw new BadRequestError('사진 저장소(R2)가 설정되지 않았습니다. 관리자에게 문의하세요.');
    }

    const imageUrl = await uploadToR2(buffer, originalName, mimetype);
    return this.photos.add(visitId, imageUrl, caption ?? null);
  }

  async list(visitId: string): Promise<PhotoRecord[]> {
    return this.photos.listByVisit(visitId);
  }

  async delete(userId: string, photoId: string): Promise<void> {
    const photo = await this.photos.findById(photoId);
    if (!photo) throw new NotFoundError('사진을 찾을 수 없습니다.');
    const visit = await this.visits.findById(photo.visitId);
    if (!visit || visit.userId !== userId) throw new ForbiddenError('삭제 권한이 없습니다.');
    await this.photos.delete(photoId);
    await deleteFromR2(photo.imagePath);
  }
}

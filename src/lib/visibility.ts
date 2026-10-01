/* ============================================================================
   "이 사람에게 이걸 보여줘도 되나" 판단.

   ⚠️ 이건 화면을 정리하기 위한 것이고, 진짜 차단은 DB(RLS)가 한다.
      RLS 가 안 돌려준 사진은 애초에 여기까지 오지 않는다.
      그래도 여기가 틀리면 "RLS 는 막았는데 화면이 보여주려 해서 깨진 칸이
      뜨는" 일이 생기고, 반대로 "볼 수 있는데 안 보여주는" 일도 생긴다.

   규칙은 하나다 — 나만보기는 올린 사람과 우리 집 관리자만 본다.
   ========================================================================== */

export interface Ownable {
  vis?: string | null;
  uploadedBy?: string | null;
  createdBy?: string | null;
}

const isPrivate = (vis: unknown): boolean => (vis || "public") === "private";

/** 사진을 볼 수 있는가 (olderBy = uploadedBy) */
export function canSeePhoto(p: Ownable | null | undefined, uid: string | null, isAdmin: boolean): boolean {
  if (!p) return false;
  if (isAdmin) return true;
  if (!isPrivate(p.vis)) return true;
  // 나만보기는 올린 사람만. uid 가 없으면(로그인 전) 볼 수 없다.
  return !!uid && p.uploadedBy === uid;
}

/** 편지를 볼 수 있는가 (올린 사람 = createdBy) */
export function canSeeLetter(l: Ownable | null | undefined, uid: string | null, isAdmin: boolean): boolean {
  if (!l) return false;
  if (isAdmin) return true;
  if (!isPrivate(l.vis)) return true;
  return !!uid && l.createdBy === uid;
}

/** 좋아요 수. 예전 형식(likeCount 숫자)도 받아준다. */
export function likeCountOf(photo: { likedBy?: unknown; likeCount?: unknown } | null | undefined): number {
  if (!photo) return 0;
  if (Array.isArray(photo.likedBy)) return photo.likedBy.length;
  return typeof photo.likeCount === "number" && Number.isFinite(photo.likeCount) ? photo.likeCount : 0;
}

/** 내가 좋아요를 눌렀는가 */
export function likedByMe(photo: { likedBy?: unknown } | null | undefined, uid: string | null): boolean {
  if (!photo || !uid || !Array.isArray(photo.likedBy)) return false;
  return photo.likedBy.includes(uid);
}

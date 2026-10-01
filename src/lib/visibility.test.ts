import { describe, it, expect } from "vitest";
import { canSeePhoto, canSeeLetter, likeCountOf, likedByMe } from "./visibility";

const ME = "u-me";
const OTHER = "u-other";

describe("사진을 보여줘도 되나", () => {
  it("공개 사진은 가족 모두가 본다", () => {
    expect(canSeePhoto({ vis: "public", uploadedBy: OTHER }, ME, false)).toBe(true);
  });

  it("공개범위가 비어 있으면 공개로 본다 (예전에 올린 사진)", () => {
    expect(canSeePhoto({ uploadedBy: OTHER }, ME, false)).toBe(true);
    expect(canSeePhoto({ vis: null, uploadedBy: OTHER }, ME, false)).toBe(true);
    expect(canSeePhoto({ vis: "", uploadedBy: OTHER }, ME, false)).toBe(true);
  });

  it("내가 올린 나만보기는 나에게 보인다", () => {
    expect(canSeePhoto({ vis: "private", uploadedBy: ME }, ME, false)).toBe(true);
  });

  it("남이 올린 나만보기는 안 보인다", () => {
    expect(canSeePhoto({ vis: "private", uploadedBy: OTHER }, ME, false)).toBe(false);
  });

  it("관리자는 남의 나만보기도 본다", () => {
    expect(canSeePhoto({ vis: "private", uploadedBy: OTHER }, ME, true)).toBe(true);
  });

  it("로그인 전(uid 없음)에는 나만보기를 보여주지 않는다", () => {
    // uid 가 null 인데 uploadedBy 도 null 이면 "둘 다 없으니 같다" 로
    // 통과해 버릴 수 있다. 그 구멍을 막는다.
    expect(canSeePhoto({ vis: "private", uploadedBy: null }, null, false)).toBe(false);
    expect(canSeePhoto({ vis: "private", uploadedBy: undefined }, null, false)).toBe(false);
  });

  it("사진이 없으면 false (없는 걸 보여주려다 깨지지 않게)", () => {
    expect(canSeePhoto(null, ME, false)).toBe(false);
    expect(canSeePhoto(undefined, ME, true)).toBe(false);
  });

  it("모르는 공개범위 값은 공개로 본다", () => {
    // RLS 가 돌려준 사진이므로 숨길 이유가 없다. 숨기면 "안 보인다" 는
    // 문의만 생긴다.
    expect(canSeePhoto({ vis: "이상한값", uploadedBy: OTHER }, ME, false)).toBe(true);
  });
});

describe("편지를 보여줘도 되나", () => {
  it("편지는 올린 사람이 createdBy 다 (사진과 필드가 다르다)", () => {
    expect(canSeeLetter({ vis: "private", createdBy: ME }, ME, false)).toBe(true);
    expect(canSeeLetter({ vis: "private", createdBy: OTHER }, ME, false)).toBe(false);
  });

  it("사진 필드(uploadedBy)로는 통과하지 않는다", () => {
    // 두 함수를 섞어 쓰면 남의 비밀 편지가 보일 수 있다
    expect(canSeeLetter({ vis: "private", uploadedBy: ME }, ME, false)).toBe(false);
  });

  it("공개 편지는 모두가 본다", () => {
    expect(canSeeLetter({ createdBy: OTHER }, ME, false)).toBe(true);
  });

  it("관리자는 다 본다", () => {
    expect(canSeeLetter({ vis: "private", createdBy: OTHER }, ME, true)).toBe(true);
  });
});

describe("좋아요 수", () => {
  it("누른 사람 목록의 길이를 센다", () => {
    expect(likeCountOf({ likedBy: ["a", "b"] })).toBe(2);
    expect(likeCountOf({ likedBy: [] })).toBe(0);
  });

  it("예전 형식(숫자)도 받아준다", () => {
    expect(likeCountOf({ likeCount: 3 })).toBe(3);
  });

  it("목록이 있으면 목록을 우선한다", () => {
    expect(likeCountOf({ likedBy: ["a"], likeCount: 99 })).toBe(1);
  });

  it("없거나 이상한 값이면 0 (NaN 이 화면에 찍히지 않게)", () => {
    expect(likeCountOf(null)).toBe(0);
    expect(likeCountOf({})).toBe(0);
    expect(likeCountOf({ likedBy: "배열아님" })).toBe(0);
    expect(likeCountOf({ likeCount: NaN })).toBe(0);
    expect(likeCountOf({ likeCount: "3" })).toBe(0);
  });
});

describe("내가 좋아요를 눌렀나", () => {
  it("목록에 있으면 눌렀다", () => {
    expect(likedByMe({ likedBy: [ME] }, ME)).toBe(true);
    expect(likedByMe({ likedBy: [OTHER] }, ME)).toBe(false);
  });

  it("로그인 전이면 누르지 않은 것으로", () => {
    expect(likedByMe({ likedBy: [] }, null)).toBe(false);
  });

  it("값이 없어도 깨지지 않는다", () => {
    expect(likedByMe(null, ME)).toBe(false);
    expect(likedByMe({}, ME)).toBe(false);
  });
});

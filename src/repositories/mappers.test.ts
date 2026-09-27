import { describe, it, expect } from "vitest";
import { toRecord, fromRecord, toPhoto, toProfile, toAlbum, ROLE_TO_LEGACY, LEGACY_TO_ROLE } from "./mappers";

describe("record 매핑", () => {
  it("data 를 펼쳐서 화면 모델로", () => {
    const r = toRecord({
      id: "r1", type: "feeding", at: "2026-09-27T01:00:00Z",
      created_at: "2026-09-27T01:00:00Z", created_by: "u1", creator_name: "아부지요",
      data: { kind: "formula", amount: 120 },
    });
    expect(r.type).toBe("feeding");
    expect(r.creatorName).toBe("아부지요");
    expect(r.amount).toBe(120);
    expect(r.kind).toBe("formula");
  });
  it("왕복해도 값이 유지된다", () => {
    const { row, data } = fromRecord({
      type: "sleep", at: "2026-09-27T01:00:00Z", createdBy: "u1",
      creatorName: "엄마", naptype: "night", durationMin: 480,
    });
    expect(row.type).toBe("sleep");
    expect(row.created_by).toBe("u1");
    expect(data.durationMin).toBe(480);
    expect(data.naptype).toBe("night");
    // 공통 컬럼이 data 로 새지 않아야 한다
    expect(data.type).toBeUndefined();
    expect(data.createdBy).toBeUndefined();
  });
});

describe("photo 매핑", () => {
  it("기본값이 안전하다", () => {
    const p = toPhoto({ id: "m1", storage_path: "f/2026/09/a.jpg" });
    expect(p.category).toBe("baby");
    expect(p.vis).toBe("public");
    expect(p.likedBy).toEqual([]);
    expect(p.people).toEqual([]);
    expect(p.url).toBeNull();
  });
  it("나만보기와 좋아요를 읽는다", () => {
    const p = toPhoto({ id: "m2", storage_path: "x", vis: "private", liked_by: ["u1", "u2"] });
    expect(p.vis).toBe("private");
    expect(p.likedBy).toHaveLength(2);
  });
});

describe("profile 매핑", () => {
  it("승인 여부는 엄격히 true 일 때만", () => {
    expect(toProfile({ id: "u", approved: true }).approved).toBe(true);
    expect(toProfile({ id: "u", approved: null }).approved).toBe(false);
    expect(toProfile({ id: "u" }).approved).toBe(false);
  });
  it("등급 이름 변환", () => {
    expect(ROLE_TO_LEGACY.parent).toBe("member");
    expect(ROLE_TO_LEGACY.gallery_only).toBe("viewer");
    expect(LEGACY_TO_ROLE.member).toBe("parent");
  });
});

describe("album 매핑", () => {
  it("이모지 기본값", () => {
    expect(toAlbum({ id: "a", title: "첫돌" }).emoji).toBe("📁");
  });
});

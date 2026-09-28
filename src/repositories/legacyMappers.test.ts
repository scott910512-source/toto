import { describe, it, expect } from "vitest";
import { MAPPERS, FIELD_COL, ROLE_TO_DB, ROLE_FROM_DB } from "./legacyMappers";
import { SV } from "@/lib/fieldValues";

const { records, photos, albums, users } = MAPPERS;

describe("기록 변환", () => {
  it("공통 컬럼과 data 를 펼쳐서 하나로 보여준다", () => {
    const got = records!.fromDb({
      id: "r1", type: "feeding", at: "2026-05-01T10:00:00Z",
      created_at: "2026-05-01T10:00:01Z", created_by: "u1", creator_name: "아부지요",
      data: { kind: "breast", amount: 120 },
    });
    expect(got).toEqual({
      id: "r1", type: "feeding", at: "2026-05-01T10:00:00Z",
      createdAt: "2026-05-01T10:00:01Z", createdBy: "u1", creatorName: "아부지요",
      kind: "breast", amount: 120,
    });
  });

  it("data 가 없어도 깨지지 않는다", () => {
    expect(records!.fromDb({ id: "r1", type: "memo" }).id).toBe("r1");
    expect(records!.fromDb({ id: "r1", type: "memo", data: null }).type).toBe("memo");
  });

  it("공통 컬럼이 아닌 것은 data 로 보낸다", () => {
    const { row, data } = records!.split({
      type: "feeding", at: new Date("2026-05-01T10:00:00Z"),
      createdBy: "u1", creatorName: "아부지요", kind: "breast", amount: 120,
    });
    expect(row).toEqual({
      type: "feeding", at: "2026-05-01T10:00:00.000Z",
      created_by: "u1", creator_name: "아부지요",
    });
    expect(data).toEqual({ kind: "breast", amount: 120 });
  });

  it("id 는 보내지 않는다 (DB 가 정한다)", () => {
    const { row, data } = records!.split({ id: "가짜id", type: "memo" });
    expect(row.id).toBeUndefined();
    expect(data!.id).toBeUndefined();
  });

  it("family_id 를 화면에서 보내지 않는다 (DB 기본값이 채운다)", () => {
    // 프론트가 보내면 다른 가족 것으로 위조할 여지가 생긴다
    const { row, data } = records!.split({ type: "memo", familyId: "남의집" });
    expect(row.family_id).toBeUndefined();
    expect(data!.family_id).toBeUndefined();
  });

  it("쓰기 지시는 그대로 넘겨 나중에 해석되게 둔다", () => {
    const { row, data } = records!.split({ type: "memo", at: SV.serverTimestamp(), count: SV.increment(1) });
    expect(typeof row.at).toBe("string");          // at 은 바로 ISO 로
    expect(data!.count).toEqual({ __sv: "inc", n: 1 });   // data 안은 지시 그대로
  });

  it("data 안의 {seconds} 날짜도 ISO 로 바꾼다 (백업 가져오기)", () => {
    const { data } = records!.split({ type: "sleep", start: { seconds: 1777000000 } });
    expect(data!.start).toBe(new Date(1777000000000).toISOString());
  });

  it("망가진 날짜는 null 로 (Invalid Date 를 저장하지 않는다)", () => {
    const { row } = records!.split({ type: "memo", at: "어제쯤" });
    expect(row.at).toBeNull();
  });
});

describe("사진 변환", () => {
  const dbRow = {
    id: "m1", album_id: "a1", storage_path: "f/2026/09/x_o.jpg",
    preview_path: "f/2026/09/x_p.jpg", thumb_path: "f/2026/09/x_t.jpg",
    caption: "첫 초음파", category: "ultrasound",
    uploader_name: "엄마", uploaded_by: "u2",
    uploaded_at: "2026-09-01T00:00:00Z", captured_at: "2026-08-31T00:00:00Z",
    people: ["또또"], place: "병원", gps: null,
    vis: "private", liked_by: ["u1"], favorite: true,
    width: 600, height: 800, bytes: 1000, type: "image",
  };

  it("컬럼을 화면 이름으로 바꾼다", () => {
    const p = photos!.fromDb(dbRow);
    expect(p.albumId).toBe("a1");
    expect(p.storagePath).toBe("f/2026/09/x_o.jpg");
    expect(p.uploaderName).toBe("엄마");
    expect(p.takenAt).toBe("2026-08-31T00:00:00Z");
    expect(p.vis).toBe("private");
    expect(p.likedBy).toEqual(["u1"]);
    expect(p.favorite).toBe(true);
  });

  it("서명 URL 이 없으면 null (있는 척하지 않는다)", () => {
    const p = photos!.fromDb(dbRow);
    expect(p.url).toBeNull();
    expect(p.thumbUrl).toBeNull();
  });

  it("서명 URL 이 주입되면 그것을 쓴다", () => {
    const p = photos!.fromDb({ ...dbRow, __url: "https://o", __thumb: "https://t" });
    expect(p.url).toBe("https://o");
    expect(p.thumbUrl).toBe("https://t");
  });

  it("썸네일이 없으면 원본을 쓴다", () => {
    const p = photos!.fromDb({ ...dbRow, __url: "https://o" });
    expect(p.thumbUrl).toBe("https://o");
  });

  it("빈 값에 기본값을 채운다", () => {
    const p = photos!.fromDb({ id: "m2" });
    expect(p.caption).toBe("");
    expect(p.category).toBe("baby");
    expect(p.vis).toBe("public");       // 공개범위가 비어 있으면 공개로 본다
    expect(p.people).toEqual([]);
    expect(p.likedBy).toEqual([]);
    expect(p.favorite).toBe(false);
  });

  it("표시용 값(url)은 DB 로 보내지 않는다", () => {
    const { row } = photos!.split({ id: "m1", url: "https://o", thumbUrl: "https://t", caption: "안녕" });
    expect(row).toEqual({ caption: "안녕" });
  });

  it("모르는 필드는 버린다 (없는 컬럼에 쓰다 실패하지 않게)", () => {
    const { row } = photos!.split({ caption: "안녕", 이상한필드: 1 });
    expect(row).toEqual({ caption: "안녕" });
  });

  it("날짜 컬럼은 ISO 로", () => {
    const { row } = photos!.split({ takenAt: new Date("2026-08-31T00:00:00Z") });
    expect(row.captured_at).toBe("2026-08-31T00:00:00.000Z");
  });
});

describe("앨범 변환", () => {
  it("기본 이모지를 채운다", () => {
    expect(albums!.fromDb({ id: "a1", title: "첫 크리스마스" }).emoji).toBe("📁");
    expect(albums!.fromDb({ id: "a1", title: "x", emoji: "🎄" }).emoji).toBe("🎄");
  });

  it("정렬 순서가 없으면 0", () => {
    expect(albums!.fromDb({ id: "a1", title: "x" }).sortOrder).toBe(0);
  });

  it("컬럼 이름을 바꿔 보낸다", () => {
    const { row } = albums!.split({ title: "x", sortOrder: 3, coverMediaId: "m1" });
    expect(row).toEqual({ title: "x", sort_order: 3, cover_media_id: "m1" });
  });
});

describe("사람 변환 — 역할 이름이 DB 와 화면에서 다르다", () => {
  it("DB 이름을 화면 이름으로", () => {
    expect(users!.fromDb({ id: "u", role: "admin" }).role).toBe("admin");
    expect(users!.fromDb({ id: "u", role: "parent" }).role).toBe("member");
    expect(users!.fromDb({ id: "u", role: "family" }).role).toBe("viewer");
    expect(users!.fromDb({ id: "u", role: "gallery_only" }).role).toBe("viewer");
  });

  it("원래 DB 값도 함께 넘긴다", () => {
    expect(users!.fromDb({ id: "u", role: "family" }).roleDb).toBe("family");
  });

  it("모르는 역할은 가장 약한 권한으로 본다", () => {
    // 권한을 모를 때 넓게 주면 안 된다
    expect(users!.fromDb({ id: "u", role: "이상한역할" }).role).toBe("viewer");
    expect(users!.fromDb({ id: "u" }).role).toBe("viewer");
  });

  it("화면 이름을 DB 이름으로", () => {
    expect(users!.split({ role: "member" }).row.role).toBe("parent");
    expect(users!.split({ role: "viewer" }).row.role).toBe("gallery_only");
    expect(users!.split({ role: "admin" }).row.role).toBe("admin");
  });

  it("두 표가 서로 어긋나지 않는다", () => {
    for (const ui of Object.keys(ROLE_TO_DB)) {
      expect(ROLE_FROM_DB[ROLE_TO_DB[ui] as string]).toBe(ui);
    }
  });

  it("uid 와 id 를 함께 준다 (화면이 둘 다 쓴다)", () => {
    const p = users!.fromDb({ id: "u1" });
    expect(p.uid).toBe("u1");
    expect(p.id).toBe("u1");
  });

  it("family_id 는 화면으로 넘기지도, 받지도 않는다", () => {
    expect(users!.fromDb({ id: "u1", family_id: "f1" }).familyId).toBeUndefined();
    expect(users!.split({ familyId: "남의집" }).row.family_id).toBeUndefined();
  });

  it("모르는 필드는 보내지 않는다", () => {
    expect(users!.split({ name: "엄마", 이상한필드: 1 }).row).toEqual({ display_name: "엄마" });
  });
});

describe("조건에 쓰는 필드 이름", () => {
  it("화면 이름으로 조회할 수 있다", () => {
    expect(FIELD_COL.records!.createdBy).toBe("created_by");
    expect(FIELD_COL.photos!.takenAt).toBe("captured_at");
    expect(FIELD_COL.photos!.createdAt).toBe("uploaded_at");
    expect(FIELD_COL.albums!.sortOrder).toBe("sort_order");
  });

  it("사진의 createdAt 은 records 의 createdAt 과 다른 컬럼이다", () => {
    // media 는 uploaded_at, records 는 created_at — 헷갈리면 정렬이 틀어진다
    expect(FIELD_COL.photos!.createdAt).not.toBe(FIELD_COL.records!.createdAt);
  });
});

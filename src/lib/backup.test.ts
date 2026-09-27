import { describe, it, expect } from "vitest";
import { buildBackup, verifyBackup, inspectBackup, BACKUP_VERSION } from "./backup";
import type { Photo, BabyRecord, Album } from "@/types/models";

const photo = (id: string, over: Partial<Photo> = {}): Photo => ({
  id, albumId: null, storagePath: `fam/2026/09/${id}.jpg`, previewPath: null, thumbPath: null,
  url: null, thumbUrl: null, caption: "", category: "baby", uploaderName: "엄마", uploadedBy: "u1",
  createdAt: "2026-09-01T00:00:00Z", takenAt: "2026-09-01T00:00:00Z", people: [], place: "",
  gps: null, vis: "public", likedBy: [], favorite: false, width: null, height: null, bytes: null,
  ...over,
});
const rec = (id: string, at: string): BabyRecord => ({
  id, type: "feeding", at, createdAt: at, createdBy: "u1", creatorName: "엄마",
});
const album: Album = { id: "a1", title: "첫돌", emoji: "🎂", description: "", coverMediaId: null,
  eventDate: null, sortOrder: 1, createdAt: "" };

const base = { baby: { name: "또또", dueDate: "2026-12-14" }, records: [], photos: [], albums: [], users: [] };

describe("buildBackup", () => {
  it("사진 원본을 실제로 담는다 (예전엔 url 이 null 이라 복원 시 전부 사라졌다)", async () => {
    const b = await buildBackup({
      ...base,
      photos: [photo("m1"), photo("m2")],
      toDataUrl: async () => "data:image/jpeg;base64,AAAA",
    });
    expect(b.photos).toHaveLength(2);
    expect(b.photos.every((p) => p.url.startsWith("data:"))).toBe(true);
    expect(b.summary.photos).toBe(2);
    expect(b.summary.photosExpected).toBe(2);
    expect(b.version).toBe(BACKUP_VERSION);
  });

  it("실패한 사진을 숨기지 않고 기록한다", async () => {
    const b = await buildBackup({
      ...base,
      photos: [photo("m1"), photo("m2"), photo("m3")],
      toDataUrl: async (p) => (p.id === "m2" ? null : "data:image/jpeg;base64,AAAA"),
    });
    expect(b.photos).toHaveLength(2);
    expect(b.summary.failedPhotoIds).toEqual(["m2"]);
    expect(b.summary.photosExpected).toBe(3);
  });

  it("기록을 시간순으로 정렬한다", async () => {
    const b = await buildBackup({
      ...base,
      records: [rec("r2", "2026-09-20T00:00:00Z"), rec("r1", "2026-09-01T00:00:00Z")],
    });
    expect(b.records.map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("진행률을 알려준다", async () => {
    const seen: number[] = [];
    await buildBackup({
      ...base, photos: [photo("m1"), photo("m2")],
      toDataUrl: async () => "data:image/jpeg;base64,AA",
      onProgress: (p) => seen.push(p.done),
    });
    expect(seen).toContain(0);
    expect(seen).toContain(2);   // 완료
  });
});

describe("verifyBackup — 무결성", () => {
  it("전부 담기면 성공으로 알린다", async () => {
    const b = await buildBackup({ ...base, records: [rec("r1", "2026-09-01T00:00:00Z")],
      photos: [photo("m1")], albums: [album], toDataUrl: async () => "data:image/jpeg;base64,AA" });
    const v = verifyBackup(b);
    expect(v.ok).toBe(true);
    expect(v.message).toContain("사진 1/1장");
  });

  it("사진이 빠지면 실패로 알린다 (조용히 넘어가지 않는다)", async () => {
    const b = await buildBackup({ ...base, photos: [photo("m1"), photo("m2")],
      toDataUrl: async (p) => (p.id === "m1" ? "data:image/jpeg;base64,AA" : null) });
    const v = verifyBackup(b);
    expect(v.ok).toBe(false);
    expect(v.message).toContain("1/2장");
  });

  it("v2 처럼 url 이 없는 백업을 실패로 판정한다", () => {
    const fake = {
      exportedAt: "", version: 2, baby: {}, records: [], albums: [], users: [],
      photos: [{ ...photo("m1"), url: null as unknown as string }],
      summary: { records: 0, photos: 1, photosExpected: 1, albums: 0, users: 0, failedPhotoIds: [] },
    };
    expect(verifyBackup(fake).ok).toBe(false);
  });
});

describe("inspectBackup — 복원 전 검사", () => {
  it("사진이 실제로 들어있는지 센다", () => {
    const r = inspectBackup({
      version: 3, records: [rec("r1", "2026-09-01T00:00:00Z")], albums: [album], users: [],
      photos: [{ url: "data:image/jpeg;base64,AA" }, { url: null }],
      baby: { name: "또또" },
    });
    expect(r.ok).toBe(true);
    expect(r.photos).toBe(2);
    expect(r.photosWithImage).toBe(1);   // 1장은 이미지가 없다
    expect(r.records).toBe(1);
  });

  it("형식이 아니면 이유를 알려준다", () => {
    expect(inspectBackup({ hello: 1 }).ok).toBe(false);
    expect(inspectBackup(null).reason).toContain("읽을 수 없어요");
  });

  it("구버전(version 없음)도 읽는다", () => {
    const r = inspectBackup({ records: [], photos: [] });
    expect(r.ok).toBe(true);
    expect(r.version).toBe(1);
  });
});

describe("한 장이 실패해도 백업은 계속된다", () => {
  it("변환이 예외를 던져도 나머지를 담는다", async () => {
    const b = await buildBackup({
      ...base, photos: [photo("m1"), photo("m2"), photo("m3")],
      toDataUrl: async (p) => {
        if (p.id === "m2") throw new Error("네트워크 끊김");
        return "data:image/jpeg;base64,AA";
      },
    });
    expect(b.photos).toHaveLength(2);                 // m1, m3 는 담긴다
    expect(b.summary.failedPhotoIds).toEqual(["m2"]);
    expect(verifyBackup(b).ok).toBe(false);           // 빠진 걸 숨기지 않는다
    expect(verifyBackup(b).message).toContain("2/3장");
  });
});

import { describe, it, expect } from "vitest";
import { tempStage, fhrCheck, crlGuide, roleLabel, ROLE_LABEL } from "./guides";

describe("체온 단계 — 경계가 틀리면 잘못 안심하게 된다", () => {
  it("36.0 미만은 낮은 편", () => {
    expect(tempStage(35.9)?.label).toBe("낮은 편");
  });

  it("36.0 은 이미 참고 범위다", () => {
    expect(tempStage(36.0)?.label).toBe("참고 범위");
  });

  it("37.5 는 아직 참고 범위다", () => {
    expect(tempStage(37.5)?.label).toBe("참고 범위");
  });

  it("37.6 부터 조금 높음", () => {
    expect(tempStage(37.6)?.label).toBe("조금 높음");
  });

  it("37.9 는 아직 조금 높음", () => {
    expect(tempStage(37.9)?.label).toBe("조금 높음");
  });

  it("38.0 은 '조금 높음' 이 아니라 '38℃ 이상' 이다", () => {
    // 여기가 한 칸 밀리면 열이 나는 아기를 괜찮다고 보여준다
    expect(tempStage(38.0)?.label).toBe("38℃ 이상");
    expect(tempStage(38.0)?.msg).toContain("바로 소아과 진료");
  });

  it("아주 높은 값도 같은 단계", () => {
    expect(tempStage(40.5)?.label).toBe("38℃ 이상");
  });

  it("값이 없으면 아무것도 보여주지 않는다", () => {
    expect(tempStage(null)).toBeNull();
    expect(tempStage(undefined)).toBeNull();
    expect(tempStage(NaN)).toBeNull();
  });

  it("'정상' 이나 '비정상' 이라고 단정하지 않는다", () => {
    for (const t of [35, 36.5, 37.8, 39]) {
      const s = tempStage(t)!;
      expect(s.label).not.toContain("정상");
      expect(s.msg).not.toContain("비정상");
    }
  });

  it("모든 단계에 색과 배경이 있다 (화면이 깨지지 않게)", () => {
    for (const t of [35, 36.5, 37.8, 39]) {
      const s = tempStage(t)!;
      expect(s.color).toMatch(/^text-/);
      expect(s.bg).toMatch(/^bg-/);
    }
  });
});

describe("태아 심박수", () => {
  it("120~160 은 참고 범위 안", () => {
    expect(fhrCheck(120)?.ok).toBe(true);
    expect(fhrCheck(145)?.ok).toBe(true);
    expect(fhrCheck(160)?.ok).toBe(true);
  });

  it("범위를 벗어나면 진료 때 보여주라고 안내한다", () => {
    expect(fhrCheck(119)?.ok).toBe(false);
    expect(fhrCheck(161)?.ok).toBe(false);
    expect(fhrCheck(161)?.msg).toContain("산부인과");
  });

  it("문자열로 들어와도 숫자로 본다 (입력칸 값이 문자열이다)", () => {
    expect(fhrCheck("145")?.ok).toBe(true);
  });

  it("비었거나 말이 안 되면 아무것도 보여주지 않는다", () => {
    expect(fhrCheck("")).toBeNull();
    expect(fhrCheck(null)).toBeNull();
    expect(fhrCheck("모르겠음")).toBeNull();
  });

  it("0 을 '비어 있음' 으로 보지 않는다", () => {
    // 예전 코드는 !bpm 으로 걸러서 0 이 null 이 됐다.
    // 0 은 입력 실수지만, 조용히 사라지는 것보다 범위 밖이라고 말해주는 게 낫다.
    expect(fhrCheck(0)?.ok).toBe(false);
  });

  it("'정상' 이라고 쓰지 않는다", () => {
    expect(fhrCheck(145)?.msg).not.toContain("정상");
    expect(fhrCheck(200)?.msg).not.toContain("정상");
  });
});

describe("CRL 측정 시기 안내", () => {
  it("6~13주는 맞는 시기", () => {
    expect(crlGuide(6)?.ok).toBe(true);
    expect(crlGuide(13)?.ok).toBe(true);
  });

  it("그 밖이면 다른 수치를 쓰라고 안내", () => {
    expect(crlGuide(5)?.ok).toBe(false);
    expect(crlGuide(14)?.ok).toBe(false);
    expect(crlGuide(14)?.msg).toContain("BPD");
  });

  it("비었으면 아무것도 보여주지 않는다", () => {
    expect(crlGuide("")).toBeNull();
    expect(crlGuide(null)).toBeNull();
    expect(crlGuide("몰라")).toBeNull();
  });
});

describe("계정 등급 이름", () => {
  it("세 가지를 한국어로", () => {
    expect(roleLabel("admin")).toBe("관리자");
    expect(roleLabel("member")).toBe("구성원");
    expect(roleLabel("viewer")).toBe("관람전용");
  });

  it("모르는 값이면 구성원 (빈 칸을 보여주지 않게)", () => {
    expect(roleLabel("이상한역할")).toBe("구성원");
    expect(roleLabel(null)).toBe("구성원");
    expect(roleLabel(undefined)).toBe("구성원");
    expect(roleLabel("")).toBe("구성원");
  });

  it("DB 이름을 그대로 넣으면 안 된다는 걸 드러낸다", () => {
    // DB 는 parent/gallery_only 를 쓴다. 변환 없이 넣으면 '구성원' 으로
    // 뭉개지므로, 변환은 legacyMappers 가 책임진다.
    expect(ROLE_LABEL.parent).toBeUndefined();
    expect(ROLE_LABEL.gallery_only).toBeUndefined();
  });
});

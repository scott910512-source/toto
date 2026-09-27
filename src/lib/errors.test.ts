import { describe, it, expect } from "vitest";
import { errMsg } from "./errors";

describe("errMsg", () => {
  it("로그인 실패를 한국어로", () => {
    expect(errMsg({ message: "Invalid login credentials" })).toContain("올바르지 않아요");
  });
  it("RLS 거부를 권한 안내로", () => {
    expect(errMsg({ message: 'new row violates row-level security policy' })).toContain("권한이 없어요");
  });
  it("초대코드 오류를 그대로 안내", () => {
    expect(errMsg({ message: "초대코드를 찾을 수 없습니다: ZZZZZZ" })).toContain("가족에게 코드를");
  });
  it("마지막 관리자 강등 차단 메시지", () => {
    expect(errMsg({ message: "마지막 관리자는 권한을 낮출 수 없습니다." })).toContain("다른 관리자를");
  });
  it("네트워크 오류", () => {
    expect(errMsg(new TypeError("Failed to fetch"))).toContain("네트워크");
  });
  it("모르는 오류는 원문을 보여준다", () => {
    expect(errMsg({ message: "뭔가 이상함" })).toBe("뭔가 이상함");
  });
  it("빈 값도 안전하게", () => {
    expect(errMsg(null)).toBe("알 수 없는 오류가 발생했어요.");
  });
});

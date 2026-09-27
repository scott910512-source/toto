import { describe, it, expect } from "vitest";
import { diagnoseConfig } from "./supabase";

const URL_OK = "https://cuxcxzqfcnofmuusxsvo.supabase.co";
const b64 = (o: unknown) =>
  Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${b64({ iss: "supabase", role })}.sig`;

describe("diagnoseConfig", () => {
  it("정상 anon JWT", () => expect(diagnoseConfig(URL_OK, jwt("anon"))).toBeNull());
  it("정상 publishable 키", () => expect(diagnoseConfig(URL_OK, "sb_publishable_AbCd1234efgh")).toBeNull());
  it("URL 끝 슬래시 허용", () => expect(diagnoseConfig(URL_OK + "/", jwt("anon"))).toBeNull());

  it("키 자리에 URL 을 넣은 경우를 잡는다", () => {
    expect(diagnoseConfig(URL_OK, URL_OK + "/rest/v1/")?.code).toBe("url-as-key");
  });
  it("service_role JWT 를 막는다", () => {
    expect(diagnoseConfig(URL_OK, jwt("service_role"))?.code).toBe("secret-key");
  });
  it("신형 secret 키도 막는다", () => {
    expect(diagnoseConfig(URL_OK, "sb_secret_AbCd1234efgh")?.code).toBe("secret-key");
  });
  it("빈 값", () => {
    expect(diagnoseConfig("", jwt("anon"))?.code).toBe("no-url");
    expect(diagnoseConfig(URL_OK, "")?.code).toBe("no-key");
  });
  it("주소 형식 오류", () => {
    expect(diagnoseConfig("cuxcxzqfcnofmuusxsvo.supabase.co", jwt("anon"))?.code).toBe("bad-url");
  });
  it("아무 문자열", () => {
    expect(diagnoseConfig(URL_OK, "내키값")?.code).toBe("bad-key");
  });
});

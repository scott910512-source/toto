import { describe, it, expect } from "vitest";
import { readConfig } from "./readConfig";

describe("접속 정보를 어디서 읽나", () => {
  it("빌드 때 넣은 값을 먼저 쓴다", () => {
    const c = readConfig(
      { url: "https://env.supabase.co", key: "eyJenv" },
      { SUPABASE_URL: "https://win.supabase.co", SUPABASE_ANON_KEY: "eyJwin" },
    );
    expect(c.url).toBe("https://env.supabase.co");
    expect(c.key).toBe("eyJenv");
    expect(c.source).toEqual({ url: "env", key: "env" });
  });

  it("없으면 supabase-config.js 가 올려둔 값을 쓴다 (app.html 과 같은 파일)", () => {
    const c = readConfig({}, { SUPABASE_URL: "https://win.supabase.co", SUPABASE_ANON_KEY: "eyJwin" });
    expect(c.url).toBe("https://win.supabase.co");
    expect(c.source).toEqual({ url: "window", key: "window" });
  });

  it("한쪽만 있어도 각각 따로 고른다", () => {
    const c = readConfig({ url: "https://env.supabase.co" }, { SUPABASE_ANON_KEY: "eyJwin" });
    expect(c.source).toEqual({ url: "env", key: "window" });
  });

  it("앞뒤 공백을 떼어낸다 (붙여넣다 섞인 줄바꿈 때문에 안 붙는 일이 많다)", () => {
    const c = readConfig({ url: "  https://x.supabase.co \n", key: " eyJa " }, {});
    expect(c.url).toBe("https://x.supabase.co");
    expect(c.key).toBe("eyJa");
  });

  it("빈 문자열은 '없음' 으로 본다", () => {
    const c = readConfig({ url: "   ", key: "" }, {});
    expect(c.url).toBe("");
    expect(c.source).toEqual({ url: "none", key: "none" });
  });

  it("문자열이 아닌 값이 들어와도 깨지지 않는다", () => {
    const c = readConfig({}, { SUPABASE_URL: 123, SUPABASE_ANON_KEY: null });
    expect(c.url).toBe("");
    expect(c.key).toBe("");
  });

  it("사진 저장소는 기본값이 있다", () => {
    expect(readConfig({}, {}).bucket).toBe("family-media");
    expect(readConfig({ bucket: "other" }, {}).bucket).toBe("other");
    expect(readConfig({}, { MEDIA_BUCKET: "win-bucket" }).bucket).toBe("win-bucket");
  });
});

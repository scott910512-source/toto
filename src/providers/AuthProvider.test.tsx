import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth, type AuthClient } from "./AuthProvider";

type Row = Record<string, unknown>;

function fakeClient(opts: {
  session?: { id: string; email?: string | null } | null;
  profile?: Row | null;
  profileError?: unknown;
  rpcError?: unknown;
} = {}) {
  const calls: Array<{ op: string; arg?: unknown }> = [];
  let onChange: ((e: string, s: { user: { id: string } } | null) => void) | null = null;
  const unsubscribe = vi.fn();

  const client: AuthClient = {
    auth: {
      getSession: () => {
        calls.push({ op: "getSession" });
        return Promise.resolve({ data: { session: opts.session ? { user: opts.session } : null } });
      },
      onAuthStateChange: (cb) => {
        onChange = cb;
        return { data: { subscription: { unsubscribe } } };
      },
    },
    from: (t) => ({
      select: () => ({
        eq: (_c, v) => ({
          maybeSingle: () => {
            calls.push({ op: "readProfile", arg: `${t}:${v}` });
            return Promise.resolve({
              data: opts.profileError ? null : (opts.profile ?? null),
              error: opts.profileError ?? null,
            });
          },
        }),
      }),
    }),
    rpc: (fn) => {
      calls.push({ op: "rpc", arg: fn });
      return Promise.resolve({ error: opts.rpcError ?? null });
    },
  };

  /* 로그인 상태 변화를 흉내낸다. act 로 감싸지 않으면 React 가
     "화면 갱신이 테스트 밖에서 일어났다" 고 경고한다. */
  const fire = async (s: { user: { id: string } } | null) => {
    await act(async () => { onChange?.("SIGNED_IN", s); });
  };
  return { client, calls, fire, unsubscribe };
}

function Show() {
  const { user, profile, isAdmin, approved, adminMismatch } = useAuth();
  return (
    <>
      <p data-testid="user">{user === undefined ? "확인중" : user === null ? "비로그인" : user.id}</p>
      <p data-testid="role">{profile?.role ?? "-"}</p>
      <p data-testid="admin">{isAdmin ? "관리자" : "아님"}</p>
      <p data-testid="approved">{approved ? "승인" : "대기"}</p>
      <p data-testid="mismatch">{adminMismatch ? "불일치" : "정상"}</p>
    </>
  );
}

const mount = (c: AuthClient, adminEmails?: string[]) =>
  render(<AuthProvider client={c} adminEmails={adminEmails}><Show /></AuthProvider>);

const ADMIN = { id: "u1", email: "me@t.com", role: "admin", approved: true, family_id: "f1" };

describe("로그인 상태", () => {
  it("처음에는 '확인중' 이다 (로그인 화면이 깜빡이지 않게)", async () => {
    const f = fakeClient({ session: { id: "u1" } });
    mount(f.client);
    expect(screen.getByTestId("user")).toHaveTextContent("확인중");
    // 세션 확인이 끝나기를 기다린다. 기다리지 않으면 테스트가 끝난 뒤에
    // 화면이 갱신돼 React 가 경고를 낸다 (경고를 쌓으면 진짜 문제를 가린다)
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("u1"));
  });

  it("세션이 없으면 비로그인", async () => {
    const f = fakeClient({ session: null });
    mount(f.client);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("비로그인"));
  });

  it("세션이 있으면 그 사람으로", async () => {
    const f = fakeClient({ session: { id: "u1", email: "me@t.com" }, profile: ADMIN });
    mount(f.client);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("u1"));
  });

  it("로그아웃하면 프로필도 비운다 (다음 사람에게 남의 권한이 남지 않게)", async () => {
    const f = fakeClient({ session: { id: "u1" }, profile: ADMIN });
    mount(f.client);
    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("admin"));
    await f.fire(null);
    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("-"));
    expect(screen.getByTestId("admin")).toHaveTextContent("아님");
  });

  it("떠날 때 구독을 끊는다", async () => {
    const f = fakeClient({ session: null });
    const { unmount } = mount(f.client);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("비로그인"));
    unmount();
    expect(f.unsubscribe).toHaveBeenCalled();
  });
});

describe("권한은 DB 가 정한다", () => {
  it("DB 가 관리자라고 하면 관리자다", async () => {
    const f = fakeClient({ session: { id: "u1" }, profile: ADMIN });
    mount(f.client);
    await waitFor(() => expect(screen.getByTestId("admin")).toHaveTextContent("관리자"));
  });

  it("승인 전이면 관리자여도 아니다", async () => {
    const f = fakeClient({ session: { id: "u1" }, profile: { ...ADMIN, approved: false } });
    mount(f.client);
    await waitFor(() => expect(screen.getByTestId("approved")).toHaveTextContent("대기"));
    expect(screen.getByTestId("admin")).toHaveTextContent("아님");
  });

  it("DB 역할 이름을 화면 이름으로 바꿔 준다", async () => {
    const f = fakeClient({ session: { id: "u1" }, profile: { ...ADMIN, role: "parent" } });
    mount(f.client);
    // DB parent → 화면 member
    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("member"));
    expect(screen.getByTestId("admin")).toHaveTextContent("아님");
  });

  it("프로필을 못 읽으면 아무 권한도 주지 않는다", async () => {
    const f = fakeClient({ session: { id: "u1" }, profileError: { message: "권한 없음" } });
    mount(f.client);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("u1"));
    expect(screen.getByTestId("admin")).toHaveTextContent("아님");
    expect(screen.getByTestId("approved")).toHaveTextContent("대기");
  });

  it("프로필이 아직 없어도(트리거 직후) 권한을 주지 않는다", async () => {
    const f = fakeClient({ session: { id: "u1" }, profile: null });
    mount(f.client);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("u1"));
    expect(screen.getByTestId("approved")).toHaveTextContent("대기");
  });
});

describe("관리자 이메일은 권한이 아니라 안내다", () => {
  it("이메일이 맞고 DB 도 관리자면 조용하다", async () => {
    const f = fakeClient({ session: { id: "u1", email: "boss@t.com" }, profile: ADMIN });
    mount(f.client, ["boss@t.com"]);
    await waitFor(() => expect(screen.getByTestId("admin")).toHaveTextContent("관리자"));
    expect(screen.getByTestId("mismatch")).toHaveTextContent("정상");
  });

  it("이메일만 맞고 DB 는 아니면 — 권한을 주지 않고 알린다", async () => {
    const f = fakeClient({
      session: { id: "u1", email: "boss@t.com" },
      profile: { ...ADMIN, role: "family" },
    });
    mount(f.client, ["boss@t.com"]);
    await waitFor(() => expect(screen.getByTestId("mismatch")).toHaveTextContent("불일치"));
    // 예전에는 여기서 화면이 관리자 메뉴를 열어줬다
    expect(screen.getByTestId("admin")).toHaveTextContent("아님");
  });

  it("대소문자를 가리지 않는다", async () => {
    const f = fakeClient({
      session: { id: "u1", email: "BOSS@T.com" },
      profile: { ...ADMIN, role: "family" },
    });
    mount(f.client, ["boss@t.com"]);
    await waitFor(() => expect(screen.getByTestId("mismatch")).toHaveTextContent("불일치"));
  });

  it("목록에 없는 사람에게는 안내도 띄우지 않는다", async () => {
    const f = fakeClient({ session: { id: "u1", email: "mom@t.com" }, profile: { ...ADMIN, role: "parent" } });
    mount(f.client, ["boss@t.com"]);
    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("member"));
    expect(screen.getByTestId("mismatch")).toHaveTextContent("정상");
  });
});

describe("접속 기록", () => {
  it("로그인하면 DB 함수로 남긴다 (프로필을 직접 고치지 않는다)", async () => {
    const f = fakeClient({ session: { id: "u1" }, profile: ADMIN });
    mount(f.client);
    await waitFor(() => expect(f.calls.some((c) => c.op === "rpc" && c.arg === "touch_login")).toBe(true));
  });

  it("로그인 전에는 부르지 않는다", async () => {
    const f = fakeClient({ session: null });
    mount(f.client);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("비로그인"));
    expect(f.calls.some((c) => c.op === "rpc")).toBe(false);
  });

  it("기록이 실패해도 로그인은 그대로 된다", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = fakeClient({ session: { id: "u1" }, profile: ADMIN, rpcError: { message: "막힘" } });
    mount(f.client);
    await waitFor(() => expect(screen.getByTestId("admin")).toHaveTextContent("관리자"));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

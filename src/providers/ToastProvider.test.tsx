import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast, type ToastOptions, type ToastType } from "./ToastProvider";

function Trigger({ msg, type, opts }: { msg: string; type?: ToastType; opts?: ToastOptions }) {
  const toast = useToast();
  return <button onClick={() => toast(msg, type, opts)}>알림 띄우기</button>;
}

const show = async (props: Parameters<typeof Trigger>[0]) => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<ToastProvider><Trigger {...props} /></ToastProvider>);
  await user.click(screen.getByRole("button", { name: "알림 띄우기" }));
  return user;
};

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("알림", () => {
  it("메시지를 띄운다", async () => {
    await show({ msg: "저장했어요" });
    expect(await screen.findByRole("alert")).toHaveTextContent("저장했어요");
  });

  it("잠시 뒤 사라진다", async () => {
    await show({ msg: "저장했어요" });
    await screen.findByRole("alert");
    act(() => void vi.advanceTimersByTime(3300));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("실행취소가 없으면 되돌리기 버튼도 없다", async () => {
    await show({ msg: "메모를 저장했어요" });
    const alert = await screen.findByRole("alert");
    expect(alert.querySelector("button")).toBeNull();
  });
});

describe("실행취소", () => {
  it("되돌리기 버튼이 함께 뜬다", async () => {
    await show({ msg: "기저귀 기록 추가", type: "success", opts: { undo: vi.fn() } });
    expect(await screen.findByRole("button", { name: "실행취소" })).toBeInTheDocument();
  });

  it("누르면 되돌리는 동작이 불린다", async () => {
    const undo = vi.fn();
    const user = await show({ msg: "기저귀 기록 추가", opts: { undo } });
    await user.click(await screen.findByRole("button", { name: "실행취소" }));
    await waitFor(() => expect(undo).toHaveBeenCalledTimes(1));
  });

  it("누르면 알림이 바로 사라진다", async () => {
    const user = await show({ msg: "기저귀 기록 추가", opts: { undo: vi.fn() } });
    await user.click(await screen.findByRole("button", { name: "실행취소" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("되돌리기가 있으면 더 오래 머문다 (3.2초에 사라지지 않는다)", async () => {
    // 아기 안고 한 손으로 쓰는 화면이라 3초는 너무 짧다
    await show({ msg: "수면을 시작했어요", opts: { undo: vi.fn() } });
    await screen.findByRole("alert");
    act(() => void vi.advanceTimersByTime(4000));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(4500));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("되돌리기가 실패해도 앱이 멈추지 않는다", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const undo = vi.fn().mockRejectedValue(new Error("권한 없음"));
    const user = await show({ msg: "기저귀 기록 추가", opts: { undo } });
    await user.click(await screen.findByRole("button", { name: "실행취소" }));
    await waitFor(() => expect(err).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
    err.mockRestore();
  });

  it("되돌리기가 던져도 조용히 삼키지 않는다", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = await show({
      msg: "기저귀 기록 추가",
      opts: { undo: () => { throw new Error("터짐"); } },
    });
    await user.click(await screen.findByRole("button", { name: "실행취소" }));
    await waitFor(() => expect(err).toHaveBeenCalled());
    err.mockRestore();
  });

  it("머무는 시간을 직접 정할 수 있다", async () => {
    await show({ msg: "잠깐", opts: { ms: 1000 } });
    await screen.findByRole("alert");
    act(() => void vi.advanceTimersByTime(1100));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});

describe("여러 개가 겹칠 때", () => {
  it("쌓여서 함께 보인다", async () => {
    const user = await show({ msg: "첫 번째" });
    await user.click(screen.getByRole("button", { name: "알림 띄우기" }));
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
  });

  it("하나를 되돌려도 다른 알림은 남는다", async () => {
    function Two() {
      const toast = useToast();
      return (
        <>
          <button onClick={() => toast("되돌릴 것", "success", { undo: vi.fn() })}>A</button>
          <button onClick={() => toast("그냥 알림")}>B</button>
        </>
      );
    }
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ToastProvider><Two /></ToastProvider>);
    await user.click(screen.getByRole("button", { name: "A" }));
    await user.click(screen.getByRole("button", { name: "B" }));
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
    await user.click(screen.getByRole("button", { name: "실행취소" }));
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1));
    expect(screen.getByRole("alert")).toHaveTextContent("그냥 알림");
  });

  it("같은 순간에 띄워도 서로 덮어쓰지 않는다", async () => {
    // Date.now() 로 id 를 만들면 같은 밀리초에 두 개가 겹쳐 하나가 사라진다
    function Burst() {
      const toast = useToast();
      return <button onClick={() => { toast("하나"); toast("둘"); toast("셋"); }}>한꺼번에</button>;
    }
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ToastProvider><Burst /></ToastProvider>);
    await user.click(screen.getByRole("button", { name: "한꺼번에" }));
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(3));
  });
});

describe("스크린리더", () => {
  it("알림 영역을 바로 읽어준다", async () => {
    await show({ msg: "저장했어요" });
    await screen.findByRole("alert");
    const live = document.querySelector('[aria-live="assertive"]');
    expect(live).not.toBeNull();
    expect(live).toHaveTextContent("저장했어요");
  });
});

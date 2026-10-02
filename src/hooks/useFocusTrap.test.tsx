import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/ui/Modal";

/* 모달을 열고 닫는 작은 화면. 실제 쓰임과 같게 '여는 버튼' 을 둔다 —
   닫을 때 초점이 그 버튼으로 돌아가는지 확인해야 하기 때문이다. */
function Harness({ title = "다른 기록", onClose }: { title?: string; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>＋ 다른 기록</button>
      <button>바깥 버튼</button>
      <Modal open={open} title={title} onClose={() => { setOpen(false); onClose?.(); }}>
        <button>첫째</button>
        <button>둘째</button>
        <input aria-label="메모" />
      </Modal>
    </>
  );
}

/* 모달을 열고, 초점이 안으로 들어오기를 기다린다.
   초점이 옮겨지기 전에 Tab 을 누르면 사람이 할 수 없는 조작을 흉내내는 셈이라
   테스트가 잘못된 실패를 낸다. */
const openModal = async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "＋ 다른 기록" }));
  const dlg = await screen.findByRole("dialog");
  await waitFor(() => expect(dlg.contains(document.activeElement)).toBe(true));
  return user;
};

describe("모달 초점 가두기", () => {
  it("열면 모달 안 첫 요소로 초점이 간다", async () => {
    await openModal();
    // 제목이 있으면 닫기(×) 가 첫 요소다 — 스크린리더가 제목 다음에 바로 닫기를 읽는다
    await waitFor(() => expect(screen.getByRole("button", { name: "닫기" })).toHaveFocus());
  });

  it("제목과 aria-labelledby 로 연결된다", async () => {
    await openModal();
    const dlg = screen.getByRole("dialog");
    const id = dlg.getAttribute("aria-labelledby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toHaveTextContent("다른 기록");
  });

  it("제목이 없으면 이름을 따로 붙여준다", async () => {
    const user = userEvent.setup();
    render(
      <Modal open onClose={() => {}}>
        <button>하나</button>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "대화상자");
    await user.keyboard("{Tab}");       // 터지지 않는지만 확인
  });

  it("Tab 을 계속 눌러도 초점이 모달 밖으로 새지 않는다", async () => {
    const user = await openModal();
    const dlg = screen.getByRole("dialog");
    for (let i = 0; i < 12; i++) {
      await user.keyboard("{Tab}");
      expect(dlg.contains(document.activeElement)).toBe(true);
    }
  });

  it("Shift+Tab 으로 거꾸로 돌아도 새지 않는다", async () => {
    const user = await openModal();
    const dlg = screen.getByRole("dialog");
    for (let i = 0; i < 12; i++) {
      await user.keyboard("{Shift>}{Tab}{/Shift}");
      expect(dlg.contains(document.activeElement)).toBe(true);
    }
  });

  it("ESC 로 닫힌다", async () => {
    const user = await openModal();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("바깥(어두운 배경)을 누르면 닫힌다", async () => {
    const user = await openModal();
    // 덮개는 dialog 의 부모다
    await user.click(screen.getByRole("dialog").parentElement!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("모달 안을 눌러도 닫히지 않는다", async () => {
    const user = await openModal();
    await user.click(screen.getByRole("button", { name: "첫째" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("닫으면 열었던 버튼으로 초점이 돌아온다", async () => {
    const user = await openModal();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "＋ 다른 기록" })).toHaveFocus(),
    );
  });

  it("열려 있는 동안 뒤 화면이 스크롤되지 않는다", async () => {
    const user = await openModal();
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });

  it("닫혀 있으면 아무것도 그리지 않는다", () => {
    render(<Modal open={false} onClose={() => {}}><button>하나</button></Modal>);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "하나" })).toBeNull();
  });

  it("닫기 버튼을 누르면 onClose 가 불린다", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "＋ 다른 기록" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

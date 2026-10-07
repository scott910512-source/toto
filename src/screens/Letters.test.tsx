import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Letters, type Letter } from "./Letters";

const ME = "u-me", DAD = "u-dad", AUNT = "u-aunt";
const at = "2026-10-01T10:00:00.000Z";

const LETTERS: Letter[] = [
  { id: "l1", title: "사랑하는 또또에게", body: "건강하게 나와줘", vis: "public", createdBy: DAD, creatorName: "아빠", at },
  { id: "l2", title: "엄마의 비밀 편지", body: "너만 알아줘", vis: "private", createdBy: ME, creatorName: "엄마", at },
  { id: "l3", title: "이모의 비밀 편지", body: "이모만 아는 얘기", vis: "private", createdBy: AUNT, creatorName: "이모", at,
    reply: "고마워요", replyBy: "엄마", replyAt: at },
];

/* 모달은 열리고 잠시 뒤(60ms) 첫 입력칸으로 초점을 옮긴다. 그 전에 치기
   시작하면 글자가 다른 곳으로 간다 — 진짜 사람은 그 사이에 못 친다. */
async function openDialog(user: ReturnType<typeof userEvent.setup>, name: RegExp | string) {
  await user.click(screen.getByRole("button", { name }));
  const dlg = screen.getByRole("dialog");
  await waitFor(() => expect(dlg.contains(document.activeElement)).toBe(true));
  return dlg;
}

function setup(over: Partial<React.ComponentProps<typeof Letters>> = {}) {
  const props = {
    letters: LETTERS, uid: ME, isAdmin: false,
    onSave: vi.fn(async () => {}), onDelete: vi.fn(async () => {}), onReply: vi.fn(async () => {}),
    confirm: vi.fn(async () => true),
    ...over,
  };
  const utils = render(<Letters {...props} />);
  return { ...utils, props, user: userEvent.setup() };
}

describe("편지 목록 — 누구에게 무엇이 보이나", () => {
  it("일반 가족은 공개 편지와 내 나만보기 편지만 본다", () => {
    setup();
    expect(screen.getByText("사랑하는 또또에게")).toBeInTheDocument();
    expect(screen.getByText(/엄마의 비밀 편지/)).toBeInTheDocument();
    expect(screen.queryByText(/이모의 비밀 편지/)).not.toBeInTheDocument();
  });

  it("관리자는 전부 본다", () => {
    setup({ isAdmin: true });
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("나만보기 편지에는 자물쇠와 '나만보기' 가 붙는다", () => {
    setup();
    const item = screen.getByRole("button", { name: /엄마의 비밀 편지/ });
    expect(item).toHaveTextContent("🔒");
    expect(item).toHaveTextContent("나만보기");
  });

  it("불러오는 중에는 스피너, 하나도 없으면 안내", () => {
    const { unmount } = setup({ letters: null });
    expect(screen.getByRole("status")).toBeInTheDocument();
    unmount();
    setup({ letters: [] });
    expect(screen.getByText(/아직 편지가 없어요/)).toBeInTheDocument();
  });

  it("등록자가 둘 이상이면 등록자별로 거를 수 있다", async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "등록자별 보기" }), DAD);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("사랑하는 또또에게")).toBeInTheDocument();
  });

  it("보이는 편지의 등록자가 한 명뿐이면 거르기를 보여주지 않는다", () => {
    setup({ letters: [LETTERS[0]!] });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

describe("편지 열람", () => {
  it("누르면 전문이 열리고, 남의 편지에는 수정·삭제가 없다", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /사랑하는 또또에게/ }));
    const dlg = screen.getByRole("dialog");
    expect(within(dlg).getByText("건강하게 나와줘")).toBeInTheDocument();
    expect(within(dlg).queryByRole("button", { name: /수정/ })).not.toBeInTheDocument();
    expect(within(dlg).queryByRole("button", { name: /삭제/ })).not.toBeInTheDocument();
  });

  it("답장은 작성자와 관리자만 본다 — 관리자는 보이고 답장칸도 있다", async () => {
    const { user } = setup({ isAdmin: true });
    const dlg = await openDialog(user, /이모의 비밀 편지/);
    expect(within(dlg).getByText(/엄마의 답장/)).toBeInTheDocument();
    expect(within(dlg).getByText((t, el) => el?.tagName === "P" && t === "고마워요")).toBeInTheDocument();
    // 답장칸에는 기존 답장이 채워져 있어 고쳐 보낼 수 있다
    expect(within(dlg).getByRole("textbox", { name: "답장" })).toHaveValue("고마워요");
    expect(within(dlg).getByRole("button", { name: "답장 수정" })).toBeInTheDocument();
  });

  it("일반 가족에게는 답장칸이 없다", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /사랑하는 또또에게/ }));
    expect(within(screen.getByRole("dialog")).queryByText(/답장 쓰기/)).not.toBeInTheDocument();
  });

  it("관리자가 답장을 보내면 그 편지와 글이 콜백으로 간다 (빈 답장은 막는다)", async () => {
    const { user, props } = setup({ isAdmin: true });
    const dlg = await openDialog(user, /사랑하는 또또에게/);
    await user.click(within(dlg).getByRole("button", { name: "답장 보내기" }));
    expect(within(dlg).getByRole("alert")).toHaveTextContent("답장을 입력해주세요");
    expect(props.onReply).not.toHaveBeenCalled();

    await user.type(within(dlg).getByRole("textbox", { name: "답장" }), "  사랑해  ");
    await user.click(within(dlg).getByRole("button", { name: "답장 보내기" }));
    expect(props.onReply).toHaveBeenCalledWith(expect.objectContaining({ id: "l1" }), "사랑해");
  });

  it("내 편지는 확인 뒤 삭제된다 — 취소하면 그대로", async () => {
    const confirm = vi.fn(async () => false);
    const { user, props, rerender } = setup({ confirm });
    await user.click(screen.getByRole("button", { name: /엄마의 비밀 편지/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /삭제/ }));
    expect(confirm).toHaveBeenCalledWith("이 편지를 삭제할까요?");
    expect(props.onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    confirm.mockResolvedValue(true);
    rerender(<Letters {...props} confirm={confirm} />);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /삭제/ }));
    await waitFor(() => expect(props.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "l2" })));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("열어 둔 편지가 바깥에서 바뀌면(답장 도착) 최신 내용이 보인다", async () => {
    const { user, props, rerender } = setup({ isAdmin: true });
    await user.click(screen.getByRole("button", { name: /사랑하는 또또에게/ }));
    const updated = LETTERS.map((l) => (l.id === "l1" ? { ...l, reply: "방금 온 답장", replyBy: "엄마", replyAt: at } : l));
    rerender(<Letters {...props} letters={updated} />);
    expect(within(screen.getByRole("dialog")).getByText("방금 온 답장")).toBeInTheDocument();
  });
});

describe("편지 쓰기·수정", () => {
  it("새 편지는 기본이 나만보기이고, 내용 없이는 저장되지 않는다", async () => {
    const { user, props } = setup();
    const dlg = await openDialog(user, "+ 편지 쓰기");
    expect(within(dlg).getByRole("radio", { name: /나만보기/ })).toBeChecked();
    await user.click(within(dlg).getByRole("button", { name: "편지 남기기" }));
    expect(within(dlg).getByRole("alert")).toHaveTextContent("내용을 입력해주세요");
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("쓴 내용이 그대로 저장되고 창이 닫힌다", async () => {
    const { user, props } = setup();
    const dlg = await openDialog(user, "+ 편지 쓰기");
    await user.type(within(dlg).getByRole("textbox", { name: "제목" }), "첫 편지");
    await user.type(within(dlg).getByRole("textbox", { name: "내용" }), "안녕 또또");
    await user.click(within(dlg).getByRole("radio", { name: /전체공개/ }));
    await user.click(within(dlg).getByRole("button", { name: "편지 남기기" }));
    expect(props.onSave).toHaveBeenCalledWith({ title: "첫 편지", body: "안녕 또또", image: null, vis: "public" }, undefined);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("수정은 기존 내용을 채워 열고, 그 편지의 id 로 저장한다", async () => {
    const { user, props } = setup();
    await user.click(screen.getByRole("button", { name: /엄마의 비밀 편지/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /수정/ }));
    const dlg = screen.getByRole("dialog", { name: /편지 수정/ });
    await waitFor(() => expect(dlg.contains(document.activeElement)).toBe(true));
    expect(within(dlg).getByRole("textbox", { name: "제목" })).toHaveValue("엄마의 비밀 편지");
    await user.type(within(dlg).getByRole("textbox", { name: "내용" }), " (추가)");
    await user.click(within(dlg).getByRole("button", { name: "수정 저장" }));
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ body: "너만 알아줘 (추가)", vis: "private" }), "l2");
  });

  it("저장이 실패하면 창을 닫지 않고 이유를 보여준다", async () => {
    const onSave = vi.fn(async () => { throw new Error("Failed to fetch"); });
    const { user } = setup({ onSave });
    const dlg = await openDialog(user, "+ 편지 쓰기");
    await user.type(within(dlg).getByRole("textbox", { name: "내용" }), "x");
    await user.click(within(dlg).getByRole("button", { name: "편지 남기기" }));
    expect(await within(dlg).findByRole("alert")).toHaveTextContent("네트워크 연결을 확인해주세요");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("사진 읽기를 주지 않으면 첨부 버튼이 없다 (작업대처럼)", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "+ 편지 쓰기" }));
    expect(within(screen.getByRole("dialog")).queryByText("사진 첨부")).not.toBeInTheDocument();
  });

  it("사진을 고르면 읽어서 미리보기를 보여주고, 지울 수 있다", async () => {
    const readImage = vi.fn(async () => "data:image/jpeg;base64,AAA");
    const { user } = setup({ readImage });
    const dlg = await openDialog(user, "+ 편지 쓰기");
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    await user.upload(within(dlg).getByLabelText("사진 파일"), file);
    expect(readImage).toHaveBeenCalledWith(file);
    expect(await within(dlg).findByAltText("첨부 미리보기")).toHaveAttribute("src", "data:image/jpeg;base64,AAA");
    await user.click(within(dlg).getByRole("button", { name: "이미지 제거" }));
    expect(within(dlg).queryByAltText("첨부 미리보기")).not.toBeInTheDocument();
  });
});

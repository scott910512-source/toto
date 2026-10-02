import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Card } from "./Card";
import { Btn } from "./Btn";
import { Spinner } from "./Spinner";
import { Field, inputCls } from "./Field";
import { ChipGroup } from "./ChipGroup";

describe("버튼", () => {
  it("기본은 submit 이 아니다 (폼 안에서 뜻하지 않게 전송되지 않게)", () => {
    render(<Btn>저장</Btn>);
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute("type", "button");
  });

  it("submit 이 필요하면 지정할 수 있다", () => {
    render(<Btn type="submit">로그인</Btn>);
    expect(screen.getByRole("button", { name: "로그인" })).toHaveAttribute("type", "submit");
  });

  it("누르면 불린다", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Btn onClick={onClick}>저장</Btn>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("막아두면 눌리지 않는다", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Btn onClick={onClick} disabled>저장 중...</Btn>);
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("종류마다 다른 색을 쓴다", () => {
    const { rerender } = render(<Btn variant="danger">삭제</Btn>);
    expect(screen.getByRole("button").className).toContain("bg-rose-500");
    rerender(<Btn variant="ghost">취소</Btn>);
    expect(screen.getByRole("button").className).toContain("bg-slate-100");
  });

  it("aria-label 같은 속성을 그대로 넘겨준다", () => {
    render(<Btn aria-label="닫기">×</Btn>);
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
  });

  it("누를 수 있는 높이를 넉넉히 둔다 (한 손 조작)", () => {
    render(<Btn>저장</Btn>);
    expect(screen.getByRole("button").className).toContain("py-3");
  });
});

describe("고르기 칩", () => {
  const OPTS = [
    { value: "breast", label: "모유" },
    { value: "formula", label: "분유" },
  ] as const;

  it("스크린리더가 '하나 고르기' 로 읽는다", () => {
    render(<ChipGroup label="수유 종류" options={OPTS} value="breast" onChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "수유 종류" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("고른 것만 선택 상태다", () => {
    render(<ChipGroup options={OPTS} value="formula" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "분유" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "모유" })).toHaveAttribute("aria-checked", "false");
  });

  it("아무것도 안 고른 상태도 된다", () => {
    render(<ChipGroup options={OPTS} value={null} onChange={() => {}} />);
    for (const r of screen.getAllByRole("radio")) {
      expect(r).toHaveAttribute("aria-checked", "false");
    }
  });

  it("누르면 그 값을 넘긴다", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ChipGroup options={OPTS} value="breast" onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "분유" }));
    expect(onChange).toHaveBeenCalledWith("formula");
  });

  it("라벨이 없으면 글자를 띄우지 않는다", () => {
    render(<ChipGroup options={OPTS} value={null} onChange={() => {}} />);
    expect(screen.queryByText("수유 종류")).toBeNull();
  });
});

describe("입력 묶음", () => {
  it("라벨을 눌러도 입력칸으로 초점이 간다", async () => {
    const user = userEvent.setup();
    render(<Field label="체온"><input className={inputCls} /></Field>);
    await user.click(screen.getByText("체온"));
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it("입력칸 글씨가 16px 이다 (iOS 가 자동 확대하지 않게)", () => {
    // text-base = 16px. 더 작으면 입력할 때 화면이 확 커진다.
    expect(inputCls).toContain("text-base");
  });
});

describe("불러오는 중 표시", () => {
  it("스크린리더에 상태로 알린다", () => {
    render(<Spinner label="불러오는 중..." />);
    const st = screen.getByRole("status");
    expect(st).toHaveTextContent("불러오는 중...");
    expect(st).toHaveAttribute("aria-live", "polite");
  });

  it("라벨이 없어도 그려진다", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("카드", () => {
  it("내용을 감싸고 덧붙인 클래스를 지킨다", () => {
    render(<Card className="p-4"><p>안녕</p></Card>);
    const el = screen.getByText("안녕").parentElement!;
    expect(el.className).toContain("p-4");
    expect(el.className).toContain("rounded-2xl");
  });
});

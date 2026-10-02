import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MedalGrid } from "./MedalGrid";
import { MEDALS } from "@/lib/medals";

const owner = (login: number, letter = 0) => ({
  loginDays: Array.from({ length: login }, (_, i) => `2026-05-${String(i + 1).padStart(2, "0")}`),
  letterCount: letter,
});

describe("메달 판", () => {
  it("메달 여섯 개를 모두 보여준다 (못 받은 것도 숨기지 않는다)", () => {
    // 숨기면 "뭐가 더 있나" 를 알 수 없어 모으는 재미가 없다
    render(<MedalGrid owner={owner(0)} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(MEDALS.length);
  });

  it("진행 정도를 숫자로 읽을 수 있다", () => {
    render(<MedalGrid owner={owner(5)} />);
    const bar = screen.getByRole("progressbar", { name: "꾸준한 사랑 진행" });
    expect(bar).toHaveAttribute("aria-valuenow", "5");
    expect(bar).toHaveAttribute("aria-valuemax", "10");
  });

  it("목표를 넘겨도 막대가 넘치지 않는다", () => {
    render(<MedalGrid owner={owner(99)} />);
    const bar = screen.getByRole("progressbar", { name: "첫 발걸음 진행" });
    expect(bar).toHaveAttribute("aria-valuenow", "3");      // 목표에서 멈춘다
    expect(bar.firstElementChild).toHaveStyle({ width: "100%" });
  });

  it("받은 메달은 '받았어요' 로 읽어준다", () => {
    render(<MedalGrid owner={owner(3)} />);
    // 3일 접속 → 첫 발걸음만 받았다
    expect(screen.getAllByText("받았어요")).toHaveLength(1);
  });

  it("받지 못한 메달은 흐리게 둔다", () => {
    render(<MedalGrid owner={owner(0)} />);
    const icons = screen.getAllByRole("listitem").map((li) => li.firstElementChild as HTMLElement);
    for (const i of icons) expect(i.style.filter).toBe("grayscale(1)");
  });

  it("받은 메달은 흐리게 두지 않는다", () => {
    render(<MedalGrid owner={owner(30, 30)} />);
    const icons = screen.getAllByRole("listitem").map((li) => li.firstElementChild as HTMLElement);
    for (const i of icons) expect(i.style.filter).toBe("");
  });

  it("아직 아무 기록이 없어도 깨지지 않는다 (새로 가입한 사람)", () => {
    render(<MedalGrid owner={null} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(MEDALS.length);
    expect(screen.getByRole("list")).toHaveAccessibleName("메달 · 접속 0일 · 편지 0회");
  });

  it("이상한 값이 저장돼 있어도 숫자로 보여준다", () => {
    // 예전에 NaN 이 저장될 수 있던 자리다. 화면에 NaN 이 찍히면 안 된다
    render(<MedalGrid owner={{ loginDays: "배열아님", letterCount: NaN }} />);
    expect(screen.getByRole("list")).toHaveAccessibleName("메달 · 접속 0일 · 편지 0회");
    expect(screen.queryByText(/NaN/)).toBeNull();
  });

  it("접속과 편지를 섞어 세지 않는다", () => {
    // 편지만 30번 쓴 사람에게 접속 메달을 주면 안 된다
    render(<MedalGrid owner={owner(0, 30)} />);
    expect(screen.getByRole("progressbar", { name: "첫 발걸음 진행" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("progressbar", { name: "마음 부자 진행" })).toHaveAttribute("aria-valuenow", "30");
  });
});

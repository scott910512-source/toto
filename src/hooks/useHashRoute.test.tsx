import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useHashRoute } from "./useHashRoute";

function Show() {
  const { path, tab, sub, nav } = useHashRoute();
  return (
    <>
      <p data-testid="path">{path}</p>
      <p data-testid="tab">{tab}</p>
      <p data-testid="sub">{sub ?? "-"}</p>
      <button onClick={() => nav("/records/feeding")}>수유로</button>
      <button onClick={() => nav("gallery")}>사진으로(슬래시 없이)</button>
      <button onClick={() => nav("/more", { replace: true })}>더보기로(기록 없이)</button>
    </>
  );
}

const hash = () => location.hash;
/* 주소 변경 알림(hashchange)은 브라우저가 나중에 보내므로 기다려야 한다 */
const setHash = async (h: string, tab: string) => {
  location.hash = h;
  await waitFor(() => expect(screen.getByTestId("tab")).toHaveTextContent(tab));
};

beforeEach(() => {
  history.replaceState(null, "", location.pathname);
});

describe("화면을 주소에 남긴다", () => {
  it("주소가 비어 있으면 기본 화면을 적어둔다", () => {
    render(<Show />);
    expect(hash()).toBe("#/dashboard");
    expect(screen.getByTestId("tab")).toHaveTextContent("dashboard");
  });

  it("기본 화면은 뒤로가기 기록을 남기지 않는다", () => {
    // replaceState 로 적으므로, 처음 들어와 뒤로 누르면 앱을 벗어난다
    const before = history.length;
    render(<Show />);
    expect(history.length).toBe(before);
  });

  it("주소를 읽어 탭과 하위탭으로 나눈다", () => {
    history.replaceState(null, "", "#/records/feeding");
    render(<Show />);
    expect(screen.getByTestId("tab")).toHaveTextContent("records");
    expect(screen.getByTestId("sub")).toHaveTextContent("feeding");
  });

  it("하위탭이 없으면 비어 있다", () => {
    history.replaceState(null, "", "#/gallery");
    render(<Show />);
    expect(screen.getByTestId("tab")).toHaveTextContent("gallery");
    expect(screen.getByTestId("sub")).toHaveTextContent("-");
  });

  it("옮기면 주소가 바뀐다", async () => {
    const user = userEvent.setup();
    render(<Show />);
    await user.click(screen.getByRole("button", { name: "수유로" }));
    expect(hash()).toBe("#/records/feeding");
    expect(screen.getByTestId("sub")).toHaveTextContent("feeding");
  });

  it("앞에 슬래시를 안 붙여도 받아준다", async () => {
    const user = userEvent.setup();
    render(<Show />);
    await user.click(screen.getByRole("button", { name: /사진으로/ }));
    expect(hash()).toBe("#/gallery");
  });

  it("뒤로가기(주소 변경)를 따라간다", async () => {
    render(<Show />);
    await setHash("#/letters", "letters");
    expect(screen.getByTestId("path")).toHaveTextContent("/letters");
  });

  it("같은 곳으로 다시 옮겨도 뒤로가기 기록이 쌓이지 않는다", async () => {
    // 같은 버튼을 두 번 누르면 뒤로가기를 두 번 눌러야 나가는 일이 생긴다
    const user = userEvent.setup();
    render(<Show />);
    await user.click(screen.getByRole("button", { name: "수유로" }));
    const len = history.length;
    await user.click(screen.getByRole("button", { name: "수유로" }));
    expect(history.length).toBe(len);
    expect(hash()).toBe("#/records/feeding");
  });

  it("replace 로 옮기면 뒤로가기 기록을 남기지 않는다", async () => {
    const user = userEvent.setup();
    render(<Show />);
    const len = history.length;
    await user.click(screen.getByRole("button", { name: /더보기로/ }));
    expect(hash()).toBe("#/more");
    expect(history.length).toBe(len);
  });

  it("빈 조각을 무시한다 (#//records 같은 주소)", () => {
    history.replaceState(null, "", "#//records//feeding");
    render(<Show />);
    expect(screen.getByTestId("tab")).toHaveTextContent("records");
    expect(screen.getByTestId("sub")).toHaveTextContent("feeding");
  });
});

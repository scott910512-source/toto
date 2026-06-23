# -*- coding: utf-8 -*-
"""
VDI 단축키 런처 — 웹사이트/프로그램/폴더를 전역 핫키 또는 런처 창으로 바로 실행.

특징
  * 외부 라이브러리 0개 (파이썬 표준 라이브러리만 사용) → 오프라인 VDI 에서 그대로 동작
  * 전역 핫키: 어디서든 Ctrl+Alt+1 등으로 즉시 실행 (Win32 RegisterHotKey)
  * 런처 창: Ctrl+Alt+Space 로 띄우고 숫자키/버튼 클릭으로 실행
  * config.json 만 수정하면 실행 항목을 자유롭게 추가/변경

실행
    pythonw launcher.py      (콘솔창 없이 백그라운드 실행 — 권장)
    python  launcher.py      (디버그용, 콘솔 출력 보임)
"""

import os
import sys
import json
import queue
import webbrowser
import subprocess

import tkinter as tk
from tkinter import messagebox

from hotkeys import HotkeyManager

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")


# ---------------------------------------------------------------------------
# 설정 로드
# ---------------------------------------------------------------------------
def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as fp:
        return json.load(fp)


# ---------------------------------------------------------------------------
# 실행 액션
# ---------------------------------------------------------------------------
def launch_item(item):
    """config 의 항목 하나를 실제로 실행한다."""
    item_type = (item.get("type") or "program").lower()
    target = item.get("target", "")
    args = item.get("args", []) or []

    try:
        if item_type == "url":
            webbrowser.open(target)
        elif item_type in ("file", "folder"):
            os.startfile(target)  # Windows 전용: 연결된 기본 프로그램으로 열기
        elif item_type == "command":
            subprocess.Popen(target, shell=True)
        else:  # "program" / "app" / "exe"
            subprocess.Popen([target] + list(args))
        return True, None
    except Exception as exc:
        return False, str(exc)


# ---------------------------------------------------------------------------
# 런처 GUI
# ---------------------------------------------------------------------------
class LauncherApp:
    def __init__(self, root, config):
        self.root = root
        self.config = config
        self.items = config.get("items", [])
        self.cmd_queue = queue.Queue()   # 핫키 스레드 → UI 스레드 안전 전달용
        self.hotkeys = HotkeyManager()

        self._build_ui()
        self._setup_hotkeys()
        self._poll_queue()

        # 시작 시에는 창을 숨겨 두고, 토글 핫키로 부른다.
        self.root.withdraw()

    # -- UI -----------------------------------------------------------------
    def _build_ui(self):
        self.root.title("VDI 런처")
        self.root.configure(bg="#1e1e2e")
        self.root.resizable(False, False)
        self.root.attributes("-topmost", True)

        header = tk.Label(
            self.root, text="⚡ VDI 단축키 런처", bg="#1e1e2e", fg="#cdd6f4",
            font=("맑은 고딕", 13, "bold"), pady=8,
        )
        header.pack(fill="x")

        body = tk.Frame(self.root, bg="#1e1e2e", padx=12, pady=4)
        body.pack(fill="both", expand=True)

        for idx, item in enumerate(self.items):
            num = idx + 1
            hk = item.get("hotkey", "")
            label = "  %s.  %s" % (num if num <= 9 else " ", item.get("name", "(이름없음)"))
            sub = ("전역: %s" % hk) if hk else ""

            row = tk.Frame(body, bg="#313244", cursor="hand2")
            row.pack(fill="x", pady=3)
            row.bind("<Button-1>", lambda e, it=item: self._run(it))

            name_lbl = tk.Label(row, text=label, bg="#313244", fg="#cdd6f4",
                                font=("맑은 고딕", 11), anchor="w", padx=8, pady=6)
            name_lbl.pack(side="left", fill="x", expand=True)
            name_lbl.bind("<Button-1>", lambda e, it=item: self._run(it))

            if sub:
                hk_lbl = tk.Label(row, text=sub, bg="#313244", fg="#89b4fa",
                                  font=("Consolas", 9), padx=8)
                hk_lbl.pack(side="right")
                hk_lbl.bind("<Button-1>", lambda e, it=item: self._run(it))

        footer = tk.Frame(self.root, bg="#1e1e2e", padx=12, pady=8)
        footer.pack(fill="x")
        tk.Label(footer, text="숫자키 1~9 실행 · Esc 닫기",
                 bg="#1e1e2e", fg="#6c7086", font=("맑은 고딕", 9)).pack(side="left")
        tk.Button(footer, text="설정 열기", command=self._open_config,
                  bg="#45475a", fg="#cdd6f4", relief="flat",
                  font=("맑은 고딕", 9), padx=8).pack(side="right", padx=2)
        tk.Button(footer, text="새로고침", command=self._reload,
                  bg="#45475a", fg="#cdd6f4", relief="flat",
                  font=("맑은 고딕", 9), padx=8).pack(side="right", padx=2)

        # 키 바인딩: 숫자 1~9 로 해당 항목 실행, Esc 로 숨기기
        for i in range(1, 10):
            self.root.bind(str(i), self._on_number_key)
        self.root.bind("<KP_1>", self._on_number_key)  # 키패드 숫자도 지원
        self.root.bind("<Escape>", lambda e: self._hide())
        self.root.protocol("WM_DELETE_WINDOW", self._hide)

    # -- 핫키 ---------------------------------------------------------------
    def _setup_hotkeys(self):
        toggle = self.config.get("toggle_hotkey")
        if toggle:
            # 핫키 스레드에서 직접 tkinter 를 건드리면 안 되므로 큐로 넘긴다.
            self.hotkeys.add(toggle, lambda: self.cmd_queue.put(("toggle", None)))

        for item in self.items:
            hk = item.get("hotkey")
            if hk:
                self.hotkeys.add(hk, lambda it=item: launch_item(it))

        failed = self.hotkeys.start()
        if failed:
            # 다른 프로그램이 이미 쓰는 핫키 등 — 조용히 무시하지 않고 알려준다.
            self.cmd_queue.put(("warn_failed", failed))

    def _poll_queue(self):
        """UI 스레드에서 주기적으로 큐를 비우며 안전하게 처리."""
        try:
            while True:
                cmd, payload = self.cmd_queue.get_nowait()
                if cmd == "toggle":
                    self._toggle()
                elif cmd == "warn_failed":
                    messagebox.showwarning(
                        "핫키 등록 실패",
                        "다음 핫키는 다른 프로그램이 사용 중이라 등록하지 못했습니다:\n\n"
                        + "\n".join(payload)
                        + "\n\nconfig.json 에서 다른 조합으로 바꿔주세요.",
                    )
        except queue.Empty:
            pass
        self.root.after(80, self._poll_queue)

    # -- 동작 ---------------------------------------------------------------
    def _run(self, item):
        ok, err = launch_item(item)
        if not ok:
            messagebox.showerror("실행 실패", "%s\n\n%s" % (item.get("name", ""), err))
        self._hide()

    def _on_number_key(self, event):
        try:
            idx = int(event.char) - 1
        except (ValueError, TypeError):
            return
        if 0 <= idx < len(self.items):
            self._run(self.items[idx])

    def _toggle(self):
        if self.root.state() == "withdrawn":
            self._show()
        else:
            self._hide()

    def _show(self):
        self.root.deiconify()
        self.root.lift()
        self.root.attributes("-topmost", True)
        self.root.focus_force()
        # 화면 중앙 배치
        self.root.update_idletasks()
        w, h = self.root.winfo_width(), self.root.winfo_height()
        sw, sh = self.root.winfo_screenwidth(), self.root.winfo_screenheight()
        self.root.geometry("+%d+%d" % ((sw - w) // 2, (sh - h) // 3))

    def _hide(self):
        self.root.withdraw()

    def _open_config(self):
        try:
            os.startfile(CONFIG_PATH)
        except Exception as exc:
            messagebox.showerror("열기 실패", str(exc))

    def _reload(self):
        """config.json 다시 읽고 핫키/창을 재구성."""
        try:
            new_config = load_config()
        except Exception as exc:
            messagebox.showerror("설정 오류", "config.json 을 읽을 수 없습니다:\n%s" % exc)
            return
        self.hotkeys.stop()
        # 기존 위젯 제거 후 재생성
        for child in self.root.winfo_children():
            child.destroy()
        self.config = new_config
        self.items = new_config.get("items", [])
        self.hotkeys = HotkeyManager()
        self._build_ui()
        self._setup_hotkeys()
        messagebox.showinfo("새로고침", "설정을 다시 불러왔습니다.")
        self._show()


def main():
    if not sys.platform.startswith("win"):
        sys.stderr.write("이 런처는 Windows VDI 전용입니다.\n")
        sys.exit(1)
    try:
        config = load_config()
    except FileNotFoundError:
        sys.stderr.write("config.json 이 없습니다: %s\n" % CONFIG_PATH)
        sys.exit(1)

    root = tk.Tk()
    LauncherApp(root, config)
    root.mainloop()


if __name__ == "__main__":
    main()

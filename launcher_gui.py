import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import json
import os
import threading
from outlook_attachment_saver import preview_emails, save_attachments

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")


def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "keyword": "",
        "extensions": "",
        "save_dir": "",
        "search_in": "subject",
        "folder_name": ""
    }


def save_config(data):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class PreviewDialog(tk.Toplevel):
    """미리보기 확인 팝업"""
    def __init__(self, parent, previews):
        super().__init__(parent)
        self.title("진행 확인")
        self.geometry("500x320")
        self.resizable(False, False)
        self.configure(bg="#f0f0f0")
        self.grab_set()
        self.result = False

        tk.Label(self, text=f"총 {len(previews)}개 메일 미리보기 (최대 2개)",
                 font=("맑은 고딕", 12, "bold"), bg="#f0f0f0"
                 ).pack(pady=(16, 8))

        frame = tk.Frame(self, bg="#ffffff", relief="flat", bd=1)
        frame.pack(fill="both", expand=True, padx=20, pady=4)

        for i, p in enumerate(previews):
            bg = "#f8f8f8" if i % 2 == 0 else "#ffffff"
            row = tk.Frame(frame, bg=bg)
            row.pack(fill="x", padx=8, pady=6)

            tk.Label(row, text=f"[{i+1}]", font=("맑은 고딕", 10, "bold"),
                     bg=bg, fg="#0078d4", width=3, anchor="w"
                     ).pack(side="left")

            info = tk.Frame(row, bg=bg)
            info.pack(side="left", fill="x", expand=True)

            tk.Label(info, text=p["subject"], font=("맑은 고딕", 10),
                     bg=bg, anchor="w", wraplength=360
                     ).pack(anchor="w")
            tk.Label(info,
                     text=f"{p['received']}  |  {p['sender']}  |  첨부 {p['attachments']}개",
                     font=("맑은 고딕", 9), fg="#777", bg=bg, anchor="w"
                     ).pack(anchor="w")

        tk.Label(self, text="전체 메일에 대해 계속 진행하시겠습니까?",
                 font=("맑은 고딕", 10), bg="#f0f0f0", fg="#444"
                 ).pack(pady=(10, 4))

        btn_frame = tk.Frame(self, bg="#f0f0f0")
        btn_frame.pack(pady=8)

        tk.Button(btn_frame, text="  진행  ",
                  font=("맑은 고딕", 11, "bold"),
                  bg="#0078d4", fg="white", relief="flat",
                  padx=20, pady=6,
                  command=self._confirm
                  ).pack(side="left", padx=8)

        tk.Button(btn_frame, text="  취소  ",
                  font=("맑은 고딕", 11),
                  bg="#e0e0e0", relief="flat",
                  padx=20, pady=6,
                  command=self._cancel
                  ).pack(side="left", padx=8)

        self.protocol("WM_DELETE_WINDOW", self._cancel)

    def _confirm(self):
        self.result = True
        self.destroy()

    def _cancel(self):
        self.result = False
        self.destroy()


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Outlook 첨부파일 수집기")
        self.geometry("560, 460")
        self.geometry("560x460")
        self.resizable(False, False)
        self.configure(bg="#f0f0f0")

        self.config_data = load_config()
        self._build_ui()
        self._load_values()

    def _build_ui(self):
        # 타이틀 바
        tk.Label(self, text="Outlook 첨부파일 수집기",
                 font=("맑은 고딕", 14, "bold"),
                 bg="#0078d4", fg="white"
                 ).pack(fill="x", ipady=10)

        frame = tk.Frame(self, bg="#f0f0f0")
        frame.pack(fill="both", expand=True, padx=24, pady=8)
        frame.columnconfigure(1, weight=1)

        def lbl(text, row):
            tk.Label(frame, text=text, bg="#f0f0f0",
                     font=("맑은 고딕", 10), anchor="w"
                     ).grid(row=row, column=0, sticky="w", pady=7)

        # 검색 키워드
        lbl("검색 키워드", 0)
        self.keyword_var = tk.StringVar()
        tk.Entry(frame, textvariable=self.keyword_var, font=("맑은 고딕", 10)
                 ).grid(row=0, column=1, sticky="ew", padx=(12, 0), pady=7)

        # 키워드 검색 위치
        lbl("키워드 검색", 1)
        self.search_in_var = tk.StringVar()
        self._search_map = {"제목": "subject", "본문": "body", "제목+본문": "both"}
        self._search_map_rev = {v: k for k, v in self._search_map.items()}
        ttk.Combobox(frame, textvariable=self.search_in_var,
                     values=list(self._search_map.keys()),
                     state="readonly", font=("맑은 고딕", 10)
                     ).grid(row=1, column=1, sticky="ew", padx=(12, 0), pady=7)

        # Outlook 폴더명 필터
        lbl("폴더명 필터", 2)
        self.folder_name_var = tk.StringVar()
        folder_frame = tk.Frame(frame, bg="#f0f0f0")
        folder_frame.grid(row=2, column=1, sticky="ew", padx=(12, 0), pady=7)
        tk.Entry(folder_frame, textvariable=self.folder_name_var,
                 font=("맑은 고딕", 10)
                 ).pack(side="left", fill="x", expand=True)
        tk.Label(folder_frame, text="  비우면 받은편지함 전체",
                 bg="#f0f0f0", fg="gray", font=("맑은 고딕", 8)
                 ).pack(side="left")

        # 파일 형태
        lbl("파일 형태", 3)
        self.ext_var = tk.StringVar()
        ext_frame = tk.Frame(frame, bg="#f0f0f0")
        ext_frame.grid(row=3, column=1, sticky="ew", padx=(12, 0), pady=7)
        tk.Entry(ext_frame, textvariable=self.ext_var,
                 font=("맑은 고딕", 10)
                 ).pack(side="left", fill="x", expand=True)
        tk.Label(ext_frame, text="  예: pdf, xlsx  (비우면 전체)",
                 bg="#f0f0f0", fg="gray", font=("맑은 고딕", 8)
                 ).pack(side="left")

        # 저장 경로
        lbl("저장 경로", 4)
        self.save_dir_var = tk.StringVar()
        dir_frame = tk.Frame(frame, bg="#f0f0f0")
        dir_frame.grid(row=4, column=1, sticky="ew", padx=(12, 0), pady=7)
        tk.Entry(dir_frame, textvariable=self.save_dir_var,
                 font=("맑은 고딕", 10)
                 ).pack(side="left", fill="x", expand=True)
        tk.Button(dir_frame, text="찾아보기",
                  font=("맑은 고딕", 9), relief="flat",
                  bg="#e0e0e0", command=self._browse
                  ).pack(side="left", padx=(6, 0))

        # 구분선
        ttk.Separator(self, orient="horizontal").pack(fill="x", padx=24, pady=6)

        # 상태
        self.status_var = tk.StringVar(value="대기 중")
        tk.Label(self, textvariable=self.status_var,
                 bg="#f0f0f0", fg="#555", font=("맑은 고딕", 9)
                 ).pack()

        # 버튼
        btn_frame = tk.Frame(self, bg="#f0f0f0")
        btn_frame.pack(pady=10)

        self.run_btn = tk.Button(
            btn_frame, text="  실행  ",
            font=("맑은 고딕", 11, "bold"),
            bg="#0078d4", fg="white", relief="flat",
            padx=24, pady=7, command=self._run
        )
        self.run_btn.pack(side="left", padx=8)

        tk.Button(
            btn_frame, text="설정 저장",
            font=("맑은 고딕", 10), bg="#e0e0e0",
            relief="flat", padx=14, pady=7,
            command=self._save_only
        ).pack(side="left", padx=8)

    def _load_values(self):
        self.keyword_var.set(self.config_data.get("keyword", ""))
        saved = self.config_data.get("search_in", "subject")
        self.search_in_var.set(self._search_map_rev.get(saved, "제목"))
        self.ext_var.set(self.config_data.get("extensions", ""))
        self.save_dir_var.set(self.config_data.get("save_dir", ""))
        self.folder_name_var.set(self.config_data.get("folder_name", ""))

    def _get_values(self):
        return {
            "keyword": self.keyword_var.get().strip(),
            "search_in": self._search_map.get(self.search_in_var.get(), "subject"),
            "extensions": self.ext_var.get().strip(),
            "save_dir": self.save_dir_var.get().strip(),
            "folder_name": self.folder_name_var.get().strip()
        }

    def _browse(self):
        path = filedialog.askdirectory()
        if path:
            self.save_dir_var.set(path)

    def _save_only(self):
        save_config(self._get_values())
        messagebox.showinfo("저장 완료", "설정이 저장되었습니다.")

    def _run(self):
        v = self._get_values()

        if not v["keyword"]:
            messagebox.showwarning("입력 오류", "검색 키워드를 입력해주세요.")
            return
        if not v["save_dir"]:
            messagebox.showwarning("입력 오류", "저장 경로를 입력해주세요.")
            return

        exts = []
        if v["extensions"]:
            for e in v["extensions"].split(","):
                e = e.strip().lower()
                if not e.startswith("."):
                    e = "." + e
                exts.append(e)

        save_config(v)
        self.run_btn.config(state="disabled", text="검색 중...")
        self.status_var.set("미리보기 검색 중...")

        def preview_worker():
            try:
                previews = preview_emails(
                    keyword=v["keyword"],
                    search_in=v["search_in"],
                    folder_name=v["folder_name"] or None,
                    limit=2
                )
                self.after(0, lambda: self._show_preview(previews, v, exts))
            except Exception as e:
                self.after(0, lambda: self._on_error(str(e)))

        threading.Thread(target=preview_worker, daemon=True).start()

    def _show_preview(self, previews, v, exts):
        self.run_btn.config(state="normal", text="  실행  ")

        if not previews:
            self.status_var.set("조건에 맞는 메일이 없습니다.")
            messagebox.showinfo("결과 없음", "조건에 맞는 메일을 찾지 못했습니다.")
            return

        self.status_var.set(f"미리보기: {len(previews)}개 검색됨")

        dlg = PreviewDialog(self, previews)
        self.wait_window(dlg)

        if not dlg.result:
            self.status_var.set("취소됨.")
            return

        # 전체 실행
        self.run_btn.config(state="disabled", text="저장 중...")
        self.status_var.set("저장 중... 잠시 기다려주세요.")

        def save_worker():
            try:
                matched, saved = save_attachments(
                    keyword=v["keyword"],
                    file_extensions=exts,
                    save_dir=v["save_dir"],
                    search_in=v["search_in"],
                    folder_name=v["folder_name"] or None
                )
                self.after(0, lambda: self._on_done(matched, saved))
            except Exception as e:
                self.after(0, lambda: self._on_error(str(e)))

        threading.Thread(target=save_worker, daemon=True).start()

    def _on_done(self, matched, saved):
        self.run_btn.config(state="normal", text="  실행  ")
        self.status_var.set(f"완료: 메일 {matched}개 / 첨부파일 {saved}개 저장")
        messagebox.showinfo("완료", f"완료!\n\n메일: {matched}개\n첨부파일: {saved}개 저장")

    def _on_error(self, err):
        self.run_btn.config(state="normal", text="  실행  ")
        self.status_var.set("오류 발생")
        messagebox.showerror("오류", err)


if __name__ == "__main__":
    app = App()
    app.mainloop()

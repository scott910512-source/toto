import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import json
import os
import threading
from datetime import datetime
from outlook_attachment_saver import preview_emails, save_attachments

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

# ── 색상 상수 ────────────────────────────────────────────
C_BLUE   = "#0078D4"
C_LIGHT  = "#E8F0FE"
C_BG     = "#F3F3F3"
C_WHITE  = "#FFFFFF"
C_GRAY   = "#E0E0E0"
C_DKGRAY = "#555555"
C_ERROR  = "#D83B01"
C_WARN   = "#CA5010"
C_SKIP   = "#767676"
LOG_COLORS = {"INFO": C_DKGRAY, "SKIP": C_SKIP, "WARN": C_WARN, "ERROR": C_ERROR}


def load_config():
    defaults = {
        "keywords": "", "keyword_mode": "OR",
        "search_in": "subject",
        "sender_filter": "", "folder_name": "",
        "date_from": "", "date_to": "",
        "extensions": "", "save_dir": "",
        "require_attachment": False,
        "make_excel": True, "dry_run": False
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                defaults.update(saved)
        except Exception:
            pass
    return defaults


def save_config(data):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def parse_date(s):
    s = s.strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%Y%m%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    raise ValueError(f"날짜 형식 오류: '{s}'  →  YYYY-MM-DD")


def parse_extensions(s):
    if not s.strip():
        return []
    exts = []
    for e in s.split(","):
        e = e.strip().lower()
        if e and not e.startswith("."):
            e = "." + e
        if e:
            exts.append(e)
    return exts


def parse_keywords(s):
    return [k.strip() for k in s.split(",") if k.strip()]


# ── 미리보기 팝업 ─────────────────────────────────────────
class PreviewDialog(tk.Toplevel):
    def __init__(self, parent, previews, total_hint=""):
        super().__init__(parent)
        self.title("진행 확인")
        self.geometry("520x340")
        self.resizable(False, False)
        self.configure(bg=C_BG)
        self.grab_set()
        self.result = False

        tk.Label(self, text=f"미리보기 (상위 {len(previews)}건){total_hint}",
                 font=("맑은 고딕", 12, "bold"), bg=C_BG
                 ).pack(pady=(14, 6))

        box = tk.Frame(self, bg=C_WHITE, relief="solid", bd=1)
        box.pack(fill="both", expand=True, padx=18, pady=2)

        for i, p in enumerate(previews):
            row = tk.Frame(box, bg=C_LIGHT if i % 2 == 0 else C_WHITE)
            row.pack(fill="x", padx=0)
            bg = C_LIGHT if i % 2 == 0 else C_WHITE

            tk.Label(row, text=f" {i+1} ", font=("맑은 고딕", 10, "bold"),
                     bg=bg, fg=C_BLUE, width=3
                     ).pack(side="left", pady=6)
            info = tk.Frame(row, bg=bg)
            info.pack(side="left", fill="x", expand=True)
            tk.Label(info, text=p["subject"], font=("맑은 고딕", 10),
                     bg=bg, anchor="w", wraplength=400
                     ).pack(anchor="w")
            tk.Label(info,
                     text=f"수신: {p['received']}  |  발신: {p['sender']}  |  첨부 {p['attachments']}개  |  폴더: {p['folder']}",
                     font=("맑은 고딕", 8), fg=C_DKGRAY, bg=bg
                     ).pack(anchor="w", pady=(0, 4))

        tk.Label(self, text="전체 메일을 계속 처리하시겠습니까?",
                 font=("맑은 고딕", 10), bg=C_BG
                 ).pack(pady=(10, 4))

        bf = tk.Frame(self, bg=C_BG)
        bf.pack(pady=8)
        tk.Button(bf, text="  진행  ", font=("맑은 고딕", 11, "bold"),
                  bg=C_BLUE, fg="white", relief="flat",
                  padx=20, pady=6, command=self._ok
                  ).pack(side="left", padx=8)
        tk.Button(bf, text="  취소  ", font=("맑은 고딕", 11),
                  bg=C_GRAY, relief="flat",
                  padx=20, pady=6, command=self._cancel
                  ).pack(side="left", padx=8)
        self.protocol("WM_DELETE_WINDOW", self._cancel)

    def _ok(self):
        self.result = True
        self.destroy()

    def _cancel(self):
        self.result = False
        self.destroy()


# ── 메인 앱 ──────────────────────────────────────────────
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Outlook 메일 수집기")
        self.geometry("620x580")
        self.resizable(False, False)
        self.configure(bg=C_BG)

        self.cfg = load_config()
        self._stop_event = threading.Event()
        self._last_save_dir = ""

        self._build_ui()
        self._load_values()

    # ── UI 빌드 ───────────────────────────────────────────
    def _build_ui(self):
        # 타이틀 바
        tk.Label(self, text="Outlook 메일 수집기",
                 font=("맑은 고딕", 14, "bold"),
                 bg=C_BLUE, fg="white"
                 ).pack(fill="x", ipady=10)

        self.nb = ttk.Notebook(self)
        self.nb.pack(fill="both", expand=True, padx=10, pady=8)

        self._build_tab_search()
        self._build_tab_log()

        # 하단 버튼 바
        self._build_bottom_bar()

    def _build_tab_search(self):
        tab = tk.Frame(self.nb, bg=C_BG)
        self.nb.add(tab, text="  검색 설정  ")

        f = tk.Frame(tab, bg=C_BG)
        f.pack(fill="both", expand=True, padx=16, pady=8)
        f.columnconfigure(1, weight=1)

        def lbl(text, row, col=0):
            tk.Label(f, text=text, bg=C_BG,
                     font=("맑은 고딕", 10), anchor="w"
                     ).grid(row=row, column=col, sticky="w", pady=5)

        def entry(row, var, col=1, colspan=1):
            e = tk.Entry(f, textvariable=var, font=("맑은 고딕", 10))
            e.grid(row=row, column=col, columnspan=colspan,
                   sticky="ew", padx=(10, 0), pady=5)
            return e

        def hint(text, row):
            tk.Label(f, text=text, bg=C_BG, fg="gray",
                     font=("맑은 고딕", 8)
                     ).grid(row=row, column=1, columnspan=3, sticky="w", padx=(10, 0))

        # 키워드
        lbl("키워드", 0)
        kw_frame = tk.Frame(f, bg=C_BG)
        kw_frame.grid(row=0, column=1, columnspan=3, sticky="ew", padx=(10, 0), pady=5)
        self.kw_var = tk.StringVar()
        tk.Entry(kw_frame, textvariable=self.kw_var,
                 font=("맑은 고딕", 10)
                 ).pack(side="left", fill="x", expand=True)
        tk.Label(kw_frame, text="  방식:", bg=C_BG,
                 font=("맑은 고딕", 9)).pack(side="left")
        self.kw_mode_var = tk.StringVar()
        ttk.Combobox(kw_frame, textvariable=self.kw_mode_var,
                     values=["OR", "AND"], state="readonly",
                     width=5, font=("맑은 고딕", 9)
                     ).pack(side="left", padx=(2, 0))
        hint("쉼표로 구분 (예: 견적서, 계약)  |  OR: 하나라도 포함 / AND: 모두 포함", 1)

        # 키워드 검색 위치
        lbl("검색 위치", 2)
        self.search_in_var = tk.StringVar()
        self._si_map = {"제목": "subject", "본문": "body", "제목+본문": "both"}
        self._si_rev = {v: k for k, v in self._si_map.items()}
        ttk.Combobox(f, textvariable=self.search_in_var,
                     values=list(self._si_map.keys()),
                     state="readonly", font=("맑은 고딕", 10)
                     ).grid(row=2, column=1, sticky="ew", padx=(10, 0), pady=5)

        # 발신자 필터
        lbl("발신자 필터", 3)
        self.sender_var = tk.StringVar()
        entry(3, self.sender_var)
        hint("이메일 주소 일부 입력 (비우면 전체)", 4)

        # 날짜 범위
        lbl("날짜 범위", 5)
        date_frame = tk.Frame(f, bg=C_BG)
        date_frame.grid(row=5, column=1, columnspan=3, sticky="ew", padx=(10, 0), pady=5)
        self.date_from_var = tk.StringVar()
        self.date_to_var = tk.StringVar()
        tk.Entry(date_frame, textvariable=self.date_from_var,
                 font=("맑은 고딕", 10), width=12
                 ).pack(side="left")
        tk.Label(date_frame, text="  ~  ", bg=C_BG,
                 font=("맑은 고딕", 10)).pack(side="left")
        tk.Entry(date_frame, textvariable=self.date_to_var,
                 font=("맑은 고딕", 10), width=12
                 ).pack(side="left")
        tk.Label(date_frame, text="  YYYY-MM-DD  (비우면 전체)",
                 bg=C_BG, fg="gray", font=("맑은 고딕", 8)
                 ).pack(side="left")

        # 폴더명 필터
        lbl("Outlook 폴더", 6)
        self.folder_var = tk.StringVar()
        entry(6, self.folder_var)
        hint("폴더명 일부 입력 (비우면 받은편지함)", 7)

        # 파일 형태
        lbl("파일 형태", 8)
        self.ext_var = tk.StringVar()
        entry(8, self.ext_var)
        hint("예: pdf, xlsx  (비우면 첨부 전체)", 9)

        # 저장 경로
        lbl("저장 경로", 10)
        dir_f = tk.Frame(f, bg=C_BG)
        dir_f.grid(row=10, column=1, columnspan=3, sticky="ew", padx=(10, 0), pady=5)
        self.save_dir_var = tk.StringVar()
        tk.Entry(dir_f, textvariable=self.save_dir_var,
                 font=("맑은 고딕", 10)
                 ).pack(side="left", fill="x", expand=True)
        tk.Button(dir_f, text="찾아보기", font=("맑은 고딕", 9),
                  bg=C_GRAY, relief="flat", command=self._browse
                  ).pack(side="left", padx=(6, 0))

        # 옵션 체크박스
        opt_f = tk.Frame(f, bg=C_BG)
        opt_f.grid(row=11, column=0, columnspan=4, sticky="w", pady=(8, 2))
        self.excel_var = tk.BooleanVar()
        self.dry_var = tk.BooleanVar()
        self.att_only_var = tk.BooleanVar()
        for var, text in [
            (self.excel_var, "Excel 보고서 생성"),
            (self.dry_var, "Dry Run (저장 없이 건수만 확인)"),
            (self.att_only_var, "첨부파일 있는 메일만"),
        ]:
            tk.Checkbutton(opt_f, text=text, variable=var,
                           bg=C_BG, font=("맑은 고딕", 9),
                           activebackground=C_BG
                           ).pack(side="left", padx=8)

    def _build_tab_log(self):
        tab = tk.Frame(self.nb, bg=C_BG)
        self.nb.add(tab, text="  실행 로그  ")

        # 프로그레스바
        pg_f = tk.Frame(tab, bg=C_BG)
        pg_f.pack(fill="x", padx=14, pady=(10, 4))
        self.progress_var = tk.DoubleVar()
        self.progress = ttk.Progressbar(pg_f, variable=self.progress_var,
                                        maximum=100, length=400)
        self.progress.pack(side="left", fill="x", expand=True)
        self.pct_label = tk.Label(pg_f, text="0%", bg=C_BG,
                                  font=("맑은 고딕", 9), width=6)
        self.pct_label.pack(side="left", padx=(6, 0))

        # 로그 텍스트
        self.log_box = scrolledtext.ScrolledText(
            tab, font=("Consolas", 9), height=20,
            bg="#1E1E1E", fg="#D4D4D4",
            insertbackground="white", relief="flat"
        )
        self.log_box.pack(fill="both", expand=True, padx=14, pady=(0, 6))
        for level, color in LOG_COLORS.items():
            self.log_box.tag_config(level, foreground=color)
        self.log_box.tag_config("ERROR", foreground=C_ERROR)
        self.log_box.tag_config("WARN", foreground="#CE9178")
        self.log_box.tag_config("SKIP", foreground="#808080")

        # 로그 하단 버튼
        lb = tk.Frame(tab, bg=C_BG)
        lb.pack(pady=4)
        tk.Button(lb, text="로그 지우기", font=("맑은 고딕", 9),
                  bg=C_GRAY, relief="flat", padx=10, pady=4,
                  command=self._clear_log
                  ).pack(side="left", padx=6)
        self.open_btn = tk.Button(lb, text="저장 폴더 열기",
                                  font=("맑은 고딕", 9),
                                  bg=C_GRAY, relief="flat",
                                  padx=10, pady=4,
                                  state="disabled",
                                  command=self._open_folder)
        self.open_btn.pack(side="left", padx=6)

    def _build_bottom_bar(self):
        bar = tk.Frame(self, bg=C_BG)
        bar.pack(fill="x", padx=10, pady=(0, 10))

        self.status_var = tk.StringVar(value="대기 중")
        tk.Label(bar, textvariable=self.status_var,
                 bg=C_BG, fg=C_DKGRAY, font=("맑은 고딕", 9)
                 ).pack(side="left", padx=8)

        tk.Button(bar, text="설정 저장", font=("맑은 고딕", 9),
                  bg=C_GRAY, relief="flat", padx=12, pady=5,
                  command=self._save_only
                  ).pack(side="right", padx=4)

        self.stop_btn = tk.Button(bar, text="중단", font=("맑은 고딕", 10),
                                  bg="#D83B01", fg="white", relief="flat",
                                  padx=14, pady=5, state="disabled",
                                  command=self._stop)
        self.stop_btn.pack(side="right", padx=4)

        self.run_btn = tk.Button(bar, text="  실행  ",
                                 font=("맑은 고딕", 11, "bold"),
                                 bg=C_BLUE, fg="white", relief="flat",
                                 padx=22, pady=5, command=self._run)
        self.run_btn.pack(side="right", padx=4)

    # ── 값 로드/수집 ──────────────────────────────────────
    def _load_values(self):
        c = self.cfg
        self.kw_var.set(c.get("keywords", ""))
        self.kw_mode_var.set(c.get("keyword_mode", "OR"))
        self.search_in_var.set(self._si_rev.get(c.get("search_in", "subject"), "제목"))
        self.sender_var.set(c.get("sender_filter", ""))
        self.folder_var.set(c.get("folder_name", ""))
        self.date_from_var.set(c.get("date_from", ""))
        self.date_to_var.set(c.get("date_to", ""))
        self.ext_var.set(c.get("extensions", ""))
        self.save_dir_var.set(c.get("save_dir", ""))
        self.excel_var.set(c.get("make_excel", True))
        self.dry_var.set(c.get("dry_run", False))
        self.att_only_var.set(c.get("require_attachment", False))

    def _get_values(self):
        return {
            "keywords": self.kw_var.get().strip(),
            "keyword_mode": self.kw_mode_var.get(),
            "search_in": self._si_map.get(self.search_in_var.get(), "subject"),
            "sender_filter": self.sender_var.get().strip(),
            "folder_name": self.folder_var.get().strip(),
            "date_from": self.date_from_var.get().strip(),
            "date_to": self.date_to_var.get().strip(),
            "extensions": self.ext_var.get().strip(),
            "save_dir": self.save_dir_var.get().strip(),
            "make_excel": self.excel_var.get(),
            "dry_run": self.dry_var.get(),
            "require_attachment": self.att_only_var.get()
        }

    def _validate(self, v):
        if not v["keywords"]:
            messagebox.showwarning("입력 오류", "키워드를 입력해주세요.")
            return False
        if not v["save_dir"]:
            messagebox.showwarning("입력 오류", "저장 경로를 입력해주세요.")
            return False
        try:
            parse_date(v["date_from"])
            parse_date(v["date_to"])
        except ValueError as e:
            messagebox.showwarning("날짜 오류", str(e))
            return False
        return True

    # ── 동작 ─────────────────────────────────────────────
    def _browse(self):
        path = filedialog.askdirectory()
        if path:
            self.save_dir_var.set(path)

    def _save_only(self):
        save_config(self._get_values())
        self.status_var.set("설정 저장됨")

    def _clear_log(self):
        self.log_box.config(state="normal")
        self.log_box.delete("1.0", tk.END)
        self.log_box.config(state="disabled")

    def _open_folder(self):
        if self._last_save_dir and os.path.exists(self._last_save_dir):
            os.startfile(self._last_save_dir)

    def _stop(self):
        self._stop_event.set()
        self.status_var.set("중단 요청 중...")

    def _log(self, msg, level="INFO"):
        tag = level if level in LOG_COLORS else "INFO"
        self.log_box.config(state="normal")
        ts = datetime.now().strftime("%H:%M:%S")
        self.log_box.insert(tk.END, f"{ts} {msg}\n", tag)
        self.log_box.see(tk.END)
        self.log_box.config(state="disabled")

    def _set_running(self, running):
        state_run = "disabled" if running else "normal"
        state_stop = "normal" if running else "disabled"
        self.run_btn.config(state=state_run,
                            text="실행 중..." if running else "  실행  ")
        self.stop_btn.config(state=state_stop)

    def _update_progress(self, done, total):
        if total > 0:
            pct = done / total * 100
            self.progress_var.set(pct)
            self.pct_label.config(text=f"{int(pct)}%")

    def _run(self):
        v = self._get_values()
        if not self._validate(v):
            return

        keywords = parse_keywords(v["keywords"])
        exts = parse_extensions(v["extensions"])
        date_from = parse_date(v["date_from"])
        date_to = parse_date(v["date_to"])
        save_config(v)
        self._last_save_dir = v["save_dir"]

        self.status_var.set("미리보기 검색 중...")
        self._set_running(True)
        self._stop_event.clear()
        self.nb.select(0)

        def preview_worker():
            try:
                previews = preview_emails(
                    keywords=keywords,
                    search_in=v["search_in"],
                    keyword_mode=v["keyword_mode"],
                    folder_name=v["folder_name"] or None,
                    sender_filter=v["sender_filter"] or None,
                    date_from=date_from, date_to=date_to,
                    require_attachment=v["require_attachment"],
                    limit=2
                )
                self.after(0, lambda: self._show_preview(previews, v, keywords, exts, date_from, date_to))
            except Exception as e:
                self.after(0, lambda: self._on_error(str(e)))

        threading.Thread(target=preview_worker, daemon=True).start()

    def _show_preview(self, previews, v, keywords, exts, date_from, date_to):
        self._set_running(False)
        if not previews:
            self.status_var.set("조건에 맞는 메일 없음")
            messagebox.showinfo("결과 없음", "조건에 맞는 메일을 찾지 못했습니다.")
            return

        dlg = PreviewDialog(self, previews)
        self.wait_window(dlg)
        if not dlg.result:
            self.status_var.set("취소됨")
            return

        # 실행 시작
        self._set_running(True)
        self.progress_var.set(0)
        self.pct_label.config(text="0%")
        self.open_btn.config(state="disabled")
        self.nb.select(1)  # 로그 탭으로 전환
        self.status_var.set("처리 중...")
        self._stop_event.clear()

        def save_worker():
            try:
                m, s, e = save_attachments(
                    keywords=keywords,
                    file_extensions=exts,
                    save_dir=v["save_dir"],
                    search_in=v["search_in"],
                    keyword_mode=v["keyword_mode"],
                    folder_name=v["folder_name"] or None,
                    sender_filter=v["sender_filter"] or None,
                    date_from=date_from, date_to=date_to,
                    require_attachment=v["require_attachment"],
                    make_excel=v["make_excel"],
                    dry_run=v["dry_run"],
                    stop_event=self._stop_event,
                    progress_cb=lambda d, t: self.after(0, lambda: self._update_progress(d, t)),
                    log_cb=lambda msg, lv="INFO": self.after(0, lambda: self._log(msg, lv))
                )
                self.after(0, lambda: self._on_done(m, s, e))
            except Exception as ex:
                self.after(0, lambda: self._on_error(str(ex)))

        threading.Thread(target=save_worker, daemon=True).start()

    def _on_done(self, matched, saved, errors):
        self._set_running(False)
        self.progress_var.set(100)
        self.pct_label.config(text="100%")
        self.open_btn.config(state="normal")
        msg = f"완료: 메일 {matched}개 / 첨부 {saved}개"
        if errors:
            msg += f" / 오류 {errors}건"
        self.status_var.set(msg)
        messagebox.showinfo("완료", f"{msg}\n\n저장경로: {self._last_save_dir}")

    def _on_error(self, err):
        self._set_running(False)
        self.status_var.set("오류 발생")
        self._log(err, "ERROR")
        messagebox.showerror("오류", err)


if __name__ == "__main__":
    app = App()
    app.mainloop()

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext, simpledialog
import json
import os
import threading
from datetime import datetime
from outlook_attachment_saver import preview_emails, save_attachments

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

C_BLUE   = "#0078D4"
C_LIGHT  = "#E8F0FE"
C_BG     = "#F3F3F3"
C_WHITE  = "#FFFFFF"
C_GRAY   = "#E0E0E0"
C_DKGRAY = "#555555"
C_ERROR  = "#D83B01"
C_WARN   = "#CA5010"
C_SKIP   = "#767676"
C_GREEN  = "#107C10"
LOG_COLORS = {"INFO": C_DKGRAY, "SKIP": C_SKIP, "WARN": C_WARN, "ERROR": C_ERROR}

PRESET_DEFAULTS = {
    "keywords": "", "keyword_mode": "OR",
    "search_in": "subject",
    "sender_filter": "", "folder_name": "",
    "date_from": "", "date_to": "",
    "extensions": "", "save_dir": "",
    "require_attachment": False,
    "make_excel": True, "dry_run": False
}


def load_config():
    data = {"presets": {}, "last_preset": ""}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                data.update(saved)
        except Exception:
            pass
    return data


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
    def __init__(self, parent, previews):
        super().__init__(parent)
        self.title("진행 확인")
        self.geometry("520x320")
        self.resizable(False, False)
        self.configure(bg=C_BG)
        self.grab_set()
        self.result = False

        tk.Label(self, text=f"미리보기 (상위 {len(previews)}건)",
                 font=("맑은 고딕", 12, "bold"), bg=C_BG
                 ).pack(pady=(14, 6))

        box = tk.Frame(self, bg=C_WHITE, relief="solid", bd=1)
        box.pack(fill="both", expand=True, padx=18, pady=2)

        for i, p in enumerate(previews):
            bg = C_LIGHT if i % 2 == 0 else C_WHITE
            row = tk.Frame(box, bg=bg)
            row.pack(fill="x")
            tk.Label(row, text=f" {i+1} ", font=("맑은 고딕", 10, "bold"),
                     bg=bg, fg=C_BLUE, width=3).pack(side="left", pady=6)
            info = tk.Frame(row, bg=bg)
            info.pack(side="left", fill="x", expand=True)
            tk.Label(info, text=p["subject"], font=("맑은 고딕", 10),
                     bg=bg, anchor="w", wraplength=400).pack(anchor="w")
            tk.Label(info,
                     text=f"수신: {p['received']}  |  {p['sender']}  |  첨부 {p['attachments']}개  |  {p['folder']}",
                     font=("맑은 고딕", 8), fg=C_DKGRAY, bg=bg
                     ).pack(anchor="w", pady=(0, 4))

        tk.Label(self, text="전체 메일을 계속 처리하시겠습니까?",
                 font=("맑은 고딕", 10), bg=C_BG).pack(pady=(10, 4))

        bf = tk.Frame(self, bg=C_BG)
        bf.pack(pady=8)
        tk.Button(bf, text="  진행  ", font=("맑은 고딕", 11, "bold"),
                  bg=C_BLUE, fg="white", relief="flat",
                  padx=20, pady=6, command=self._ok).pack(side="left", padx=8)
        tk.Button(bf, text="  취소  ", font=("맑은 고딕", 11),
                  bg=C_GRAY, relief="flat",
                  padx=20, pady=6, command=self._cancel).pack(side="left", padx=8)
        self.protocol("WM_DELETE_WINDOW", self._cancel)

    def _ok(self):
        self.result = True
        self.destroy()

    def _cancel(self):
        self.result = False
        self.destroy()


# ── 프리셋 관리 팝업 ─────────────────────────────────────
class PresetManagerDialog(tk.Toplevel):
    """프리셋 목록 보기 + 일괄 실행 선택"""
    def __init__(self, parent, presets):
        super().__init__(parent)
        self.title("프리셋 관리")
        self.geometry("460x400")
        self.resizable(False, False)
        self.configure(bg=C_BG)
        self.grab_set()
        self.selected = []   # 일괄 실행할 프리셋 이름 목록
        self._presets = presets
        self._vars = {}
        self._build(presets)

    def _build(self, presets):
        tk.Label(self, text="일괄 실행할 프리셋을 선택하세요",
                 font=("맑은 고딕", 12, "bold"), bg=C_BG
                 ).pack(pady=(14, 8))

        box = tk.Frame(self, bg=C_WHITE, relief="solid", bd=1)
        box.pack(fill="both", expand=True, padx=18, pady=2)

        if not presets:
            tk.Label(box, text="저장된 프리셋이 없습니다.",
                     bg=C_WHITE, fg="#999", font=("맑은 고딕", 10)
                     ).pack(pady=30)
        else:
            for i, (name, cfg) in enumerate(presets.items()):
                bg = C_LIGHT if i % 2 == 0 else C_WHITE
                row = tk.Frame(box, bg=bg)
                row.pack(fill="x", padx=8, pady=4)

                var = tk.BooleanVar(value=True)
                self._vars[name] = var
                tk.Checkbutton(row, variable=var, bg=bg,
                               activebackground=bg).pack(side="left")

                info = tk.Frame(row, bg=bg)
                info.pack(side="left", fill="x", expand=True)
                tk.Label(info, text=name, font=("맑은 고딕", 10, "bold"),
                         bg=bg, anchor="w").pack(anchor="w")
                kw = cfg.get("keywords", "")
                sd = cfg.get("save_dir", "")[:40]
                tk.Label(info,
                         text=f"키워드: {kw}  |  저장: {sd}",
                         font=("맑은 고딕", 8), fg=C_DKGRAY, bg=bg
                         ).pack(anchor="w")

        bf = tk.Frame(self, bg=C_BG)
        bf.pack(pady=10)
        tk.Button(bf, text="선택 실행", font=("맑은 고딕", 11, "bold"),
                  bg=C_BLUE, fg="white", relief="flat",
                  padx=20, pady=6, command=self._run).pack(side="left", padx=8)
        tk.Button(bf, text="취소", font=("맑은 고딕", 10),
                  bg=C_GRAY, relief="flat",
                  padx=14, pady=6, command=self.destroy).pack(side="left", padx=8)

    def _run(self):
        self.selected = [name for name, var in self._vars.items() if var.get()]
        if not self.selected:
            messagebox.showwarning("선택 없음", "실행할 프리셋을 하나 이상 선택해주세요.")
            return
        self.destroy()


# ── 메인 앱 ──────────────────────────────────────────────
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Outlook 메일 수집기")
        self.geometry("640x640")
        self.resizable(False, False)
        self.configure(bg=C_BG)

        self._cfg = load_config()
        self._stop_event = threading.Event()
        self._last_save_dir = ""
        self._batch_queue = []  # 일괄 실행 큐

        self._build_ui()
        self._refresh_preset_list()
        # 마지막 프리셋 자동 로드
        last = self._cfg.get("last_preset", "")
        if last and last in self._cfg.get("presets", {}):
            self.preset_var.set(last)
            self._load_preset()

    # ── UI 빌드 ───────────────────────────────────────────
    def _build_ui(self):
        tk.Label(self, text="Outlook 메일 수집기",
                 font=("맑은 고딕", 14, "bold"),
                 bg=C_BLUE, fg="white").pack(fill="x", ipady=10)

        # 프리셋 바
        self._build_preset_bar()

        self.nb = ttk.Notebook(self)
        self.nb.pack(fill="both", expand=True, padx=10, pady=(4, 4))

        self._build_tab_search()
        self._build_tab_log()
        self._build_bottom_bar()

    def _build_preset_bar(self):
        bar = tk.Frame(self, bg=C_LIGHT, pady=6)
        bar.pack(fill="x", padx=10, pady=(6, 0))

        tk.Label(bar, text="프리셋", bg=C_LIGHT,
                 font=("맑은 고딕", 10, "bold"), fg=C_BLUE
                 ).pack(side="left", padx=(10, 6))

        self.preset_var = tk.StringVar()
        self.preset_cb = ttk.Combobox(bar, textvariable=self.preset_var,
                                       state="readonly", width=22,
                                       font=("맑은 고딕", 10))
        self.preset_cb.pack(side="left", padx=4)
        self.preset_cb.bind("<<ComboboxSelected>>", lambda e: self._load_preset())

        for text, cmd, color in [
            ("불러오기", self._load_preset, C_BLUE),
            ("저장",    self._save_preset, C_GREEN),
            ("삭제",    self._delete_preset, C_ERROR),
            ("일괄 실행", self._batch_run, "#5C2D91"),
        ]:
            tk.Button(bar, text=text, font=("맑은 고딕", 9),
                      bg=color, fg="white", relief="flat",
                      padx=10, pady=3,
                      command=cmd).pack(side="left", padx=3)

    def _build_tab_search(self):
        tab = tk.Frame(self.nb, bg=C_BG)
        self.nb.add(tab, text="  검색 설정  ")

        f = tk.Frame(tab, bg=C_BG)
        f.pack(fill="both", expand=True, padx=16, pady=6)
        f.columnconfigure(1, weight=1)

        def lbl(text, row):
            tk.Label(f, text=text, bg=C_BG,
                     font=("맑은 고딕", 10), anchor="w"
                     ).grid(row=row, column=0, sticky="w", pady=4)

        def hint(text, row):
            tk.Label(f, text=text, bg=C_BG, fg="gray",
                     font=("맑은 고딕", 8)
                     ).grid(row=row, column=1, columnspan=3, sticky="w", padx=(10, 0))

        # 키워드
        lbl("키워드", 0)
        kw_f = tk.Frame(f, bg=C_BG)
        kw_f.grid(row=0, column=1, columnspan=3, sticky="ew", padx=(10, 0), pady=4)
        self.kw_var = tk.StringVar()
        tk.Entry(kw_f, textvariable=self.kw_var,
                 font=("맑은 고딕", 10)).pack(side="left", fill="x", expand=True)
        tk.Label(kw_f, text="  방식:", bg=C_BG, font=("맑은 고딕", 9)).pack(side="left")
        self.kw_mode_var = tk.StringVar()
        ttk.Combobox(kw_f, textvariable=self.kw_mode_var,
                     values=["OR", "AND"], state="readonly",
                     width=5).pack(side="left", padx=(2, 0))
        hint("쉼표 구분 (예: 견적서, 계약)  |  OR: 하나라도 / AND: 모두 포함", 1)

        # 검색 위치
        lbl("검색 위치", 2)
        self.search_in_var = tk.StringVar()
        self._si_map = {"제목": "subject", "본문": "body", "제목+본문": "both"}
        self._si_rev = {v: k for k, v in self._si_map.items()}
        ttk.Combobox(f, textvariable=self.search_in_var,
                     values=list(self._si_map.keys()),
                     state="readonly", font=("맑은 고딕", 10)
                     ).grid(row=2, column=1, sticky="ew", padx=(10, 0), pady=4)

        # 발신자
        lbl("발신자 필터", 3)
        self.sender_var = tk.StringVar()
        tk.Entry(f, textvariable=self.sender_var, font=("맑은 고딕", 10)
                 ).grid(row=3, column=1, sticky="ew", padx=(10, 0), pady=4)
        hint("이메일 일부 (비우면 전체)", 4)

        # 날짜 범위
        lbl("날짜 범위", 5)
        dt_f = tk.Frame(f, bg=C_BG)
        dt_f.grid(row=5, column=1, columnspan=3, sticky="ew", padx=(10, 0), pady=4)
        self.date_from_var = tk.StringVar()
        self.date_to_var = tk.StringVar()
        tk.Entry(dt_f, textvariable=self.date_from_var,
                 font=("맑은 고딕", 10), width=12).pack(side="left")
        tk.Label(dt_f, text="  ~  ", bg=C_BG, font=("맑은 고딕", 10)).pack(side="left")
        tk.Entry(dt_f, textvariable=self.date_to_var,
                 font=("맑은 고딕", 10), width=12).pack(side="left")
        tk.Label(dt_f, text="  YYYY-MM-DD", bg=C_BG,
                 fg="gray", font=("맑은 고딕", 8)).pack(side="left")

        # 폴더
        lbl("Outlook 폴더", 6)
        self.folder_var = tk.StringVar()
        tk.Entry(f, textvariable=self.folder_var, font=("맑은 고딕", 10)
                 ).grid(row=6, column=1, sticky="ew", padx=(10, 0), pady=4)
        hint("폴더명 일부 (비우면 받은편지함)", 7)

        # 파일 형태
        lbl("파일 형태", 8)
        self.ext_var = tk.StringVar()
        tk.Entry(f, textvariable=self.ext_var, font=("맑은 고딕", 10)
                 ).grid(row=8, column=1, sticky="ew", padx=(10, 0), pady=4)
        hint("예: pdf, xlsx  (비우면 전체)", 9)

        # 저장 경로
        lbl("저장 경로", 10)
        dir_f = tk.Frame(f, bg=C_BG)
        dir_f.grid(row=10, column=1, columnspan=3, sticky="ew", padx=(10, 0), pady=4)
        self.save_dir_var = tk.StringVar()
        tk.Entry(dir_f, textvariable=self.save_dir_var,
                 font=("맑은 고딕", 10)).pack(side="left", fill="x", expand=True)
        tk.Button(dir_f, text="찾아보기", font=("맑은 고딕", 9),
                  bg=C_GRAY, relief="flat",
                  command=self._browse).pack(side="left", padx=(6, 0))

        # 체크박스
        opt_f = tk.Frame(f, bg=C_BG)
        opt_f.grid(row=11, column=0, columnspan=4, sticky="w", pady=(6, 2))
        self.excel_var = tk.BooleanVar()
        self.dry_var = tk.BooleanVar()
        self.att_only_var = tk.BooleanVar()
        for var, text in [(self.excel_var, "Excel 보고서"),
                          (self.dry_var, "Dry Run"),
                          (self.att_only_var, "첨부파일만")]:
            tk.Checkbutton(opt_f, text=text, variable=var,
                           bg=C_BG, font=("맑은 고딕", 9),
                           activebackground=C_BG).pack(side="left", padx=8)

    def _build_tab_log(self):
        tab = tk.Frame(self.nb, bg=C_BG)
        self.nb.add(tab, text="  실행 로그  ")

        pg_f = tk.Frame(tab, bg=C_BG)
        pg_f.pack(fill="x", padx=14, pady=(10, 4))

        # 프리셋 진행 표시
        self.batch_label = tk.Label(pg_f, text="", bg=C_BG,
                                    fg=C_BLUE, font=("맑은 고딕", 9))
        self.batch_label.pack(anchor="w")

        self.progress_var = tk.DoubleVar()
        self.progress = ttk.Progressbar(pg_f, variable=self.progress_var,
                                        maximum=100, length=400)
        self.progress.pack(side="left", fill="x", expand=True)
        self.pct_label = tk.Label(pg_f, text="0%", bg=C_BG,
                                  font=("맑은 고딕", 9), width=6)
        self.pct_label.pack(side="left", padx=(6, 0))

        self.log_box = scrolledtext.ScrolledText(
            tab, font=("Consolas", 9), height=18,
            bg="#1E1E1E", fg="#D4D4D4",
            insertbackground="white", relief="flat"
        )
        self.log_box.pack(fill="both", expand=True, padx=14, pady=(0, 6))
        for level, color in LOG_COLORS.items():
            self.log_box.tag_config(level, foreground=color)
        self.log_box.tag_config("WARN",  foreground="#CE9178")
        self.log_box.tag_config("SKIP",  foreground="#808080")
        self.log_box.tag_config("ERROR", foreground=C_ERROR)
        self.log_box.tag_config("DONE",  foreground="#4EC9B0")

        lb = tk.Frame(tab, bg=C_BG)
        lb.pack(pady=4)
        tk.Button(lb, text="로그 지우기", font=("맑은 고딕", 9),
                  bg=C_GRAY, relief="flat", padx=10, pady=4,
                  command=self._clear_log).pack(side="left", padx=6)
        self.open_btn = tk.Button(lb, text="저장 폴더 열기",
                                  font=("맑은 고딕", 9),
                                  bg=C_GRAY, relief="flat",
                                  padx=10, pady=4, state="disabled",
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
                  command=self._save_only).pack(side="right", padx=4)
        self.stop_btn = tk.Button(bar, text="중단", font=("맑은 고딕", 10),
                                  bg=C_ERROR, fg="white", relief="flat",
                                  padx=14, pady=5, state="disabled",
                                  command=self._stop)
        self.stop_btn.pack(side="right", padx=4)
        self.run_btn = tk.Button(bar, text="  실행  ",
                                 font=("맑은 고딕", 11, "bold"),
                                 bg=C_BLUE, fg="white", relief="flat",
                                 padx=22, pady=5, command=self._run)
        self.run_btn.pack(side="right", padx=4)

    # ── 프리셋 관련 ───────────────────────────────────────
    def _refresh_preset_list(self):
        names = list(self._cfg.get("presets", {}).keys())
        self.preset_cb["values"] = names

    def _get_current_settings(self):
        return {
            "keywords":          self.kw_var.get().strip(),
            "keyword_mode":      self.kw_mode_var.get(),
            "search_in":         self._si_map.get(self.search_in_var.get(), "subject"),
            "sender_filter":     self.sender_var.get().strip(),
            "folder_name":       self.folder_var.get().strip(),
            "date_from":         self.date_from_var.get().strip(),
            "date_to":           self.date_to_var.get().strip(),
            "extensions":        self.ext_var.get().strip(),
            "save_dir":          self.save_dir_var.get().strip(),
            "make_excel":        self.excel_var.get(),
            "dry_run":           self.dry_var.get(),
            "require_attachment":self.att_only_var.get()
        }

    def _apply_settings(self, cfg):
        self.kw_var.set(cfg.get("keywords", ""))
        self.kw_mode_var.set(cfg.get("keyword_mode", "OR"))
        self.search_in_var.set(self._si_rev.get(cfg.get("search_in", "subject"), "제목"))
        self.sender_var.set(cfg.get("sender_filter", ""))
        self.folder_var.set(cfg.get("folder_name", ""))
        self.date_from_var.set(cfg.get("date_from", ""))
        self.date_to_var.set(cfg.get("date_to", ""))
        self.ext_var.set(cfg.get("extensions", ""))
        self.save_dir_var.set(cfg.get("save_dir", ""))
        self.excel_var.set(cfg.get("make_excel", True))
        self.dry_var.set(cfg.get("dry_run", False))
        self.att_only_var.set(cfg.get("require_attachment", False))

    def _load_preset(self):
        name = self.preset_var.get()
        presets = self._cfg.get("presets", {})
        if name in presets:
            self._apply_settings(presets[name])
            self.status_var.set(f"프리셋 불러옴: {name}")

    def _save_preset(self):
        name = simpledialog.askstring("프리셋 저장", "프리셋 이름을 입력하세요:",
                                      initialvalue=self.preset_var.get())
        if not name:
            return
        if "presets" not in self._cfg:
            self._cfg["presets"] = {}
        self._cfg["presets"][name] = self._get_current_settings()
        self._cfg["last_preset"] = name
        save_config(self._cfg)
        self._refresh_preset_list()
        self.preset_var.set(name)
        self.status_var.set(f"프리셋 저장됨: {name}")

    def _delete_preset(self):
        name = self.preset_var.get()
        if not name:
            return
        if not messagebox.askyesno("삭제 확인", f"'{name}' 프리셋을 삭제하시겠습니까?"):
            return
        self._cfg.get("presets", {}).pop(name, None)
        save_config(self._cfg)
        self._refresh_preset_list()
        self.preset_var.set("")
        self.status_var.set(f"프리셋 삭제됨: {name}")

    def _batch_run(self):
        presets = self._cfg.get("presets", {})
        if not presets:
            messagebox.showinfo("프리셋 없음", "저장된 프리셋이 없습니다.\n먼저 프리셋을 저장해주세요.")
            return
        dlg = PresetManagerDialog(self, presets)
        self.wait_window(dlg)
        if dlg.selected:
            self._batch_queue = list(dlg.selected)
            self._run_next_batch()

    def _run_next_batch(self):
        if not self._batch_queue:
            self.status_var.set("일괄 실행 완료")
            self._log("=" * 40, "DONE")
            self._log("모든 프리셋 실행 완료", "DONE")
            self._set_running(False)
            return

        name = self._batch_queue.pop(0)
        remaining = len(self._batch_queue)
        presets = self._cfg.get("presets", {})

        if name not in presets:
            self._log(f"[건너뜀] 프리셋 없음: {name}", "WARN")
            self._run_next_batch()
            return

        self._apply_settings(presets[name])
        self.preset_var.set(name)
        total_count = len(self._batch_queue) + 1
        self.batch_label.config(
            text=f"일괄 실행 중: [{name}]  (남은 프리셋: {remaining}개)"
        )
        self._log(f"\n{'='*40}", "DONE")
        self._log(f"프리셋 시작: {name}", "DONE")
        self._execute(on_done_callback=self._run_next_batch)

    # ── 실행 로직 ─────────────────────────────────────────
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

    def _run(self):
        self._batch_queue = []
        self.batch_label.config(text="")
        self._execute()

    def _execute(self, on_done_callback=None):
        v = self._get_current_settings()
        if not self._validate(v):
            return

        keywords = parse_keywords(v["keywords"])
        exts = parse_extensions(v["extensions"])
        date_from = parse_date(v["date_from"])
        date_to = parse_date(v["date_to"])

        self._last_save_dir = v["save_dir"]
        self._set_running(True)
        self._stop_event.clear()
        self.status_var.set("미리보기 검색 중...")
        self.nb.select(1)

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
                self.after(0, lambda: self._show_preview(
                    previews, v, keywords, exts, date_from, date_to, on_done_callback))
            except Exception as e:
                self.after(0, lambda: self._on_error(str(e)))

        threading.Thread(target=preview_worker, daemon=True).start()

    def _show_preview(self, previews, v, keywords, exts, date_from, date_to, on_done_cb):
        if not previews:
            self._set_running(False)
            self.status_var.set("조건에 맞는 메일 없음")
            if on_done_cb:
                on_done_cb()
            else:
                messagebox.showinfo("결과 없음", "조건에 맞는 메일을 찾지 못했습니다.")
            return

        # 일괄 실행 중에는 확인 생략
        if on_done_cb:
            confirmed = True
        else:
            self._set_running(False)
            dlg = PreviewDialog(self, previews)
            self.wait_window(dlg)
            confirmed = dlg.result

        if not confirmed:
            self.status_var.set("취소됨")
            return

        self._set_running(True)
        self.progress_var.set(0)
        self.pct_label.config(text="0%")
        self.open_btn.config(state="disabled")
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
                self.after(0, lambda: self._on_done(m, s, e, on_done_cb))
            except Exception as ex:
                self.after(0, lambda: self._on_error(str(ex)))

        threading.Thread(target=save_worker, daemon=True).start()

    # ── 헬퍼 ─────────────────────────────────────────────
    def _browse(self):
        path = filedialog.askdirectory()
        if path:
            self.save_dir_var.set(path)

    def _save_only(self):
        save_config(self._cfg)
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
        self._batch_queue.clear()
        self.status_var.set("중단 요청됨...")

    def _log(self, msg, level="INFO"):
        tag = level if level in (*LOG_COLORS, "DONE") else "INFO"
        self.log_box.config(state="normal")
        ts = datetime.now().strftime("%H:%M:%S")
        self.log_box.insert(tk.END, f"{ts} {msg}\n", tag)
        self.log_box.see(tk.END)
        self.log_box.config(state="disabled")

    def _set_running(self, running):
        self.run_btn.config(state="disabled" if running else "normal",
                            text="실행 중..." if running else "  실행  ")
        self.stop_btn.config(state="normal" if running else "disabled")

    def _update_progress(self, done, total):
        if total > 0:
            pct = done / total * 100
            self.progress_var.set(pct)
            self.pct_label.config(text=f"{int(pct)}%")

    def _on_done(self, matched, saved, errors, on_done_cb=None):
        self.open_btn.config(state="normal")
        msg = f"메일:{matched} 첨부:{saved}"
        if errors:
            msg += f" 오류:{errors}"
        self.status_var.set(msg)
        self._log(f"완료 — {msg}", "DONE")

        if on_done_cb:
            on_done_cb()
        else:
            self._set_running(False)
            messagebox.showinfo("완료", f"{msg}\n\n저장경로: {self._last_save_dir}")

    def _on_error(self, err):
        self._set_running(False)
        self.status_var.set("오류 발생")
        self._log(err, "ERROR")
        messagebox.showerror("오류", err)


if __name__ == "__main__":
    app = App()
    app.mainloop()

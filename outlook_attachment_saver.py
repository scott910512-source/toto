import win32com.client
import pythoncom
import os
import re
from datetime import datetime

olMSG = 3  # Outlook SaveAs MSG 포맷


def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "_", name)


def _to_naive_dt(dt):
    return datetime(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)


def _build_date_restrict(date_from, date_to):
    """날짜 범위만 서버사이드 Restrict — 와일드카드 없이 안전"""
    parts = []
    if date_from:
        parts.append(f"[ReceivedTime] >= '{date_from.strftime('%m/%d/%Y')} 12:00 AM'")
    if date_to:
        parts.append(f"[ReceivedTime] <= '{date_to.strftime('%m/%d/%Y')} 11:59 PM'")
    return " AND ".join(parts) if parts else None


def _kw_in(text, kw, word_boundary):
    """단일 키워드 매칭. word_boundary=True 이면 알파벳/숫자 연속 단어 제외"""
    if word_boundary:
        pattern = r'(?<![a-zA-Z0-9가-힣])' + re.escape(kw) + r'(?![a-zA-Z0-9가-힣])'
        return bool(re.search(pattern, text, re.IGNORECASE))
    return kw.lower() in text.lower()


def _matches(msg, keywords, search_in, keyword_mode, sender_filter, word_boundary=False):
    """Python 측 필터링 — 키워드 / 발신자"""
    # 발신자: 쉼표 구분 OR 조건
    if sender_filter:
        senders = [s.strip().lower() for s in sender_filter.split(',') if s.strip()]
        addr = (msg.SenderEmailAddress or "").lower()
        if not any(s in addr for s in senders):
            return False

    if not keywords:
        return True

    subject = msg.Subject or ""

    if search_in == "subject":
        chk = lambda kw: _kw_in(subject, kw, word_boundary)
    elif search_in == "body":
        body = msg.Body or ""
        chk = lambda kw: _kw_in(body, kw, word_boundary)
    else:  # both — OR 모드는 제목 먼저 체크해 Body 접근 최소화
        if keyword_mode == "OR":
            if any(_kw_in(subject, kw, word_boundary) for kw in keywords):
                return True
            body = msg.Body or ""
            return any(_kw_in(body, kw, word_boundary) for kw in keywords)
        else:  # AND
            if all(_kw_in(subject, kw, word_boundary) for kw in keywords):
                return True
            combined = subject + " " + (msg.Body or "")
            return all(_kw_in(combined, kw, word_boundary) for kw in keywords)

    if keyword_mode == "AND":
        return all(chk(kw) for kw in keywords)
    return any(chk(kw) for kw in keywords)


def _collect_all(folders):
    result = []
    for folder in folders:
        result.append(folder)
        if folder.Folders.Count > 0:
            result.extend(_collect_all(folder.Folders))
    return result


def _collect_by_name(folders, name_filter):
    result = []
    for folder in folders:
        if name_filter.lower() in folder.Name.lower():
            result.append(folder)
        if folder.Folders.Count > 0:
            result.extend(_collect_by_name(folder.Folders, name_filter))
    return result


def _get_target_folders(ns, folder_name_filter=None):
    if not folder_name_filter:
        inbox = ns.GetDefaultFolder(6)
        return [inbox] + _collect_all(inbox.Folders)
    all_folders = []
    for store in ns.Stores:
        root = store.GetRootFolder()
        all_folders.extend(_collect_by_name(root.Folders, folder_name_filter))
    if not all_folders:
        raise ValueError(f"'{folder_name_filter}' 이름을 포함한 폴더를 찾을 수 없습니다.")
    return all_folders


def preview_emails(keywords, search_in="subject", keyword_mode="OR",
                   folder_name=None, sender_filter=None,
                   date_from=None, date_to=None,
                   require_attachment=False, limit=2,
                   word_boundary=False, stop_event=None):
    pythoncom.CoInitialize()
    try:
        outlook = win32com.client.Dispatch("Outlook.Application")
        ns = outlook.GetNamespace("MAPI")
        folders = _get_target_folders(ns, folder_name)
        restrict = _build_date_restrict(date_from, date_to)

        previews = []
        for folder in folders:
            if stop_event and stop_event.is_set():
                break
            if len(previews) >= limit:
                break
            try:
                items = folder.Items
                items.Sort("[ReceivedTime]", True)
                if restrict:
                    items = items.Restrict(restrict)
                for msg in items:
                    if stop_event and stop_event.is_set():
                        break
                    if len(previews) >= limit:
                        break
                    try:
                        if require_attachment and msg.Attachments.Count == 0:
                            continue
                        if not _matches(msg, keywords, search_in, keyword_mode, sender_filter, word_boundary):
                            continue
                        previews.append({
                            "subject":     (msg.Subject or "(제목없음)")[:60],
                            "sender":      msg.SenderEmailAddress or "",
                            "received":    _to_naive_dt(msg.ReceivedTime).strftime("%Y-%m-%d %H:%M"),
                            "attachments": msg.Attachments.Count,
                            "folder":      folder.Name
                        })
                    except Exception:
                        continue
            except Exception:
                continue
        return previews
    finally:
        pythoncom.CoUninitialize()


def save_attachments(keywords, file_extensions, save_dir,
                     search_in="subject", keyword_mode="OR",
                     folder_name=None, sender_filter=None,
                     date_from=None, date_to=None,
                     require_attachment=False,
                     save_modes=None,          # {"msg", "body", "attachments"}
                     make_excel=True, dry_run=False,
                     word_boundary=False,
                     stop_event=None, progress_cb=None, log_cb=None):

    if save_modes is None:
        save_modes = {"body", "attachments"}

    do_msg  = "msg"         in save_modes
    do_body = "body"        in save_modes
    do_att  = "attachments" in save_modes

    def log(msg, level="INFO"):
        if log_cb:
            log_cb(f"[{level}] {msg}", level)
        else:
            print(f"[{level}] {msg}")

    def stopped():
        return stop_event and stop_event.is_set()

    os.makedirs(save_dir, exist_ok=True)
    pythoncom.CoInitialize()
    try:
        outlook = win32com.client.Dispatch("Outlook.Application")
        ns = outlook.GetNamespace("MAPI")
        folders = _get_target_folders(ns, folder_name)
        restrict = _build_date_restrict(date_from, date_to)

        today_str = datetime.now().strftime("%Y%m%d")
        matched = saved_files = skipped = 0
        errors = []
        excel_rows = []
        seen_stamps = set()  # 같은 실행 내 동일 메일 중복 방지

        mode_str = "+".join(s for s in ["MSG" if do_msg else "",
                                         "HTML" if do_body else "",
                                         "첨부" if do_att else ""] if s)
        # 저장 폴더: 키워드_날짜_저장형식 (개별 메일 폴더 없이 파일 직접 저장)
        kw_part = sanitize_filename("_".join(keywords)[:20]) if keywords else "전체"
        run_folder = os.path.join(save_dir, f"{kw_part}_{today_str}_{mode_str}")
        if not dry_run:
            os.makedirs(run_folder, exist_ok=True)

        log(f"시작 {'[DRY RUN] ' if dry_run else ''}| 저장형식: {mode_str}")
        log(f"키워드: {keywords or '전체'} | 저장폴더: {run_folder}")
        log("-" * 40)

        total = sum(f.Items.Count for f in folders)
        processed = 0

        for folder in folders:
            if stopped():
                break
            log(f"폴더: {folder.Name}")

            try:
                items = folder.Items
                items.Sort("[ReceivedTime]", True)
                if restrict:
                    items = items.Restrict(restrict)
            except Exception as e:
                log(f"폴더 접근 실패: {e}", "ERROR")
                continue

            for msg in items:
                if stopped():
                    log("중단됨.", "WARN")
                    break

                processed += 1
                if progress_cb:
                    progress_cb(processed, total)

                try:
                    if require_attachment and msg.Attachments.Count == 0:
                        continue

                    if stopped():
                        break

                    if not _matches(msg, keywords, search_in, keyword_mode, sender_filter, word_boundary):
                        continue

                    subject      = msg.Subject or "(제목없음)"
                    sender       = msg.SenderEmailAddress or ""
                    received     = _to_naive_dt(msg.ReceivedTime)
                    received_str = received.strftime("%Y%m%d")
                    safe_sub     = sanitize_filename(subject[:40])
                    stamp        = f"{received_str}_{safe_sub}"

                    # 중복 체크 — 같은 실행 내 동일 메일(다른 폴더에 중복 존재) 방지
                    if stamp in seen_stamps:
                        log(f"중복 스킵: {subject[:40]}", "SKIP")
                        skipped += 1
                        continue
                    seen_stamps.add(stamp)

                    matched += 1
                    log(f"[{matched}] {subject[:45]} | 첨부:{msg.Attachments.Count}개")

                    if dry_run:
                        continue

                    if stopped():
                        break

                    # ── MSG 파일 저장 ────────────────────────
                    if do_msg:
                        try:
                            msg_path = os.path.join(run_folder, f"{stamp}.msg")
                            if not os.path.exists(msg_path):
                                msg.SaveAs(msg_path, olMSG)
                                log(f"  MSG: {stamp}.msg")
                        except Exception as e:
                            log(f"  MSG 저장 실패: {e}", "ERROR")

                    if stopped():
                        break

                    # ── 본문 HTML 저장 ──────────────────────
                    if do_body:
                        try:
                            html_path = os.path.join(run_folder, f"{stamp}_본문.html")
                            if msg.HTMLBody:
                                with open(html_path, "w", encoding="utf-8") as f:
                                    f.write(msg.HTMLBody)
                                log(f"  HTML: {stamp}_본문.html")
                            else:
                                log(f"  HTML 없음 (텍스트 메일)", "SKIP")
                        except Exception as e:
                            log(f"  본문 저장 실패: {e}", "ERROR")

                    if stopped():
                        break

                    # ── 첨부파일 저장 ────────────────────────
                    att_names = []
                    if do_att:
                        for att in msg.Attachments:
                            if stopped():
                                break
                            try:
                                att_name = att.FileName
                                ext = os.path.splitext(att_name)[1].lower()
                                if file_extensions and ext not in file_extensions:
                                    log(f"  첨부 스킵(확장자): {att_name}", "SKIP")
                                    continue
                                save_path = os.path.join(run_folder, f"{stamp}_{att_name}")
                                if os.path.exists(save_path):
                                    log(f"  첨부 중복: {att_name}", "SKIP")
                                    continue
                                att.SaveAsFile(save_path)
                                log(f"  첨부: {att_name}")
                                saved_files += 1
                                att_names.append(att_name)
                            except Exception as e:
                                log(f"  첨부 실패({att_name}): {e}", "ERROR")

                    excel_rows.append({
                        "번호":    matched,
                        "수신일":  received.strftime("%Y-%m-%d %H:%M"),
                        "제목":    subject,
                        "발신자":  sender,
                        "폴더":    folder.Name,
                        "첨부파일": ", ".join(att_names) if att_names else "없음",
                        "저장경로": run_folder
                    })

                except Exception as e:
                    err = f"오류: {getattr(msg, 'Subject', '?')} → {e}"
                    log(err, "ERROR")
                    errors.append(err)

            if stopped():
                break

        if errors:
            err_path = os.path.join(save_dir, f"{today_str}_오류목록.txt")
            with open(err_path, "w", encoding="utf-8") as f:
                f.write("\n".join(errors))
            log(f"오류 {len(errors)}건 저장됨", "WARN")

        if make_excel and excel_rows and not dry_run:
            path = _save_excel(excel_rows, save_dir, today_str, keywords)
            log(f"Excel: {os.path.basename(path)}")

        log("=" * 40)
        log(f"완료 | 메일:{matched} 첨부:{saved_files} 스킵:{skipped} 오류:{len(errors)}")
        return matched, saved_files, len(errors)

    finally:
        pythoncom.CoUninitialize()


def _save_excel(rows, save_dir, today_str, keywords):
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    except ImportError:
        return ""

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "메일 목록"

    headers = ["번호", "수신일", "제목", "발신자", "폴더", "첨부파일", "저장경로"]
    hfill = PatternFill("solid", fgColor="0078D4")
    hfont = Font(color="FFFFFF", bold=True, size=10)
    thin  = Side(style="thin", color="CCCCCC")
    bdr   = Border(left=thin, right=thin, top=thin, bottom=thin)
    efill = PatternFill("solid", fgColor="F0F4FA")

    for c, h in enumerate(headers, 1):
        cell = ws.cell(1, c, h)
        cell.fill, cell.font, cell.border = hfill, hfont, bdr
        cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 22

    for r, row in enumerate(rows, 2):
        for c, k in enumerate(headers, 1):
            cell = ws.cell(r, c, row[k])
            cell.border = bdr
            cell.alignment = Alignment(vertical="center", wrap_text=(k in ("제목", "첨부파일")))
            if r % 2 == 0:
                cell.fill = efill
        ws.row_dimensions[r].height = 18

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    for i, w in enumerate([6, 18, 42, 28, 16, 32, 52], 1):
        ws.column_dimensions[ws.cell(1, i).column_letter].width = w

    kw_str = "_".join(keywords or [])[:20]
    path = os.path.join(save_dir, f"{today_str}_{kw_str}_메일목록.xlsx")
    wb.save(path)
    return path

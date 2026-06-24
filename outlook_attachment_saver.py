import win32com.client
import os
import re
from datetime import datetime


def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "_", name)


def _matches(subject, body, keyword, search_in):
    kw = keyword.lower()
    if search_in == "subject":
        return kw in subject.lower()
    elif search_in == "body":
        return kw in body.lower()
    else:  # both
        return kw in subject.lower() or kw in body.lower()


def _collect_folders(folders, folder_name_filter=None):
    """폴더명 필터가 있으면 해당 이름 포함 폴더만, 없으면 받은편지함 반환"""
    result = []
    for folder in folders:
        if folder_name_filter:
            if folder_name_filter.lower() in folder.Name.lower():
                result.append(folder)
        if folder.Folders.Count > 0:
            result.extend(_collect_folders(folder.Folders, folder_name_filter))
    return result


def _get_target_folders(ns, folder_name_filter=None):
    if not folder_name_filter:
        return [ns.GetDefaultFolder(6)]  # 받은편지함

    all_folders = []
    for store in ns.Stores:
        root = store.GetRootFolder()
        all_folders.extend(_collect_folders(root.Folders, folder_name_filter))

    if not all_folders:
        raise ValueError(f"'{folder_name_filter}' 이름을 포함한 폴더를 찾을 수 없습니다.")
    return all_folders


def preview_emails(keyword, search_in="subject", folder_name=None, limit=2):
    """조건에 맞는 메일 미리보기 (최대 limit개 반환)"""
    outlook = win32com.client.Dispatch("Outlook.Application")
    ns = outlook.GetNamespace("MAPI")
    folders = _get_target_folders(ns, folder_name)

    previews = []
    for folder in folders:
        messages = folder.Items
        messages.Sort("[ReceivedTime]", True)
        for msg in messages:
            if len(previews) >= limit:
                break
            try:
                subject = msg.Subject or ""
                body = msg.Body or ""
                if _matches(subject, body, keyword, search_in):
                    previews.append({
                        "subject": subject[:60],
                        "sender": msg.SenderEmailAddress or "",
                        "received": msg.ReceivedTime.strftime("%Y-%m-%d %H:%M"),
                        "attachments": msg.Attachments.Count
                    })
            except Exception:
                continue
        if len(previews) >= limit:
            break
    return previews


def save_attachments(keyword, file_extensions, save_dir,
                     search_in="subject", folder_name=None):
    os.makedirs(save_dir, exist_ok=True)

    outlook = win32com.client.Dispatch("Outlook.Application")
    ns = outlook.GetNamespace("MAPI")
    folders = _get_target_folders(ns, folder_name)

    today_str = datetime.now().strftime("%Y%m%d")
    matched_mails = 0
    saved_files = 0
    skipped_mails = 0

    print(f"\n검색 시작 | 키워드: '{keyword}' | 확장자: {file_extensions or '전체'}")
    print(f"저장 경로: {save_dir}")
    print("-" * 60)

    for folder in folders:
        print(f"\n📁 폴더: {folder.Name}")
        messages = folder.Items
        messages.Sort("[ReceivedTime]", True)

        for msg in messages:
            try:
                subject = msg.Subject or ""
                body = msg.Body or ""

                if not _matches(subject, body, keyword, search_in):
                    continue

                received_str = msg.ReceivedTime.strftime("%Y%m%d")
                safe_subject = sanitize_filename(subject[:40])

                # 메일별 폴더: 메일받은날짜_제목
                mail_folder_name = f"{received_str}_{safe_subject}"
                mail_folder = os.path.join(save_dir, mail_folder_name)

                # ── 중복 체크: 폴더 존재 + 본문 txt 존재 시 스킵 ──
                txt_name = f"{received_str}_{safe_subject}_{today_str}_본문.txt"
                txt_path = os.path.join(mail_folder, txt_name)
                if os.path.exists(mail_folder) and os.path.exists(txt_path):
                    print(f"   [스킵] 이미 저장됨: {mail_folder_name}")
                    skipped_mails += 1
                    continue

                os.makedirs(mail_folder, exist_ok=True)
                matched_mails += 1
                print(f"\n[{matched_mails}] {subject[:50]} ({received_str})")

                # ── 본문 txt 저장 ──
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(f"제목   : {subject}\n")
                    f.write(f"발신자 : {msg.SenderEmailAddress}\n")
                    f.write(f"수신일 : {msg.ReceivedTime.strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write(f"저장일 : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write("=" * 60 + "\n\n")
                    f.write(body)
                print(f"   [본문] {txt_name}")

                # ── 첨부파일 저장 ──
                if msg.Attachments.Count == 0:
                    print(f"   [첨부] 없음")
                    continue

                for att in msg.Attachments:
                    att_name = att.FileName
                    ext = os.path.splitext(att_name)[1].lower()

                    if file_extensions and ext not in file_extensions:
                        print(f"   [첨부] 스킵 (확장자): {att_name}")
                        continue

                    # 파일명: 메일받은날짜_제목_저장날짜_원본파일명
                    save_name = f"{received_str}_{safe_subject}_{today_str}_{att_name}"
                    save_path = os.path.join(mail_folder, save_name)

                    if os.path.exists(save_path):
                        print(f"   [첨부] 중복 스킵: {att_name}")
                        continue

                    att.SaveAsFile(save_path)
                    print(f"   [첨부] {save_name}")
                    saved_files += 1

            except Exception as e:
                print(f"   오류: {e}")
                continue

    print("\n" + "=" * 60)
    print(f"완료 | 저장: {matched_mails}개 | 첨부파일: {saved_files}개 | 중복스킵: {skipped_mails}개")
    print("=" * 60)
    return matched_mails, saved_files

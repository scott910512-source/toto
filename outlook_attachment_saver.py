import win32com.client
import os
import re
from datetime import datetime


def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "_", name)


def save_attachments(keyword, file_extensions, save_dir, search_in="subject"):
    os.makedirs(save_dir, exist_ok=True)

    outlook = win32com.client.Dispatch("Outlook.Application")
    ns = outlook.GetNamespace("MAPI")
    inbox = ns.GetDefaultFolder(6)
    messages = inbox.Items
    messages.Sort("[ReceivedTime]", True)

    today_str = datetime.now().strftime("%Y%m%d")
    matched_mails = 0
    saved_files = 0
    skipped_files = 0

    print(f"\n검색 시작 | 키워드: '{keyword}' | 확장자: {file_extensions or '전체'}")
    print(f"저장 경로: {save_dir}")
    print("-" * 60)

    for msg in messages:
        try:
            subject = msg.Subject or ""
            body = msg.Body or ""

            hit = False
            if search_in == "subject" and keyword.lower() in subject.lower():
                hit = True
            elif search_in == "body" and keyword.lower() in body.lower():
                hit = True
            elif search_in == "both" and (
                keyword.lower() in subject.lower() or keyword.lower() in body.lower()
            ):
                hit = True

            if not hit:
                continue

            matched_mails += 1
            received_dt = msg.ReceivedTime
            received_str = received_dt.strftime("%Y%m%d")
            safe_subject = sanitize_filename(subject[:40])

            # 메일별 폴더 생성: 메일받은날짜_제목
            mail_folder_name = f"{received_str}_{safe_subject}"
            mail_folder = os.path.join(save_dir, mail_folder_name)
            os.makedirs(mail_folder, exist_ok=True)

            print(f"\n[{matched_mails}] {subject[:50]} ({received_str})")

            # ── 본문 텍스트 저장 ──────────────────────────────
            txt_name = f"{received_str}_{safe_subject}_{today_str}_본문.txt"
            txt_path = os.path.join(mail_folder, txt_name)
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(f"제목   : {subject}\n")
                f.write(f"발신자 : {msg.SenderEmailAddress}\n")
                f.write(f"수신일 : {received_dt.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"저장일 : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("=" * 60 + "\n\n")
                f.write(body)
            print(f"   [본문] 저장됨: {txt_name}")

            # ── 첨부파일 저장 ─────────────────────────────────
            if msg.Attachments.Count == 0:
                print(f"   [첨부] 없음")
                continue

            for att in msg.Attachments:
                att_name = att.FileName
                ext = os.path.splitext(att_name)[1].lower()

                if file_extensions and ext not in file_extensions:
                    print(f"   [첨부] 스킵 (확장자 불일치): {att_name}")
                    skipped_files += 1
                    continue

                # 파일명: 메일받은날짜_제목_저장날짜_원본파일명
                save_name = f"{received_str}_{safe_subject}_{today_str}_{att_name}"
                save_path = os.path.join(mail_folder, save_name)

                if os.path.exists(save_path):
                    base, ext2 = os.path.splitext(save_path)
                    save_path = f"{base}_dup{ext2}"

                att.SaveAsFile(save_path)
                print(f"   [첨부] 저장됨: {save_name}")
                saved_files += 1

        except Exception as e:
            print(f"   오류 발생: {e}")
            continue

    print("\n" + "=" * 60)
    print(f"완료 | 매칭 메일: {matched_mails}개 | 첨부 저장: {saved_files}개 | 스킵: {skipped_files}개")
    print("=" * 60)
    return matched_mails, saved_files

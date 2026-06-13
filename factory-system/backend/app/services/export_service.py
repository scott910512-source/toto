"""데이터 Export 서비스: Excel(.xlsx) / CSV / PDF 생성."""
import io
from typing import List

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet


def to_dataframe(rows: List[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


def to_csv_bytes(rows: List[dict]) -> bytes:
    df = to_dataframe(rows)
    # 한글 깨짐 방지를 위해 UTF-8 BOM 사용 (Excel 호환)
    return df.to_csv(index=False).encode("utf-8-sig")


def to_xlsx_bytes(rows: List[dict], sheet_name: str = "data") -> bytes:
    df = to_dataframe(rows)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name=sheet_name[:31])
        ws = writer.sheets[sheet_name[:31]]
        # 컬럼 너비 자동 조정
        for i, col in enumerate(df.columns, start=1):
            width = max(12, min(40, int(df[col].astype(str).map(len).max() if not df.empty else 12) + 2))
            ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = width
    buf.seek(0)
    return buf.read()


def to_pdf_bytes(rows: List[dict], title: str = "Report") -> bytes:
    df = to_dataframe(rows)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=10 * mm, rightMargin=10 * mm)
    styles = getSampleStyleSheet()
    elements = [Paragraph(title, styles["Title"])]

    if df.empty:
        elements.append(Paragraph("데이터가 없습니다.", styles["Normal"]))
    else:
        # PDF 가독성을 위해 최대 200행만 출력
        df = df.head(200)
        data = [list(df.columns)] + df.astype(str).values.tolist()
        table = Table(data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 6),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        elements.append(table)

    doc.build(elements)
    buf.seek(0)
    return buf.read()

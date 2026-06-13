"""데이터 Export 라우터: 카테고리별 데이터를 xlsx/csv/pdf 로 추출."""
from datetime import datetime
from typing import List, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.equipment import EquipmentCheck
from app.models.production import Production
from app.models.quality import Quality
from app.models.safety import Safety
from app.services import export_service

router = APIRouter(prefix="/export", tags=["export"], dependencies=[Depends(get_current_user)])

# 카테고리 -> (모델, 날짜컬럼, 한글 제목)
_CATEGORIES = {
    "production": (Production, "produced_at", "생산 정보"),
    "equipment": (EquipmentCheck, "checked_at", "설비 점검"),
    "quality": (Quality, "analyzed_at", "품질 데이터"),
    "safety": (Safety, "worked_at", "안전 데이터"),
}

_MEDIA = {
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}


def _serialize(obj) -> dict:
    out = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if hasattr(val, "value"):  # Enum
            val = val.value
        if isinstance(val, datetime):
            val = val.strftime("%Y-%m-%d %H:%M")
        out[col.name] = val
    return out


@router.get("/{category}")
def export_data(
    category: str,
    fmt: str = Query("xlsx", pattern="^(xlsx|csv|pdf)$"),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    if category not in _CATEGORIES:
        raise HTTPException(status_code=400, detail="알 수 없는 카테고리입니다.")
    model, date_col, title = _CATEGORIES[category]

    query = db.query(model)
    col = getattr(model, date_col)
    if date_from:
        query = query.filter(col >= date_from)
    if date_to:
        query = query.filter(col <= date_to)
    rows: List[dict] = [_serialize(o) for o in query.order_by(col.desc()).all()]

    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    filename = f"{category}_{stamp}.{fmt}"

    if fmt == "csv":
        content = export_service.to_csv_bytes(rows)
    elif fmt == "xlsx":
        content = export_service.to_xlsx_bytes(rows, sheet_name=category)
    else:
        content = export_service.to_pdf_bytes(rows, title=f"{title} 리포트 ({stamp})")

    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"
    }
    return StreamingResponse(iter([content]), media_type=_MEDIA[fmt], headers=headers)

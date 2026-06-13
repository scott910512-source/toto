"""품질 데이터 CRUD + 필터 검색 라우터."""
from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_editor
from app.core.database import get_db
from app.models.quality import Quality, QualityResult
from app.models.user import User
from app.schemas.common import Page
from app.schemas.records import QualityCreate, QualityOut, QualityUpdate
from app.services import audit

router = APIRouter(prefix="/quality", tags=["quality"])


@router.get("", response_model=Page[QualityOut], dependencies=[Depends(get_current_user)])
def list_quality(
    db: Session = Depends(get_db),
    q: Optional[str] = None,
    lot_number: Optional[str] = None,
    item_name: Optional[str] = None,
    result: Optional[QualityResult] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=500),
    sort: str = Query("-analyzed_at"),
):
    query = db.query(Quality)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Quality.sample_number.ilike(like),
                Quality.lot_number.ilike(like),
                Quality.analyst.ilike(like),
                Quality.item_name.ilike(like),
            )
        )
    if lot_number:
        query = query.filter(Quality.lot_number.ilike(f"%{lot_number}%"))
    if item_name:
        query = query.filter(Quality.item_name == item_name)
    if result:
        query = query.filter(Quality.result == result)
    if date_from:
        query = query.filter(Quality.analyzed_at >= date_from)
    if date_to:
        query = query.filter(Quality.analyzed_at <= date_to)

    total = query.count()
    desc = sort.startswith("-")
    field = getattr(Quality, sort.lstrip("-"), Quality.analyzed_at)
    query = query.order_by(field.desc() if desc else field.asc())
    items = query.offset((page - 1) * size).limit(size).all()
    return Page(items=items, total=total, page=page, size=size, pages=ceil(total / size) or 1)


@router.get("/{rid}", response_model=QualityOut, dependencies=[Depends(get_current_user)])
def get_quality(rid: int, db: Session = Depends(get_db)):
    obj = db.get(Quality, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    return obj


@router.post("", response_model=QualityOut, status_code=201)
def create_quality(
    payload: QualityCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_editor),
):
    obj = Quality(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    audit.record(db, current, "CREATE", "quality", obj.id,
                 f"{obj.sample_number}/{obj.lot_number} · {obj.item_name} 분석 등록 ({obj.result.value})")
    db.commit()
    return obj


@router.patch("/{rid}", response_model=QualityOut)
def update_quality(
    rid: int,
    payload: QualityUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_editor),
):
    obj = db.get(Quality, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    changes = payload.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    audit.record(db, current, "UPDATE", "quality", obj.id,
                 f"{obj.sample_number} 품질 수정 · {audit.fmt_changes(changes)}")
    db.commit()
    return obj


@router.delete("/{rid}", status_code=204)
def delete_quality(
    rid: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_editor),
):
    obj = db.get(Quality, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    summary = f"{obj.sample_number}/{obj.lot_number} 품질 삭제"
    db.delete(obj)
    db.commit()
    audit.record(db, current, "DELETE", "quality", rid, summary)
    db.commit()

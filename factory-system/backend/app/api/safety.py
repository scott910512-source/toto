"""안전 데이터 CRUD + 필터 검색 라우터."""
from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_editor
from app.core.database import get_db
from app.models.safety import Safety
from app.schemas.common import Page
from app.schemas.records import SafetyCreate, SafetyOut, SafetyUpdate

router = APIRouter(prefix="/safety", tags=["safety"])


@router.get("", response_model=Page[SafetyOut], dependencies=[Depends(get_current_user)])
def list_safety(
    db: Session = Depends(get_db),
    q: Optional[str] = None,
    work_area: Optional[str] = None,
    manager: Optional[str] = None,
    completed: Optional[bool] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=500),
    sort: str = Query("-worked_at"),
):
    query = db.query(Safety)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Safety.work_area.ilike(like),
                Safety.hazard.ilike(like),
                Safety.improvement.ilike(like),
                Safety.manager.ilike(like),
            )
        )
    if work_area:
        query = query.filter(Safety.work_area == work_area)
    if manager:
        query = query.filter(Safety.manager.ilike(f"%{manager}%"))
    if completed is not None:
        query = query.filter(Safety.completed == completed)
    if date_from:
        query = query.filter(Safety.worked_at >= date_from)
    if date_to:
        query = query.filter(Safety.worked_at <= date_to)

    total = query.count()
    desc = sort.startswith("-")
    field = getattr(Safety, sort.lstrip("-"), Safety.worked_at)
    query = query.order_by(field.desc() if desc else field.asc())
    items = query.offset((page - 1) * size).limit(size).all()
    return Page(items=items, total=total, page=page, size=size, pages=ceil(total / size) or 1)


@router.get("/{rid}", response_model=SafetyOut, dependencies=[Depends(get_current_user)])
def get_safety(rid: int, db: Session = Depends(get_db)):
    obj = db.get(Safety, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    return obj


@router.post("", response_model=SafetyOut, status_code=201, dependencies=[Depends(require_editor)])
def create_safety(payload: SafetyCreate, db: Session = Depends(get_db)):
    obj = Safety(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{rid}", response_model=SafetyOut, dependencies=[Depends(require_editor)])
def update_safety(rid: int, payload: SafetyUpdate, db: Session = Depends(get_db)):
    obj = db.get(Safety, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{rid}", status_code=204, dependencies=[Depends(require_editor)])
def delete_safety(rid: int, db: Session = Depends(get_db)):
    obj = db.get(Safety, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    db.delete(obj)
    db.commit()

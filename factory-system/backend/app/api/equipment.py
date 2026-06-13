"""설비 점검 CRUD + 필터 검색 라우터."""
from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_editor
from app.core.database import get_db
from app.models.equipment import EquipmentCheck, Judgement
from app.schemas.common import Page
from app.schemas.records import EquipmentCreate, EquipmentOut, EquipmentUpdate

router = APIRouter(prefix="/equipment", tags=["equipment"])


@router.get("", response_model=Page[EquipmentOut], dependencies=[Depends(get_current_user)])
def list_equipment(
    db: Session = Depends(get_db),
    q: Optional[str] = None,
    equipment_name: Optional[str] = None,
    inspector: Optional[str] = None,
    judgement: Optional[Judgement] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=500),
    sort: str = Query("-checked_at"),
):
    query = db.query(EquipmentCheck)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                EquipmentCheck.equipment_name.ilike(like),
                EquipmentCheck.inspector.ilike(like),
                EquipmentCheck.check_item.ilike(like),
                EquipmentCheck.action.ilike(like),
            )
        )
    if equipment_name:
        query = query.filter(EquipmentCheck.equipment_name == equipment_name)
    if inspector:
        query = query.filter(EquipmentCheck.inspector.ilike(f"%{inspector}%"))
    if judgement:
        query = query.filter(EquipmentCheck.judgement == judgement)
    if date_from:
        query = query.filter(EquipmentCheck.checked_at >= date_from)
    if date_to:
        query = query.filter(EquipmentCheck.checked_at <= date_to)

    total = query.count()
    desc = sort.startswith("-")
    field = getattr(EquipmentCheck, sort.lstrip("-"), EquipmentCheck.checked_at)
    query = query.order_by(field.desc() if desc else field.asc())
    items = query.offset((page - 1) * size).limit(size).all()
    return Page(items=items, total=total, page=page, size=size, pages=ceil(total / size) or 1)


@router.get("/{rid}", response_model=EquipmentOut, dependencies=[Depends(get_current_user)])
def get_equipment(rid: int, db: Session = Depends(get_db)):
    obj = db.get(EquipmentCheck, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    return obj


@router.post("", response_model=EquipmentOut, status_code=201, dependencies=[Depends(require_editor)])
def create_equipment(payload: EquipmentCreate, db: Session = Depends(get_db)):
    obj = EquipmentCheck(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{rid}", response_model=EquipmentOut, dependencies=[Depends(require_editor)])
def update_equipment(rid: int, payload: EquipmentUpdate, db: Session = Depends(get_db)):
    obj = db.get(EquipmentCheck, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{rid}", status_code=204, dependencies=[Depends(require_editor)])
def delete_equipment(rid: int, db: Session = Depends(get_db)):
    obj = db.get(EquipmentCheck, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    db.delete(obj)
    db.commit()

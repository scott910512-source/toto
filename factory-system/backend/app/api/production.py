"""생산 정보 CRUD + 필터 검색 라우터."""
from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_editor
from app.core.database import get_db
from app.models.production import Production
from app.schemas.common import Page
from app.schemas.records import ProductionCreate, ProductionOut, ProductionUpdate

router = APIRouter(prefix="/production", tags=["production"])


@router.get("", response_model=Page[ProductionOut], dependencies=[Depends(get_current_user)])
def list_production(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="통합 검색어(공정/설비/LOT/작업자/비고)"),
    process_name: Optional[str] = None,
    equipment_name: Optional[str] = None,
    lot_number: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    yield_min: Optional[float] = None,
    yield_max: Optional[float] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=500),
    sort: str = Query("-produced_at", description="정렬 필드, '-' 접두사는 내림차순"),
):
    query = db.query(Production)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Production.process_name.ilike(like),
                Production.equipment_name.ilike(like),
                Production.lot_number.ilike(like),
                Production.operator.ilike(like),
                Production.remark.ilike(like),
            )
        )
    if process_name:
        query = query.filter(Production.process_name == process_name)
    if equipment_name:
        query = query.filter(Production.equipment_name == equipment_name)
    if lot_number:
        query = query.filter(Production.lot_number.ilike(f"%{lot_number}%"))
    if date_from:
        query = query.filter(Production.produced_at >= date_from)
    if date_to:
        query = query.filter(Production.produced_at <= date_to)
    if yield_min is not None:
        query = query.filter(Production.yield_rate >= yield_min)
    if yield_max is not None:
        query = query.filter(Production.yield_rate <= yield_max)

    total = query.count()
    desc = sort.startswith("-")
    field = getattr(Production, sort.lstrip("-"), Production.produced_at)
    query = query.order_by(field.desc() if desc else field.asc())
    items = query.offset((page - 1) * size).limit(size).all()
    return Page(items=items, total=total, page=page, size=size, pages=ceil(total / size) or 1)


@router.get("/{rid}", response_model=ProductionOut, dependencies=[Depends(get_current_user)])
def get_production(rid: int, db: Session = Depends(get_db)):
    obj = db.get(Production, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    return obj


@router.post("", response_model=ProductionOut, status_code=201, dependencies=[Depends(require_editor)])
def create_production(payload: ProductionCreate, db: Session = Depends(get_db)):
    obj = Production(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{rid}", response_model=ProductionOut, dependencies=[Depends(require_editor)])
def update_production(rid: int, payload: ProductionUpdate, db: Session = Depends(get_db)):
    obj = db.get(Production, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{rid}", status_code=204, dependencies=[Depends(require_editor)])
def delete_production(rid: int, db: Session = Depends(get_db)):
    obj = db.get(Production, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    db.delete(obj)
    db.commit()

"""원부재료 CRUD + 필터 검색 + 자재명 탭 목록 라우터."""
from datetime import datetime
from math import ceil
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_editor
from app.core.database import get_db
from app.models.raw_material import RawMaterial
from app.models.user import User
from app.schemas.common import Page
from app.schemas.raw_material import RawMaterialCreate, RawMaterialOut, RawMaterialUpdate
from app.services import audit

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("/material-names", response_model=List[str], dependencies=[Depends(get_current_user)])
def material_names(db: Session = Depends(get_db)):
    """자재별 탭 구성을 위한 고유 자재명 목록."""
    rows = (
        db.query(RawMaterial.material_name)
        .distinct()
        .order_by(RawMaterial.material_name)
        .all()
    )
    return [r[0] for r in rows]


@router.get("", response_model=Page[RawMaterialOut], dependencies=[Depends(get_current_user)])
def list_materials(
    db: Session = Depends(get_db),
    q: Optional[str] = None,
    category: Optional[str] = None,
    material_name: Optional[str] = None,  # 탭 선택 시 정확히 일치
    lot_number: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=500),
    sort: str = Query("-occurred_at"),
):
    query = db.query(RawMaterial)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                RawMaterial.material_name.ilike(like),
                RawMaterial.material_code.ilike(like),
                RawMaterial.lot_number.ilike(like),
                RawMaterial.maker.ilike(like),
                RawMaterial.operator.ilike(like),
                RawMaterial.remark.ilike(like),
            )
        )
    if category:
        query = query.filter(RawMaterial.category == category)
    if material_name:
        query = query.filter(RawMaterial.material_name == material_name)
    if lot_number:
        query = query.filter(RawMaterial.lot_number.ilike(f"%{lot_number}%"))
    if date_from:
        query = query.filter(RawMaterial.occurred_at >= date_from)
    if date_to:
        query = query.filter(RawMaterial.occurred_at <= date_to)

    total = query.count()
    desc = sort.startswith("-")
    field = getattr(RawMaterial, sort.lstrip("-"), RawMaterial.occurred_at)
    query = query.order_by(field.desc() if desc else field.asc())
    items = query.offset((page - 1) * size).limit(size).all()
    return Page(items=items, total=total, page=page, size=size, pages=ceil(total / size) or 1)


@router.get("/{rid}", response_model=RawMaterialOut, dependencies=[Depends(get_current_user)])
def get_material(rid: int, db: Session = Depends(get_db)):
    obj = db.get(RawMaterial, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    return obj


@router.post("", response_model=RawMaterialOut, status_code=201)
def create_material(
    payload: RawMaterialCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_editor),
):
    obj = RawMaterial(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    audit.record(db, current, "CREATE", "material", obj.id,
                 f"{obj.material_name} · {obj.category} {obj.quantity}{obj.unit} (LOT {obj.lot_number})")
    db.commit()
    return obj


@router.patch("/{rid}", response_model=RawMaterialOut)
def update_material(
    rid: int,
    payload: RawMaterialUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_editor),
):
    obj = db.get(RawMaterial, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    changes = payload.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    audit.record(db, current, "UPDATE", "material", obj.id,
                 f"{obj.material_name} 수정 · {audit.fmt_changes(changes)}")
    db.commit()
    return obj


@router.delete("/{rid}", status_code=204)
def delete_material(
    rid: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_editor),
):
    obj = db.get(RawMaterial, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    summary = f"{obj.material_name} · {obj.category} 삭제"
    db.delete(obj)
    db.commit()
    audit.record(db, current, "DELETE", "material", rid, summary)
    db.commit()

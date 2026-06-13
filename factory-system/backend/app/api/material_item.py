"""품목 마스터 CRUD 라우터."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_editor
from app.core.database import get_db
from app.models.material_item import MaterialItem
from app.models.user import User
from app.schemas.material_item import MaterialItemCreate, MaterialItemOut, MaterialItemUpdate
from app.services import audit

router = APIRouter(prefix="/material-items", tags=["material-items"])


@router.get("", response_model=List[MaterialItemOut], dependencies=[Depends(get_current_user)])
def list_items(
    db: Session = Depends(get_db),
    q: Optional[str] = None,
    active_only: bool = Query(False),
):
    query = db.query(MaterialItem)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (MaterialItem.material_name.ilike(like)) | (MaterialItem.material_code.ilike(like))
        )
    if active_only:
        query = query.filter(MaterialItem.active.is_(True))
    return query.order_by(MaterialItem.material_name).all()


@router.post("", response_model=MaterialItemOut, status_code=201)
def create_item(
    payload: MaterialItemCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_editor),
):
    if db.query(MaterialItem).filter(MaterialItem.material_name == payload.material_name).first():
        raise HTTPException(status_code=400, detail="이미 등록된 품목명입니다.")
    obj = MaterialItem(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    audit.record(db, current, "CREATE", "material_item", obj.id,
                 f"품목 등록 {obj.material_name} ({obj.material_code})")
    db.commit()
    return obj


@router.patch("/{rid}", response_model=MaterialItemOut)
def update_item(
    rid: int,
    payload: MaterialItemUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_editor),
):
    obj = db.get(MaterialItem, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="품목을 찾을 수 없습니다.")
    changes = payload.model_dump(exclude_unset=True)
    if "material_name" in changes and changes["material_name"] != obj.material_name:
        if db.query(MaterialItem).filter(MaterialItem.material_name == changes["material_name"]).first():
            raise HTTPException(status_code=400, detail="이미 등록된 품목명입니다.")
    for k, v in changes.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    audit.record(db, current, "UPDATE", "material_item", obj.id,
                 f"품목 수정 {obj.material_name} · {audit.fmt_changes(changes)}")
    db.commit()
    return obj


@router.delete("/{rid}", status_code=204)
def delete_item(
    rid: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_editor),
):
    obj = db.get(MaterialItem, rid)
    if not obj:
        raise HTTPException(status_code=404, detail="품목을 찾을 수 없습니다.")
    name = obj.material_name
    db.delete(obj)
    db.commit()
    audit.record(db, current, "DELETE", "material_item", rid, f"품목 삭제 {name}")
    db.commit()

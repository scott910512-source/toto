"""재고 현황 라우터 (읽기 전용 집계)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.services import inventory

router = APIRouter(prefix="/inventory", tags=["inventory"], dependencies=[Depends(get_current_user)])


@router.get("")
def inventory_summary(
    db: Session = Depends(get_db),
    q: Optional[str] = None,
    low_only: bool = False,
):
    """품목별 현재고 요약."""
    return inventory.item_summary(db, q=q, low_only=low_only)


@router.get("/lots", response_model=List[dict])
def lots(material_name: str, db: Session = Depends(get_db)):
    """특정 품목의 재고 보유 LOT 목록(FIFO 순)."""
    return inventory.lots_with_stock(db, material_name)


@router.get("/fifo-check")
def fifo_check(
    material_name: str,
    lot_number: str,
    quantity: float = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """사용/출고 전 FIFO 위반 및 재고부족 점검."""
    return inventory.fifo_check(db, material_name, lot_number, quantity)

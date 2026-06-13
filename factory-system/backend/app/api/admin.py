"""관리자 유틸 라우터: 가상 데이터 생성 트리거."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.services import seed_data

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.post("/seed")
def seed(lots: int = 1000, db: Session = Depends(get_db)):
    """가상 데이터를 생성한다 (데이터가 비어있을 때만)."""
    return seed_data.generate(db, lots=lots)

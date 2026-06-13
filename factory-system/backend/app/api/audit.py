"""감사 로그(활동 이력) 조회 라우터 - admin 전용, 읽기 전용."""
from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.audit import AuditLog
from app.schemas.audit import AuditOut
from app.schemas.common import Page

router = APIRouter(prefix="/audit", tags=["audit"], dependencies=[Depends(require_admin)])


@router.get("", response_model=Page[AuditOut])
def list_audit(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="사용자/내용 검색"),
    username: Optional[str] = None,
    action: Optional[str] = Query(None, description="CREATE|UPDATE|DELETE"),
    entity: Optional[str] = Query(None, description="production|equipment|quality|safety|user"),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=500),
):
    query = db.query(AuditLog)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(AuditLog.username.ilike(like), AuditLog.summary.ilike(like)))
    if username:
        query = query.filter(AuditLog.username == username)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)

    total = query.count()
    items = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return Page(items=items, total=total, page=page, size=size, pages=ceil(total / size) or 1)

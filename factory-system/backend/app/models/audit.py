"""감사 로그(활동 이력) 모델 - 사용자별 등록/수정/삭제 이력."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditLog(Base):
    """누가(username) 언제(created_at) 무엇을(entity/entity_id)
    어떻게(action) 변경했는지 기록한다. (append-only)"""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    username: Mapped[str] = mapped_column(String(50), index=True)  # 행위자
    role: Mapped[str] = mapped_column(String(20))                  # 행위자 권한
    action: Mapped[str] = mapped_column(String(10), index=True)    # CREATE/UPDATE/DELETE
    entity: Mapped[str] = mapped_column(String(30), index=True)    # production/equipment/...
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 대상 PK
    summary: Mapped[str] = mapped_column(Text, default="")         # 사람이 읽는 변경 요약

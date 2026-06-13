"""안전 데이터 모델."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Safety(Base):
    """안전 데이터 (작업일시, 작업구역, 위험요인, 개선조치, 담당자, 완료여부)."""

    __tablename__ = "safety"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    worked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    work_area: Mapped[str] = mapped_column(String(80), index=True)  # 작업구역
    hazard: Mapped[str] = mapped_column(String(120))  # 위험요인
    improvement: Mapped[str] = mapped_column(Text, default="")  # 개선조치
    manager: Mapped[str] = mapped_column(String(50))  # 담당자
    completed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)  # 완료여부
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

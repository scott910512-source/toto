"""생산 정보 모델."""
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Production(Base):
    """생산 정보 (생산일시, 공정명, 설비명, LOT, 작업자, 생산량, 수율, 비고)."""

    __tablename__ = "production"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    produced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    process_name: Mapped[str] = mapped_column(String(50), index=True)  # 공정명
    equipment_name: Mapped[str] = mapped_column(String(50), index=True)  # 설비명
    lot_number: Mapped[str] = mapped_column(String(30), index=True)  # LOT 번호
    operator: Mapped[str] = mapped_column(String(50))  # 작업자
    quantity: Mapped[int] = mapped_column(Integer)  # 생산량
    yield_rate: Mapped[float] = mapped_column(Float)  # 수율(%)
    remark: Mapped[str] = mapped_column(Text, default="")  # 비고
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

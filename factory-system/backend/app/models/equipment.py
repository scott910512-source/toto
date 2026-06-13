"""설비 점검 모델."""
import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Judgement(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"


class EquipmentCheck(Base):
    """설비 점검 (점검일시, 설비명, 점검자, 점검항목, 측정값, 기준값, 판정, 조치내용)."""

    __tablename__ = "equipment_check"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    equipment_name: Mapped[str] = mapped_column(String(50), index=True)  # 설비명
    inspector: Mapped[str] = mapped_column(String(50))  # 점검자
    check_item: Mapped[str] = mapped_column(String(80))  # 점검항목
    measured_value: Mapped[float] = mapped_column(Float)  # 측정값
    standard_value: Mapped[str] = mapped_column(String(50))  # 기준값 (범위 문자열 허용)
    judgement: Mapped[Judgement] = mapped_column(Enum(Judgement), index=True)  # 판정
    action: Mapped[str] = mapped_column(Text, default="")  # 조치내용
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

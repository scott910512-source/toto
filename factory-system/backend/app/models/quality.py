"""품질 데이터 모델."""
import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class QualityResult(str, enum.Enum):
    OK = "OK"
    NG = "NG"


class Quality(Base):
    """품질 데이터 (샘플번호, LOT, 분석일시, 분석자, 항목명, 측정값, 규격하한/상한, 결과)."""

    __tablename__ = "quality"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sample_number: Mapped[str] = mapped_column(String(30), index=True)  # 샘플번호
    lot_number: Mapped[str] = mapped_column(String(30), index=True)  # LOT 번호
    analyzed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    analyst: Mapped[str] = mapped_column(String(50))  # 분석자
    item_name: Mapped[str] = mapped_column(String(50), index=True)  # 항목명
    measured_value: Mapped[float] = mapped_column(Float)  # 측정값
    spec_lower: Mapped[float] = mapped_column(Float)  # 규격 하한
    spec_upper: Mapped[float] = mapped_column(Float)  # 규격 상한
    result: Mapped[QualityResult] = mapped_column(Enum(QualityResult), index=True)  # 결과
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

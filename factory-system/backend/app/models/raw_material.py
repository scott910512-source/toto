"""원부재료 관리 모델.

구분(category): 입고 / 사용 / 반품 / 폐기 / 사용대기
자재명(material_name) 기준으로 탭을 나눠 관리한다.
"""
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# 허용 구분값 (검증/표시 공용)
MATERIAL_CATEGORIES = ["입고", "사용", "반품", "폐기", "사용대기"]


class RawMaterial(Base):
    __tablename__ = "raw_material"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)  # 일시
    category: Mapped[str] = mapped_column(String(10), index=True)   # 구분(입고/사용/반품/폐기/사용대기)
    material_name: Mapped[str] = mapped_column(String(80), index=True)  # 자재명 (탭 기준)
    material_code: Mapped[str] = mapped_column(String(40), default="")  # 자재코드
    lot_number: Mapped[str] = mapped_column(String(40), default="", index=True)  # LOT/배치번호
    grade: Mapped[str] = mapped_column(String(40), default="")      # 규격/등급
    quantity: Mapped[float] = mapped_column(Float, default=0)       # 수량
    unit: Mapped[str] = mapped_column(String(10), default="")       # 단위
    maker: Mapped[str] = mapped_column(String(60), default="")      # 공급사/Maker
    mfg_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)     # 제조일
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # 유효기한
    process_equipment: Mapped[str] = mapped_column(String(60), default="")  # 사용 공정·설비
    location: Mapped[str] = mapped_column(String(60), default="")   # 보관위치
    operator: Mapped[str] = mapped_column(String(50), default="")   # 작업자
    remark: Mapped[str] = mapped_column(Text, default="")           # 비고
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

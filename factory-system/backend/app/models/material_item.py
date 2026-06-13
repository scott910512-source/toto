"""품목 마스터 모델 - 관리 대상 자재 목록.

입출고(raw_material)는 이 마스터의 품목을 선택해 기록한다.
신규 물질/업체는 여기에 등록하여 관리한다. (LOT 은 입출고에서 매번 달라짐)
"""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MaterialItem(Base):
    __tablename__ = "material_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    material_name: Mapped[str] = mapped_column(String(80), unique=True, index=True)  # 품목명(고유)
    material_code: Mapped[str] = mapped_column(String(40), default="", index=True)   # 품목코드
    unit: Mapped[str] = mapped_column(String(10), default="")        # 단위
    maker: Mapped[str] = mapped_column(String(60), default="")       # 공급사/Maker
    item_category: Mapped[str] = mapped_column(String(30), default="")  # 분류(화학/가스/소모품 등)
    safety_stock: Mapped[float] = mapped_column(Float, default=0)    # 안전재고(미달 시 경고)
    note: Mapped[str] = mapped_column(Text, default="")              # 비고
    active: Mapped[bool] = mapped_column(Boolean, default=True)      # 사용 여부
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

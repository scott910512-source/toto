"""원부재료 스키마. (검증은 Create/Update 에만, Out 은 무검증 직렬화)"""
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator

CategoryT = Literal["입고", "사용", "반품", "폐기", "사용대기"]


def _not_blank(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    v = v.strip()
    if v == "":
        raise ValueError("빈 값은 입력할 수 없습니다.")
    return v


def _qty_non_negative(v: Optional[float]) -> Optional[float]:
    if v is not None and v < 0:
        raise ValueError("수량은 0 이상이어야 합니다.")
    return v


class RawMaterialBase(BaseModel):
    occurred_at: datetime
    category: str
    material_name: str
    material_code: str = ""
    lot_number: str = ""
    grade: str = ""
    quantity: float = 0
    unit: str = ""
    maker: str = ""
    mfg_date: Optional[date] = None
    expiry_date: Optional[date] = None
    process_equipment: str = ""
    location: str = ""
    operator: str = ""
    remark: str = ""
    confirmed_by: str = ""  # FIFO 경고 무시 승인자


class RawMaterialCreate(RawMaterialBase):
    category: CategoryT
    material_name: str

    _strip = field_validator("material_name")(_not_blank)
    _qty = field_validator("quantity")(_qty_non_negative)


class RawMaterialUpdate(BaseModel):
    occurred_at: Optional[datetime] = None
    category: Optional[CategoryT] = None
    material_name: Optional[str] = None
    material_code: Optional[str] = None
    lot_number: Optional[str] = None
    grade: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    maker: Optional[str] = None
    mfg_date: Optional[date] = None
    expiry_date: Optional[date] = None
    process_equipment: Optional[str] = None
    location: Optional[str] = None
    operator: Optional[str] = None
    remark: Optional[str] = None
    confirmed_by: Optional[str] = None

    _strip = field_validator("material_name")(_not_blank)
    _qty = field_validator("quantity")(_qty_non_negative)


class RawMaterialOut(RawMaterialBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

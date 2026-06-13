"""품목 마스터 스키마."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


def _not_blank(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    v = v.strip()
    if v == "":
        raise ValueError("빈 값은 입력할 수 없습니다.")
    return v


class MaterialItemBase(BaseModel):
    material_name: str
    material_code: str = ""
    unit: str = ""
    maker: str = ""
    item_category: str = ""
    safety_stock: float = 0
    note: str = ""
    active: bool = True


class MaterialItemCreate(MaterialItemBase):
    _strip = field_validator("material_name")(_not_blank)


class MaterialItemUpdate(BaseModel):
    material_name: Optional[str] = None
    material_code: Optional[str] = None
    unit: Optional[str] = None
    maker: Optional[str] = None
    item_category: Optional[str] = None
    safety_stock: Optional[float] = None
    note: Optional[str] = None
    active: Optional[bool] = None

    _strip = field_validator("material_name")(_not_blank)


class MaterialItemOut(MaterialItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

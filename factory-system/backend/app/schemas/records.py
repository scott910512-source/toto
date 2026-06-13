"""4대 데이터 카테고리(생산/설비/품질/안전) 스키마.

서버측 입력 검증 포함:
- 수량 음수 금지, 수율 0~100 범위
- 핵심 식별자(LOT/공정/설비/샘플 등) 빈 값 금지
- 품질 규격 하한 ≤ 상한 보장
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.equipment import Judgement
from app.models.quality import QualityResult


def _not_blank(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    v = v.strip()
    if v == "":
        raise ValueError("빈 값은 입력할 수 없습니다.")
    return v


# ---------- 생산 ----------
class ProductionBase(BaseModel):
    produced_at: datetime
    process_name: str = Field(min_length=1)
    equipment_name: str = Field(min_length=1)
    lot_number: str = Field(min_length=1)
    operator: str = Field(min_length=1)
    quantity: int = Field(ge=0, description="생산량(0 이상)")
    yield_rate: float = Field(ge=0, le=100, description="수율(0~100%)")
    remark: str = ""

    _strip = field_validator("process_name", "equipment_name", "lot_number", "operator")(_not_blank)


class ProductionCreate(ProductionBase):
    pass


class ProductionUpdate(BaseModel):
    produced_at: Optional[datetime] = None
    process_name: Optional[str] = None
    equipment_name: Optional[str] = None
    lot_number: Optional[str] = None
    operator: Optional[str] = None
    quantity: Optional[int] = Field(default=None, ge=0)
    yield_rate: Optional[float] = Field(default=None, ge=0, le=100)
    remark: Optional[str] = None

    _strip = field_validator("process_name", "equipment_name", "lot_number", "operator")(_not_blank)


class ProductionOut(ProductionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- 설비 점검 ----------
class EquipmentBase(BaseModel):
    checked_at: datetime
    equipment_name: str = Field(min_length=1)
    inspector: str = Field(min_length=1)
    check_item: str = Field(min_length=1)
    measured_value: float
    standard_value: str
    judgement: Judgement
    action: str = ""

    _strip = field_validator("equipment_name", "inspector", "check_item")(_not_blank)


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    checked_at: Optional[datetime] = None
    equipment_name: Optional[str] = None
    inspector: Optional[str] = None
    check_item: Optional[str] = None
    measured_value: Optional[float] = None
    standard_value: Optional[str] = None
    judgement: Optional[Judgement] = None
    action: Optional[str] = None

    _strip = field_validator("equipment_name", "inspector", "check_item")(_not_blank)


class EquipmentOut(EquipmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- 품질 ----------
class QualityBase(BaseModel):
    sample_number: str = Field(min_length=1)
    lot_number: str = Field(min_length=1)
    analyzed_at: datetime
    analyst: str = Field(min_length=1)
    item_name: str = Field(min_length=1)
    measured_value: float
    spec_lower: float
    spec_upper: float
    result: QualityResult

    _strip = field_validator("sample_number", "lot_number", "analyst", "item_name")(_not_blank)

    @model_validator(mode="after")
    def _check_spec(self):
        if self.spec_lower > self.spec_upper:
            raise ValueError("규격 하한은 상한보다 클 수 없습니다.")
        return self


class QualityCreate(QualityBase):
    pass


class QualityUpdate(BaseModel):
    sample_number: Optional[str] = None
    lot_number: Optional[str] = None
    analyzed_at: Optional[datetime] = None
    analyst: Optional[str] = None
    item_name: Optional[str] = None
    measured_value: Optional[float] = None
    spec_lower: Optional[float] = None
    spec_upper: Optional[float] = None
    result: Optional[QualityResult] = None

    _strip = field_validator("sample_number", "lot_number", "analyst", "item_name")(_not_blank)

    @model_validator(mode="after")
    def _check_spec(self):
        if self.spec_lower is not None and self.spec_upper is not None and self.spec_lower > self.spec_upper:
            raise ValueError("규격 하한은 상한보다 클 수 없습니다.")
        return self


class QualityOut(QualityBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- 안전 ----------
class SafetyBase(BaseModel):
    worked_at: datetime
    work_area: str = Field(min_length=1)
    hazard: str = Field(min_length=1)
    improvement: str = ""
    manager: str = Field(min_length=1)
    completed: bool = False

    _strip = field_validator("work_area", "hazard", "manager")(_not_blank)


class SafetyCreate(SafetyBase):
    pass


class SafetyUpdate(BaseModel):
    worked_at: Optional[datetime] = None
    work_area: Optional[str] = None
    hazard: Optional[str] = None
    improvement: Optional[str] = None
    manager: Optional[str] = None
    completed: Optional[bool] = None

    _strip = field_validator("work_area", "hazard", "manager")(_not_blank)


class SafetyOut(SafetyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

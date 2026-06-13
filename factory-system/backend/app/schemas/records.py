"""4대 데이터 카테고리(생산/설비/품질/안전) 스키마.

설계 원칙:
- *Base / *Out : 순수 데이터 형태 (검증 제약 없음). 저장된 데이터를 그대로 직렬화하므로,
  과거/백업복원 데이터가 정책을 위반하더라도 읽기(응답)는 실패하지 않아야 한다.
- *Create / *Update : 입력 검증(수량 음수 금지, 수율 0~100, 빈 식별자 금지,
  규격 하한 ≤ 상한)을 여기에만 둔다.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models.equipment import Judgement
from app.models.quality import QualityResult


# ===== 공용 검증 헬퍼 =====
def _not_blank(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    v = v.strip()
    if v == "":
        raise ValueError("빈 값은 입력할 수 없습니다.")
    return v


def _qty_non_negative(v: Optional[int]) -> Optional[int]:
    if v is not None and v < 0:
        raise ValueError("생산량은 0 이상이어야 합니다.")
    return v


def _yield_range(v: Optional[float]) -> Optional[float]:
    if v is not None and not (0 <= v <= 100):
        raise ValueError("수율은 0~100 범위여야 합니다.")
    return v


# ===================== 생산 =====================
class ProductionBase(BaseModel):
    produced_at: datetime
    process_name: str
    equipment_name: str
    lot_number: str
    operator: str
    quantity: int
    yield_rate: float
    remark: str = ""


class ProductionCreate(ProductionBase):
    _strip = field_validator("process_name", "equipment_name", "lot_number", "operator")(_not_blank)
    _qty = field_validator("quantity")(_qty_non_negative)
    _yld = field_validator("yield_rate")(_yield_range)


class ProductionUpdate(BaseModel):
    produced_at: Optional[datetime] = None
    process_name: Optional[str] = None
    equipment_name: Optional[str] = None
    lot_number: Optional[str] = None
    operator: Optional[str] = None
    quantity: Optional[int] = None
    yield_rate: Optional[float] = None
    remark: Optional[str] = None

    _strip = field_validator("process_name", "equipment_name", "lot_number", "operator")(_not_blank)
    _qty = field_validator("quantity")(_qty_non_negative)
    _yld = field_validator("yield_rate")(_yield_range)


class ProductionOut(ProductionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ===================== 설비 점검 =====================
class EquipmentBase(BaseModel):
    checked_at: datetime
    equipment_name: str
    inspector: str
    check_item: str
    measured_value: float
    standard_value: str
    judgement: Judgement
    action: str = ""


class EquipmentCreate(EquipmentBase):
    _strip = field_validator("equipment_name", "inspector", "check_item")(_not_blank)


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


# ===================== 품질 =====================
class QualityBase(BaseModel):
    sample_number: str
    lot_number: str
    analyzed_at: datetime
    analyst: str
    item_name: str
    measured_value: float
    spec_lower: float
    spec_upper: float
    result: QualityResult


class QualityCreate(QualityBase):
    _strip = field_validator("sample_number", "lot_number", "analyst", "item_name")(_not_blank)

    @model_validator(mode="after")
    def _check_spec(self):
        if self.spec_lower > self.spec_upper:
            raise ValueError("규격 하한은 상한보다 클 수 없습니다.")
        return self


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


# ===================== 안전 =====================
class SafetyBase(BaseModel):
    worked_at: datetime
    work_area: str
    hazard: str
    improvement: str = ""
    manager: str
    completed: bool = False


class SafetyCreate(SafetyBase):
    _strip = field_validator("work_area", "hazard", "manager")(_not_blank)


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

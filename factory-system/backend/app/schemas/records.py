"""4대 데이터 카테고리(생산/설비/품질/안전) 스키마."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.equipment import Judgement
from app.models.quality import QualityResult


# ---------- 생산 ----------
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
    pass


class ProductionUpdate(BaseModel):
    produced_at: Optional[datetime] = None
    process_name: Optional[str] = None
    equipment_name: Optional[str] = None
    lot_number: Optional[str] = None
    operator: Optional[str] = None
    quantity: Optional[int] = None
    yield_rate: Optional[float] = None
    remark: Optional[str] = None


class ProductionOut(ProductionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- 설비 점검 ----------
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


class EquipmentOut(EquipmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- 품질 ----------
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


class QualityOut(QualityBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- 안전 ----------
class SafetyBase(BaseModel):
    worked_at: datetime
    work_area: str
    hazard: str
    improvement: str = ""
    manager: str
    completed: bool = False


class SafetyCreate(SafetyBase):
    pass


class SafetyUpdate(BaseModel):
    worked_at: Optional[datetime] = None
    work_area: Optional[str] = None
    hazard: Optional[str] = None
    improvement: Optional[str] = None
    manager: Optional[str] = None
    completed: Optional[bool] = None


class SafetyOut(SafetyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

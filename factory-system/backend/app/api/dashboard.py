"""대시보드 라우터: KPI 및 그래프용 집계 데이터."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.equipment import EquipmentCheck, Judgement
from app.models.production import Production
from app.models.quality import Quality, QualityResult
from app.models.safety import Safety

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("/kpi")
def kpi(db: Session = Depends(get_db)):
    """대시보드 상단 KPI 카드 데이터."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    daily_qty = (
        db.query(func.coalesce(func.sum(Production.quantity), 0))
        .filter(Production.produced_at >= today_start)
        .scalar()
    )
    monthly_qty = (
        db.query(func.coalesce(func.sum(Production.quantity), 0))
        .filter(Production.produced_at >= month_start)
        .scalar()
    )
    avg_yield = (
        db.query(func.coalesce(func.avg(Production.yield_rate), 0))
        .filter(Production.produced_at >= month_start)
        .scalar()
    )
    equip_fail = (
        db.query(func.count(EquipmentCheck.id))
        .filter(EquipmentCheck.judgement == Judgement.FAIL)
        .scalar()
    )
    quality_ng = (
        db.query(func.count(Quality.id))
        .filter(Quality.result == QualityResult.NG)
        .scalar()
    )
    safety_open = (
        db.query(func.count(Safety.id)).filter(Safety.completed.is_(False)).scalar()
    )

    return {
        "daily_production": int(daily_qty),
        "monthly_production": int(monthly_qty),
        "avg_yield": round(float(avg_yield), 2),
        "equipment_fail_count": int(equip_fail),
        "quality_ng_count": int(quality_ng),
        "safety_open_count": int(safety_open),
    }


@router.get("/production-trend")
def production_trend(days: int = 30, db: Session = Depends(get_db)):
    """최근 N일 일별 생산량/평균수율 추이 (그래프용)."""
    start = datetime.now(timezone.utc) - timedelta(days=days)
    day = func.date(Production.produced_at)
    rows = (
        db.query(
            day.label("date"),
            func.sum(Production.quantity).label("quantity"),
            func.avg(Production.yield_rate).label("yield_rate"),
        )
        .filter(Production.produced_at >= start)
        .group_by(day)
        .order_by(day)
        .all()
    )
    return [
        {
            "date": str(r.date),
            "quantity": int(r.quantity or 0),
            "yield_rate": round(float(r.yield_rate or 0), 2),
        }
        for r in rows
    ]


@router.get("/equipment-fails")
def equipment_fails(db: Session = Depends(get_db)):
    """설비별 FAIL(이상) 발생 건수 (그래프용)."""
    rows = (
        db.query(
            EquipmentCheck.equipment_name.label("equipment"),
            func.count(EquipmentCheck.id).label("fails"),
        )
        .filter(EquipmentCheck.judgement == Judgement.FAIL)
        .group_by(EquipmentCheck.equipment_name)
        .order_by(func.count(EquipmentCheck.id).desc())
        .all()
    )
    return [{"equipment": r.equipment, "fails": int(r.fails)} for r in rows]


@router.get("/quality-summary")
def quality_summary(db: Session = Depends(get_db)):
    """품질 항목별 OK/NG 건수 (그래프용)."""
    rows = (
        db.query(
            Quality.item_name.label("item"),
            Quality.result.label("result"),
            func.count(Quality.id).label("cnt"),
        )
        .group_by(Quality.item_name, Quality.result)
        .all()
    )
    summary: dict[str, dict[str, int]] = {}
    for r in rows:
        d = summary.setdefault(r.item, {"item": r.item, "OK": 0, "NG": 0})
        d[r.result.value] = int(r.cnt)
    return list(summary.values())


@router.get("/process-output")
def process_output(db: Session = Depends(get_db)):
    """공정별 누적 생산량 (그래프용)."""
    rows = (
        db.query(
            Production.process_name.label("process"),
            func.sum(Production.quantity).label("quantity"),
        )
        .group_by(Production.process_name)
        .order_by(func.sum(Production.quantity).desc())
        .all()
    )
    return [{"process": r.process, "quantity": int(r.quantity or 0)} for r in rows]

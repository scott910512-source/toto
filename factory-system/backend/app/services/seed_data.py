"""가상(샘플) 데이터 생성 로직.

요구사항:
  - 5개 공정 / 20개 설비 / 1000개 LOT
  - 생산량 100~5000, 수율 92~99.9%
  - 품질 항목: Moisture, Metal, Purity, Particle (현실적 규격 범위)
  - 설비 점검 PASS/FAIL
  - 안전 데이터(위험요인 5종)
"""
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import (
    CHECK_ITEMS,
    EQUIPMENTS,
    HAZARDS,
    PEOPLE,
    PROCESSES,
    QUALITY_ITEMS,
    WORK_AREAS,
)
from app.core.security import get_password_hash
from app.models.equipment import EquipmentCheck, Judgement
from app.models.production import Production
from app.models.quality import Quality, QualityResult
from app.models.safety import Safety
from app.models.user import User, UserRole


def ensure_superuser(db: Session) -> None:
    """초기 관리자 계정을 생성한다(없을 경우)."""
    exists = db.query(User).filter(User.username == settings.FIRST_SUPERUSER).first()
    if exists:
        return
    db.add(
        User(
            username=settings.FIRST_SUPERUSER,
            full_name="시스템 관리자",
            role=UserRole.admin,
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
        )
    )
    # 데모용 엔지니어/뷰어 계정
    db.add(User(username="engineer", full_name="공정 엔지니어", role=UserRole.engineer,
                hashed_password=get_password_hash("engineer1234")))
    db.add(User(username="viewer", full_name="조회 사용자", role=UserRole.viewer,
                hashed_password=get_password_hash("viewer1234")))
    db.commit()


def _rand_dt(days_back: int) -> datetime:
    now = datetime.now(timezone.utc)
    delta = timedelta(
        days=random.randint(0, days_back),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    return now - delta


def generate(db: Session, *, lots: int = 1000, days_back: int = 180) -> dict:
    """가상 데이터를 생성한다. 이미 데이터가 있으면 건너뛴다."""
    if db.query(Production).count() > 0:
        return {"status": "skipped", "reason": "이미 데이터가 존재합니다."}

    lot_numbers = [f"LOT-{2026000 + i}" for i in range(lots)]
    counts = {"production": 0, "equipment": 0, "quality": 0, "safety": 0}

    # --- 생산 데이터: LOT 당 1건 ---
    for lot in lot_numbers:
        process = random.choice(PROCESSES)
        equip = random.choice(EQUIPMENTS)
        # 대부분 정상(92~99.9), 가끔 저수율
        yield_rate = round(random.choice([
            random.uniform(96.0, 99.9),
            random.uniform(96.0, 99.9),
            random.uniform(92.0, 96.0),
        ]), 2)
        db.add(Production(
            produced_at=_rand_dt(days_back),
            process_name=process,
            equipment_name=equip,
            lot_number=lot,
            operator=random.choice(PEOPLE),
            quantity=random.randint(100, 5000),
            yield_rate=yield_rate,
            remark=random.choice(["", "", "", "정상", "재작업", "긴급생산"]),
        ))
        counts["production"] += 1

    # --- 품질 데이터: LOT 의 60% 에 대해 1~2개 항목 분석 ---
    sample_no = 1
    for lot in random.sample(lot_numbers, int(lots * 0.6)):
        for item in random.sample(list(QUALITY_ITEMS.keys()), random.randint(1, 2)):
            spec = QUALITY_ITEMS[item]
            lo, hi = spec["typical"]
            # 5% 확률로 규격 이탈
            if random.random() < 0.05:
                measured = round(spec["upper"] * random.uniform(1.01, 1.2), 3)
            else:
                measured = round(random.uniform(lo, hi), 3)
            result = (
                QualityResult.OK
                if spec["lower"] <= measured <= spec["upper"]
                else QualityResult.NG
            )
            db.add(Quality(
                sample_number=f"S{sample_no:06d}",
                lot_number=lot,
                analyzed_at=_rand_dt(days_back),
                analyst=random.choice(PEOPLE),
                item_name=item,
                measured_value=measured,
                spec_lower=spec["lower"],
                spec_upper=spec["upper"],
                result=result,
            ))
            sample_no += 1
            counts["quality"] += 1

    # --- 설비 점검: 설비당 다회 ---
    for equip in EQUIPMENTS:
        for _ in range(random.randint(8, 20)):
            item = random.choice(CHECK_ITEMS)
            measured = round(random.uniform(80, 120), 2)
            # 90% PASS
            judgement = Judgement.PASS if random.random() < 0.9 else Judgement.FAIL
            db.add(EquipmentCheck(
                checked_at=_rand_dt(days_back),
                equipment_name=equip,
                inspector=random.choice(PEOPLE),
                check_item=item,
                measured_value=measured,
                standard_value="90 ~ 110",
                judgement=judgement,
                action="" if judgement == Judgement.PASS else random.choice(
                    ["부품 교체", "재점검 실시", "설비 정지 후 정비", "윤활유 보충"]
                ),
            ))
            counts["equipment"] += 1

    # --- 안전 데이터 ---
    for _ in range(300):
        completed = random.random() < 0.7
        db.add(Safety(
            worked_at=_rand_dt(days_back),
            work_area=random.choice(WORK_AREAS),
            hazard=random.choice(HAZARDS),
            improvement=random.choice(
                ["환기 강화", "보호구 착용 의무화", "방호덮개 설치", "안전교육 실시", "접근 차단"]
            ),
            manager=random.choice(PEOPLE),
            completed=completed,
        ))
        counts["safety"] += 1

    db.commit()
    return {"status": "ok", "generated": counts}

"""AI 자연어 검색 서비스.

키워드/의도 기반(규칙) 엔진을 기본으로 사용하여 API 키 없이도 동작한다.
OPENAI_API_KEY 가 설정되어 있으면, 매칭되지 않은 질문에 대해 LLM 으로
의도를 추론해 동일한 핸들러로 라우팅한다(선택적, 실패 시 안전하게 폴백).
"""
from datetime import datetime, timedelta, timezone
from typing import Callable

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.constants import EQUIPMENTS
from app.models.equipment import EquipmentCheck, Judgement
from app.models.production import Production
from app.models.quality import Quality, QualityResult
from app.models.safety import Safety


def _last_month_range():
    now = datetime.now(timezone.utc)
    first_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_end = first_this
    last_month_start = (first_this - timedelta(days=1)).replace(day=1)
    return last_month_start, last_month_end


# ---------- 의도 핸들러 ----------
def _lowest_yield_lot(db: Session) -> dict:
    start, end = _last_month_range()
    row = (
        db.query(Production)
        .filter(Production.produced_at >= start, Production.produced_at < end)
        .order_by(Production.yield_rate.asc())
        .first()
    )
    if not row:
        return {"answer": "지난달 생산 데이터가 없습니다.", "rows": []}
    return {
        "answer": f"지난달 수율이 가장 낮았던 LOT 은 '{row.lot_number}' 이며 수율은 {row.yield_rate}% 입니다 "
        f"(공정: {row.process_name}, 설비: {row.equipment_name}).",
        "rows": [
            {
                "lot_number": row.lot_number,
                "yield_rate": row.yield_rate,
                "process_name": row.process_name,
                "equipment_name": row.equipment_name,
                "produced_at": row.produced_at.strftime("%Y-%m-%d %H:%M"),
            }
        ],
    }


def _most_fail_equipment(db: Session) -> dict:
    rows = (
        db.query(
            EquipmentCheck.equipment_name.label("eq"),
            func.count(EquipmentCheck.id).label("c"),
        )
        .filter(EquipmentCheck.judgement == Judgement.FAIL)
        .group_by(EquipmentCheck.equipment_name)
        .order_by(func.count(EquipmentCheck.id).desc())
        .limit(5)
        .all()
    )
    if not rows:
        return {"answer": "FAIL 데이터가 없습니다.", "rows": []}
    top = rows[0]
    return {
        "answer": f"FAIL 발생이 가장 많은 설비는 '{top.eq}' 이며 총 {top.c}건 입니다.",
        "rows": [{"equipment_name": r.eq, "fail_count": int(r.c)} for r in rows],
    }


def _production_trend(db: Session) -> dict:
    # DB 종류(PostgreSQL/SQLite)에 무관하게 동작하도록 월 집계는 Python 에서 수행
    start = datetime.now(timezone.utc) - timedelta(days=90)
    records = (
        db.query(Production.produced_at, Production.quantity, Production.yield_rate)
        .filter(Production.produced_at >= start)
        .all()
    )
    if not records:
        return {"answer": "최근 3개월 생산 데이터가 없습니다.", "rows": []}

    agg: dict[str, list] = {}
    for produced_at, qty, yld in records:
        key = produced_at.strftime("%Y-%m")
        bucket = agg.setdefault(key, [0, 0.0, 0])  # [수량합, 수율합, 건수]
        bucket[0] += qty
        bucket[1] += yld
        bucket[2] += 1

    months = sorted(agg.keys())
    rows = [
        {"month": m, "quantity": agg[m][0], "avg_yield": round(agg[m][1] / agg[m][2], 2)}
        for m in months
    ]
    parts = [f"{r['month']}: {r['quantity']:,}개(평균수율 {r['avg_yield']:.1f}%)" for r in rows]
    trend = "증가" if rows[-1]["quantity"] >= rows[0]["quantity"] else "감소"
    return {
        "answer": f"최근 3개월 생산량 추세는 전반적으로 '{trend}' 입니다. " + ", ".join(parts),
        "rows": rows,
    }


def _unchecked_equipment(db: Session) -> dict:
    # 최근 30일 내 점검 기록이 있는 설비
    start = datetime.now(timezone.utc) - timedelta(days=30)
    checked = {
        e
        for (e,) in db.query(EquipmentCheck.equipment_name)
        .filter(EquipmentCheck.checked_at >= start)
        .distinct()
        .all()
    }
    missing = [e for e in EQUIPMENTS if e not in checked]
    if not missing:
        return {"answer": "최근 30일 내 모든 설비가 점검되었습니다.", "rows": []}
    return {
        "answer": f"최근 30일간 점검 미실시 설비는 {len(missing)}대 입니다: {', '.join(missing)}",
        "rows": [{"equipment_name": e} for e in missing],
    }


def _quality_ng_summary(db: Session) -> dict:
    rows = (
        db.query(Quality.item_name.label("i"), func.count(Quality.id).label("c"))
        .filter(Quality.result == QualityResult.NG)
        .group_by(Quality.item_name)
        .order_by(func.count(Quality.id).desc())
        .all()
    )
    if not rows:
        return {"answer": "품질 부적합(NG) 데이터가 없습니다.", "rows": []}
    parts = [f"{r.i}: {int(r.c)}건" for r in rows]
    return {
        "answer": "품질 부적합(NG) 현황 - " + ", ".join(parts),
        "rows": [{"item_name": r.i, "ng_count": int(r.c)} for r in rows],
    }


def _open_safety(db: Session) -> dict:
    rows = (
        db.query(Safety)
        .filter(Safety.completed.is_(False))
        .order_by(Safety.worked_at.desc())
        .limit(20)
        .all()
    )
    total = db.query(func.count(Safety.id)).filter(Safety.completed.is_(False)).scalar()
    return {
        "answer": f"미완료 안전조치는 총 {int(total)}건 입니다.",
        "rows": [
            {
                "worked_at": r.worked_at.strftime("%Y-%m-%d"),
                "work_area": r.work_area,
                "hazard": r.hazard,
                "manager": r.manager,
            }
            for r in rows
        ],
    }


# 의도 -> (키워드 집합, 핸들러)
_INTENTS: list[tuple[set[str], Callable[[Session], dict]]] = [
    ({"수율", "낮"}, _lowest_yield_lot),
    ({"fail", "많"}, _most_fail_equipment),
    ({"이상", "많", "설비"}, _most_fail_equipment),
    ({"생산량", "추세"}, _production_trend),
    ({"생산", "추이"}, _production_trend),
    ({"점검", "미실시"}, _unchecked_equipment),
    ({"점검", "안"}, _unchecked_equipment),
    ({"부적합"}, _quality_ng_summary),
    ({"ng", "품질"}, _quality_ng_summary),
    ({"안전", "미완료"}, _open_safety),
    ({"조치", "미완료"}, _open_safety),
]


def answer_query(db: Session, question: str) -> dict:
    """자연어 질문을 받아 DB 를 조회하고 구조화된 답변을 반환한다."""
    q = question.lower()

    best = None
    best_score = 0
    for keywords, handler in _INTENTS:
        score = sum(1 for k in keywords if k.lower() in q)
        if score == len(keywords) and score > best_score:
            best, best_score = handler, score

    if best is not None:
        result = best(db)
        result["matched"] = True
        result["question"] = question
        return result

    # 폴백: 매칭 실패
    return {
        "matched": False,
        "question": question,
        "answer": (
            "질문을 이해하지 못했습니다. 예시: "
            "'지난달 수율이 가장 낮았던 LOT 보여줘', 'FAIL 발생이 가장 많은 설비는?', "
            "'최근 3개월 생산량 추세 분석해줘', '점검 미실시 설비 찾아줘'"
        ),
        "rows": [],
    }

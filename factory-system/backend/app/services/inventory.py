"""재고 계산 엔진.

재고 = Σ( 부호(구분) × 수량 )  (품목 × LOT 단위)
부호: 입고(+), 사용·폐기·반품(−), 사용대기(0)
FIFO: LOT 의 최초 입고일시 기준. 더 오래된 LOT 에 재고가 남아있는데
      신규 LOT 를 사용하려 하면 FIFO 위반으로 경고한다.
"""
from collections import defaultdict
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.material_item import MaterialItem
from app.models.raw_material import CATEGORY_SIGN, RawMaterial


def _lot_state(db: Session, material_name: str):
    """해당 품목의 LOT 별 (잔량, 최초입고일시) 를 계산한다."""
    txns = (
        db.query(RawMaterial)
        .filter(RawMaterial.material_name == material_name)
        .all()
    )
    balance: dict[str, float] = defaultdict(float)
    first_in: dict[str, Optional[datetime]] = {}
    for tx in txns:
        sign = CATEGORY_SIGN.get(tx.category, 0)
        balance[tx.lot_number] += sign * tx.quantity
        if tx.category == "입고":
            cur = first_in.get(tx.lot_number)
            if cur is None or (tx.occurred_at and tx.occurred_at < cur):
                first_in[tx.lot_number] = tx.occurred_at
    return balance, first_in


def lots_with_stock(db: Session, material_name: str) -> list[dict]:
    """재고가 남아있는 LOT 목록을 FIFO(최초 입고일) 순으로 반환."""
    balance, first_in = _lot_state(db, material_name)
    rows = []
    for lot, bal in balance.items():
        if round(bal, 4) > 0:
            rows.append({
                "lot_number": lot,
                "balance": round(bal, 3),
                "first_in": first_in.get(lot).isoformat() if first_in.get(lot) else None,
            })
    # 최초 입고일 오름차순(오래된 것 먼저) = FIFO
    rows.sort(key=lambda r: (r["first_in"] or "9999"))
    return rows


def fifo_check(db: Session, material_name: str, lot_number: str, quantity: float) -> dict:
    """사용/출고 시 FIFO 위반 및 재고부족 여부를 점검한다."""
    stock_rows = lots_with_stock(db, material_name)
    selected = next((r for r in stock_rows if r["lot_number"] == lot_number), None)
    available = selected["balance"] if selected else 0.0

    # 선택 LOT 보다 먼저 입고됐는데 재고가 남은 LOT (FIFO 위반 대상)
    older_with_stock = []
    if selected:
        sel_key = selected["first_in"] or "9999"
        for r in stock_rows:
            if r["lot_number"] == lot_number:
                continue
            if (r["first_in"] or "9999") < sel_key:
                older_with_stock.append(r)

    return {
        "material_name": material_name,
        "lot_number": lot_number,
        "available": round(available, 3),
        "shortage": quantity > available,         # 재고 부족
        "fifo_violation": len(older_with_stock) > 0,  # 더 오래된 LOT 재고 존재
        "older_lots": older_with_stock,
    }


def item_summary(db: Session, q: Optional[str] = None, low_only: bool = False) -> list[dict]:
    """품목별 현재고 요약 (마스터 + 입출고에만 존재하는 품목 모두 포함)."""
    items = {i.material_name: i for i in db.query(MaterialItem).all()}
    names = set(items.keys())
    # 입출고에만 있는 품목명도 포함
    for (n,) in db.query(RawMaterial.material_name).distinct().all():
        names.add(n)

    out = []
    for name in names:
        if q and q.lower() not in name.lower():
            continue
        balance, _ = _lot_state(db, name)
        total = round(sum(balance.values()), 3)
        lot_count = sum(1 for b in balance.values() if round(b, 4) > 0)
        item = items.get(name)
        safety = item.safety_stock if item else 0
        low = safety > 0 and total < safety
        if low_only and not low:
            continue
        out.append({
            "material_name": name,
            "material_code": item.material_code if item else "",
            "unit": item.unit if item else "",
            "maker": item.maker if item else "",
            "total_stock": total,
            "safety_stock": safety,
            "lot_count": lot_count,
            "low": low,
            "in_master": item is not None,
        })
    out.sort(key=lambda r: r["material_name"])
    return out

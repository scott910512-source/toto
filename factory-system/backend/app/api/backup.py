"""데이터 백업 라우터 (admin 전용): 전체 데이터를 JSON 으로 백업/복원."""
import json
from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.equipment import EquipmentCheck
from app.models.production import Production
from app.models.quality import Quality
from app.models.safety import Safety

router = APIRouter(prefix="/backup", tags=["backup"], dependencies=[Depends(require_admin)])

_TABLES = {
    "production": Production,
    "equipment": EquipmentCheck,
    "quality": Quality,
    "safety": Safety,
}


def _serialize(obj) -> dict:
    out = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if hasattr(val, "value"):
            val = val.value
        if isinstance(val, datetime):
            val = val.isoformat()
        out[col.name] = val
    return out


@router.get("/export")
def backup_export(db: Session = Depends(get_db)):
    """모든 데이터 테이블을 하나의 JSON 파일로 백업한다."""
    dump = {
        name: [_serialize(o) for o in db.query(model).all()]
        for name, model in _TABLES.items()
    }
    payload = {
        "version": 1,
        "exported_at": datetime.utcnow().isoformat(),
        "data": dump,
    }
    content = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    filename = f"factory_backup_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"}
    return StreamingResponse(iter([content]), media_type="application/json", headers=headers)


@router.post("/import")
async def backup_import(
    file: UploadFile = File(...),
    replace: bool = False,
    db: Session = Depends(get_db),
):
    """백업 JSON 을 복원한다. replace=true 면 기존 데이터를 모두 삭제 후 적재한다."""
    raw = await file.read()
    payload = json.loads(raw.decode("utf-8"))
    data = payload.get("data", {})
    counts = {}
    for name, model in _TABLES.items():
        if replace:
            db.query(model).delete()
        rows = data.get(name, [])
        for row in rows:
            row.pop("id", None)  # 새 PK 부여
            db.add(model(**row))
        counts[name] = len(rows)
    db.commit()
    return {"status": "ok", "imported": counts, "replaced": replace}

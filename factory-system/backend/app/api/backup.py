"""데이터 백업 라우터 (admin 전용): 전체 데이터를 JSON 으로 백업/복원."""
import json
from datetime import date, datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import Date, DateTime
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.equipment import EquipmentCheck
from app.models.material_item import MaterialItem
from app.models.production import Production
from app.models.quality import Quality
from app.models.raw_material import RawMaterial
from app.models.safety import Safety

router = APIRouter(prefix="/backup", tags=["backup"], dependencies=[Depends(require_admin)])

_TABLES = {
    "material_item": MaterialItem,
    "production": Production,
    "material": RawMaterial,
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
        if isinstance(val, (datetime, date)):  # datetime 또는 date 모두 ISO 문자열로
            val = val.isoformat()
        out[col.name] = val
    return out


def _deserialize(model, row: dict) -> dict:
    """백업 JSON 한 행을 모델 컬럼 타입에 맞게 역직렬화한다.

    DateTime 컬럼은 datetime 으로, Date 컬럼은 date 로 변환한다.
    (Enum 컬럼은 SQLAlchemy 가 문자열 값을 그대로 받아들이므로 변환 불필요)
    """
    out = dict(row)
    out.pop("id", None)  # 새 PK 부여
    for col in model.__table__.columns:
        v = out.get(col.name)
        if v is None or not isinstance(v, str):
            continue
        if isinstance(col.type, DateTime):
            try:
                out[col.name] = datetime.fromisoformat(v)
            except ValueError:
                out[col.name] = datetime.fromisoformat(v.replace("Z", "+00:00"))
        elif isinstance(col.type, Date):
            out[col.name] = date.fromisoformat(v[:10])
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
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="올바른 JSON 백업 파일이 아닙니다.")

    data = payload.get("data")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="백업 파일 형식이 올바르지 않습니다.")

    counts: dict = {}
    skipped: dict = {}
    try:
        for name, model in _TABLES.items():
            if replace:
                db.query(model).delete()
            rows = data.get(name, []) or []
            ok = 0
            sk = 0
            for row in rows:
                # 행마다 SAVEPOINT 로 격리 → 유니크 충돌 등은 해당 행만 건너뛴다
                try:
                    with db.begin_nested():
                        db.add(model(**_deserialize(model, row)))
                    ok += 1
                except IntegrityError:
                    sk += 1
            counts[name] = ok
            if sk:
                skipped[name] = sk
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        raise HTTPException(status_code=400, detail=f"복원 실패: {exc}")
    return {"status": "ok", "imported": counts, "skipped": skipped, "replaced": replace}

"""감사 로그 기록 헬퍼.

각 CRUD 라우터에서 작업 직후 호출한다. 커밋은 호출 측에서 수행한다.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User


def record(
    db: Session,
    user: User,
    action: str,
    entity: str,
    entity_id: Optional[int],
    summary: str = "",
) -> None:
    """감사 로그 1건을 세션에 추가한다 (commit 은 호출 측 책임)."""
    db.add(
        AuditLog(
            username=user.username,
            role=user.role.value,
            action=action,
            entity=entity,
            entity_id=entity_id,
            summary=summary,
        )
    )


def fmt_changes(changes: dict) -> str:
    """수정 시 변경 필드 dict 를 사람이 읽는 요약 문자열로 만든다."""
    parts = []
    for k, v in changes.items():
        if hasattr(v, "value"):  # Enum
            v = v.value
        parts.append(f"{k}={v}")
    s = ", ".join(parts)
    return (s[:300] + "…") if len(s) > 300 else s

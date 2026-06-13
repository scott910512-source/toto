"""감사 로그 스키마."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    username: str
    role: str
    action: str
    entity: str
    entity_id: Optional[int]
    summary: str

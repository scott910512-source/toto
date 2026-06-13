"""AI 자연어 검색 라우터."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.services import ai_search

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(get_current_user)])


class AskRequest(BaseModel):
    question: str


@router.post("/ask")
def ask(payload: AskRequest, db: Session = Depends(get_db)):
    """자연어 질문에 대해 데이터베이스를 조회하여 답변한다."""
    return ai_search.answer_query(db, payload.question)


@router.get("/examples")
def examples():
    return {
        "examples": [
            "지난달 수율이 가장 낮았던 LOT 보여줘",
            "FAIL 발생이 가장 많은 설비는?",
            "최근 3개월 생산량 추세 분석해줘",
            "점검 미실시 설비 찾아줘",
            "품질 부적합 현황 알려줘",
            "안전조치 미완료 건 보여줘",
        ]
    }

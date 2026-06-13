"""FastAPI 애플리케이션 진입점."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    admin,
    ai_search,
    audit,
    auth,
    backup,
    dashboard,
    equipment,
    export,
    inventory,
    material_item,
    production,
    quality,
    raw_material,
    safety,
    users,
)
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.services import seed_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("factory")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작 시 테이블 생성 및 초기 데이터(관리자 + 가상 데이터) 준비."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_data.ensure_superuser(db)
        # 데이터가 비어있으면 가상 데이터 자동 생성
        result = seed_data.generate(db)
        logger.info("초기 데이터 준비: %s", result)
    except Exception as exc:  # pragma: no cover
        logger.exception("초기화 실패: %s", exc)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="반도체/화학 공장 현장 데이터 통합 관리 시스템 REST API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"http://localhost(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
for r in (
    auth.router,
    users.router,
    production.router,
    material_item.router,
    raw_material.router,
    inventory.router,
    equipment.router,
    quality.router,
    safety.router,
    dashboard.router,
    export.router,
    ai_search.router,
    backup.router,
    audit.router,
    admin.router,
):
    app.include_router(r, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": settings.PROJECT_NAME}


@app.get("/", tags=["system"])
def root():
    return {"message": settings.PROJECT_NAME, "docs": "/docs"}

"""SQLAlchemy 데이터베이스 연결 및 세션 관리."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """모든 ORM 모델의 베이스 클래스."""


def get_db() -> Generator:
    """FastAPI 의존성: 요청 단위 DB 세션을 제공한다."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

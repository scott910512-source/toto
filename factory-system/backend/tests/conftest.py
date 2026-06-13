"""테스트 픽스처: SQLite 인메모리 DB 로 앱을 구동한다."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.services import seed_data

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_data.ensure_superuser(db)
    db.close()
    app.dependency_overrides[get_db] = _override_get_db
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    # lifespan 을 건너뛰기 위해 raise_server_exceptions 기본 사용
    return TestClient(app)


@pytest.fixture()
def admin_token(client):
    res = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "admin1234"},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

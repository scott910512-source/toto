"""애플리케이션 설정. 환경 변수에서 값을 로드한다."""
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # 프로젝트 메타
    PROJECT_NAME: str = "현장 데이터 통합 관리 시스템"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    # KPI 일/월 경계 계산용 현지 시간대 (예: Asia/Seoul)
    TIMEZONE: str = "Asia/Seoul"

    # 데이터베이스
    DATABASE_URL: str = (
        "postgresql+psycopg2://factory:factory@localhost:5432/factory_db"
    )

    # 인증 (JWT)
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_super_secret_key_0123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24시간

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
    ]

    # AI 검색 (선택) - 키가 없으면 규칙 기반 폴백 사용
    OPENAI_API_KEY: str = ""
    AI_MODEL: str = "gpt-4o-mini"

    # 초기 관리자 계정
    FIRST_SUPERUSER: str = "admin"
    FIRST_SUPERUSER_PASSWORD: str = "admin1234"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

"""API 공통 의존성: 현재 사용자 인증 및 권한 검사."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

_CRED_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="인증 정보를 확인할 수 없습니다.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    payload = decode_access_token(token)
    if payload is None or "sub" not in payload:
        raise _CRED_EXC
    user = db.query(User).filter(User.username == payload["sub"]).first()
    if user is None or not user.is_active:
        raise _CRED_EXC
    return user


def require_roles(*roles: UserRole):
    """지정한 권한 중 하나를 가진 사용자만 허용하는 의존성을 생성한다."""

    def checker(current: User = Depends(get_current_user)) -> User:
        if current.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="권한이 부족합니다.",
            )
        return current

    return checker


# 데이터 입력/수정/삭제: admin, engineer 허용
require_editor = require_roles(UserRole.admin, UserRole.engineer)
# 관리 기능: admin 전용
require_admin = require_roles(UserRole.admin)

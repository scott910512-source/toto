"""사용자 관리 라우터 (admin 전용)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services import audit

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])


def _other_active_admins(db: Session, exclude_id: int) -> int:
    """자기 자신을 제외한 '활성 관리자' 수."""
    return (
        db.query(User)
        .filter(User.role == UserRole.admin, User.is_active.is_(True), User.id != exclude_id)
        .count()
    )


@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    user = User(
        username=payload.username,
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    audit.record(db, current, "CREATE", "user", user.id,
                 f"사용자 {user.username} ({user.role.value}) 등록")
    db.commit()
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    data = payload.model_dump(exclude_unset=True)
    # 마지막 관리자를 강등/비활성화하여 시스템이 잠기는 것을 방지
    demoting = data.get("role") not in (None, UserRole.admin, "admin")
    deactivating = data.get("is_active") is False
    if user.role == UserRole.admin and (demoting or deactivating) and _other_active_admins(db, user.id) == 0:
        raise HTTPException(status_code=400, detail="마지막 활성 관리자는 강등·비활성화할 수 없습니다.")
    pw_changed = bool(data.get("password"))
    if pw_changed:
        user.hashed_password = get_password_hash(data.pop("password"))
    else:
        data.pop("password", None)
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    detail = audit.fmt_changes(data) + (" · 비밀번호 변경" if pw_changed else "")
    audit.record(db, current, "UPDATE", "user", user.id,
                 f"사용자 {user.username} 수정 · {detail}")
    db.commit()
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.id == current.id:
        raise HTTPException(status_code=400, detail="본인 계정은 삭제할 수 없습니다.")
    if user.role == UserRole.admin and _other_active_admins(db, user.id) == 0:
        raise HTTPException(status_code=400, detail="마지막 활성 관리자는 삭제할 수 없습니다.")
    username = user.username
    db.delete(user)
    db.commit()
    audit.record(db, current, "DELETE", "user", user_id, f"사용자 {username} 삭제")
    db.commit()

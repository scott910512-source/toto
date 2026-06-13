"""공통 스키마: 페이지네이션 응답 등."""
from typing import Generic, List, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """페이지네이션 결과 래퍼."""

    items: List[T]
    total: int
    page: int
    size: int
    pages: int

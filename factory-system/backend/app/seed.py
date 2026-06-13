"""독립 실행형 시드 스크립트.

사용법:
    python -m app.seed             # 테이블 생성 + 관리자 + 가상 데이터
    python -m app.seed --lots 500  # LOT 수 지정
"""
import argparse

from app.core.database import Base, SessionLocal, engine
from app.services import seed_data


def main():
    parser = argparse.ArgumentParser(description="가상 데이터 생성")
    parser.add_argument("--lots", type=int, default=1000)
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_data.ensure_superuser(db)
        result = seed_data.generate(db, lots=args.lots)
        print("관리자 계정 준비 완료 (admin / admin1234)")
        print("시드 결과:", result)
    finally:
        db.close()


if __name__ == "__main__":
    main()

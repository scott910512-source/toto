# 6. 프로젝트 폴더 구조

```
factory-system/
├── docker-compose.yml          # 3-tier (db / backend / frontend) 오케스트레이션
├── .env.example                # 환경변수 템플릿
├── README.md                   # 설치 매뉴얼 + 개요
│
├── docs/                       # 설계 문서
│   ├── 01_ARCHITECTURE.md
│   ├── 02_ERD.md
│   ├── 03_DB_SCHEMA.md
│   ├── 04_API_DESIGN.md
│   ├── 05_SCREEN_DESIGN.md
│   └── 06_FOLDER_STRUCTURE.md
│
├── backend/                    # FastAPI 백엔드
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             # 앱 진입점 (라우터 등록, 시작 시 시드)
│   │   ├── seed.py             # 독립 실행 시드 스크립트
│   │   ├── core/
│   │   │   ├── config.py       # 환경설정 (pydantic-settings)
│   │   │   ├── database.py     # 엔진/세션/Base
│   │   │   ├── security.py     # 비밀번호 해싱, JWT
│   │   │   └── constants.py    # 공장 마스터(공정/설비/항목 등)
│   │   ├── models/             # SQLAlchemy ORM
│   │   │   ├── user.py production.py equipment.py quality.py safety.py
│   │   ├── schemas/            # Pydantic DTO
│   │   │   ├── user.py records.py common.py
│   │   ├── api/                # 라우터
│   │   │   ├── deps.py         # 인증/권한 의존성
│   │   │   ├── auth.py users.py
│   │   │   ├── production.py equipment.py quality.py safety.py
│   │   │   ├── dashboard.py export.py ai_search.py backup.py admin.py
│   │   └── services/           # 비즈니스 로직
│   │       ├── seed_data.py    # 가상 데이터 생성
│   │       ├── export_service.py # xlsx/csv/pdf 생성
│   │       └── ai_search.py    # 자연어 검색 엔진
│   └── tests/                  # pytest 스모크 테스트
│       ├── conftest.py test_api.py
│
└── frontend/                   # React + TypeScript 프론트엔드
    ├── Dockerfile
    ├── nginx.conf              # SPA 라우팅 + /api 프록시
    ├── package.json
    ├── vite.config.ts tailwind.config.js postcss.config.js
    ├── tsconfig.json tsconfig.node.json
    ├── index.html
    └── src/
        ├── main.tsx App.tsx    # 진입점 / 라우팅
        ├── index.css           # 리퀴드 글라스 테마
        ├── lib/
        │   ├── api.ts          # axios 클라이언트 + 다운로드 헬퍼
        │   ├── auth.tsx        # 인증 컨텍스트
        │   ├── constants.ts    # 공정/설비/항목 옵션
        │   └── utils.ts        # 포맷터, cn()
        ├── hooks/useTheme.ts   # 다크모드
        ├── types/index.ts      # 공용 타입
        ├── components/
        │   ├── ui/index.tsx    # Button/Card/Input/Modal/Badge ...
        │   ├── layout/AppLayout.tsx
        │   └── CrudPage.tsx    # 제네릭 CRUD 페이지
        └── pages/
            ├── LoginPage.tsx DashboardPage.tsx
            ├── ProductionPage.tsx EquipmentPage.tsx
            ├── QualityPage.tsx SafetyPage.tsx
            ├── AiSearchPage.tsx UsersPage.tsx SettingsPage.tsx
```

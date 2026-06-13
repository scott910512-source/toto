# 🏭 현장 데이터 통합 관리 시스템

반도체 · 화학 공장의 공정 엔지니어를 위한 **현장 데이터 통합 관리 시스템**입니다.
생산 · 설비점검 · 품질 · 안전 데이터를 하나의 플랫폼에서
**입력 · 저장 · 검색 · 수정 · 분석 · 추출**할 수 있습니다.

> 테마: **리퀴드 글라스(Liquid Glass)** — Apple iOS 스타일 UI · 다크모드 · 모바일 대응

---

## ✨ 주요 기능

- **데이터 입력/관리(CRUD)**: 생산정보 · 설비점검 · 품질 · 안전 4대 카테고리
- **검색**: 통합검색, 다중조건, 날짜범위, 공정/설비/LOT별 필터
- **대시보드**: 6대 KPI + 생산추이/공정별/설비이상/품질 그래프 (Recharts)
- **Export**: Excel(.xlsx) / CSV / PDF 추출
- **AI 자연어 검색**: "지난달 수율이 가장 낮았던 LOT 보여줘" 등 자연어 질의
- **인증/권한**: JWT 로그인 + 3단계 RBAC(admin/engineer/viewer)
- **백업/복원**: 전체 데이터 JSON 백업·복원
- **가상 데이터 자동 생성**: 5공정 · 20설비 · 1000 LOT 의 현실적 샘플

---

## 🧰 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL 16 |
| Export | Pandas, OpenPyXL, ReportLab |
| 배포 | Docker, Docker Compose, Nginx |

---

## 🚀 빠른 시작 (Docker — 권장)

사전 요구: **Docker** 및 **Docker Compose**

```bash
cd factory-system
cp .env.example .env          # 필요 시 비밀번호/SECRET_KEY 수정
docker compose up --build -d  # db + backend + frontend 기동
```

기동되면 백엔드가 **최초 1회 자동으로 가상 데이터를 생성**합니다(수십 초 소요).

| 서비스 | 주소 |
|--------|------|
| 웹 화면 | http://localhost:3000 |
| API 문서(Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

**데모 계정**

| 권한 | 아이디 | 비밀번호 |
|------|--------|----------|
| 관리자 | `admin` | `admin1234` |
| 엔지니어 | `engineer` | `engineer1234` |
| 조회 | `viewer` | `viewer1234` |

종료: `docker compose down` (데이터 유지) / 데이터까지 삭제: `docker compose down -v`

---

## 🛠️ 로컬 개발 환경

### 1) 백엔드

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# DB: 로컬 PostgreSQL 사용 시 환경변수 지정 (미지정 시 기본값 사용)
export DATABASE_URL="postgresql+psycopg2://factory:factory@localhost:5432/factory_db"

# (선택) 테이블 생성 + 관리자 + 가상 데이터 시드
python -m app.seed --lots 1000

# 개발 서버
uvicorn app.main:app --reload --port 8000
```

> PostgreSQL 없이 빠르게 시험하려면 `export DATABASE_URL="sqlite+pysqlite:///./dev.db"` 도 가능합니다.
> (단, AI 검색의 일부 월별 집계 기능은 PostgreSQL 전용입니다.)

테스트:
```bash
cd backend && pip install pytest && python -m pytest -q   # SQLite 인메모리로 실행
```

### 2) 프론트엔드

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 ( /api 요청은 localhost:8000 으로 프록시 )
```

빌드: `npm run build` → `dist/`

---

## 🤖 AI 자연어 검색

키 없이 **규칙 기반 엔진**으로 바로 동작합니다. 지원 질의 예:

- "지난달 수율이 가장 낮았던 LOT 보여줘"
- "FAIL 발생이 가장 많은 설비는?"
- "최근 3개월 생산량 추세 분석해줘"
- "점검 미실시 설비 찾아줘"
- "품질 부적합 현황 알려줘"
- "안전조치 미완료 건 보여줘"

`.env` 의 `OPENAI_API_KEY` 를 채우면 LLM 보강이 가능하도록 설계되어 있습니다(선택).

---

## 📚 설계 문서

자세한 내용은 [`docs/`](./docs) 참고:

1. [시스템 아키텍처](./docs/01_ARCHITECTURE.md)
2. [ERD](./docs/02_ERD.md)
3. [DB 스키마](./docs/03_DB_SCHEMA.md)
4. [API 설계서](./docs/04_API_DESIGN.md)
5. [화면 설계서](./docs/05_SCREEN_DESIGN.md)
6. [폴더 구조](./docs/06_FOLDER_STRUCTURE.md)

---

## 🔐 운영 시 주의

- `.env` 의 `SECRET_KEY`, 기본 비밀번호를 **반드시 변경**하세요.
- 외부 공개 시 HTTPS(리버스 프록시) 적용을 권장합니다.
- 백업은 **설정 · 백업** 화면 또는 `GET /api/v1/backup/export` 로 주기적으로 수행하세요.

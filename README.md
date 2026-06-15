# 🗺️ Travel Korea Tracker

대한민국 시군구 단위 **여행 방문 기록 관리 웹앱**입니다.
종이 "스크래치맵"처럼 방문한 지역을 색칠하고, 메모·사진·통계·배지로 여행을 기록합니다.
개인 및 소규모 그룹(가족·친구·회사 동호회, 최대 50명 수준) 내부 공유용으로 설계되었습니다.

> UI 컨셉: **리퀴드 글라스(Liquid Glass)** + 여행 다이어리 · 다크모드 지원 · 모바일/태블릿/PC 반응형

---

## ✨ 핵심 기능

| # | 기능 | 설명 |
|---|------|------|
| 1 | **대한민국 지도** | 17개 시도 SVG 타일맵(카토그램) + 시군구(229개) 클릭 |
| 2 | **방문 체크** | 방문함 / 계획중 / 미방문 상태 + 방문일 저장, 클릭 즉시 색상 변경 |
| 3 | **여행 기록** | 지역별 메모 작성, 사진 첨부(방문당 최대 20장) |
| 4 | **통계** | 전국·시도별 방문률, 올해 방문 수, 지역 순위 |
| 5 | **버킷리스트** | 가고 싶은 지역 저장(전용 색상 ⭐) |
| 6 | **여행 히스토리** | 방문일 기준 타임라인 |
| 7 | **지도 색칠** | 상태별 색상(방문=초록 / 계획=노랑 / 미방문=회색) |
| 8 | **사진 갤러리** | 지역별 사진 모아보기 + 라이트박스 |
| 9 | **검색** | 지역명 검색 → 지도로 이동 |
| 10 | **관리자** | 사용자 관리 / 권한(관리자·일반사용자) |
| + | **공유 권한** | 공개 / 비공개 / 그룹공유 |
| + | **대시보드** | 총 방문지역·올해 방문·최근 여행·방문률 그래프·지역 순위 |
| + | **여행 배지** | 서울 완주, 제주 완주, 전국 50%/100% 달성 등 자동 부여 |
| + | **엑셀 내보내기** | 방문기록 `.xlsx` 다운로드 |
| + | **백업** | JSON Export / Import |

---

## 🧱 기술 스택 & 아키텍처

- **Frontend**: React + TypeScript + Vite + Tailwind CSS (리퀴드 글라스 테마, 다크모드)
- **Backend**: Node.js + Express + TypeScript
- **DB / ORM**: SQLite + Prisma (→ PostgreSQL 전환 가능하게 설계)
- **인증**: 이메일 + 비밀번호 (JWT)
- **배포**: Docker / Docker Compose (내부망 단일 컨테이너)

### Clean Architecture (server)

```
server/src
├─ domain/            # 엔티티 + 레포지토리 인터페이스(포트) — 프레임워크 무관
│  ├─ entities/
│  └─ repositories/
├─ application/       # 유스케이스 / 서비스 (비즈니스 로직)
│  └─ services/       # Auth, Visit, Wishlist, Photo, Stats, Badge, Admin, Export
├─ infrastructure/    # 어댑터: Prisma 레포지토리, JWT, 비밀번호, 파일저장, 시더
│  ├─ db/  ├─ repositories/  ├─ auth/  └─ storage/
├─ presentation/      # HTTP 계층: Express 라우터·컨트롤러·미들웨어
│  └─ http/
├─ config/            # 환경변수
├─ shared/            # 공용 에러 등
├─ container.ts       # Composition Root (DI)
└─ main.ts            # 부트스트랩
```

의존성 방향은 항상 안쪽(domain)을 향합니다. 애플리케이션 계층은 Prisma가 아닌
**레포지토리 인터페이스**에만 의존하므로, DB/ORM 교체 시 `infrastructure`만 변경하면 됩니다.

---

## 🚀 빠른 시작

### 방법 A — Docker Compose (권장, 내부망 배포)

```bash
# 1) (선택) 환경변수 설정
cp .env.example .env   # JWT_SECRET, ADMIN_PASSWORD 등 수정 권장

# 2) 빌드 & 실행
docker compose up -d --build

# 3) 접속
#    http://<서버IP>:4000
```

- 컨테이너 시작 시 **DB 스키마 적용 + 시드(지역/배지/관리자/샘플)**가 자동 수행됩니다.
- 데이터(SQLite)·업로드 사진은 Docker 볼륨(`tkt_data`, `tkt_uploads`)에 영속 저장됩니다.

### 방법 B — 로컬 개발

```bash
# 의존성 설치 (server + client)
npm run install:all

# 서버 DB 준비 + 시드 (server 디렉터리 기준)
cd server && cp .env.example .env && npm run setup && cd ..

# 개발 서버 동시 실행 (server:4000, client:5173, /api 프록시)
npm install            # 루트 concurrently 설치
npm run dev
```

- 프론트엔드: http://localhost:5173
- API: http://localhost:4000/api

---

## 🔑 기본 계정

| 구분 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | `admin@travel.kr` | `admin1234` |
| 데모 사용자 | `demo@travel.kr` | `demo1234` |

> 운영 시 반드시 `ADMIN_PASSWORD`/`JWT_SECRET`을 변경하세요.
> 회원가입 시스템에 **사용자가 한 명도 없으면 첫 가입자가 자동으로 관리자**가 됩니다.

---

## 🔌 주요 API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/register` · `/login` | 회원가입 / 로그인 |
| GET | `/api/auth/me` | 내 정보 |
| GET | `/api/regions` · `/search?q=` | 시군구 목록 / 검색 |
| GET / PUT / DELETE | `/api/visits` | 방문 목록 / 생성·수정(upsert) / 삭제 |
| GET | `/api/visits/timeline` · `/feed` | 타임라인 / 공유 피드 |
| GET / POST / DELETE | `/api/wishlist` | 버킷리스트 |
| POST / GET / DELETE | `/api/photos/visit/:id` | 사진 업로드 / 목록 / 삭제 |
| GET | `/api/stats` | 통계 |
| GET | `/api/badges` | 배지 현황 |
| GET | `/api/admin/users` … | 관리자: 사용자/권한 |
| GET | `/api/export/excel` · `/backup`, POST `/restore` | 엑셀 / JSON 백업·복원 |

모든 보호 엔드포인트는 `Authorization: Bearer <token>` 헤더가 필요합니다.

---

## 🗃️ 데이터 모델 (요약)

`User` · `Province` · `Region` · `Visit`(+`VisitShare`) · `Photo` · `Wishlist` · `Badge`(+`UserBadge`)

- 시군구 시드 데이터: `server/src/infrastructure/db/regions.ts` (전국 **229개**)
- 시드 로직: `server/src/infrastructure/db/seeder.ts` (멱등 — 서버 부팅 시에도 안전하게 재실행)

---

## 🐘 PostgreSQL 전환

1. `server/prisma/schema.prisma`의 `datasource db.provider`를 `"postgresql"`로 변경
2. `DATABASE_URL`을 PostgreSQL 접속 문자열로 설정
3. `docker-compose.yml`의 주석 처리된 `db` 서비스 활성화
4. `npx prisma migrate deploy` (또는 `db push`)

스키마는 enum 대신 문자열 유니온, `cuid` 기반 PK를 사용해 전환을 단순화했습니다.

---

## 🔭 향후 확장 로드맵 (설계 반영)

- 방문 인증 GPS · 여행 동선 기록 · Google Maps 연동
- AI 여행일지 자동 생성 · 부부/그룹 공동 여행 기록
- 실제 GeoJSON 기반 정밀 SVG 지도 (현재 타일 카토그램 → `utils/constants.ts` 좌표만 교체)

---

## 📁 프로젝트 구조

```
.
├─ client/            # React + Vite 프론트엔드
├─ server/            # Express + Prisma 백엔드 (Clean Architecture)
├─ Dockerfile         # 단일 이미지(프론트+백엔드) 빌드
├─ docker-compose.yml # 내부망 배포
└─ README.md
```

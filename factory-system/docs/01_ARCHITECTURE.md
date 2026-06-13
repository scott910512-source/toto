# 1. 전체 시스템 아키텍처

반도체/화학 공장 **현장 데이터 통합 관리 시스템**의 아키텍처 문서입니다.

## 1.1 개요

현장에서 발생하는 4대 데이터(생산 · 설비점검 · 품질 · 안전)를 하나의 플랫폼에서
입력 · 저장 · 검색 · 수정 · 분석 · 추출할 수 있는 풀스택 웹 시스템입니다.

## 1.2 구성도

```
                          ┌─────────────────────────────┐
   사용자(PC/모바일)  ───▶ │  Frontend (React + Vite)    │
                          │  - Liquid Glass UI          │
                          │  - Recharts 대시보드          │
                          │  - 다크모드 / 모바일 대응       │
                          └──────────────┬──────────────┘
                                         │ REST (JSON, JWT)
                                         ▼
                          ┌─────────────────────────────┐
                          │  Nginx (정적 호스팅 + /api 프록시) │
                          └──────────────┬──────────────┘
                                         ▼
                          ┌─────────────────────────────┐
                          │  Backend (FastAPI)          │
                          │  - 인증/권한 (JWT, RBAC)       │
                          │  - CRUD / 필터검색            │
                          │  - 대시보드 집계               │
                          │  - Export (xlsx/csv/pdf)     │
                          │  - AI 자연어 검색              │
                          │  - 백업/복원                  │
                          └──────────────┬──────────────┘
                                         │ SQLAlchemy ORM
                                         ▼
                          ┌─────────────────────────────┐
                          │  PostgreSQL 16              │
                          └─────────────────────────────┘
```

## 1.3 레이어 설계 (Backend)

| 레이어 | 책임 | 위치 |
|--------|------|------|
| API (Router) | HTTP 엔드포인트, 검증, 권한 | `app/api/*` |
| Schema | 입출력 DTO (Pydantic) | `app/schemas/*` |
| Service | 비즈니스 로직 (export, AI, seed) | `app/services/*` |
| Model (ORM) | 테이블 매핑 | `app/models/*` |
| Core | 설정, DB, 보안, 상수 | `app/core/*` |

## 1.4 인증 · 권한 (RBAC)

JWT 기반 인증. 3개 역할:

| 역할 | 조회 | 입력/수정/삭제 | 사용자관리/백업 |
|------|:---:|:---:|:---:|
| `admin` | ✅ | ✅ | ✅ |
| `engineer` | ✅ | ✅ | ❌ |
| `viewer` | ✅ | ❌ | ❌ |

## 1.5 기술 스택

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, lucide-react
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2
- **DB**: PostgreSQL 16
- **Export**: Pandas, OpenPyXL, ReportLab
- **배포**: Docker, Docker Compose, Nginx

## 1.6 주요 비기능 요구사항 대응

| 요구사항 | 구현 |
|----------|------|
| 모바일 대응 | Tailwind 반응형, 모바일 사이드바 |
| 다크모드 | `class` 기반 토글 + localStorage 저장 |
| 로그인 | JWT (OAuth2 password flow) |
| 권한 관리 | RBAC 3단계 |
| 데이터 백업 | JSON Export/Import API |
| REST API | OpenAPI 문서 자동 생성 (`/docs`) |
| Docker 배포 | 3-tier docker-compose |
| 샘플 데이터 자동 생성 | 앱 최초 기동 시 자동 시드 |

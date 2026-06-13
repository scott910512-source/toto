# 4. API 설계서

- Base URL: `/api/v1`
- 인증: `Authorization: Bearer <JWT>` (로그인 제외 전체)
- 대화형 문서: 백엔드 기동 후 **`http://localhost:8000/docs`** (Swagger UI)

## 4.1 인증 (auth)

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| POST | `/auth/login` | 로그인(form: username/password) → JWT | 공개 |
| GET | `/auth/me` | 내 정보 | 로그인 |

**예시**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=admin&password=admin1234"
# → { "access_token": "...", "token_type": "bearer", "user": {...} }
```

## 4.2 데이터 CRUD (production / equipment / quality / safety)

각 카테고리는 동일한 패턴을 가집니다. (예: `production`)

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/production` | 목록 + 필터 + 페이지네이션 | 로그인 |
| GET | `/production/{id}` | 단건 조회 | 로그인 |
| POST | `/production` | 생성 | engineer+ |
| PATCH | `/production/{id}` | 수정 | engineer+ |
| DELETE | `/production/{id}` | 삭제 | engineer+ |

**공통 쿼리 파라미터 (목록)**

| 파라미터 | 설명 |
|----------|------|
| `q` | 통합 검색어 |
| `date_from`, `date_to` | 날짜 범위 (ISO8601) |
| `page`, `size` | 페이지(기본 1), 페이지당 건수(기본 20, 최대 500) |
| `sort` | 정렬 필드, `-` 접두사는 내림차순 (예: `-produced_at`) |

**카테고리별 추가 필터**

- production: `process_name`, `equipment_name`, `lot_number`, `yield_min`, `yield_max`
- equipment: `equipment_name`, `inspector`, `judgement(PASS|FAIL)`
- quality: `lot_number`, `item_name`, `result(OK|NG)`
- safety: `work_area`, `manager`, `completed(true|false)`

**응답 (Page 래퍼)**
```json
{ "items": [ ... ], "total": 1000, "page": 1, "size": 20, "pages": 50 }
```

## 4.3 대시보드 (dashboard)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/dashboard/kpi` | 6대 KPI |
| GET | `/dashboard/production-trend?days=30` | 일별 생산량·수율 추이 |
| GET | `/dashboard/equipment-fails` | 설비별 FAIL 건수 |
| GET | `/dashboard/quality-summary` | 품질 항목별 OK/NG |
| GET | `/dashboard/process-output` | 공정별 누적 생산량 |

## 4.4 Export (export)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/export/{category}?fmt=xlsx\|csv\|pdf` | 데이터 추출 |

`category` ∈ `production | equipment | quality | safety`,
`date_from`/`date_to` 로 기간 지정 가능.

## 4.5 AI 자연어 검색 (ai)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/ai/ask` | `{ "question": "..." }` → 답변 + 근거 rows |
| GET | `/ai/examples` | 예시 질문 목록 |

## 4.6 사용자 관리 (users, admin 전용)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/users` | 목록 |
| POST | `/users` | 생성 |
| PATCH | `/users/{id}` | 수정 |
| DELETE | `/users/{id}` | 삭제 |

## 4.7 백업/관리 (admin 전용)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/backup/export` | 전체 데이터 JSON 백업 |
| POST | `/backup/import?replace=false` | 백업 복원 |
| POST | `/admin/seed?lots=1000` | 가상 데이터 생성 |

## 4.8 상태 코드

| 코드 | 의미 |
|------|------|
| 200 / 201 / 204 | 성공 / 생성 / 삭제 |
| 401 | 미인증(토큰 없음/만료) |
| 403 | 권한 부족 |
| 404 | 리소스 없음 |
| 422 | 입력 검증 실패 |

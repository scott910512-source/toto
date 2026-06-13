"""핵심 API 스모크 테스트."""
from datetime import datetime, timezone


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_login_wrong_password(client):
    res = client.post("/api/v1/auth/login", data={"username": "admin", "password": "nope"})
    assert res.status_code == 401


def test_production_crud_and_dashboard(client, admin_token):
    headers = _auth(admin_token)

    payload = {
        "produced_at": datetime.now(timezone.utc).isoformat(),
        "process_name": "증착",
        "equipment_name": "Reactor-101",
        "lot_number": "LOT-TEST-1",
        "operator": "김철수",
        "quantity": 1200,
        "yield_rate": 98.5,
        "remark": "테스트",
    }
    res = client.post("/api/v1/production", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    rid = res.json()["id"]

    # 목록 + 검색
    res = client.get("/api/v1/production?q=LOT-TEST", headers=headers)
    assert res.json()["total"] >= 1

    # 수정
    res = client.patch(f"/api/v1/production/{rid}", json={"quantity": 1500}, headers=headers)
    assert res.json()["quantity"] == 1500

    # 대시보드 KPI
    res = client.get("/api/v1/dashboard/kpi", headers=headers)
    assert "daily_production" in res.json()

    # 삭제
    assert client.delete(f"/api/v1/production/{rid}", headers=headers).status_code == 204


def test_ai_search(client, admin_token):
    res = client.post(
        "/api/v1/ai/ask",
        json={"question": "FAIL 발생이 가장 많은 설비는?"},
        headers=_auth(admin_token),
    )
    assert res.status_code == 200
    assert "answer" in res.json()


def test_requires_auth(client):
    assert client.get("/api/v1/production").status_code == 401


def test_raw_material_crud_and_tabs(client, admin_token):
    """원부재료 등록 → 자재명 탭 목록 → 구분 검증 → 탭 필터."""
    h = _auth(admin_token)
    payload = {
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "category": "입고", "material_name": "TEOS", "material_code": "RM-1024",
        "lot_number": "B2606-101", "grade": "Grade 5N", "quantity": 25, "unit": "L",
        "maker": "OO케미칼", "mfg_date": "2026-05-01", "expiry_date": "2027-05-01",
        "process_equipment": "증착 / Reactor-101", "location": "약품보관소 A-3",
        "operator": "김철수", "remark": "정상",
    }
    res = client.post("/api/v1/materials", json=payload, headers=h)
    assert res.status_code == 201, res.text

    # 자재명 탭 목록에 TEOS 가 포함
    names = client.get("/api/v1/materials/material-names", headers=h).json()
    assert "TEOS" in names

    # 잘못된 구분값 거부(422)
    bad = {**payload, "category": "잘못된값"}
    assert client.post("/api/v1/materials", json=bad, headers=h).status_code == 422

    # 탭 필터(material_name 정확히 일치)
    res = client.get("/api/v1/materials?material_name=TEOS", headers=h)
    assert res.json()["total"] >= 1
    assert all(it["material_name"] == "TEOS" for it in res.json()["items"])


def test_material_export(client, admin_token):
    """원부재료 엑셀/CSV export 동작."""
    h = _auth(admin_token)
    for fmt in ("xlsx", "csv"):
        assert client.get(f"/api/v1/export/material?fmt={fmt}", headers=h).status_code == 200


def _prod(**kw):
    base = {
        "produced_at": datetime.now(timezone.utc).isoformat(),
        "process_name": "증착", "equipment_name": "Reactor-101", "lot_number": "LOT-X",
        "operator": "t", "quantity": 1000, "yield_rate": 97.0, "remark": "",
    }
    base.update(kw)
    return base


def test_input_validation(client, admin_token):
    """서버측 입력 검증: 음수 수량/범위초과 수율/빈 LOT/규격 모순 거부."""
    h = _auth(admin_token)
    assert client.post("/api/v1/production", json=_prod(quantity=-5), headers=h).status_code == 422
    assert client.post("/api/v1/production", json=_prod(yield_rate=250), headers=h).status_code == 422
    assert client.post("/api/v1/production", json=_prod(lot_number=""), headers=h).status_code == 422
    assert client.post("/api/v1/production", json=_prod(lot_number="   "), headers=h).status_code == 422
    bad_q = {
        "sample_number": "S", "lot_number": "L", "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "analyst": "a", "item_name": "Purity", "measured_value": 50,
        "spec_lower": 100, "spec_upper": 0, "result": "OK",
    }
    assert client.post("/api/v1/quality", json=bad_q, headers=h).status_code == 422


def test_quality_result_auto_computed(client, admin_token):
    """측정값이 규격을 벗어나면 result 가 NG 로 자동 판정되어야 한다."""
    h = _auth(admin_token)
    payload = {
        "sample_number": "S-AUTO", "lot_number": "L1",
        "analyzed_at": datetime.now(timezone.utc).isoformat(), "analyst": "a",
        "item_name": "Moisture", "measured_value": 9999,
        "spec_lower": 0, "spec_upper": 50, "result": "OK",  # 사용자가 OK 라 우겨도
    }
    res = client.post("/api/v1/quality", json=payload, headers=h)
    assert res.status_code == 201
    assert res.json()["result"] == "NG"  # 서버가 NG 로 정정


def test_read_does_not_crash_on_out_of_policy_data(client, admin_token):
    """입력검증을 우회한(백업복원 등) 정책위반 데이터도 조회(응답)는 깨지지 않아야 한다.

    회귀 방지: 과거 *Out 스키마가 입력제약을 강제해 읽기 시 500 을 유발했음.
    """
    import json

    headers = _auth(admin_token)
    backup = {
        "version": 1,
        "data": {
            "production": [{
                "produced_at": "2026-01-01T00:00:00+00:00", "process_name": "증착",
                "equipment_name": "R1", "lot_number": "L-OLD", "operator": "t",
                "quantity": -999, "yield_rate": 250.0, "remark": "legacy",  # 정책 위반 값
            }],
            "quality": [{
                "sample_number": "S-OLD", "lot_number": "L-OLD",
                "analyzed_at": "2026-01-01T00:00:00+00:00", "analyst": "a",
                "item_name": "Purity", "measured_value": 50,
                "spec_lower": 100, "spec_upper": 0, "result": "OK",  # 하한>상한
            }],
            "equipment": [], "safety": [],
        },
    }
    raw = json.dumps(backup).encode("utf-8")
    res = client.post(
        "/api/v1/backup/import?replace=false",
        files={"file": ("b.json", raw, "application/json")},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    # 핵심: 위반 데이터가 들어있어도 목록 조회가 500 이 아니어야 한다
    assert client.get("/api/v1/production?q=L-OLD", headers=headers).status_code == 200
    assert client.get("/api/v1/quality?lot_number=L-OLD", headers=headers).status_code == 200


def test_last_admin_cannot_be_deleted(client, admin_token):
    """유일한 관리자(=본인)는 삭제할 수 없어야 한다(시스템 잠김 방지)."""
    h = _auth(admin_token)
    me = client.get("/api/v1/auth/me", headers=h).json()
    res = client.delete(f"/api/v1/users/{me['id']}", headers=h)
    assert res.status_code == 400


def test_backup_export_and_restore_roundtrip(client, admin_token):
    """백업 다운로드 → 복원(추가/전체교체) 왕복 검증 (datetime 역직렬화 포함)."""
    headers = _auth(admin_token)

    # 시드용 데이터 1건 생성
    payload = {
        "produced_at": datetime.now(timezone.utc).isoformat(),
        "process_name": "증착",
        "equipment_name": "Reactor-101",
        "lot_number": "LOT-BK-1",
        "operator": "김철수",
        "quantity": 1000,
        "yield_rate": 97.0,
        "remark": "백업테스트",
    }
    client.post("/api/v1/production", json=payload, headers=headers)
    before = client.get("/api/v1/production?size=1", headers=headers).json()["total"]
    assert before >= 1

    # 백업 다운로드
    res = client.get("/api/v1/backup/export", headers=headers)
    assert res.status_code == 200
    backup_bytes = res.content

    # 복원(추가) → 건수 2배
    res = client.post(
        "/api/v1/backup/import?replace=false",
        files={"file": ("backup.json", backup_bytes, "application/json")},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    added = client.get("/api/v1/production?size=1", headers=headers).json()["total"]
    assert added == before * 2

    # 복원(전체교체) → 원본 건수로 복구
    res = client.post(
        "/api/v1/backup/import?replace=true",
        files={"file": ("backup.json", backup_bytes, "application/json")},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    replaced = client.get("/api/v1/production?size=1", headers=headers).json()["total"]
    assert replaced == before


def test_audit_log_records_crud(client, admin_token):
    """등록/수정/삭제 시 감사 로그가 행위자(username)와 함께 남는지 검증."""
    headers = _auth(admin_token)
    payload = {
        "produced_at": datetime.now(timezone.utc).isoformat(),
        "process_name": "식각",
        "equipment_name": "Etcher-501",
        "lot_number": "LOT-AUDIT-1",
        "operator": "박민수",
        "quantity": 800,
        "yield_rate": 95.5,
        "remark": "",
    }
    rid = client.post("/api/v1/production", json=payload, headers=headers).json()["id"]
    client.patch(f"/api/v1/production/{rid}", json={"quantity": 999}, headers=headers)
    client.delete(f"/api/v1/production/{rid}", headers=headers)

    res = client.get("/api/v1/audit?entity=production", headers=headers)
    assert res.status_code == 200
    actions = [r["action"] for r in res.json()["items"]]
    assert {"CREATE", "UPDATE", "DELETE"}.issubset(set(actions))
    # 행위자 기록 확인
    assert all(r["username"] == "admin" for r in res.json()["items"])


def test_audit_requires_admin(client):
    """viewer/engineer 는 활동 이력 조회 불가."""
    res = client.post(
        "/api/v1/auth/login", data={"username": "engineer", "password": "engineer1234"}
    )
    token = res.json()["access_token"]
    assert client.get("/api/v1/audit", headers=_auth(token)).status_code == 403


def test_backup_requires_admin(client):
    """viewer 계정은 백업 불가(403)."""
    res = client.post(
        "/api/v1/auth/login", data={"username": "viewer", "password": "viewer1234"}
    )
    token = res.json()["access_token"]
    assert client.get("/api/v1/backup/export", headers=_auth(token)).status_code == 403

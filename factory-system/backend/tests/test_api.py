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

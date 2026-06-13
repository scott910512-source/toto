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

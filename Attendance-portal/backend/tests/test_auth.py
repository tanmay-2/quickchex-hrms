from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_login_unauthorized():
    response = client.post("/api/v1/auth/login", json={
        "username": "unknown_user"
    })

    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized User"


def test_login_success():
    # make sure user exists in DB
    response = client.post("/api/v1/auth/login", json={
        "username": "abhishek"
    })

    assert response.status_code == 200
    assert "message" in response.json()
# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEST_AUTH.PY
# Path: Attendance-portal/backend/tests/test_auth.py
# Purpose: Backend module.
# Primary Functions:
#   • test_login_unauthorized()
#   • test_login_success()
# ==============================================================================

# Import TestClient from fastapi.testclient for module operations
from fastapi.testclient import TestClient
# Import app from app.main for module operations
from app.main import app

# Set client variable to store client value
client = TestClient(app)


# Define test_login_unauthorized function to handle test login unauthorized
def test_login_unauthorized():
    # Set response variable to store response value
    response = client.post("/api/v1/auth/login", json={
        # Execute statement to process data and maintain state
        "username": "unknown_user"
    # Execute statement to process data and maintain state
    })

    # Execute statement to process data and maintain state
    assert response.status_code == 401
    # Execute statement to process data and maintain state
    assert response.json()["detail"] == "Unauthorized User"


# Define test_login_success function to handle test login success
def test_login_success():
    # make sure user exists in DB
    response = client.post("/api/v1/auth/login", json={
        # Execute statement to process data and maintain state
        "username": "abhishek"
    # Execute statement to process data and maintain state
    })

    # Execute statement to process data and maintain state
    assert response.status_code == 200
    # Execute statement to process data and maintain state
    assert "message" in response.json()
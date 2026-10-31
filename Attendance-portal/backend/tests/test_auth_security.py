# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEST_AUTH_SECURITY.PY
# Path: Attendance-portal/backend/tests/test_auth_security.py
# Purpose: Backend module.
# Classes / Data Models:
#   • AuthSecurityTests
# ==============================================================================

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.v1.endpoints.auth import router as auth_router
from app.core.dependencies import get_current_user
from app.services import auth_service


app = FastAPI()
app.include_router(auth_router, prefix="/api/v1/auth")
client = TestClient(app)


class AuthSecurityTests(unittest.TestCase):
    def test_password_change_requires_authentication(self):
        for endpoint in ("recover-password", "set-first-password"):
            with self.subTest(endpoint=endpoint):
                response = client.post(
                    f"/api/v1/auth/{endpoint}",
                    json={"email": "employee@example.com", "new_password": "NewPassword@2026"},
                )
                self.assertEqual(response.status_code, 401)

    def test_password_change_cannot_target_another_account(self):
        current_user = SimpleNamespace(email="employee@example.com", emp_code="EMP001")
        with patch.dict(app.dependency_overrides, {get_current_user: lambda: current_user}):
            response = client.post(
                "/api/v1/auth/recover-password",
                json={"email": "EMP002", "new_password": "NewPassword@2026"},
            )

        self.assertEqual(response.status_code, 403)

    def test_legacy_master_otp_is_rejected_without_active_code(self):
        user = SimpleNamespace(email="employee@example.com", emp_code="EMP001", role="employee")

        class FakeQuery:
            def filter(self, *_args):
                return self

            def first(self):
                return user

        class FakeSession:
            def query(self, _model):
                return FakeQuery()

        with patch.object(auth_service, "get_latest_otp", return_value=None):
            with self.assertRaises(HTTPException) as exc:
                auth_service.verify_user_otp(FakeSession(), user.email, "123456")

        self.assertEqual(exc.exception.status_code, 400)

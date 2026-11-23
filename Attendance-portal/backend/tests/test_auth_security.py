# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEST_AUTH_SECURITY.PY
# Path: Attendance-portal/backend/tests/test_auth_security.py
# Purpose: Backend module.
# Classes / Data Models:
#   • AuthSecurityTests
# ==============================================================================

# Import module unittest for system functionality
import unittest
# Import SimpleNamespace from types for module operations
from types import SimpleNamespace
# Import patch from unittest.mock for module operations
from unittest.mock import patch

# Import FastAPI, HTTPException from fastapi for module operations
from fastapi import FastAPI, HTTPException
# Import TestClient from fastapi.testclient for module operations
from fastapi.testclient import TestClient

# Import router as auth_router from app.api.v1.endpoints.auth for module operations
from app.api.v1.endpoints.auth import router as auth_router
# Import get_current_user from app.core.dependencies for module operations
from app.core.dependencies import get_current_user
# Import auth_service from app.services for module operations
from app.services import auth_service


# Set app variable to store app value
app = FastAPI()
# Invoke app.include_router to perform operational action
app.include_router(auth_router, prefix="/api/v1/auth")
# Set client variable to store client value
client = TestClient(app)


# Define class AuthSecurityTests inheriting from unittest.TestCase
class AuthSecurityTests(unittest.TestCase):
    # Define test_password_change_requires_authentication function to handle test password change requires authentication
    def test_password_change_requires_authentication(self):
        # Iterate through items in sequence loop
        for endpoint in ("recover-password", "set-first-password"):
            # Acquire context manager resource for enclosed block
            with self.subTest(endpoint=endpoint):
                # Set response variable to store response value
                response = client.post(
                    # Execute statement to process data and maintain state
                    f"/api/v1/auth/{endpoint}",
                    # Set json variable to store json value
                    json={"email": "employee@example.com", "new_password": "NewPassword@2026"},
                # Execute statement to process data and maintain state
                )
                # Invoke self.assertEqual to perform operational action
                self.assertEqual(response.status_code, 401)

    # Define test_password_change_cannot_target_another_account function to handle test password change cannot target another account
    def test_password_change_cannot_target_another_account(self):
        # Set current_user variable to store current user value
        current_user = SimpleNamespace(email="employee@example.com", emp_code="EMP001")
        # Acquire context manager resource for enclosed block
        with patch.dict(app.dependency_overrides, {get_current_user: lambda: current_user}):
            # Set response variable to store response value
            response = client.post(
                # Execute statement to process data and maintain state
                "/api/v1/auth/recover-password",
                # Set json variable to store json value
                json={"email": "EMP002", "new_password": "NewPassword@2026"},
            # Execute statement to process data and maintain state
            )

        # Invoke self.assertEqual to perform operational action
        self.assertEqual(response.status_code, 403)

    # Define test_legacy_master_otp_is_rejected_without_active_code function to handle test legacy master otp is rejected without active code
    def test_legacy_master_otp_is_rejected_without_active_code(self):
        # Set user variable to store user value
        user = SimpleNamespace(email="employee@example.com", emp_code="EMP001", role="employee")

        # Define class FakeQuery to encapsulate data and behavior
        class FakeQuery:
            # Define filter function to handle filter
            def filter(self, *_args):
                # Return computed result or response payload to caller
                return self

            # Define first function to handle first
            def first(self):
                # Return computed result or response payload to caller
                return user

        # Define class FakeSession to encapsulate data and behavior
        class FakeSession:
            # Define query function to handle query
            def query(self, _model):
                # Return computed result or response payload to caller
                return FakeQuery()

        # Acquire context manager resource for enclosed block
        with patch.object(auth_service, "get_latest_otp", return_value=None):
            # Acquire context manager resource for enclosed block
            with self.assertRaises(HTTPException) as exc:
                # Invoke auth_service.verify_user_otp to perform operational action
                auth_service.verify_user_otp(FakeSession(), user.email, "123456")

        # Invoke self.assertEqual to perform operational action
        self.assertEqual(exc.exception.status_code, 400)

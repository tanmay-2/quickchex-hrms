# ==============================================================================
# QUICKCHEX HRMS BACKEND - GRAPH_EMAIL_SERVICE.PY
# Path: Attendance-portal/backend/app/services/graph_email_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'graph_email_service'.
# Primary Functions:
#   • get_access_token()
#   • send_email_via_graph()
# ==============================================================================

# Import module requests for system functionality
import requests
# Import module os for system functionality
import os
# Import datetime, timedelta from datetime for module operations
from datetime import datetime, timedelta
# Import load_dotenv from dotenv for module operations
from dotenv import load_dotenv

# Invoke load_dotenv to perform operational action
load_dotenv()

# Set TENANT_ID variable to store TENANT ID value
TENANT_ID = os.getenv("TENANT_ID") or os.getenv("OUTLOOK_TENANT_ID")
# Set CLIENT_ID variable to store CLIENT ID value
CLIENT_ID = os.getenv("CLIENT_ID") or os.getenv("OUTLOOK_CLIENT_ID")
# Set CLIENT_SECRET variable to store CLIENT SECRET value
CLIENT_SECRET = os.getenv("CLIENT_SECRET") or os.getenv("OUTLOOK_CLIENT_SECRET")
# Set SENDER_EMAIL variable to store SENDER EMAIL value
SENDER_EMAIL = os.getenv("SENDER_EMAIL") or "aicogni@laesfera.co"
# Set _access_token variable to store  access token value
_access_token = None
# Set _token_expires_at variable to store  token expires at value
_token_expires_at = datetime.min



# 🔐 Get Access Token from Microsoft
def get_access_token():
    # Execute statement to process data and maintain state
    global _access_token, _token_expires_at
    # Evaluate condition to control execution branch
    if _access_token and datetime.utcnow() < _token_expires_at:
        # Return computed result or response payload to caller
        return _access_token

    # Set url variable to store url value
    url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"

    # Set payload variable to store payload value
    payload = {
        # Execute statement to process data and maintain state
        "client_id": CLIENT_ID,
        # Execute statement to process data and maintain state
        "scope": "https://graph.microsoft.com/.default",
        # Execute statement to process data and maintain state
        "client_secret": CLIENT_SECRET,
        # Execute statement to process data and maintain state
        "grant_type": "client_credentials",
    # Execute statement to process data and maintain state
    }

    # Set response variable to store response value
    response = requests.post(url, data=payload, timeout=10)

    # Evaluate condition to control execution branch
    if response.status_code != 200:
        # Invoke print to perform operational action
        print("Token Error:", response.text)
        # Return computed result or response payload to caller
        return None

    # Set _access_token variable to store  access token value
    _access_token = response.json().get("access_token")
    # Set _token_expires_at variable to store  token expires at value
    _token_expires_at = datetime.utcnow() + timedelta(minutes=50)
    # Return computed result or response payload to caller
    return _access_token


# 📧 Send Email using Graph API
def send_email_via_graph(to_email: str, otp: str):
    # Set access_token variable to store access token value
    access_token = get_access_token()

    # Check if target condition is false or object is missing
    if not access_token:
        # Invoke print to perform operational action
        print("Failed to get access token from Microsoft Graph API")
        # Return computed result or response payload to caller
        return False

    # Set sender variable to store sender value
    sender = SENDER_EMAIL or "aicogni@laesfera.co"
    # Set url variable to store url value
    url = f"https://graph.microsoft.com/v1.0/users/{sender}/sendMail"

    # Set headers variable to store headers value
    headers = {
        # Execute statement to process data and maintain state
        "Authorization": f"Bearer {access_token}",
        # Execute statement to process data and maintain state
        "Content-Type": "application/json"
    # Execute statement to process data and maintain state
    }

    # Set body variable to store body value
    body = {
        # Execute statement to process data and maintain state
        "message": {
            # Execute statement to process data and maintain state
            "subject": f"Your Quickchex SSO Verification Code ({datetime.utcnow().strftime('%Y%m%d%H%M%S')}): {otp}",
            # Execute statement to process data and maintain state
            "body": {
                # Execute statement to process data and maintain state
                "contentType": "HTML",
                # Execute statement to process data and maintain state
                "content": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                        <h2 style="color: #4f46e5; margin-top: 0;">Identity Verification Code</h2>
                        <p style="color: #334155; font-size: 15px;">Your single sign-on verification code for <b>Quickchex HRMS</b> is:</p>
                        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">{otp}</span>
                        </div>
                        <p style="color: #64748b; font-size: 13px;">This code is valid for 10 minutes. If you did not request this login, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Sent from <b>aicogni@laesfera.co</b> via Microsoft Outlook Graph API</p>
                    </div>
                """
            # Execute statement to process data and maintain state
            },
            # Execute statement to process data and maintain state
            "toRecipients": [
                # Execute statement to process data and maintain state
                {
                    # Execute statement to process data and maintain state
                    "emailAddress": {
                        # Execute statement to process data and maintain state
                        "address": to_email
                    # Execute statement to process data and maintain state
                    }
                # Execute statement to process data and maintain state
                }
            # Execute statement to process data and maintain state
            ]
        # Execute statement to process data and maintain state
        }
    # Execute statement to process data and maintain state
    }

    # Set response variable to store response value
    response = requests.post(url, headers=headers, json=body, timeout=10)

    # Evaluate condition to control execution branch
    if response.status_code == 202:
        # Invoke print to perform operational action
        print(f"Email sent successfully to {to_email} via Graph API (Sender: {sender})")
        # Return computed result or response payload to caller
        return True
    # Execute fallback branch when conditions are not met
    else:
        # Invoke print to perform operational action
        print("Graph Email Error:", response.text)
        # Return computed result or response payload to caller
        return False
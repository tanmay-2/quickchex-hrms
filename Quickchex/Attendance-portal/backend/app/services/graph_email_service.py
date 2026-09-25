import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

TENANT_ID = os.getenv("TENANT_ID")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
SENDER_EMAIL = os.getenv("SENDER_EMAIL") or "aicogni@laesfera.co"
_access_token = None
_token_expires_at = datetime.min


# 🔐 Get Access Token from Microsoft
def get_access_token():
    global _access_token, _token_expires_at
    if _access_token and datetime.utcnow() < _token_expires_at:
        return _access_token

    url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"

    payload = {
        "client_id": CLIENT_ID,
        "scope": "https://graph.microsoft.com/.default",
        "client_secret": CLIENT_SECRET,
        "grant_type": "client_credentials",
    }

    response = requests.post(url, data=payload, timeout=10)

    if response.status_code != 200:
        print("Token Error:", response.text)
        return None

    _access_token = response.json().get("access_token")
    _token_expires_at = datetime.utcnow() + timedelta(minutes=50)
    return _access_token


# 📧 Send Email using Graph API
def send_email_via_graph(to_email: str, otp: str):
    access_token = get_access_token()

    if not access_token:
        print("Failed to get access token from Microsoft Graph API")
        return False

    sender = SENDER_EMAIL or "aicogni@laesfera.co"
    url = f"https://graph.microsoft.com/v1.0/users/{sender}/sendMail"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    body = {
        "message": {
            "subject": f"Your Quickchex SSO Verification Code ({datetime.utcnow().strftime('%Y%m%d%H%M%S')}): {otp}",
            "body": {
                "contentType": "HTML",
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
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": to_email
                    }
                }
            ]
        }
    }

    response = requests.post(url, headers=headers, json=body, timeout=10)

    if response.status_code == 202:
        print(f"Email sent successfully to {to_email} via Graph API (Sender: {sender})")
        return True
    else:
        print("Graph Email Error:", response.text)
        return False
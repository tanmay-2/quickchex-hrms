import secrets
import os
from dotenv import load_dotenv

load_dotenv()

def generate_otp():
    return f"{secrets.randbelow(900000) + 100000}"


def send_otp_email(to_email: str, otp: str):
    print("Sending email to:", to_email)
    
    # Try Microsoft Graph API first (Recommended for Corporate Outlook)
    try:
        from app.services.graph_email_service import send_email_via_graph
        graph_sent = send_email_via_graph(to_email, otp)
        if graph_sent:
            print("[GRAPH API] OTP email delivered successfully to:", to_email)
            return True
    except Exception as ge:
        print("[GRAPH API WARN]:", ge)

    # SMTP AUTH is disabled for this Microsoft 365 tenant. Do not retry it,
    # because that adds a long delay after Graph rejects the request.
    print("[EMAIL] Graph delivery failed; SMTP fallback is disabled", flush=True)
    return False
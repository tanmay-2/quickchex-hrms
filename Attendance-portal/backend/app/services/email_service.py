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

    # Attempt SMTP fallback only if explicitly enabled or if using an alternative SMTP provider
    smtp_host = os.getenv("EMAIL_HOST")
    smtp_user = os.getenv("EMAIL_USER")
    smtp_pass = os.getenv("EMAIL_PASS")
    smtp_port = int(os.getenv("EMAIL_PORT", "587"))
    enable_smtp = os.getenv("ENABLE_SMTP_FALLBACK", "false").strip().lower() in ("true", "1")

    # If alternative SMTP provider is specified or fallback is explicitly allowed
    if (enable_smtp or (smtp_host and "office365" not in smtp_host.lower())) and smtp_host and smtp_user and smtp_pass:
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Your Quickchex HRMS Verification Code: {otp}"
            msg["From"] = os.getenv("SENDER_EMAIL", smtp_user)
            msg["To"] = to_email

            html_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4F46E5;">Quickchex HRMS Verification</h2>
                <p>Your one-time password (OTP) is:</p>
                <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1E293B; margin: 16px 0;">{otp}</div>
                <p style="color: #64748B; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
            """
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            print("[SMTP] OTP email delivered via fallback SMTP to:", to_email)
            return True
        except Exception as se:
            print("[SMTP FALLBACK ERROR]:", se)

    print("[EMAIL] Graph delivery failed and no alternative SMTP fallback was available.", flush=True)
    return False
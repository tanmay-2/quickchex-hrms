# ==============================================================================
# QUICKCHEX HRMS BACKEND - EMAIL_SERVICE.PY
# Path: Attendance-portal/backend/app/services/email_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'email_service'.
# Primary Functions:
#   • generate_otp()
#   • send_otp_email()
# ==============================================================================

# Import module secrets for system functionality
import secrets
# Import module os for system functionality
import os
# Import load_dotenv from dotenv for module operations
from dotenv import load_dotenv

# Invoke load_dotenv to perform operational action
load_dotenv()

# Define generate_otp function to handle generate otp
def generate_otp():
    # Return computed result or response payload to caller
    return f"{secrets.randbelow(900000) + 100000}"


# Define send_otp_email function to handle send otp email
def send_otp_email(to_email: str, otp: str):
    # Invoke print to perform operational action
    print("Sending email to:", to_email)
    
    # Try Microsoft Graph API first (Recommended for Corporate Outlook)
    try:
        # Import send_email_via_graph from app.services.graph_email_service for module operations
        from app.services.graph_email_service import send_email_via_graph
        # Set graph_sent variable to store graph sent value
        graph_sent = send_email_via_graph(to_email, otp)
        # Evaluate condition to control execution branch
        if graph_sent:
            # Invoke print to perform operational action
            print("[GRAPH API] OTP email delivered successfully to:", to_email)
            # Return computed result or response payload to caller
            return True
    # Catch and handle specific exception if raised
    except Exception as ge:
        # Invoke print to perform operational action
        print("[GRAPH API WARN]:", ge)

    # Attempt SMTP fallback only if explicitly enabled or if using an alternative SMTP provider
    smtp_host = os.getenv("EMAIL_HOST")
    # Set smtp_user variable to store smtp user value
    smtp_user = os.getenv("EMAIL_USER")
    # Set smtp_pass variable to store smtp pass value
    smtp_pass = os.getenv("EMAIL_PASS")
    # Set smtp_port variable to store smtp port value
    smtp_port = int(os.getenv("EMAIL_PORT", "587"))
    # Set enable_smtp variable to store enable smtp value
    enable_smtp = os.getenv("ENABLE_SMTP_FALLBACK", "false").strip().lower() in ("true", "1")

    # If alternative SMTP provider is specified or fallback is explicitly allowed
    if (enable_smtp or (smtp_host and "office365" not in smtp_host.lower())) and smtp_host and smtp_user and smtp_pass:
        # Begin guarded execution block to trap exceptions
        try:
            # Import module smtplib for system functionality
            import smtplib
            # Import MIMEText from email.mime.text for module operations
            from email.mime.text import MIMEText
            # Import MIMEMultipart from email.mime.multipart for module operations
            from email.mime.multipart import MIMEMultipart

            # Set msg variable to store msg value
            msg = MIMEMultipart("alternative")
            # Execute statement to process data and maintain state
            msg["Subject"] = f"Your Quickchex HRMS Verification Code: {otp}"
            # Execute statement to process data and maintain state
            msg["From"] = os.getenv("SENDER_EMAIL", smtp_user)
            # Execute statement to process data and maintain state
            msg["To"] = to_email

            # Set html_body variable to store html body value
            html_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4F46E5;">Quickchex HRMS Verification</h2>
                <p>Your one-time password (OTP) is:</p>
                <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1E293B; margin: 16px 0;">{otp}</div>
                <p style="color: #64748B; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
            """
            # Invoke msg.attach to perform operational action
            msg.attach(MIMEText(html_body, "html"))

            # Acquire context manager resource for enclosed block
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                # Invoke server.starttls to perform operational action
                server.starttls()
                # Invoke server.login to perform operational action
                server.login(smtp_user, smtp_pass)
                # Invoke server.send_message to perform operational action
                server.send_message(msg)
            # Invoke print to perform operational action
            print("[SMTP] OTP email delivered via fallback SMTP to:", to_email)
            # Return computed result or response payload to caller
            return True
        # Catch and handle specific exception if raised
        except Exception as se:
            # Invoke print to perform operational action
            print("[SMTP FALLBACK ERROR]:", se)

    # Invoke print to perform operational action
    print("[EMAIL] Graph delivery failed and no alternative SMTP fallback was available.", flush=True)
    # Return computed result or response payload to caller
    return False
# ==============================================================================
# QUICKCHEX HRMS BACKEND - POLICY_GENERATOR.PY
# Path: Attendance-portal/backend/app/services/policy_generator.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'policy_generator'.
# Primary Functions:
#   • sanitize_filename()
#   • generate_policy_pdf()
#   • ensure_policy_file_exists()
# ==============================================================================

# Import module re for system functionality
import re
# Import Path from pathlib for module operations
from pathlib import Path
# Import UPLOAD_ROOT from app.core.storage for module operations
from app.core.storage import UPLOAD_ROOT


# Define sanitize_filename function to handle sanitize filename
def sanitize_filename(name: str) -> str:
    # Set cleaned variable to store cleaned value
    cleaned = re.sub(r"[^\w\s-]", "", str(name or "policy")).strip().lower()
    # Return computed result or response payload to caller
    return re.sub(r"[-\s]+", "_", cleaned) or "policy"


# Define generate_policy_pdf function to handle generate policy pdf
def generate_policy_pdf(policy, target_path: Path) -> Path:
    """
    Generates a professional, branded company policy PDF document using PyMuPDF.
    Ensures that policies always have a valid, viewable PDF file on disk even
    across container restarts on ephemeral environments like Render.
    """
    try:
        # Import module pymupdf for system functionality
        import pymupdf
    # Catch and handle specific exception if raised
    except ImportError:
        # Import module fitz as pymupdf for system functionality
        import fitz as pymupdf

    # Invoke target_path.parent.mkdir to perform operational action
    target_path.parent.mkdir(parents=True, exist_ok=True)

    # Set doc variable to store doc value
    doc = pymupdf.open()
    # A4 Dimensions: 595 x 842 points
    page = doc.new_page(width=595, height=842)

    # Palette
    c_primary = (124 / 255, 58 / 255, 237 / 255)      # #7c3aed
    c_dark = (15 / 255, 23 / 255, 42 / 255)            # #0f172a
    c_body = (51 / 255, 65 / 255, 85 / 255)            # #334155
    c_muted = (100 / 255, 116 / 255, 139 / 255)        # #64748b
    c_border = (226 / 255, 232 / 255, 240 / 255)      # #e2e8f0
    c_bg_light = (248 / 255, 250 / 255, 252 / 255)    # #f8fafc

    # Header Purple Band
    page.draw_rect(pymupdf.Rect(0, 0, 595, 60), color=None, fill=c_primary)
    # Execute statement to process data and maintain state
    page.insert_text(
        # Execute statement to process data and maintain state
        (40, 36),
        # Execute statement to process data and maintain state
        "LA ESFERA INFOTECH  |  OFFICIAL COMPANY POLICY",
        # Set fontsize variable to store fontsize value
        fontsize=12,
        # Set fontname variable to store fontname value
        fontname="helv",
        # Set color variable to store color value
        color=(1, 1, 1),
    # Execute statement to process data and maintain state
    )

    # Document Title
    title = getattr(policy, "name", None) or getattr(policy, "title", "Company Policy")
    # Execute statement to process data and maintain state
    page.insert_text(
        # Execute statement to process data and maintain state
        (40, 100),
        # Invoke str to perform operational action
        str(title),
        # Set fontsize variable to store fontsize value
        fontsize=22,
        # Set fontname variable to store fontname value
        fontname="helv",
        # Set color variable to store color value
        color=c_dark,
    # Execute statement to process data and maintain state
    )

    # Metadata Summary Box
    meta_rect = pymupdf.Rect(40, 120, 555, 185)
    # Invoke page.draw_rect to perform operational action
    page.draw_rect(meta_rect, color=c_border, fill=c_bg_light)

    # Set category variable to store category value
    category = getattr(policy, "category", "General") or "General"
    # Set dept variable to store dept value
    dept = getattr(policy, "department", "All Department") or "All Department"
    # Set version variable to store version value
    version = getattr(policy, "version_number", "1.0") or "1.0"
    # Set status variable to store status value
    status = getattr(policy, "status", "Published") or "Published"
    # Set pub_date variable to store pub date value
    pub_date = getattr(policy, "publish_date", None) or "Current"
    # Set upd_date variable to store upd date value
    upd_date = getattr(policy, "updated_date", None) or "Current"

    # Invoke page.insert_text to perform operational action
    page.insert_text((55, 142), f"Category: {category}", fontsize=10, fontname="helv", color=c_body)
    # Invoke page.insert_text to perform operational action
    page.insert_text((230, 142), f"Department: {dept}", fontsize=10, fontname="helv", color=c_body)
    # Invoke page.insert_text to perform operational action
    page.insert_text((410, 142), f"Status: {status}", fontsize=10, fontname="helv", color=c_body)

    # Invoke page.insert_text to perform operational action
    page.insert_text((55, 165), f"Version: {version}", fontsize=10, fontname="helv", color=c_muted)
    # Invoke page.insert_text to perform operational action
    page.insert_text((230, 165), f"Published: {pub_date}", fontsize=10, fontname="helv", color=c_muted)
    # Invoke page.insert_text to perform operational action
    page.insert_text((410, 165), f"Updated: {upd_date}", fontsize=10, fontname="helv", color=c_muted)

    # Section 1: Overview & Scope
    y = 215
    # Invoke page.insert_text to perform operational action
    page.insert_text((40, y), "1. Executive Summary & Objective", fontsize=13, fontname="helv", color=c_primary)
    # Invoke page.draw_line to perform operational action
    page.draw_line((40, y + 4), (555, y + 4), color=c_border, width=1)

    # Set description variable to store description value
    description = getattr(policy, "description", "") or "This policy sets forth operational guidelines and standards."
    # Set desc_rect variable to store desc rect value
    desc_rect = pymupdf.Rect(40, y + 14, 555, y + 65)
    # Execute statement to process data and maintain state
    page.insert_textbox(
        # Execute statement to process data and maintain state
        desc_rect,
        # Invoke str to perform operational action
        str(description),
        # Set fontsize variable to store fontsize value
        fontsize=10,
        # Set fontname variable to store fontname value
        fontname="helv",
        # Set color variable to store color value
        color=c_body,
    # Execute statement to process data and maintain state
    )

    # Section 2: Code of Conduct & Core Standards
    y = 295
    # Invoke page.insert_text to perform operational action
    page.insert_text((40, y), "2. Professional Standards & Workplace Conduct", fontsize=13, fontname="helv", color=c_primary)
    # Invoke page.draw_line to perform operational action
    page.draw_line((40, y + 4), (555, y + 4), color=c_border, width=1)

    # Set conduct_text variable to store conduct text value
    conduct_text = (
        # Execute statement to process data and maintain state
        "All employees, contractors, and managers represent La Esfera Infotech and are expected to uphold the "
        # Execute statement to process data and maintain state
        "highest standards of professional conduct, integrity, mutual respect, and ethical decision-making.\n\n"
        # Execute statement to process data and maintain state
        "• Mutual Respect: Discrimination, harassment, or unprofessional conduct in any form is strictly prohibited.\n"
        # Execute statement to process data and maintain state
        "• Confidentiality: Protect proprietary systems, customer records, and internal technical documentation.\n"
        # Execute statement to process data and maintain state
        "• Conflict of Interest: Disclose any secondary commercial engagements or personal interests promptly."
    # Execute statement to process data and maintain state
    )
    # Set conduct_rect variable to store conduct rect value
    conduct_rect = pymupdf.Rect(40, y + 14, 555, y + 115)
    # Invoke page.insert_textbox to perform operational action
    page.insert_textbox(conduct_rect, conduct_text, fontsize=9.5, fontname="helv", color=c_body)

    # Section 3: Remote Work, Attendance & Security Protocols
    y = 425
    # Invoke page.insert_text to perform operational action
    page.insert_text((40, y), "3. Operational Protocols, Security & Compliance", fontsize=13, fontname="helv", color=c_primary)
    # Invoke page.draw_line to perform operational action
    page.draw_line((40, y + 4), (555, y + 4), color=c_border, width=1)

    # Set security_text variable to store security text value
    security_text = (
        # Execute statement to process data and maintain state
        "• Attendance & Regularization: Log working hours via the official Quickchex HRMS portal promptly.\n"
        # Execute statement to process data and maintain state
        "• Device & Access Security: Maintain secure passwords, MFA credentials, and lock workstations when away.\n"
        # Execute statement to process data and maintain state
        "• Compliance & Enforcement: Violations are reviewed by HR and Management under progressive discipline."
    # Execute statement to process data and maintain state
    )
    # Set sec_rect variable to store sec rect value
    sec_rect = pymupdf.Rect(40, y + 14, 555, y + 95)
    # Invoke page.insert_textbox to perform operational action
    page.insert_textbox(sec_rect, security_text, fontsize=9.5, fontname="helv", color=c_body)

    # Section 4: Administration & Contact
    y = 535
    # Invoke page.insert_text to perform operational action
    page.insert_text((40, y), "4. Inquiries & HR Support", fontsize=13, fontname="helv", color=c_primary)
    # Invoke page.draw_line to perform operational action
    page.draw_line((40, y + 4), (555, y + 4), color=c_border, width=1)

    # Set inquiry_text variable to store inquiry text value
    inquiry_text = (
        # Execute statement to process data and maintain state
        "For clarifications, exceptions, or reporting policy questions, contact the HR Operations team via the "
        # Execute statement to process data and maintain state
        "HRMS Portal or email support@laesfera.co. This policy remains active and enforceable until updated."
    # Execute statement to process data and maintain state
    )
    # Set inq_rect variable to store inq rect value
    inq_rect = pymupdf.Rect(40, y + 14, 555, y + 60)
    # Invoke page.insert_textbox to perform operational action
    page.insert_textbox(inq_rect, inquiry_text, fontsize=9.5, fontname="helv", color=c_body)

    # Sign-off box
    sign_rect = pymupdf.Rect(40, 615, 555, 680)
    # Invoke page.draw_rect to perform operational action
    page.draw_rect(sign_rect, color=c_border, fill=c_bg_light)
    # Invoke page.insert_text to perform operational action
    page.insert_text((55, 638), "Authorized By: HR Administration & Operations", fontsize=10, fontname="helv", color=c_dark)
    # Invoke page.insert_text to perform operational action
    page.insert_text((55, 658), f"Applicable To: {dept} — La Esfera Infotech", fontsize=9.5, fontname="helv", color=c_muted)
    # Invoke page.insert_text to perform operational action
    page.insert_text((400, 658), "Document Status: Verified", fontsize=9.5, fontname="helv", color=c_primary)

    # Footer
    page.draw_line((40, 785), (555, 785), color=c_border, width=1)
    # Execute statement to process data and maintain state
    page.insert_text(
        # Execute statement to process data and maintain state
        (40, 805),
        # Execute statement to process data and maintain state
        "Confidential  |  La Esfera Infotech Pvt. Ltd.  |  Generated via HRMS Document Management",
        # Set fontsize variable to store fontsize value
        fontsize=8.5,
        # Set fontname variable to store fontname value
        fontname="helv",
        # Set color variable to store color value
        color=c_muted,
    # Execute statement to process data and maintain state
    )

    # Invoke doc.save to perform operational action
    doc.save(str(target_path))
    # Invoke doc.close to perform operational action
    doc.close()
    # Return computed result or response payload to caller
    return target_path


# Define ensure_policy_file_exists function to handle ensure policy file exists
def ensure_policy_file_exists(policy) -> Path:
    """
    Checks if the physical PDF for a policy exists in UPLOAD_ROOT/policies.
    If missing, automatically generates it so that StaticFiles and download endpoints
    always return a valid PDF.
    """
    policies_dir = UPLOAD_ROOT / "policies"
    # Invoke policies_dir.mkdir to perform operational action
    policies_dir.mkdir(parents=True, exist_ok=True)

    # Set file_path_str variable to store file path str value
    file_path_str = getattr(policy, "file_path", "") or ""
    # Set filename variable to store filename value
    filename = None
    # Evaluate condition to control execution branch
    if file_path_str:
        # Set cleaned variable to store cleaned value
        cleaned = file_path_str.replace("\\", "/").strip().lstrip("/")
        # Set filename variable to store filename value
        filename = Path(cleaned).name

    # Check if target condition is false or object is missing
    if not filename or filename == ".":
        # Set safe_name variable to store safe name value
        safe_name = sanitize_filename(getattr(policy, "name", "policy"))
        # Set filename variable to store filename value
        filename = f"{safe_name}_{getattr(policy, 'id', 1)}.pdf"

    # Set target_path variable to store target path value
    target_path = policies_dir / filename

    # Check if target condition is false or object is missing
    if not target_path.is_file() or target_path.stat().st_size == 0:
        # Invoke generate_policy_pdf to perform operational action
        generate_policy_pdf(policy, target_path)

    # Return computed result or response payload to caller
    return target_path

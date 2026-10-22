import re
from pathlib import Path
from app.core.storage import UPLOAD_ROOT


def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", str(name or "policy")).strip().lower()
    return re.sub(r"[-\s]+", "_", cleaned) or "policy"


def generate_policy_pdf(policy, target_path: Path) -> Path:
    """
    Generates a professional, branded company policy PDF document using PyMuPDF.
    Ensures that policies always have a valid, viewable PDF file on disk even
    across container restarts on ephemeral environments like Render.
    """
    try:
        import pymupdf
    except ImportError:
        import fitz as pymupdf

    target_path.parent.mkdir(parents=True, exist_ok=True)

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
    page.insert_text(
        (40, 36),
        "LA ESFERA INFOTECH  |  OFFICIAL COMPANY POLICY",
        fontsize=12,
        fontname="helv",
        color=(1, 1, 1),
    )

    # Document Title
    title = getattr(policy, "name", None) or getattr(policy, "title", "Company Policy")
    page.insert_text(
        (40, 100),
        str(title),
        fontsize=22,
        fontname="helv",
        color=c_dark,
    )

    # Metadata Summary Box
    meta_rect = pymupdf.Rect(40, 120, 555, 185)
    page.draw_rect(meta_rect, color=c_border, fill=c_bg_light)

    category = getattr(policy, "category", "General") or "General"
    dept = getattr(policy, "department", "All Department") or "All Department"
    version = getattr(policy, "version_number", "1.0") or "1.0"
    status = getattr(policy, "status", "Published") or "Published"
    pub_date = getattr(policy, "publish_date", None) or "Current"
    upd_date = getattr(policy, "updated_date", None) or "Current"

    page.insert_text((55, 142), f"Category: {category}", fontsize=10, fontname="helv", color=c_body)
    page.insert_text((230, 142), f"Department: {dept}", fontsize=10, fontname="helv", color=c_body)
    page.insert_text((410, 142), f"Status: {status}", fontsize=10, fontname="helv", color=c_body)

    page.insert_text((55, 165), f"Version: {version}", fontsize=10, fontname="helv", color=c_muted)
    page.insert_text((230, 165), f"Published: {pub_date}", fontsize=10, fontname="helv", color=c_muted)
    page.insert_text((410, 165), f"Updated: {upd_date}", fontsize=10, fontname="helv", color=c_muted)

    # Section 1: Overview & Scope
    y = 215
    page.insert_text((40, y), "1. Executive Summary & Objective", fontsize=13, fontname="helv", color=c_primary)
    page.draw_line((40, y + 4), (555, y + 4), color=c_border, width=1)

    description = getattr(policy, "description", "") or "This policy sets forth operational guidelines and standards."
    desc_rect = pymupdf.Rect(40, y + 14, 555, y + 65)
    page.insert_textbox(
        desc_rect,
        str(description),
        fontsize=10,
        fontname="helv",
        color=c_body,
    )

    # Section 2: Code of Conduct & Core Standards
    y = 295
    page.insert_text((40, y), "2. Professional Standards & Workplace Conduct", fontsize=13, fontname="helv", color=c_primary)
    page.draw_line((40, y + 4), (555, y + 4), color=c_border, width=1)

    conduct_text = (
        "All employees, contractors, and managers represent La Esfera Infotech and are expected to uphold the "
        "highest standards of professional conduct, integrity, mutual respect, and ethical decision-making.\n\n"
        "• Mutual Respect: Discrimination, harassment, or unprofessional conduct in any form is strictly prohibited.\n"
        "• Confidentiality: Protect proprietary systems, customer records, and internal technical documentation.\n"
        "• Conflict of Interest: Disclose any secondary commercial engagements or personal interests promptly."
    )
    conduct_rect = pymupdf.Rect(40, y + 14, 555, y + 115)
    page.insert_textbox(conduct_rect, conduct_text, fontsize=9.5, fontname="helv", color=c_body)

    # Section 3: Remote Work, Attendance & Security Protocols
    y = 425
    page.insert_text((40, y), "3. Operational Protocols, Security & Compliance", fontsize=13, fontname="helv", color=c_primary)
    page.draw_line((40, y + 4), (555, y + 4), color=c_border, width=1)

    security_text = (
        "• Attendance & Regularization: Log working hours via the official Quickchex HRMS portal promptly.\n"
        "• Device & Access Security: Maintain secure passwords, MFA credentials, and lock workstations when away.\n"
        "• Compliance & Enforcement: Violations are reviewed by HR and Management under progressive discipline."
    )
    sec_rect = pymupdf.Rect(40, y + 14, 555, y + 95)
    page.insert_textbox(sec_rect, security_text, fontsize=9.5, fontname="helv", color=c_body)

    # Section 4: Administration & Contact
    y = 535
    page.insert_text((40, y), "4. Inquiries & HR Support", fontsize=13, fontname="helv", color=c_primary)
    page.draw_line((40, y + 4), (555, y + 4), color=c_border, width=1)

    inquiry_text = (
        "For clarifications, exceptions, or reporting policy questions, contact the HR Operations team via the "
        "HRMS Portal or email support@laesfera.co. This policy remains active and enforceable until updated."
    )
    inq_rect = pymupdf.Rect(40, y + 14, 555, y + 60)
    page.insert_textbox(inq_rect, inquiry_text, fontsize=9.5, fontname="helv", color=c_body)

    # Sign-off box
    sign_rect = pymupdf.Rect(40, 615, 555, 680)
    page.draw_rect(sign_rect, color=c_border, fill=c_bg_light)
    page.insert_text((55, 638), "Authorized By: HR Administration & Operations", fontsize=10, fontname="helv", color=c_dark)
    page.insert_text((55, 658), f"Applicable To: {dept} — La Esfera Infotech", fontsize=9.5, fontname="helv", color=c_muted)
    page.insert_text((400, 658), "Document Status: Verified", fontsize=9.5, fontname="helv", color=c_primary)

    # Footer
    page.draw_line((40, 785), (555, 785), color=c_border, width=1)
    page.insert_text(
        (40, 805),
        "Confidential  |  La Esfera Infotech Pvt. Ltd.  |  Generated via HRMS Document Management",
        fontsize=8.5,
        fontname="helv",
        color=c_muted,
    )

    doc.save(str(target_path))
    doc.close()
    return target_path


def ensure_policy_file_exists(policy) -> Path:
    """
    Checks if the physical PDF for a policy exists in UPLOAD_ROOT/policies.
    If missing, automatically generates it so that StaticFiles and download endpoints
    always return a valid PDF.
    """
    policies_dir = UPLOAD_ROOT / "policies"
    policies_dir.mkdir(parents=True, exist_ok=True)

    file_path_str = getattr(policy, "file_path", "") or ""
    filename = None
    if file_path_str:
        cleaned = file_path_str.replace("\\", "/").strip().lstrip("/")
        filename = Path(cleaned).name

    if not filename or filename == ".":
        safe_name = sanitize_filename(getattr(policy, "name", "policy"))
        filename = f"{safe_name}_{getattr(policy, 'id', 1)}.pdf"

    target_path = policies_dir / filename

    if not target_path.is_file() or target_path.stat().st_size == 0:
        generate_policy_pdf(policy, target_path)

    return target_path

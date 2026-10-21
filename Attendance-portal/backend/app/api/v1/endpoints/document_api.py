from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import uuid
import re
from pathlib import Path
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.storage import UPLOAD_ROOT
from app.models.document import EmployeeDocument
from app.models.profile_model import Profile

router = APIRouter(tags=["Documents"])

UPLOAD_DIR = UPLOAD_ROOT / "documents"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

SINGLE_SLOT_CATEGORIES = {
    "pan_card",
    "aadhaar_card",
    "address_proof",
    "appointment_letter",
    "offer_letter",
    "experience_certificate",
    "relieving_letter",
}

def resolve_emp_code(emp_identifier: str, db: Session) -> str:
    """Helper to resolve emp_code if integer id was passed."""
    if not emp_identifier:
        return ""
    prof = db.query(Profile).filter(
        (Profile.emp_code == str(emp_identifier)) |
        (Profile.id == (int(emp_identifier) if str(emp_identifier).isdigit() else -1))
    ).first()
    if prof:
        return prof.emp_code
    return str(emp_identifier)


def _safe_delete_disk_file(file_location: Optional[str]):
    """Safely removes an existing document file from disk to avoid orphan files."""
    if not file_location:
        return
    clean_rel = str(file_location).replace("\\", "/").lstrip("/")
    base_name = os.path.basename(clean_rel)
    candidates = [
        UPLOAD_DIR / base_name,
        UPLOAD_ROOT / "documents" / base_name,
        UPLOAD_ROOT / clean_rel,
        Path(file_location),
    ]
    for p in candidates:
        try:
            p_obj = Path(p)
            if p_obj.exists() and p_obj.is_file():
                p_obj.unlink()
                break
        except Exception as e:
            print(f"Warning: could not delete old file {p}: {e}")


def _verify_document_access(current_user: Profile, target_code: str, db: Session):
    """Enforces that employees can only view/upload/delete their own documents, while Admins/HR/Supervisors can manage them."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    
    role = (current_user.role or "").strip().lower()
    if role in ("admin", "superadmin", "hr", "administrator"):
        return True

    clean_target = str(target_code or "").strip().lower()
    clean_user = str(current_user.emp_code or "").strip().lower()
    if clean_user and clean_user == clean_target:
        return True

    # Allow direct supervisor/manager access
    target_prof = db.query(Profile).filter(Profile.emp_code.ilike(target_code)).first()
    if target_prof and target_prof.reporting_supervisor:
        if str(target_prof.reporting_supervisor).strip().lower() == clean_user:
            return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Forbidden: You do not have permission to access or modify this employee's documents."
    )


# ----------------- DIRECT/LEGACY PROFILE DOCUMENT ROUTES ----------------- #

@router.get("/profile/employees/{emp_identifier}/documents")
@router.get("/profile/employees/{emp_identifier}/documents/")
def list_employee_documents(
    emp_identifier: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    emp_code = resolve_emp_code(emp_identifier, db)
    _verify_document_access(current_user, emp_code, db)
    docs = db.query(EmployeeDocument).filter(
        (EmployeeDocument.emp_code == emp_code) | (EmployeeDocument.emp_code == str(emp_identifier))
    ).order_by(EmployeeDocument.uploaded_at.desc()).all()
    results = []
    for d in docs:
        results.append({
            "id": d.id,
            "emp_code": d.emp_code,
            "name": d.file_name,
            "file_name": d.file_name,
            "url": f"/{d.file_location.lstrip('/')}",
            "file_location": d.file_location,
            "category": getattr(d, "category", "other_documents") or "other_documents",
            "size": getattr(d, "file_size", 0) or 0,
            "uploaded_at": d.uploaded_at.strftime("%Y-%m-%d %H:%M:%S") if d.uploaded_at else ""
        })
    return results

@router.post("/profile/employees/{emp_identifier}/documents/upload")
@router.post("/profile/employees/{emp_identifier}/documents/upload/")
async def upload_employee_documents(
    emp_identifier: str,
    files: List[UploadFile] = File(...),
    category: Optional[str] = Form("other_documents"),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    emp_code = resolve_emp_code(emp_identifier, db)
    _verify_document_access(current_user, emp_code, db)
    clean_cat = (category or "other_documents").strip().lower()

    # If single-slot category, delete old documents of same category first
    if clean_cat in SINGLE_SLOT_CATEGORIES:
        old_docs = db.query(EmployeeDocument).filter(
            (EmployeeDocument.emp_code == emp_code) | (EmployeeDocument.emp_code == str(emp_identifier)),
            EmployeeDocument.category == clean_cat
        ).all()
        for old in old_docs:
            _safe_delete_disk_file(old.file_location)
            db.delete(old)
        if old_docs:
            db.flush()

    uploaded = []
    for f in files:
        file_ext = os.path.splitext(f.filename)[1]
        unique_name = f"{uuid.uuid4()}{file_ext}"
        saved_path = UPLOAD_DIR / unique_name
        
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)
            
        file_size = os.path.getsize(saved_path)
        rel_path = f"uploads/documents/{unique_name}"
        
        doc = EmployeeDocument(
            emp_code=emp_code,
            file_name=f.filename,
            file_location=rel_path,
            category=clean_cat,
            file_size=file_size
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        uploaded.append(doc.id)
        
    return {"status": "success", "uploaded_count": len(uploaded)}

@router.delete("/profile/employees/{emp_identifier}/documents/{doc_id}")
@router.delete("/profile/employees/{emp_identifier}/documents/{doc_id}/")
def delete_profile_employee_document(
    emp_identifier: str,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    doc = db.query(EmployeeDocument).filter(EmployeeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    _verify_document_access(current_user, doc.emp_code, db)
    _safe_delete_disk_file(doc.file_location)
    db.delete(doc)
    db.commit()
    return {"status": "success", "message": "Document deleted"}

# ----------------- STANDALONE /api/v1/document ROUTES ----------------- #

@router.post("/upload")
async def legacy_upload_document(
    file: UploadFile = File(...),
    emp_code: str = Form(...),
    file_name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    overwrite: Optional[bool] = Form(True),
    replace_doc_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    resolved_emp_code = resolve_emp_code(emp_code, db)
    _verify_document_access(current_user, resolved_emp_code, db)
    try:
        # Extract category if tagged in filename e.g. "[aadhaar_card] doc.pdf"
        raw_name = file_name or file.filename or "document"
        clean_category = (category or "").strip().lower()
        tag_match = re.match(r"^\[([a-zA-Z0-9_]+)\]\s*(.*)$", raw_name)
        if tag_match:
            if not clean_category or clean_category == "other_documents":
                clean_category = tag_match.group(1).lower()
            raw_name = tag_match.group(2)

        if not clean_category:
            clean_category = "other_documents"

        clean_file_name = raw_name.strip() if raw_name.strip() else file.filename

        # Overwrite logic: if replace_doc_id provided, or category in SINGLE_SLOT_CATEGORIES and overwrite=True
        should_overwrite = (
            replace_doc_id is not None
            or (overwrite and clean_category in SINGLE_SLOT_CATEGORIES)
        )

        old_docs_to_delete = []
        if replace_doc_id:
            old_doc = db.query(EmployeeDocument).filter(
                EmployeeDocument.id == replace_doc_id,
                (EmployeeDocument.emp_code == resolved_emp_code) | (EmployeeDocument.emp_code == emp_code)
            ).first()
            if old_doc:
                old_docs_to_delete.append(old_doc)
        elif should_overwrite and clean_category != "other_documents":
            old_docs_to_delete = db.query(EmployeeDocument).filter(
                (EmployeeDocument.emp_code == resolved_emp_code) | (EmployeeDocument.emp_code == emp_code),
                EmployeeDocument.category == clean_category
            ).all()

        # Delete earlier physical file(s) from disk
        for old_doc in old_docs_to_delete:
            _safe_delete_disk_file(old_doc.file_location)
            db.delete(old_doc)

        if old_docs_to_delete:
            db.flush()

        # Save new file to disk
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)
        db_file_path = f"uploads/documents/{unique_filename}"

        new_doc = EmployeeDocument(
            emp_code=resolved_emp_code,
            file_name=clean_file_name,
            file_location=db_file_path,
            category=clean_category,
            file_size=file_size
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)

        return {"status": "success", "message": "File uploaded successfully", "data": new_doc}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{emp_code}")
def get_employee_documents(emp_code: str, db: Session = Depends(get_db)):
    resolved_code = resolve_emp_code(emp_code, db)
    docs = db.query(EmployeeDocument).filter(
        (EmployeeDocument.emp_code == resolved_code) | (EmployeeDocument.emp_code == emp_code)
    ).order_by(EmployeeDocument.uploaded_at.desc()).all()
    return docs

@router.delete("/{doc_id}")
def delete_employee_document_by_id(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(EmployeeDocument).filter(EmployeeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    _safe_delete_disk_file(doc.file_location)
    db.delete(doc)
    db.commit()
    return {"status": "success", "message": "Document deleted successfully"}
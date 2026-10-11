from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import uuid
import re
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.document import EmployeeDocument
from app.models.profile_model import Profile

router = APIRouter(tags=["Documents"])

UPLOAD_DIR = os.path.join("uploads", "documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def resolve_emp_code(emp_identifier: str, db: Session) -> str:
    """Helper to resolve emp_code if integer id was passed."""
    if not emp_identifier:
        return ""
    # Check if direct emp_code
    prof = db.query(Profile).filter(
        (Profile.emp_code == str(emp_identifier)) |
        (Profile.id == (int(emp_identifier) if str(emp_identifier).isdigit() else -1))
    ).first()
    if prof:
        return prof.emp_code
    return str(emp_identifier)


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
    docs = db.query(EmployeeDocument).filter(EmployeeDocument.emp_code == emp_code).order_by(EmployeeDocument.uploaded_at.desc()).all()
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
    uploaded = []
    for f in files:
        file_ext = os.path.splitext(f.filename)[1]
        unique_name = f"{uuid.uuid4()}{file_ext}"
        saved_path = os.path.join(UPLOAD_DIR, unique_name)
        
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)
            
        file_size = os.path.getsize(saved_path)
        rel_path = f"uploads/documents/{unique_name}"
        
        doc = EmployeeDocument(
            emp_code=emp_code,
            file_name=f.filename,
            file_location=rel_path,
            category=category or "other_documents",
            file_size=file_size
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        uploaded.append(doc.id)
        
    return {"status": "success", "uploaded_count": len(uploaded)}

@router.delete("/profile/employees/{emp_identifier}/documents/{doc_id}")
@router.delete("/profile/employees/{emp_identifier}/documents/{doc_id}/")
def delete_employee_document(
    emp_identifier: str,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    doc = db.query(EmployeeDocument).filter(EmployeeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    _verify_document_access(current_user, doc.emp_code, db)
    
    # Try to delete file from disk safely
    try:
        disk_path = os.path.join(doc.file_location)
        if os.path.exists(disk_path):
            os.remove(disk_path)
    except Exception:
        pass
        
    db.delete(doc)
    db.commit()
    return {"status": "success", "message": "Document deleted"}

# ----------------- STANDALONE /api/v1/document ROUTES ----------------- #

@router.post("/upload")
async def legacy_upload_document(
    file: UploadFile = File(...),
    emp_code: str = Form(...),
    file_name: str = Form(...),
    category: Optional[str] = Form("other_documents"),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    _verify_document_access(current_user, emp_code, db)
    try:
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)
        db_file_path = f"uploads/documents/{unique_filename}"

        new_doc = EmployeeDocument(
            emp_code=emp_code,
            file_name=file_name,
            file_location=db_file_path,
            category=category or "other_documents",
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
def get_employee_documents(
    emp_code: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return list_employee_documents(emp_code, db, current_user)
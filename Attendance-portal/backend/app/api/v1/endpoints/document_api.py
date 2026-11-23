# ==============================================================================
# QUICKCHEX HRMS BACKEND - DOCUMENT_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/document_api.py
# Purpose: FastAPI route controller handling 'document_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('/profile/employees/{emp_identifier}/documents') -> list_employee_documents()
#   • router.get('/profile/employees/{emp_identifier}/documents/') -> list_employee_documents()
#   • router.post('/profile/employees/{emp_identifier}/documents/upload') -> upload_employee_documents()
#   • router.post('/profile/employees/{emp_identifier}/documents/upload/') -> upload_employee_documents()
#   • router.delete('/profile/employees/{emp_identifier}/documents/{doc_id}') -> delete_profile_employee_document()
#   • router.delete('/profile/employees/{emp_identifier}/documents/{doc_id}/') -> delete_profile_employee_document()
#   • router.post('/upload') -> legacy_upload_document()
#   • router.get('/{emp_code}') -> get_employee_documents()
#   • ... and 1 more endpoints
# ==============================================================================

# Import APIRouter, UploadFile, File, Form, Depends, HTTPException, status from fastapi for module operations
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import List, Optional from typing for module operations
from typing import List, Optional
# Import module os for system functionality
import os
# Import module shutil for system functionality
import shutil
# Import module uuid for system functionality
import uuid
# Import module re for system functionality
import re
# Import Path from pathlib for module operations
from pathlib import Path
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import get_current_user from app.core.dependencies for module operations
from app.core.dependencies import get_current_user
# Import UPLOAD_ROOT from app.core.storage for module operations
from app.core.storage import UPLOAD_ROOT
# Import EmployeeDocument from app.models.document for module operations
from app.models.document import EmployeeDocument
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile

# Set router variable to store router value
router = APIRouter(tags=["Documents"])

# Set UPLOAD_DIR variable to store UPLOAD DIR value
UPLOAD_DIR = UPLOAD_ROOT / "documents"
# Invoke UPLOAD_DIR.mkdir to perform operational action
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Set SINGLE_SLOT_CATEGORIES variable to store SINGLE SLOT CATEGORIES value
SINGLE_SLOT_CATEGORIES = {
    # Execute statement to process data and maintain state
    "pan_card",
    # Execute statement to process data and maintain state
    "aadhaar_card",
    # Execute statement to process data and maintain state
    "address_proof",
    # Execute statement to process data and maintain state
    "appointment_letter",
    # Execute statement to process data and maintain state
    "offer_letter",
    # Execute statement to process data and maintain state
    "experience_certificate",
    # Execute statement to process data and maintain state
    "relieving_letter",
# Execute statement to process data and maintain state
}

# Define resolve_emp_code function to handle resolve emp code
def resolve_emp_code(emp_identifier: str, db: Session) -> str:
    """Helper to resolve emp_code if integer id was passed."""
    if not emp_identifier:
        # Return computed result or response payload to caller
        return ""
    # Initiate database query on specified model
    prof = db.query(Profile).filter(
        # Execute statement to process data and maintain state
        (Profile.emp_code == str(emp_identifier)) |
        # Execute statement to process data and maintain state
        (Profile.id == (int(emp_identifier) if str(emp_identifier).isdigit() else -1))
    # Execute statement to process data and maintain state
    ).first()
    # Evaluate condition to control execution branch
    if prof:
        # Return computed result or response payload to caller
        return prof.emp_code
    # Return computed result or response payload to caller
    return str(emp_identifier)


# Define _safe_delete_disk_file function to handle  safe delete disk file
def _safe_delete_disk_file(file_location: Optional[str]):
    """Safely removes an existing document file from disk to avoid orphan files."""
    if not file_location:
        # Return computed result or response payload to caller
        return
    # Set clean_rel variable to store clean rel value
    clean_rel = str(file_location).replace("\\", "/").lstrip("/")
    # Set base_name variable to store base name value
    base_name = os.path.basename(clean_rel)
    # Set candidates variable to store candidates value
    candidates = [
        # Execute statement to process data and maintain state
        UPLOAD_DIR / base_name,
        # Execute statement to process data and maintain state
        UPLOAD_ROOT / "documents" / base_name,
        # Execute statement to process data and maintain state
        UPLOAD_ROOT / clean_rel,
        # Invoke Path to perform operational action
        Path(file_location),
    # Execute statement to process data and maintain state
    ]
    # Iterate through items in sequence loop
    for p in candidates:
        # Begin guarded execution block to trap exceptions
        try:
            # Set p_obj variable to store p obj value
            p_obj = Path(p)
            # Evaluate condition to control execution branch
            if p_obj.exists() and p_obj.is_file():
                # Invoke p_obj.unlink to perform operational action
                p_obj.unlink()
                # Break out of current loop early
                break
        # Catch and handle specific exception if raised
        except Exception as e:
            # Invoke print to perform operational action
            print(f"Warning: could not delete old file {p}: {e}")


# Define _verify_document_access function to handle  verify document access
def _verify_document_access(current_user: Profile, target_code: str, db: Session):
    """Enforces that employees can only view/upload/delete their own documents, while Admins/HR/Supervisors can manage them."""
    if not current_user:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    
    # Set role variable to store role value
    role = (current_user.role or "").strip().lower()
    # Evaluate condition to control execution branch
    if role in ("admin", "superadmin", "hr", "administrator"):
        # Return computed result or response payload to caller
        return True

    # Set clean_target variable to store clean target value
    clean_target = str(target_code or "").strip().lower()
    # Set clean_user variable to store clean user value
    clean_user = str(current_user.emp_code or "").strip().lower()
    # Evaluate condition to control execution branch
    if clean_user and clean_user == clean_target:
        # Return computed result or response payload to caller
        return True

    # Allow direct supervisor/manager access
    target_prof = db.query(Profile).filter(Profile.emp_code.ilike(target_code)).first()
    # Evaluate condition to control execution branch
    if target_prof and target_prof.reporting_supervisor:
        # Evaluate condition to control execution branch
        if str(target_prof.reporting_supervisor).strip().lower() == clean_user:
            # Return computed result or response payload to caller
            return True

    # Raise HTTP exception with status code and error details
    raise HTTPException(
        # Set status_code variable to store status code value
        status_code=status.HTTP_403_FORBIDDEN,
        # Set detail variable to store detail value
        detail="Forbidden: You do not have permission to access or modify this employee's documents."
    # Execute statement to process data and maintain state
    )


# ----------------- DIRECT/LEGACY PROFILE DOCUMENT ROUTES ----------------- #

# Define HTTP GET route endpoint handler
@router.get("/profile/employees/{emp_identifier}/documents")
# Define HTTP GET route endpoint handler
@router.get("/profile/employees/{emp_identifier}/documents/")
# Define list_employee_documents function to handle list employee documents
def list_employee_documents(
    # Define emp_identifier schema field with type str,
    emp_identifier: str,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define current_user schema field with type Profile and default value
    current_user: Profile = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # Set emp_code variable to store emp code value
    emp_code = resolve_emp_code(emp_identifier, db)
    # Invoke _verify_document_access to perform operational action
    _verify_document_access(current_user, emp_code, db)
    # Initiate database query on specified model
    docs = db.query(EmployeeDocument).filter(
        # Execute statement to process data and maintain state
        (EmployeeDocument.emp_code == emp_code) | (EmployeeDocument.emp_code == str(emp_identifier))
    # Execute statement to process data and maintain state
    ).order_by(EmployeeDocument.uploaded_at.desc()).all()
    # Set results variable to store results value
    results = []
    # Iterate through items in sequence loop
    for d in docs:
        # Execute statement to process data and maintain state
        results.append({
            # Execute statement to process data and maintain state
            "id": d.id,
            # Execute statement to process data and maintain state
            "emp_code": d.emp_code,
            # Execute statement to process data and maintain state
            "name": d.file_name,
            # Execute statement to process data and maintain state
            "file_name": d.file_name,
            # Execute statement to process data and maintain state
            "url": f"/{d.file_location.lstrip('/')}",
            # Execute statement to process data and maintain state
            "file_location": d.file_location,
            # Execute statement to process data and maintain state
            "category": getattr(d, "category", "other_documents") or "other_documents",
            # Execute statement to process data and maintain state
            "size": getattr(d, "file_size", 0) or 0,
            # Execute statement to process data and maintain state
            "uploaded_at": d.uploaded_at.strftime("%Y-%m-%d %H:%M:%S") if d.uploaded_at else ""
        # Execute statement to process data and maintain state
        })
    # Return computed result or response payload to caller
    return results

# Define HTTP POST route endpoint handler
@router.post("/profile/employees/{emp_identifier}/documents/upload")
# Define HTTP POST route endpoint handler
@router.post("/profile/employees/{emp_identifier}/documents/upload/")
# Define upload_employee_documents function to handle upload employee documents
async def upload_employee_documents(
    # Define emp_identifier schema field with type str,
    emp_identifier: str,
    # Define files schema field with type List[UploadFile] and default value
    files: List[UploadFile] = File(...),
    # Define category schema field with type Optional[str] and default value
    category: Optional[str] = Form("other_documents"),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define current_user schema field with type Profile and default value
    current_user: Profile = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # Set emp_code variable to store emp code value
    emp_code = resolve_emp_code(emp_identifier, db)
    # Invoke _verify_document_access to perform operational action
    _verify_document_access(current_user, emp_code, db)
    # Set clean_cat variable to store clean cat value
    clean_cat = (category or "other_documents").strip().lower()

    # If single-slot category, delete old documents of same category first
    if clean_cat in SINGLE_SLOT_CATEGORIES:
        # Initiate database query on specified model
        old_docs = db.query(EmployeeDocument).filter(
            # Specify parameter value for (EmployeeDocument.emp_code
            (EmployeeDocument.emp_code == emp_code) | (EmployeeDocument.emp_code == str(emp_identifier)),
            # Execute statement to process data and maintain state
            EmployeeDocument.category == clean_cat
        # Execute statement to process data and maintain state
        ).all()
        # Iterate through items in sequence loop
        for old in old_docs:
            # Invoke _safe_delete_disk_file to perform operational action
            _safe_delete_disk_file(old.file_location)
            # Mark entity instance for deletion in database
            db.delete(old)
        # Evaluate condition to control execution branch
        if old_docs:
            # Invoke db.flush to perform operational action
            db.flush()

    # Set uploaded variable to store uploaded value
    uploaded = []
    # Iterate through items in sequence loop
    for f in files:
        # Set file_ext variable to store file ext value
        file_ext = os.path.splitext(f.filename)[1]
        # Set unique_name variable to store unique name value
        unique_name = f"{uuid.uuid4()}{file_ext}"
        # Set saved_path variable to store saved path value
        saved_path = UPLOAD_DIR / unique_name
        
        # Acquire context manager resource for enclosed block
        with open(saved_path, "wb") as buffer:
            # Invoke shutil.copyfileobj to perform operational action
            shutil.copyfileobj(f.file, buffer)
            
        # Set file_size variable to store file size value
        file_size = os.path.getsize(saved_path)
        # Set rel_path variable to store rel path value
        rel_path = f"uploads/documents/{unique_name}"
        
        # Set doc variable to store doc value
        doc = EmployeeDocument(
            # Set emp_code variable to store emp code value
            emp_code=emp_code,
            # Set file_name variable to store file name value
            file_name=f.filename,
            # Set file_location variable to store file location value
            file_location=rel_path,
            # Set category variable to store category value
            category=clean_cat,
            # Set file_size variable to store file size value
            file_size=file_size
        # Execute statement to process data and maintain state
        )
        # Stage new entity instance into database session
        db.add(doc)
        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(doc)
        # Invoke uploaded.append to perform operational action
        uploaded.append(doc.id)
        
    # Return computed result or response payload to caller
    return {"status": "success", "uploaded_count": len(uploaded)}

# Define HTTP DELETE route endpoint handler
@router.delete("/profile/employees/{emp_identifier}/documents/{doc_id}")
# Define HTTP DELETE route endpoint handler
@router.delete("/profile/employees/{emp_identifier}/documents/{doc_id}/")
# Define delete_profile_employee_document function to handle delete profile employee document
def delete_profile_employee_document(
    # Define emp_identifier schema field with type str,
    emp_identifier: str,
    # Define doc_id schema field with type int,
    doc_id: int,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define current_user schema field with type Profile and default value
    current_user: Profile = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # Initiate database query on specified model
    doc = db.query(EmployeeDocument).filter(EmployeeDocument.id == doc_id).first()
    # Check if target condition is false or object is missing
    if not doc:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Invoke _verify_document_access to perform operational action
    _verify_document_access(current_user, doc.emp_code, db)
    # Invoke _safe_delete_disk_file to perform operational action
    _safe_delete_disk_file(doc.file_location)
    # Mark entity instance for deletion in database
    db.delete(doc)
    # Commit transaction to persist changes in database
    db.commit()
    # Return computed result or response payload to caller
    return {"status": "success", "message": "Document deleted"}

# ----------------- STANDALONE /api/v1/document ROUTES ----------------- #

# Define HTTP POST route endpoint handler
@router.post("/upload")
# Define legacy_upload_document function to handle legacy upload document
async def legacy_upload_document(
    # Define file schema field with type UploadFile and default value
    file: UploadFile = File(...),
    # Define emp_code schema field with type str and default value
    emp_code: str = Form(...),
    # Define file_name schema field with type Optional[str] and default value
    file_name: Optional[str] = Form(None),
    # Define category schema field with type Optional[str] and default value
    category: Optional[str] = Form(None),
    # Define overwrite schema field with type Optional[bool] and default value
    overwrite: Optional[bool] = Form(True),
    # Define replace_doc_id schema field with type Optional[int] and default value
    replace_doc_id: Optional[int] = Form(None),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Define current_user schema field with type Profile and default value
    current_user: Profile = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # Set resolved_emp_code variable to store resolved emp code value
    resolved_emp_code = resolve_emp_code(emp_code, db)
    # Invoke _verify_document_access to perform operational action
    _verify_document_access(current_user, resolved_emp_code, db)
    # Begin guarded execution block to trap exceptions
    try:
        # Extract category if tagged in filename e.g. "[aadhaar_card] doc.pdf"
        raw_name = file_name or file.filename or "document"
        # Set clean_category variable to store clean category value
        clean_category = (category or "").strip().lower()
        # Set tag_match variable to store tag match value
        tag_match = re.match(r"^\[([a-zA-Z0-9_]+)\]\s*(.*)$", raw_name)
        # Evaluate condition to control execution branch
        if tag_match:
            # Check if target condition is false or object is missing
            if not clean_category or clean_category == "other_documents":
                # Set clean_category variable to store clean category value
                clean_category = tag_match.group(1).lower()
            # Set raw_name variable to store raw name value
            raw_name = tag_match.group(2)

        # Check if target condition is false or object is missing
        if not clean_category:
            # Set clean_category variable to store clean category value
            clean_category = "other_documents"

        # Set clean_file_name variable to store clean file name value
        clean_file_name = raw_name.strip() if raw_name.strip() else file.filename

        # Overwrite logic: if replace_doc_id provided, or category in SINGLE_SLOT_CATEGORIES and overwrite=True
        should_overwrite = (
            # Execute statement to process data and maintain state
            replace_doc_id is not None
            # Invoke or to perform operational action
            or (overwrite and clean_category in SINGLE_SLOT_CATEGORIES)
        # Execute statement to process data and maintain state
        )

        # Set old_docs_to_delete variable to store old docs to delete value
        old_docs_to_delete = []
        # Evaluate condition to control execution branch
        if replace_doc_id:
            # Initiate database query on specified model
            old_doc = db.query(EmployeeDocument).filter(
                # Specify parameter value for EmployeeDocument.id
                EmployeeDocument.id == replace_doc_id,
                # Execute statement to process data and maintain state
                (EmployeeDocument.emp_code == resolved_emp_code) | (EmployeeDocument.emp_code == emp_code)
            # Execute statement to process data and maintain state
            ).first()
            # Evaluate condition to control execution branch
            if old_doc:
                # Invoke old_docs_to_delete.append to perform operational action
                old_docs_to_delete.append(old_doc)
        # Evaluate alternate branch condition
        elif should_overwrite and clean_category != "other_documents":
            # Initiate database query on specified model
            old_docs_to_delete = db.query(EmployeeDocument).filter(
                # Specify parameter value for (EmployeeDocument.emp_code
                (EmployeeDocument.emp_code == resolved_emp_code) | (EmployeeDocument.emp_code == emp_code),
                # Execute statement to process data and maintain state
                EmployeeDocument.category == clean_category
            # Execute statement to process data and maintain state
            ).all()

        # Delete earlier physical file(s) from disk
        for old_doc in old_docs_to_delete:
            # Invoke _safe_delete_disk_file to perform operational action
            _safe_delete_disk_file(old_doc.file_location)
            # Mark entity instance for deletion in database
            db.delete(old_doc)

        # Evaluate condition to control execution branch
        if old_docs_to_delete:
            # Invoke db.flush to perform operational action
            db.flush()

        # Save new file to disk
        file_extension = os.path.splitext(file.filename)[1]
        # Set unique_filename variable to store unique filename value
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        # Set file_path variable to store file path value
        file_path = UPLOAD_DIR / unique_filename

        # Acquire context manager resource for enclosed block
        with open(file_path, "wb") as buffer:
            # Invoke shutil.copyfileobj to perform operational action
            shutil.copyfileobj(file.file, buffer)

        # Set file_size variable to store file size value
        file_size = os.path.getsize(file_path)
        # Set db_file_path variable to store db file path value
        db_file_path = f"uploads/documents/{unique_filename}"

        # Set new_doc variable to store new doc value
        new_doc = EmployeeDocument(
            # Set emp_code variable to store emp code value
            emp_code=resolved_emp_code,
            # Set file_name variable to store file name value
            file_name=clean_file_name,
            # Set file_location variable to store file location value
            file_location=db_file_path,
            # Set category variable to store category value
            category=clean_category,
            # Set file_size variable to store file size value
            file_size=file_size
        # Execute statement to process data and maintain state
        )
        # Stage new entity instance into database session
        db.add(new_doc)
        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(new_doc)

        # Return computed result or response payload to caller
        return {"status": "success", "message": "File uploaded successfully", "data": new_doc}
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))

# Define HTTP GET route endpoint handler
@router.get("/{emp_code}")
# Define get_employee_documents function to handle get employee documents
def get_employee_documents(emp_code: str, db: Session = Depends(get_db)):
    # Set resolved_code variable to store resolved code value
    resolved_code = resolve_emp_code(emp_code, db)
    # Initiate database query on specified model
    docs = db.query(EmployeeDocument).filter(
        # Execute statement to process data and maintain state
        (EmployeeDocument.emp_code == resolved_code) | (EmployeeDocument.emp_code == emp_code)
    # Execute statement to process data and maintain state
    ).order_by(EmployeeDocument.uploaded_at.desc()).all()
    # Return computed result or response payload to caller
    return docs

# Define HTTP DELETE route endpoint handler
@router.delete("/{doc_id}")
# Define delete_employee_document_by_id function to handle delete employee document by id
def delete_employee_document_by_id(doc_id: int, db: Session = Depends(get_db)):
    # Initiate database query on specified model
    doc = db.query(EmployeeDocument).filter(EmployeeDocument.id == doc_id).first()
    # Check if target condition is false or object is missing
    if not doc:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Document not found")
    # Invoke _safe_delete_disk_file to perform operational action
    _safe_delete_disk_file(doc.file_location)
    # Mark entity instance for deletion in database
    db.delete(doc)
    # Commit transaction to persist changes in database
    db.commit()
    # Return computed result or response payload to caller
    return {"status": "success", "message": "Document deleted successfully"}
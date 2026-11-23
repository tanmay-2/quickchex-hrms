# ==============================================================================
# QUICKCHEX HRMS BACKEND - POLICY_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/policy_api.py
# Purpose: FastAPI route controller handling 'policy_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('/', response_model=list[PolicyResponse]) -> read_policies()
#   • router.get('/{policy_id}', response_model=PolicyResponse) -> get_policy_by_id()
#   • router.get('/{policy_id}/file') -> get_policy_file()
#   • router.post('/', status_code=201) -> add_policy()
#   • router.delete('/{policy_id}') -> delete_policy()
#   • router.put('/{policy_id}', response_model=PolicyResponse) -> update_policy()
#   • router.patch('/{policy_id}', response_model=PolicyResponse) -> update_policy_status()
# ==============================================================================

# Import Path from pathlib for module operations
from pathlib import Path
# Import uuid4 from uuid for module operations
from uuid import uuid4
# Import module re for system functionality
import re
# Import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request from fastapi for module operations
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import Policy, PolicyResponse from app.models.policy_model for module operations
from app.models.policy_model import Policy, PolicyResponse
# Import PolicyService from app.services.policy_service for module operations
from app.services.policy_service import PolicyService
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import get_current_user from app.core.dependencies for module operations
from app.core.dependencies import get_current_user
# Import require_role from app.core.role_checker for module operations
from app.core.role_checker import require_role
# Import UPLOAD_ROOT from app.core.storage for module operations
from app.core.storage import UPLOAD_ROOT
# Import FileResponse from fastapi.responses for module operations
from fastapi.responses import FileResponse
# Import ensure_policy_file_exists from app.services.policy_generator for module operations
from app.services.policy_generator import ensure_policy_file_exists

# Set router variable to store router value
router = APIRouter(prefix="/policies", tags=["Policies"])
# Set MAX_POLICY_FILE_BYTES variable to store MAX POLICY FILE BYTES value
MAX_POLICY_FILE_BYTES = 20 * 1024 * 1024
# Set ALLOWED_POLICY_EXTENSIONS variable to store ALLOWED POLICY EXTENSIONS value
ALLOWED_POLICY_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx"}


# Define _store_policy_file function to handle  store policy file
async def _store_policy_file(file: UploadFile):
    # Check if target condition is false or object is missing
    if not file or not file.filename:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="No policy document file provided.")

    # Set ext variable to store ext value
    ext = Path(file.filename).suffix.lower()
    # Check if target condition is false or object is missing
    if ext not in ALLOWED_POLICY_EXTENSIONS:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=400,
            # Set detail variable to store detail value
            detail=f"Unsupported file type '{ext}'. Allowed types: {', '.join(sorted(ALLOWED_POLICY_EXTENSIONS))}",
        # Execute statement to process data and maintain state
        )

    # Set content variable to store content value
    content = await file.read()
    # Evaluate condition to control execution branch
    if len(content) > MAX_POLICY_FILE_BYTES:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=400,
            # Set detail variable to store detail value
            detail="File size exceeds the 20MB limit.",
        # Execute statement to process data and maintain state
        )

    # Set policies_dir variable to store policies dir value
    policies_dir = UPLOAD_ROOT / "policies"
    # Invoke policies_dir.mkdir to perform operational action
    policies_dir.mkdir(parents=True, exist_ok=True)

    # Set clean_stem variable to store clean stem value
    clean_stem = re.sub(r"[^a-zA-Z0-9_\-]", "_", Path(file.filename).stem)[:40]
    # Set stored_name variable to store stored name value
    stored_name = f"{clean_stem}_{uuid4().hex[:10]}{ext}"
    # Set destination variable to store destination value
    destination = policies_dir / stored_name

    # Acquire context manager resource for enclosed block
    with open(destination, "wb") as f:
        # Invoke f.write to perform operational action
        f.write(content)

    # Return computed result or response payload to caller
    return stored_name, destination


# Define _remove_policy_file function to handle  remove policy file
def _remove_policy_file(file_path: str):
    # Check if target condition is false or object is missing
    if not file_path:
        # Return computed result or response payload to caller
        return
    # Set cleaned variable to store cleaned value
    cleaned = str(file_path).replace("\\", "/").strip().lstrip("/")
    # Set possible_paths variable to store possible paths value
    possible_paths = [
        # Execute statement to process data and maintain state
        UPLOAD_ROOT / cleaned,
        # Execute statement to process data and maintain state
        UPLOAD_ROOT / "policies" / Path(cleaned).name,
        # Execute statement to process data and maintain state
        UPLOAD_ROOT / Path(cleaned).name,
    # Execute statement to process data and maintain state
    ]
    # Iterate through items in sequence loop
    for p in possible_paths:
        # Begin guarded execution block to trap exceptions
        try:
            # Evaluate condition to control execution branch
            if p.is_file():
                # Invoke p.unlink to perform operational action
                p.unlink(missing_ok=True)
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass


# Define HTTP GET route endpoint handler
@router.get("/", response_model=list[PolicyResponse])
# Define read_policies function to handle read policies
def read_policies(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set _user variable to store  user value
    _user=Depends(get_current_user),
# Execute statement to process data and maintain state
):
    # Set policies variable to store policies value
    policies = PolicyService.get_all_policies(db)
    # Iterate through items in sequence loop
    for p in policies:
        # Begin guarded execution block to trap exceptions
        try:
            # Invoke ensure_policy_file_exists to perform operational action
            ensure_policy_file_exists(p)
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
    # Return computed result or response payload to caller
    return policies


# Define HTTP GET route endpoint handler
@router.get("/{policy_id}", response_model=PolicyResponse)
# Define get_policy_by_id function to handle get policy by id
def get_policy_by_id(
    # Define policy_id schema field with type int,
    policy_id: int,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set _user variable to store  user value
    _user=Depends(get_current_user),
# Execute statement to process data and maintain state
):
    # Initiate database query on specified model
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    # Check if target condition is false or object is missing
    if not policy:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Policy not found")
    # Begin guarded execution block to trap exceptions
    try:
        # Invoke ensure_policy_file_exists to perform operational action
        ensure_policy_file_exists(policy)
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass
    # Return computed result or response payload to caller
    return policy


# Define HTTP GET route endpoint handler
@router.get("/{policy_id}/file")
# Define get_policy_file function to handle get policy file
def get_policy_file(
    # Define policy_id schema field with type int,
    policy_id: int,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set _user variable to store  user value
    _user=Depends(get_current_user),
# Execute statement to process data and maintain state
):
    # Initiate database query on specified model
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    # Check if target condition is false or object is missing
    if not policy:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Policy not found")

    # Begin guarded execution block to trap exceptions
    try:
        # Set candidate variable to store candidate value
        candidate = ensure_policy_file_exists(policy)
        # Evaluate condition to control execution branch
        if candidate and candidate.is_file():
            # Set filename variable to store filename value
            filename = f"{policy.name or 'policy'}{candidate.suffix}"
            # Return computed result or response payload to caller
            return FileResponse(
                # Set path variable to store path value
                path=str(candidate),
                # Set filename variable to store filename value
                filename=filename,
                # Set media_type variable to store media type value
                media_type="application/pdf" if candidate.suffix.lower() == ".pdf" else "application/octet-stream",
            # Execute statement to process data and maintain state
            )
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Raise HTTP exception with status code and error details
    raise HTTPException(status_code=404, detail="Policy document file not found on disk")


# Define HTTP POST route endpoint handler
@router.post("/", status_code=201)
# Define add_policy function to handle add policy
async def add_policy(
    # Define name schema field with type str and default value
    name: str = Form(...),
    # Define department schema field with type str and default value
    department: str = Form(...),
    # Define description schema field with type str and default value
    description: str = Form(...),
    # Define file schema field with type UploadFile and default value
    file: UploadFile = File(...),
    # Define category schema field with type str and default value
    category: str = Form("General"),
    # Define publish_date schema field with type str and default value
    publish_date: str = Form(""),
    # Define updated_date schema field with type str and default value
    updated_date: str = Form(""),
    # Define version_number schema field with type str and default value
    version_number: str = Form("1.0"),
    # Define status_value schema field with type str and default value
    status_value: str = Form("Draft", alias="status"),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set _admin variable to store  admin value
    _admin=Depends(require_role(["admin", "superadmin", "manager"])),
# Execute statement to process data and maintain state
):
    # Execute statement to process data and maintain state
    stored_name, destination = await _store_policy_file(file)
    # Begin guarded execution block to trap exceptions
    try:
        # Set created_policy variable to store created policy value
        created_policy = PolicyService.create_policy(
            # Execute statement to process data and maintain state
            db,
            # Execute statement to process data and maintain state
            name,
            # Execute statement to process data and maintain state
            department,
            # Execute statement to process data and maintain state
            description,
            # Execute statement to process data and maintain state
            stored_name,
            # Set category variable to store category value
            category=category,
            # Set publish_date variable to store publish date value
            publish_date=publish_date,
            # Set updated_date variable to store updated date value
            updated_date=updated_date,
            # Set version_number variable to store version number value
            version_number=version_number,
            # Set status variable to store status value
            status=status_value,
        # Execute statement to process data and maintain state
        )
        # Evaluate condition to control execution branch
        if str(status_value).strip().lower() == "published":
            # Begin guarded execution block to trap exceptions
            try:
                # Import NotificationService from app.services.notification_service for module operations
                from app.services.notification_service import NotificationService
                # Execute statement to process data and maintain state
                NotificationService.create_policy_update_notifications(
                    # Set db variable to store db value
                    db=db,
                    # Set policy variable to store policy value
                    policy=created_policy,
                # Execute statement to process data and maintain state
                )
            # Catch and handle specific exception if raised
            except Exception as notif_err:
                # Import module logging for system functionality
                import logging
                # Invoke logging.getLogger to perform operational action
                logging.getLogger("uvicorn.error").warning(f"Policy create notification warning: {notif_err}")
        # Return computed result or response payload to caller
        return created_policy
    # Catch and handle specific exception if raised
    except Exception:
        # Invoke destination.unlink to perform operational action
        destination.unlink(missing_ok=True)
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise exception to abort current operation with error
        raise


# Define HTTP DELETE route endpoint handler
@router.delete("/{policy_id}")
# Define delete_policy function to handle delete policy
async def delete_policy(
    # Define policy_id schema field with type int,
    policy_id: int,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set _admin variable to store  admin value
    _admin=Depends(require_role(["admin", "superadmin", "manager"])),
# Execute statement to process data and maintain state
):
    # Initiate database query on specified model
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    # Check if target condition is false or object is missing
    if not policy:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Policy not found")

    # Set old_file_path variable to store old file path value
    old_file_path = policy.file_path
    # Mark entity instance for deletion in database
    db.delete(policy)
    # Commit transaction to persist changes in database
    db.commit()
    # Invoke _remove_policy_file to perform operational action
    _remove_policy_file(old_file_path)
    # Return computed result or response payload to caller
    return {"message": "Policy deleted successfully"}


# Define HTTP PUT route endpoint handler
@router.put("/{policy_id}", response_model=PolicyResponse)
# Define update_policy function to handle update policy
async def update_policy(
    # Define policy_id schema field with type int,
    policy_id: int,
    # Define name schema field with type str and default value
    name: str = Form(None),
    # Define title schema field with type str and default value
    title: str = Form(None),
    # Define department schema field with type str and default value
    department: str = Form(None),
    # Define description schema field with type str and default value
    description: str = Form(None),
    # Define category schema field with type str and default value
    category: str = Form(None),
    # Define publish_date schema field with type str and default value
    publish_date: str = Form(None),
    # Define updated_date schema field with type str and default value
    updated_date: str = Form(None),
    # Define version_number schema field with type str and default value
    version_number: str = Form(None),
    # Define status_value schema field with type str and default value
    status_value: str = Form(None, alias="status"),
    # Define file schema field with type UploadFile and default value
    file: UploadFile = File(None),
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set _admin variable to store  admin value
    _admin=Depends(require_role(["admin", "superadmin", "manager"])),
# Execute statement to process data and maintain state
):
    # Initiate database query on specified model
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    # Check if target condition is false or object is missing
    if not policy:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Policy not found")

    # Set old_version variable to store old version value
    old_version = policy.version_number
    # Iterate through items in sequence loop
    for key, value in {
        # Execute statement to process data and maintain state
        "name": name or title,
        # Execute statement to process data and maintain state
        "department": department,
        # Execute statement to process data and maintain state
        "description": description,
        # Execute statement to process data and maintain state
        "category": category,
        # Execute statement to process data and maintain state
        "publish_date": publish_date,
        # Execute statement to process data and maintain state
        "updated_date": updated_date,
        # Execute statement to process data and maintain state
        "version_number": version_number,
        # Execute statement to process data and maintain state
        "status": status_value,
    # Execute statement to process data and maintain state
    }.items():
        # Check if target condition is false or object is missing
        if value is not None:
            # Invoke setattr to perform operational action
            setattr(policy, key, value)

    # Set old_file_path variable to store old file path value
    old_file_path = policy.file_path
    # Set new_file_path variable to store new file path value
    new_file_path = None
    # Evaluate condition to control execution branch
    if file and file.filename:
        # Execute statement to process data and maintain state
        stored_name, destination = await _store_policy_file(file)
        # Set new_file_path variable to store new file path value
        new_file_path = stored_name
        # Execute statement to process data and maintain state
        policy.file_path = f"uploads/policies/{stored_name}"

    # Begin guarded execution block to trap exceptions
    try:
        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(policy)
    # Catch and handle specific exception if raised
    except Exception:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Evaluate condition to control execution branch
        if new_file_path:
            # Invoke _remove_policy_file to perform operational action
            _remove_policy_file(new_file_path)
        # Raise exception to abort current operation with error
        raise
    # Evaluate condition to control execution branch
    if new_file_path:
        # Invoke _remove_policy_file to perform operational action
        _remove_policy_file(old_file_path)

    # Automatically create notifications for active managers and employees
    try:
        # Import NotificationService from app.services.notification_service for module operations
        from app.services.notification_service import NotificationService
        # Execute statement to process data and maintain state
        NotificationService.create_policy_update_notifications(
            # Set db variable to store db value
            db=db,
            # Set policy variable to store policy value
            policy=policy,
            # Set old_version variable to store old version value
            old_version=old_version,
        # Execute statement to process data and maintain state
        )
    # Catch and handle specific exception if raised
    except Exception as notif_err:
        # Import module logging for system functionality
        import logging
        # Invoke logging.getLogger to perform operational action
        logging.getLogger("uvicorn.error").warning(f"Policy update notification warning: {notif_err}")

    # Return computed result or response payload to caller
    return policy


# Define HTTP PATCH route endpoint handler
@router.patch("/{policy_id}", response_model=PolicyResponse)
# Define update_policy_status function to handle update policy status
async def update_policy_status(
    # Define policy_id schema field with type int,
    policy_id: int,
    # Define request schema field with type Request,
    request: Request,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set _admin variable to store  admin value
    _admin=Depends(require_role(["admin", "superadmin", "manager"])),
# Execute statement to process data and maintain state
):
    # Initiate database query on specified model
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    # Check if target condition is false or object is missing
    if not policy:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail="Policy not found")
    # Set body variable to store body value
    body = await request.json()
    # Set status_value variable to store status value value
    status_value = body.get("status")
    # Evaluate condition to control execution branch
    if status_value is None and "published" in body:
        # Set status_value variable to store status value value
        status_value = "Published" if body["published"] else "Draft"
    # Check if target condition is false or object is missing
    if status_value not in {"Draft", "Published", "Archived"}:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Status must be Draft, Published, or Archived.")

    # Set old_status variable to store old status value
    old_status = policy.status
    # Execute statement to process data and maintain state
    policy.status = status_value
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(policy)

    # Evaluate condition to control execution branch
    if status_value == "Published" and old_status != "Published":
        # Begin guarded execution block to trap exceptions
        try:
            # Import NotificationService from app.services.notification_service for module operations
            from app.services.notification_service import NotificationService
            # Execute statement to process data and maintain state
            NotificationService.create_policy_update_notifications(
                # Set db variable to store db value
                db=db,
                # Set policy variable to store policy value
                policy=policy,
            # Execute statement to process data and maintain state
            )
        # Catch and handle specific exception if raised
        except Exception as notif_err:
            # Import module logging for system functionality
            import logging
            # Invoke logging.getLogger to perform operational action
            logging.getLogger("uvicorn.error").warning(f"Policy publish notification warning: {notif_err}")

    # Return computed result or response payload to caller
    return policy

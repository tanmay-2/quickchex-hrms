from pathlib import Path
from uuid import uuid4
import re
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.orm import Session
from app.models.policy_model import Policy,PolicyResponse
from app.services.policy_service import PolicyService
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.role_checker import require_role
from app.core.storage import UPLOAD_ROOT

router = APIRouter(prefix="/policies", tags=["Policies"])
MAX_POLICY_FILE_BYTES = 20 * 1024 * 1024
ALLOWED_POLICY_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx"}


async def _store_policy_file(file: UploadFile):
    original_name = Path((file.filename or "").replace("\\", "/")).name
    extension = Path(original_name).suffix.lower()
    if not original_name or extension not in ALLOWED_POLICY_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Upload a PDF, DOC, DOCX, XLS, or XLSX policy file.")

    content = await file.read(MAX_POLICY_FILE_BYTES + 1)
    if len(content) > MAX_POLICY_FILE_BYTES:
        raise HTTPException(status_code=413, detail="Policy files must be 20 MB or smaller.")

    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", original_name)[:120]
    stored_name = f"{uuid4().hex}_{safe_name}"
    policy_dir = UPLOAD_ROOT / "policies"
    policy_dir.mkdir(parents=True, exist_ok=True)
    destination = policy_dir / stored_name
    destination.write_bytes(content)
    return stored_name, destination


def _remove_policy_file(file_path: str):
    if not file_path:
        return
    stored_name = Path(file_path.replace("\\", "/")).name
    policy_dir = (UPLOAD_ROOT / "policies").resolve()
    candidate = (policy_dir / stored_name).resolve()
    if candidate.parent == policy_dir and candidate.is_file():
        candidate.unlink()

@router.get("/", response_model=list[PolicyResponse])
def read_policies(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return PolicyService.get_all_policies(db)

@router.post("/", status_code=201)
async def add_policy(
    name: str = Form(...),
    department: str = Form(...),
    description: str = Form(...),
    file: UploadFile = File(...),
    category: str = Form("General"),
    publish_date: str = Form(""),
    updated_date: str = Form(""),
    version_number: str = Form("1.0"),
    status_value: str = Form("Draft", alias="status"),
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    stored_name, destination = await _store_policy_file(file)
    try:
        created_policy = PolicyService.create_policy(
            db, name, department, description, stored_name,
            category=category, publish_date=publish_date,
            updated_date=updated_date, version_number=version_number,
            status=status_value,
        )
        if str(status_value).strip().lower() == "published":
            try:
                from app.services.notification_service import NotificationService
                NotificationService.create_policy_update_notifications(
                    db=db,
                    policy=created_policy
                )
            except Exception as notif_err:
                import logging
                logging.getLogger("uvicorn.error").warning(f"Policy create notification warning: {notif_err}")
        return created_policy
    except Exception:
        destination.unlink(missing_ok=True)
        db.rollback()
        raise

@router.delete("/{policy_id}")
async def delete_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    
    # 2. Query the SQLAlchemy Model (Policy), not the Pydantic schema (PolicyResponse)
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    

    old_file_path = policy.file_path
    db.delete(policy)
    db.commit()
    _remove_policy_file(old_file_path)
    return {"message": "Policy deleted successfully"}


@router.put("/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: int,
    name: str = Form(None),
    title: str = Form(None),
    department: str = Form(None),
    description: str = Form(None),
    category: str = Form(None),
    publish_date: str = Form(None),
    updated_date: str = Form(None),
    version_number: str = Form(None),
    status_value: str = Form(None, alias="status"),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    old_version = policy.version_number
    for key, value in {
        "name": name or title,
        "department": department,
        "description": description,
        "category": category,
        "publish_date": publish_date,
        "updated_date": updated_date,
        "version_number": version_number,
        "status": status_value,
    }.items():
        if value is not None:
            setattr(policy, key, value)

    old_file_path = policy.file_path
    new_file_path = None
    if file and file.filename:
        stored_name, destination = await _store_policy_file(file)
        new_file_path = stored_name
        policy.file_path = f"uploads/policies/{stored_name}"

    try:
        db.commit()
        db.refresh(policy)
    except Exception:
        db.rollback()
        if new_file_path:
            _remove_policy_file(new_file_path)
        raise
    if new_file_path:
        _remove_policy_file(old_file_path)

    # Automatically create notifications for active managers and employees
    try:
        from app.services.notification_service import NotificationService
        NotificationService.create_policy_update_notifications(
            db=db,
            policy=policy,
            old_version=old_version
        )
    except Exception as notif_err:
        import logging
        logging.getLogger("uvicorn.error").warning(f"Policy update notification warning: {notif_err}")

    return policy


@router.patch("/{policy_id}", response_model=PolicyResponse)
async def update_policy_status(
    policy_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    body = await request.json()
    status_value = body.get("status")
    if status_value is None and "published" in body:
        status_value = "Published" if body["published"] else "Draft"
    if status_value not in {"Draft", "Published", "Archived"}:
        raise HTTPException(status_code=400, detail="Status must be Draft, Published, or Archived.")
    
    old_status = policy.status
    policy.status = status_value
    db.commit()
    db.refresh(policy)

    if status_value == "Published" and old_status != "Published":
        try:
            from app.services.notification_service import NotificationService
            NotificationService.create_policy_update_notifications(
                db=db,
                policy=policy
            )
        except Exception as notif_err:
            import logging
            logging.getLogger("uvicorn.error").warning(f"Policy publish notification warning: {notif_err}")

    return policy

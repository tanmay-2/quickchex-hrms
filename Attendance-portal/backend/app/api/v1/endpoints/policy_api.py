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

from pathlib import Path
from uuid import uuid4
import re
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.orm import Session
from app.models.policy_model import Policy, PolicyResponse
from app.services.policy_service import PolicyService
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.role_checker import require_role
from app.core.storage import UPLOAD_ROOT
from fastapi.responses import FileResponse
from app.services.policy_generator import ensure_policy_file_exists

router = APIRouter(prefix="/policies", tags=["Policies"])
MAX_POLICY_FILE_BYTES = 20 * 1024 * 1024
ALLOWED_POLICY_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx"}


async def _store_policy_file(file: UploadFile):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No policy document file provided.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_POLICY_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed types: {', '.join(sorted(ALLOWED_POLICY_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > MAX_POLICY_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the 20MB limit.",
        )

    policies_dir = UPLOAD_ROOT / "policies"
    policies_dir.mkdir(parents=True, exist_ok=True)

    clean_stem = re.sub(r"[^a-zA-Z0-9_\-]", "_", Path(file.filename).stem)[:40]
    stored_name = f"{clean_stem}_{uuid4().hex[:10]}{ext}"
    destination = policies_dir / stored_name

    with open(destination, "wb") as f:
        f.write(content)

    return stored_name, destination


def _remove_policy_file(file_path: str):
    if not file_path:
        return
    cleaned = str(file_path).replace("\\", "/").strip().lstrip("/")
    possible_paths = [
        UPLOAD_ROOT / cleaned,
        UPLOAD_ROOT / "policies" / Path(cleaned).name,
        UPLOAD_ROOT / Path(cleaned).name,
    ]
    for p in possible_paths:
        try:
            if p.is_file():
                p.unlink(missing_ok=True)
        except Exception:
            pass


@router.get("/", response_model=list[PolicyResponse])
def read_policies(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    policies = PolicyService.get_all_policies(db)
    for p in policies:
        try:
            ensure_policy_file_exists(p)
        except Exception:
            pass
    return policies


@router.get("/{policy_id}", response_model=PolicyResponse)
def get_policy_by_id(
    policy_id: int,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    try:
        ensure_policy_file_exists(policy)
    except Exception:
        pass
    return policy


@router.get("/{policy_id}/file")
def get_policy_file(
    policy_id: int,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    try:
        candidate = ensure_policy_file_exists(policy)
        if candidate and candidate.is_file():
            filename = f"{policy.name or 'policy'}{candidate.suffix}"
            return FileResponse(
                path=str(candidate),
                filename=filename,
                media_type="application/pdf" if candidate.suffix.lower() == ".pdf" else "application/octet-stream",
            )
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Policy document file not found on disk")


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
    _admin=Depends(require_role(["admin", "superadmin", "manager"])),
):
    stored_name, destination = await _store_policy_file(file)
    try:
        created_policy = PolicyService.create_policy(
            db,
            name,
            department,
            description,
            stored_name,
            category=category,
            publish_date=publish_date,
            updated_date=updated_date,
            version_number=version_number,
            status=status_value,
        )
        if str(status_value).strip().lower() == "published":
            try:
                from app.services.notification_service import NotificationService
                NotificationService.create_policy_update_notifications(
                    db=db,
                    policy=created_policy,
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
    _admin=Depends(require_role(["admin", "superadmin", "manager"])),
):
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
    _admin=Depends(require_role(["admin", "superadmin", "manager"])),
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
            old_version=old_version,
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
    _admin=Depends(require_role(["admin", "superadmin", "manager"])),
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
                policy=policy,
            )
        except Exception as notif_err:
            import logging
            logging.getLogger("uvicorn.error").warning(f"Policy publish notification warning: {notif_err}")

    return policy

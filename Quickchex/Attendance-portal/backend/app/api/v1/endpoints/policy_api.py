from fastapi import APIRouter, Depends, UploadFile, File, Form,HTTPException
from sqlalchemy.orm import Session
from app.models.policy_model import Policy,PolicyResponse
from app.services.policy_service import PolicyService
from app.db.session import get_db
import os
import shutil

router = APIRouter(prefix="/policies", tags=["Policies"])

@router.get("/", response_model=list[PolicyResponse])
def read_policies(db: Session = Depends(get_db)):
    return PolicyService.get_all_policies(db)

@router.post("/")
def add_policy(
    name: str = Form(...),
    department: str = Form(...),
    description: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Ensure the directory exists
    upload_dir = "uploads/policies"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    file_path = os.path.join(upload_dir, file.filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Save metadata to DB via Service
    return PolicyService.create_policy(db, name, department, description, file.filename)

@router.delete("/{policy_id}")
async def delete_policy(policy_id: int, db: Session = Depends(get_db)):
    
    # 2. Query the SQLAlchemy Model (Policy), not the Pydantic schema (PolicyResponse)
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    

    if policy.file_path and os.path.exists(policy.file_path):
        os.remove(policy.file_path)
        
    db.delete(policy)
    db.commit()
    return {"message": "Policy deleted successfully"}
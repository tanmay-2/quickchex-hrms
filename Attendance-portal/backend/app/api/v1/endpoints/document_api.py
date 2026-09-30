from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import shutil
import uuid
from app.db.session import get_db
from app.models.document import EmployeeDocument

router = APIRouter(tags=["Documents"])

# 🔥 Set the directory to the nested folder
UPLOAD_DIR = os.path.join("uploads", "documents")

# This will create 'uploads/' and 'uploads/documents/' if they don't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    emp_code: str = Form(...),
    file_name: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        # Create a unique filename to prevent overwrites
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Physical path where the file is saved (e.g., uploads/documents/abc.pdf)
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        # Save the physical file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 🔥 Store the relative URL path in the DB so the frontend can easily access it
        # We hardcode forward slashes here so it works perfectly in the browser URL
        db_file_path = f"uploads/documents/{unique_filename}"

        # Create the database record
        new_doc = EmployeeDocument(
            emp_code=emp_code,
            file_name=file_name,
            file_location=db_file_path
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
    docs = db.query(EmployeeDocument).filter(EmployeeDocument.emp_code == emp_code).all()
    return docs
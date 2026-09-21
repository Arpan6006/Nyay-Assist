import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List

from ..db_sync.db import get_db
from ..db_sync.schema import RegisteredLawyer, User
from ..auth.router import get_current_user

router = APIRouter(prefix="/lawyer-portal", tags=["lawyer_portal"])

# Hardcoded password for internal verification dashboard (per spec)
INTERNAL_VERIFICATION_PWD = os.environ.get("NYAYASSIST_ADMIN_PWD", "admin123")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "verification_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/register")
async def register_lawyer(
    full_name: str = Form(...),
    bar_council_id: str = Form(...),
    licence_number: str = Form(...),
    court_level: str = Form(...),
    case_types: str = Form(...),
    cases_handled_count: int = Form(...),
    contact: str = Form(...),
    cop_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user already registered as lawyer
    if db.query(RegisteredLawyer).filter(RegisteredLawyer.user_id == current_user.user_id).first():
        raise HTTPException(status_code=400, detail="User already registered as a lawyer")

    # Secure file saving - in a real app this should be encrypted at rest
    # For now we save it to the protected directory
    file_path = os.path.join(UPLOAD_DIR, f"{current_user.user_id}_{cop_file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(cop_file.file, buffer)

    new_lawyer = RegisteredLawyer(
        user_id=current_user.user_id,
        full_name=full_name,
        bar_council_id=bar_council_id,
        licence_number=licence_number,
        court_level=court_level,
        case_types=case_types,
        cases_handled_count=cases_handled_count,
        contact=contact,
        cop_file_path=file_path,
        verified=False # Must be verified manually
    )
    db.add(new_lawyer)
    db.commit()
    
    return {"message": "Registration submitted and pending verification"}

@router.get("/pending")
def get_pending_verifications(password: str, db: Session = Depends(get_db)):
    if password != INTERNAL_VERIFICATION_PWD:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    pending = db.query(RegisteredLawyer).filter(RegisteredLawyer.verified == False).all()
    return pending

@router.post("/{lawyer_id}/verify")
def verify_lawyer(lawyer_id: str, password: str, db: Session = Depends(get_db)):
    if password != INTERNAL_VERIFICATION_PWD:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    lawyer = db.query(RegisteredLawyer).filter(RegisteredLawyer.lawyer_id == lawyer_id).first()
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer registration not found")
    
    lawyer.verified = True
    db.commit()
    return {"message": "Lawyer verified successfully"}

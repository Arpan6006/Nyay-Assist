import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List

from ..db_sync.db import get_db
from ..db_sync.schema import User, RegisteredLawyer, BlogPost, SupportTicket

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_PWD = os.environ.get("NYAYASSIST_ADMIN_PWD", "admin123")

def verify_admin(password: str):
    if password != ADMIN_PWD:
        raise HTTPException(status_code=403, detail="Forbidden")
    return True

@router.get("/stats")
def get_stats(password: str, db: Session = Depends(get_db)):
    verify_admin(password)
    users_count = db.query(func.count(User.user_id)).scalar()
    lawyers_count = db.query(func.count(RegisteredLawyer.lawyer_id)).filter(RegisteredLawyer.verified == True).scalar()
    posts_count = db.query(func.count(BlogPost.post_id)).scalar()
    tickets_count = db.query(func.count(SupportTicket.id)).filter(SupportTicket.status == "Open").scalar()
    
    return {
        "users": users_count,
        "verified_lawyers": lawyers_count,
        "blog_posts": posts_count,
        "open_tickets": tickets_count
    }

@router.get("/users")
def get_users(password: str, db: Session = Depends(get_db)):
    verify_admin(password)
    users = db.query(User).all()
    return [{"user_id": u.user_id, "email": u.email} for u in users]

@router.delete("/users/{user_id}")
def delete_user(user_id: str, password: str, db: Session = Depends(get_db)):
    verify_admin(password)
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/lawyers")
def get_verified_lawyers(password: str, db: Session = Depends(get_db)):
    verify_admin(password)
    lawyers = db.query(RegisteredLawyer).filter(RegisteredLawyer.verified == True).all()
    return lawyers

@router.post("/lawyers/{lawyer_id}/revoke")
def revoke_lawyer(lawyer_id: str, password: str, db: Session = Depends(get_db)):
    verify_admin(password)
    lawyer = db.query(RegisteredLawyer).filter(RegisteredLawyer.lawyer_id == lawyer_id).first()
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    lawyer.verified = False
    db.commit()
    return {"message": "Lawyer verification revoked"}

@router.get("/support")
def get_tickets(password: str, db: Session = Depends(get_db)):
    verify_admin(password)
    return db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).all()

@router.post("/support/{ticket_id}/resolve")
def resolve_ticket(ticket_id: str, password: str, db: Session = Depends(get_db)):
    verify_admin(password)
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = "Resolved"
    db.commit()
    return {"message": "Ticket marked as resolved"}

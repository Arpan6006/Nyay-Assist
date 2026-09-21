from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from ..db_sync.db import get_db
from ..db_sync.schema import SupportTicket

router = APIRouter(prefix="/support", tags=["support"])

class TicketCreate(BaseModel):
    name: str
    email: str
    subject: str
    message: str

@router.post("")
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    new_ticket = SupportTicket(
        name=ticket.name,
        email=ticket.email,
        subject=ticket.subject,
        message=ticket.message
    )
    db.add(new_ticket)
    db.commit()
    return {"message": "Support ticket submitted successfully"}

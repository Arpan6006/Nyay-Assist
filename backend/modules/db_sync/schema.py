import uuid
from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base, engine

class User(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    
    conversations = relationship("Conversation", back_populates="user")
    registered_lawyer = relationship("RegisteredLawyer", back_populates="user", uselist=False)

class Conversation(Base):
    __tablename__ = "conversations"
    session_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.user_id"), nullable=True)
    title = Column(String, nullable=False, default="New Conversation")
    
    user = relationship("User", back_populates="conversations")
    messages = relationship("MessageStore", back_populates="conversation")

class MessageStore(Base):
    __tablename__ = "message_store"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("conversations.session_id"), nullable=False)
    message = Column(Text, nullable=False) # JSON representation of the message
    
    conversation = relationship("Conversation", back_populates="messages")

class Lawyer(Base):
    __tablename__ = "lawyers"
    lawyer_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    specialization = Column(String, nullable=False)
    location = Column(String, nullable=False)
    contact = Column(String, nullable=False)
    experience_years = Column(Integer, nullable=False)
    graduation_college = Column(String, nullable=True)
    graduation_year = Column(Integer, nullable=True)
    achievements = Column(String, nullable=True)
    court_level = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    bar_council_id = Column(String, nullable=True)

class RegisteredLawyer(Base):
    __tablename__ = "registered_lawyers"
    lawyer_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, unique=True)
    full_name = Column(String, nullable=False)
    bar_council_id = Column(String, nullable=False)
    licence_number = Column(String, nullable=False)
    court_level = Column(String, nullable=False) # JSON list or comma separated
    case_types = Column(String, nullable=False) # JSON list or comma separated
    cases_handled_count = Column(Integer, nullable=False, default=0)
    contact = Column(String, nullable=False)
    verified = Column(Boolean, default=False)
    cop_file_path = Column(String, nullable=False) # Path to encrypted CoP
    
    user = relationship("User", back_populates="registered_lawyer")

class BlogPost(Base):
    __tablename__ = "blog_posts"
    post_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    crime_type = Column(String, nullable=False)
    source_sections = Column(String, nullable=False) # JSON list of sections
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LawMapping(Base):
    __tablename__ = "law_mapping"
    id = Column(Integer, primary_key=True, autoincrement=True)
    old_act = Column(String, nullable=False) # IPC, CrPC, IEA
    old_section = Column(String, nullable=False)
    new_act = Column(String, nullable=False) # BNS, BNSS, BSA
    new_section = Column(String, nullable=False)
    remarks = Column(Text, nullable=True)

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="Open") # Open, Resolved
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Create all tables
Base.metadata.create_all(bind=engine)

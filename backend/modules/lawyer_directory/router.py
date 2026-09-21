import json
import os
import re
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from ..db_sync.db import get_db
from ..db_sync.schema import Lawyer, RegisteredLawyer
from ...llm_provider import get_llm
from .brief_pdf_generator import create_brief_pdf

router = APIRouter(prefix="/lawyers", tags=["lawyer_directory"])

if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    GENERATED_DIR = "/tmp/nyayassist_generated"
else:
    GENERATED_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "generated")
os.makedirs(GENERATED_DIR, exist_ok=True)

class CaseBriefRequest(BaseModel):
    lawyer_id: Optional[str] = None
    lawyer_name: Optional[str] = "Selected Advocate"
    lawyer_specialization: Optional[str] = "General Practice"
    client_name: str = "Client"
    case_description: str
    urgency_level: str = "Standard"
    incident_date: Optional[str] = None
    opposing_party: Optional[str] = None

class ChronologyItem(BaseModel):
    date: str
    event: str

class CaseBriefResponse(BaseModel):
    case_title: str
    executive_summary: str
    chronology: List[ChronologyItem]
    applicable_statutes: List[str]
    legal_remedies: List[str]
    document_checklist: List[str]
    questions_for_advocate: List[str]
    practice_area: str
    jurisdiction: str
    urgency_level: str
    date: str
    lawyer_name: str
    client_name: str

class LawyerResponse(BaseModel):
    lawyer_id: str
    name: str
    specialization: str
    location: str
    contact: str
    experience_years: int
    graduation_college: Optional[str] = None
    graduation_year: Optional[int] = None
    achievements: Optional[str] = None
    court_level: Optional[str] = None
    bio: Optional[str] = None
    bar_council_id: Optional[str] = None
    is_verified: bool = False

def load_sample_lawyers(db: Session):
    # Check if we already have lawyers in the database
    if db.query(Lawyer).first():
        return
    
    sample_file = os.path.join(os.path.dirname(__file__), "sample_lawyers.json")
    if os.path.exists(sample_file):
        with open(sample_file, "r") as f:
            lawyers_data = json.load(f)
            for l_data in lawyers_data:
                lawyer = Lawyer(
                    name=l_data["name"],
                    specialization=l_data["specialization"],
                    location=l_data["location"],
                    contact=l_data["contact"],
                    experience_years=l_data["experience_years"],
                    graduation_college=l_data.get("graduation_college"),
                    graduation_year=l_data.get("graduation_year"),
                    achievements=l_data.get("achievements"),
                    court_level=l_data.get("court_level"),
                    bio=l_data.get("bio"),
                    bar_council_id=l_data.get("bar_council_id")
                )
                db.add(lawyer)
        db.commit()

@router.get("", response_model=List[LawyerResponse])
def search_lawyers(
    specialization: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    min_experience: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    # Ensure sample data is loaded
    load_sample_lawyers(db)

    # Base query for static sample lawyers
    query = db.query(Lawyer)
    if specialization:
        query = query.filter(Lawyer.specialization.ilike(f"%{specialization}%"))
    if location:
        query = query.filter(Lawyer.location.ilike(f"%{location}%"))
    if min_experience is not None:
        query = query.filter(Lawyer.experience_years >= min_experience)
    
    sample_lawyers = query.all()

    # Query for verified registered lawyers
    reg_query = db.query(RegisteredLawyer).filter(RegisteredLawyer.verified == True)
    if specialization:
        reg_query = reg_query.filter(RegisteredLawyer.case_types.ilike(f"%{specialization}%"))
    if location:
        # Note: We didn't explicitly store location for RegisteredLawyer, but let's assume it's omitted or handle it later.
        pass 
    # For now, let's just return them. In a real system, RegisteredLawyer would have a location field.
    verified_lawyers = reg_query.all()

    results = []
    for l in sample_lawyers:
        results.append(LawyerResponse(
            lawyer_id=l.lawyer_id,
            name=l.name,
            specialization=l.specialization,
            location=l.location,
            contact=l.contact,
            experience_years=l.experience_years,
            graduation_college=l.graduation_college,
            graduation_year=l.graduation_year,
            achievements=l.achievements,
            court_level=l.court_level,
            bio=l.bio,
            bar_council_id=l.bar_council_id,
            is_verified=False
        ))
    
    for vl in verified_lawyers:
        # Just map fields best effort to fit the unified schema
        results.append(LawyerResponse(
            lawyer_id=vl.lawyer_id,
            name=vl.full_name,
            specialization=vl.case_types,
            location="Contact for details", # Placeholder as it's not in schema
            contact=vl.contact,
            experience_years=vl.cases_handled_count // 10, # Crude estimate for unified display
            court_level=vl.court_level,
            bar_council_id=vl.bar_council_id,
            is_verified=True
        ))

    return results

def fallback_generate_brief(req: CaseBriefRequest) -> Dict[str, Any]:
    """Generates structured legal brief using rule-based parsing if LLM is unavailable."""
    desc = req.case_description.strip()
    desc_lower = desc.lower()
    
    # Infer practice area
    practice_area = "Civil Litigation & Dispute Resolution"
    statutes = [
        "Code of Civil Procedure, 1908 (CPC)",
        "Indian Contract Act, 1872 (Section 10 & 73)",
        "Bharatiya Sakshya Adhiniyam, 2023 (BSA - Electronic Evidence Sec 63)"
    ]
    remedies = [
        "Issue a formal Statutory Legal Notice demanding compliance within 15 days.",
        "Explore Pre-Institution Mediation under the Commercial Courts Act, 2015.",
        "Initiate Summary Suit under CPC Order 37 for expeditious recovery."
    ]
    
    if any(k in desc_lower for k in ["rent", "tenant", "landlord", "lease", "deposit", "evict"]):
        practice_area = "Tenancy & Real Estate Law"
        statutes = [
            "Transfer of Property Act, 1882 (Section 106 & 108)",
            "State Rent Control Act / Model Tenancy Act",
            "Indian Contract Act, 1872 (Security Deposit Breach)"
        ]
        remedies = [
            "Issue Demand Notice for refund of refundable security deposit with interest.",
            "File petition before Rent Authority / Civil Court for recovery and damages.",
            "Lodge police complaint under BNS Sec 316/318 if criminal breach of trust or cheating is evident."
        ]
    elif any(k in desc_lower for k in ["cheque", "bounce", "dishonour", "138", "bank payment"]):
        practice_area = "Negotiable Instruments & Banking Disputes"
        statutes = [
            "Negotiable Instruments Act, 1881 (Section 138 & 142)",
            "Bharatiya Nagarik Suraksha Sanhita, 2023 (Summons Procedure)",
            "Bharatiya Sakshya Adhiniyam, 2023 (Bank Memo Presumption)"
        ]
        remedies = [
            "Issue mandatory Statutory Demand Notice within 30 days of receiving Bank Return Memo.",
            "File criminal complaint under Section 138 NI Act before the Judicial Magistrate within 30 days of notice expiry.",
            "Apply for interim compensation up to 20% under Section 143A NI Act."
        ]
    elif any(k in desc_lower for k in ["fir", "crime", "cyber", "police", "fraud", "assault", "threat", "theft"]):
        practice_area = "Criminal Defense & Cyber Crime"
        statutes = [
            "Bharatiya Nyaya Sanhita, 2023 (BNS)",
            "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS - Sec 173 Zero FIR)",
            "Information Technology Act, 2000 (Section 66C/66D for cyber fraud)"
        ]
        remedies = [
            "Lodge formal FIR under BNSS Section 173 with evidence dossier.",
            "Apply for Anticipatory Bail under BNSS Section 482 if apprehension of arrest exists.",
            "File application before Magistrate under BNSS Section 175(3) if police refuse registration."
        ]

    return {
        "case_title": f"Legal Consultation Dossier: {practice_area}",
        "executive_summary": f"The client ({req.client_name}) seeks legal representation and advisory regarding: {desc}\n\nThe matter entails potential liability and statutory remedies requiring immediate evaluation by legal counsel. Primary relief sought includes restitution, legal notice issuance, and court representation.",
        "chronology": [
            {"date": req.incident_date or "Initial Incident", "event": "Occurrence of primary dispute / breach of obligation."},
            {"date": "Pre-Consultation", "event": "Client compiled supporting records and initiated counsel engagement via NyayAssist."}
        ],
        "applicable_statutes": statutes,
        "legal_remedies": remedies,
        "document_checklist": [
            "Government photo identity proof of client (Aadhaar / Passport / PAN)",
            "All primary written contracts, notices, receipts, or agreements",
            "Bank statements, payment receipts, or transaction UTR numbers",
            "Exported electronic chat history / emails along with BSA Sec 63 certification details",
            "Copies of any prior notices or correspondence exchanged between parties"
        ],
        "questions_for_advocate": [
            "What is the statutory limitation period applicable to initiate legal proceedings in this matter?",
            "What is the recommended legal forum (District Court, Tribunal, High Court, Consumer Forum)?",
            "Can we resolve this through pre-litigation mediation or an urgent legal notice?",
            "What is the estimated timeline and milestone fee structure for this type of litigation?",
            "Are there any immediate interim reliefs or injunctions we should apply for?"
        ],
        "practice_area": practice_area,
        "jurisdiction": "District / High Court Jurisdiction",
        "urgency_level": req.urgency_level,
        "date": "2026-09-21",
        "lawyer_name": req.lawyer_name or "Selected Advocate",
        "client_name": req.client_name
    }

@router.post("/generate-brief", response_model=CaseBriefResponse)
def generate_case_brief(req: CaseBriefRequest):
    """Uses LLM to analyze the factual situation and generate an advocate-ready strategy brief."""
    prompt = f"""You are an elite Indian Legal Strategist and Senior Advocate assistant.
A client ({req.client_name}) is preparing for an initial consultation with Advocate {req.lawyer_name} (Specialization: {req.lawyer_specialization}).

Client's Factual Situation:
{req.case_description}

Urgency Level: {req.urgency_level}
Incident Date: {req.incident_date or 'Not specified'}
Opposing Party: {req.opposing_party or 'Not specified'}

Generate a structured, court-ready Client Case Brief & Strategy Dossier under Indian Law (incorporating BNS 2023, BNSS 2023, BSA 2023, CPC, Contract Act, or relevant special statutes).

Return strictly a valid JSON object matching this exact schema:
{{
  "case_title": "Concise professional case title (e.g., Tenancy Security Deposit Dispute & Recovery)",
  "executive_summary": "2-3 well structured paragraphs synthesizing facts, legal stakes, and client objectives.",
  "chronology": [
    {{"date": "Date or Period", "event": "Factual milestone"}}
  ],
  "applicable_statutes": [
    "Specific Indian Act and Section (e.g. Transfer of Property Act 1882 Sec 108)"
  ],
  "legal_remedies": [
    "Specific procedural remedy or action (e.g. Issue Statutory Demand Notice)"
  ],
  "document_checklist": [
    "Specific document or record the client MUST bring to the consultation"
  ],
  "questions_for_advocate": [
    "Practical, strategic question the client should ask the lawyer during meeting"
  ],
  "practice_area": "Accurate practice area name",
  "jurisdiction": "Appropriate Court / Forum jurisdiction"
}}
Do not include markdown codeblocks or extra text. Output only raw JSON."""

    try:
        llm = get_llm(temperature=0.2, max_tokens=1500)
        response = llm.invoke(prompt)
        text = response.content if hasattr(response, "content") else str(response)
        
        # Clean JSON text
        clean_json = re.sub(r"^```json\s*", "", text.strip())
        clean_json = re.sub(r"^```\s*", "", clean_json)
        clean_json = re.sub(r"\s*```$", "", clean_json)
        
        parsed = json.loads(clean_json)
        
        return CaseBriefResponse(
            case_title=parsed.get("case_title", "Legal Strategy Brief"),
            executive_summary=parsed.get("executive_summary", ""),
            chronology=[ChronologyItem(**item) for item in parsed.get("chronology", [])],
            applicable_statutes=parsed.get("applicable_statutes", []),
            legal_remedies=parsed.get("legal_remedies", []),
            document_checklist=parsed.get("document_checklist", []),
            questions_for_advocate=parsed.get("questions_for_advocate", []),
            practice_area=parsed.get("practice_area", req.lawyer_specialization or "General Practice"),
            jurisdiction=parsed.get("jurisdiction", "Competent Indian Court"),
            urgency_level=req.urgency_level,
            date="2026-09-21",
            lawyer_name=req.lawyer_name or "Selected Advocate",
            client_name=req.client_name
        )
    except Exception as e:
        print(f"[NyayAssist] LLM Brief generation fallback: {e}")
        fb = fallback_generate_brief(req)
        return CaseBriefResponse(**fb)

@router.post("/download-brief-pdf")
def download_brief_pdf(brief: CaseBriefResponse):
    """Generates an official formatted PDF for the Case Brief."""
    try:
        output_filename = f"Case_Brief_{os.urandom(4).hex()}.pdf"
        output_path = os.path.join(GENERATED_DIR, output_filename)
        
        create_brief_pdf(
            output_path=output_path,
            brief_data=brief.model_dump(),
            lawyer_name=brief.lawyer_name,
            client_name=brief.client_name
        )
        
        safe_title = re.sub(r"[^\w\s-]", "", brief.case_title).strip().replace(" ", "_")
        return FileResponse(
            path=output_path,
            filename=f"{safe_title}_Dossier.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


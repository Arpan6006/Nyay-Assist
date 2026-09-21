import os
import json
import requests
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from ..db_sync.db import get_db
from ..db_sync.schema import Conversation, MessageStore
from ..auth.router import get_optional_user, User

from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import PromptTemplate

router = APIRouter(prefix="/chat", tags=["legal_chat"])

FAISS_INDEX_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "faiss_index")
_vectorstore = None
_embeddings = None

def get_vectorstore():
    global _vectorstore, _embeddings
    if _vectorstore is None:
        try:
            if os.path.exists(FAISS_INDEX_PATH):
                from ...utils import get_optimal_device
                _embeddings = HuggingFaceEmbeddings(
                    model_name="sentence-transformers/all-mpnet-base-v2",
                    model_kwargs={"device": get_optimal_device()},
                    encode_kwargs={"batch_size": 8}
                )
                _vectorstore = FAISS.load_local(FAISS_INDEX_PATH, _embeddings, allow_dangerous_deserialization=True)
            else:
                return None
        except Exception as e:
            print(f"[NyayAssist] FAISS vectorstore load notice (using fallback knowledge): {e}")
            return None
    return _vectorstore

class StructuredIntake(BaseModel):
    incident: str
    location: str
    actions_taken: str
    authority_response: str
    next_steps: str

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    structured_intake: Optional[StructuredIntake] = None
    message: Optional[str] = None

GUEST_USER_ID = "guest_user"

def get_or_create_guest_user(db: Session) -> str:
    guest = db.query(User).filter(User.user_id == GUEST_USER_ID).first()
    if not guest:
        from ..auth.auth_handler import get_password_hash
        guest = User(
            user_id=GUEST_USER_ID,
            email="guest@nyayassist.local",
            password_hash=get_password_hash("guest_no_login_needed")
        )
        db.add(guest)
        try:
            db.commit()
        except Exception:
            db.rollback()
    return GUEST_USER_ID

@router.get("/sessions")
def get_user_sessions(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Returns chat sessions for the logged-in user or guest user."""
    target_user_id = current_user.user_id if current_user else GUEST_USER_ID
    convs = db.query(Conversation).filter(Conversation.user_id == target_user_id).order_by(Conversation.session_id.desc()).limit(50).all()
    return [{"session_id": c.session_id, "title": c.title or "Legal Inquiry"} for c in convs]


@router.get("/sessions/{session_id}")
def get_session_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Loads all messages and citations for a specific session."""
    conv = db.query(Conversation).filter(Conversation.session_id == session_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify ownership if user is logged in
    if current_user and conv.user_id and conv.user_id != current_user.user_id and conv.user_id != GUEST_USER_ID:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    msgs = db.query(MessageStore).filter(MessageStore.session_id == session_id).order_by(MessageStore.id.asc()).all()
    parsed_messages = []
    for m in msgs:
        try:
            data = json.loads(m.message)
            parsed_messages.append(data)
        except Exception:
            pass
            
    return {"session_id": session_id, "title": conv.title, "messages": parsed_messages}


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Deletes a chat session and all its messages."""
    conv = db.query(Conversation).filter(Conversation.session_id == session_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if current_user and conv.user_id and conv.user_id != current_user.user_id and conv.user_id != GUEST_USER_ID:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    db.query(MessageStore).filter(MessageStore.session_id == session_id).delete()
    db.delete(conv)
    db.commit()
    return {"message": "Session deleted successfully"}


@router.post("/message")
async def chat_message(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    # Formulate query title for better conversation identification
    title_text = "Legal Inquiry"
    if request.structured_intake and request.structured_intake.incident:
        title_text = request.structured_intake.incident[:40].strip()
    elif request.message:
        title_text = request.message[:40].strip()

    # Handle session (use logged-in user or guest user)
    user_id = current_user.user_id if current_user else get_or_create_guest_user(db)
    if not request.session_id:
        new_conv = Conversation(user_id=user_id, title=title_text)
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)
        session_id = new_conv.session_id
    else:
        session_id = request.session_id
        # Verify ownership
        conv = db.query(Conversation).filter(Conversation.session_id == session_id, Conversation.user_id == user_id).first()
        if not conv:
            new_conv = Conversation(session_id=session_id, user_id=user_id, title=title_text)
            db.add(new_conv)
            try:
                db.commit()
            except Exception:
                db.rollback()

    # Formulate query
    if request.structured_intake:
        query = (f"Incident: {request.structured_intake.incident}\n"
                 f"Location: {request.structured_intake.location}\n"
                 f"Actions Taken: {request.structured_intake.actions_taken}\n"
                 f"Authority Response: {request.structured_intake.authority_response}\n"
                 f"Next Steps: {request.structured_intake.next_steps}")
    elif request.message:
        query = request.message
    else:
        raise HTTPException(status_code=400, detail="Must provide either structured_intake or message")

    # Retrieve context
    vectorstore = get_vectorstore()
    context_text = ""
    if vectorstore:
        try:
            docs = vectorstore.similarity_search(query, k=5)
            context_text = "\n\n".join([f"Source: {doc.metadata.get('source', 'Unknown')}\n{doc.page_content}" for doc in docs])
        except Exception as e:
            print(f"[NyayAssist] Vector similarity search note: {e}")
            context_text = ""
            
    if not context_text:
        context_text = (
            "Statutory Framework: Indian Penal & Criminal Law under the Bharatiya Nyaya Sanhita, 2023 (BNS), "
            "the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS), the Bharatiya Sakshya Adhiniyam, 2023 (BSA), "
            "and relevant provisions under the Indian Penal Code (IPC), Code of Criminal Procedure (CrPC), and Indian Evidence Act (IEA)."
        )
    
    # Store user message
    user_msg = MessageStore(session_id=session_id, message=json.dumps({"role": "user", "content": query}))
    db.add(user_msg)
    db.commit()

    # Initialize LLM via unified provider (Groq prioritized, Gemini fallback)
    try:
        from ...llm_provider import get_llm
        llm = get_llm(temperature=0.2, max_tokens=4000)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM initialization error: {str(e)}")
    
    prompt = PromptTemplate(
        template="""You are NyayAssist, a friendly and helpful Indian legal assistant. Your job is to help ordinary citizens (not lawyers) understand their legal situation in simple, everyday language.

IMPORTANT RULES:
1. Use simple, plain language that a person with no legal background can easily understand.
2. Avoid heavy legal jargon. When you must use a legal term, explain it in parentheses. For example: "FIR (First Information Report — a written complaint to the police)".
3. Structure your response clearly with headings and bullet points.
4. Be empathetic and reassuring in tone.
5. Base your answer on Indian statutory provisions (BNS, BNSS, BSA, IPC, CrPC) and the provided legal context.
6. Do NOT estimate any costs or legal fees.
7. Always mention the specific law section numbers for reference.
8. Give DETAILED and THOROUGH explanations. Do not be brief. The user needs comprehensive guidance.

FORMAT YOUR RESPONSE LIKE THIS:

**🔍 Understanding Your Situation**
Explain in detail what the crime/incident is according to Indian law. Mention which specific sections of BNS (Bharatiya Nyaya Sanhita), BNSS (Bharatiya Nagarik Suraksha Sanhita), or BSA (Bharatiya Sakshya Adhiniyam) apply. Describe what the law says about this type of crime, including the definition, severity, and classification (cognizable/non-cognizable, bailable/non-bailable). Also mention the punishment prescribed under the law.

**⚖️ Your Legal Rights**
List ALL the rights the person has in this situation — right to file a complaint, right to a lawyer, right to a fair investigation, etc. Explain each right in 1-2 simple sentences so the user truly understands what protections the law gives them.

**📋 What You Should Do Next**
Provide a clear, numbered, step-by-step action plan. For example:
1. Go to the nearest police station and file an FIR...
2. Keep copies of all documents...
3. If police refuse to act, file a complaint to the Superintendent of Police (SP) or Magistrate...

**🛡️ How the Law Protects You**
Explain what safeguards exist in the law to prevent harassment, ensure police accountability, and protect victims.

**⚠️ Important Precautions & Timelines**
List any crucial deadlines (e.g., limitation periods, time to report), things to NOT do, and documents to preserve immediately.

---
LEGAL CONTEXT:
{context}

USER QUESTION / SITUATION:
{question}

ANSWER:""",
        input_variables=["context", "question"]
    )
    
    chain = prompt | llm

    async def generate():
        # Emit session metadata immediately so history displays the new conversation instantly
        yield f"data: {json.dumps({'session_id': session_id, 'title': title_text, 'init': True})}\n\n"
        
        full_response = ""
        try:
            # We will stream chunks
            for chunk in chain.stream({"context": context_text, "question": query}):
                chunk_text = _extract_text_content(chunk)
                if chunk_text:
                    full_response += chunk_text
                    # SSE format
                    yield f"data: {json.dumps({'chunk': chunk_text})}\n\n"
        except Exception as e:
            error_msg = f"AI model error: {str(e)}"
            print(f"[NyayAssist] Error during generation: {error_msg}")
            yield f"data: {json.dumps({'error': error_msg})}\n\n"
            return
        
        # Save assistant message
        citations = []
        if 'docs' in locals() and docs:
            citations = [{"source": d.metadata.get("source", "Legal Statute"), "snippet": d.page_content[:100]} for d in docs]
            
        ast_msg = MessageStore(session_id=session_id, message=json.dumps({"role": "assistant", "content": full_response, "citations": citations}))
        db.add(ast_msg)
        db.commit()
        
        yield f"data: {json.dumps({'done': True, 'session_id': session_id, 'citations': citations})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


def _extract_text_content(chunk) -> str:
    """Extract plain text from a LangChain chunk, handling both standard and thinking model formats."""
    content = chunk.content if hasattr(chunk, "content") else str(chunk)
    
    # Standard format: content is a plain string
    if isinstance(content, str):
        return content
    
    # Thinking model format: content is a list of dicts like [{"type": "text", "text": "..."}]
    if isinstance(content, list):
        texts = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                texts.append(part.get("text", ""))
            elif isinstance(part, str):
                texts.append(part)
        return "".join(texts)
    
    return str(content) if content else ""


class VoiceFIRRequest(BaseModel):
    voice_transcript: str
    complainant_name: Optional[str] = "Complainant"
    complainant_contact: Optional[str] = ""
    complainant_address: Optional[str] = ""
    location: Optional[str] = ""
    police_station: Optional[str] = ""
    session_id: Optional[str] = None


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...)
):
    """Transcribes user voice audio into text using Groq Whisper API (or returns error if unavailable)."""
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is required for voice transcription.")
    
    try:
        from groq import Groq
        client = Groq(api_key=groq_key.strip())
        
        file_bytes = await file.read()
        filename = file.filename or "voice_recording.webm"
        
        transcription = client.audio.transcriptions.create(
            file=(filename, file_bytes),
            model="whisper-large-v3-turbo",
            prompt="First Information Report, FIR, police complaint, India, BNS, BNSS, crime, theft, assault, harassment, cheating, mobile snatching",
            response_format="json"
        )
        
        text = transcription.text if hasattr(transcription, "text") else transcription.get("text", "")
        return {"text": text.strip()}
    except Exception as e:
        print(f"[NyayAssist] Voice transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Voice transcription failed: {str(e)}")


def parse_fir_json(raw_input: Any, request: VoiceFIRRequest) -> dict:
    """Robustly parse JSON output for Voice FIR drafting with complete field fallback protection."""
    import re
    cleaned = _extract_text_content(raw_input)
    cleaned = re.sub(r"<think>.*?</think>", "", cleaned, flags=re.DOTALL).strip()
    
    parsed = None

    # 1. Try json_repair
    try:
        import json_repair
        result = json_repair.loads(cleaned)
        if isinstance(result, dict) and len(result.keys()) > 0:
            parsed = result
    except Exception as e:
        print(f"[Voice FIR] json_repair error: {e}")

    # 2. Try direct json.loads
    if not parsed:
        try:
            parsed = json.loads(cleaned)
        except Exception:
            pass

    # 3. Try regex extraction of JSON code block
    if not parsed:
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
        if match:
            try:
                import json_repair
                parsed = json_repair.loads(match.group(1))
            except Exception:
                try:
                    parsed = json.loads(match.group(1))
                except Exception:
                    pass

    # 4. Try extracting from first { to last }
    if not parsed:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            snippet = cleaned[start:end+1]
            try:
                import json_repair
                parsed = json_repair.loads(snippet)
            except Exception:
                try:
                    parsed = json.loads(snippet)
                except Exception:
                    pass

    # Ensure parsed is a dict
    if not isinstance(parsed, dict):
        parsed = {}

    # Ensure required schema structure exists with sensible fallbacks
    complaint_meta = parsed.get("complaint_meta", {})
    if not isinstance(complaint_meta, dict):
        complaint_meta = {}

    default_meta = {
        "to": "The Station House Officer (SHO)",
        "police_station": request.police_station or "Jurisdictional Police Station",
        "district": request.location or "Jurisdictional District",
        "complainant_name": request.complainant_name or "Complainant",
        "complainant_contact": request.complainant_contact or "Provided upon filing",
        "complainant_address": request.complainant_address or "As per record",
        "date_of_incident": "Recent",
        "place_of_incident": request.location or "Location of occurrence",
        "accused_details": "Unknown persons (to be identified)"
    }
    for k, v in default_meta.items():
        if k not in complaint_meta or not complaint_meta[k]:
            complaint_meta[k] = v

    title = parsed.get("title") or "Formal Police Complaint / FIR Request"
    incident_type = parsed.get("incident_type") or "Criminal Offense"
    applicable_sections = parsed.get("applicable_sections") or [
        {
            "act": "Bharatiya Nyaya Sanhita, 2023 (BNS)",
            "section": "Section 303 / 304 / 318 BNS",
            "offense_name": "Offense requiring police investigation",
            "classification": "Cognizable & Non-Bailable",
            "punishment": "As prescribed under BNS, 2023"
        }
    ]
    chronological_statement = parsed.get("chronological_statement") or (
        f"I, {request.complainant_name or 'the complainant'}, state that on the date of occurrence, "
        f"{request.voice_transcript}. I request immediate police investigation."
    )
    stolen_or_damaged_property = parsed.get("stolen_or_damaged_property") or []
    evidence_and_witnesses = parsed.get("evidence_and_witnesses") or ["Available eyewitnesses and CCTV / electronic logs"]
    prayer = parsed.get("prayer") or (
        "It is therefore most respectfully prayed that an FIR may kindly be registered under Section 173 of BNSS, 2023, "
        "and appropriate investigation may be initiated immediately."
    )
    citizen_rights = parsed.get("citizen_rights_guidance") or [
        "Under Section 173(2) BNSS, 2023, you are entitled to a free copy of the FIR immediately upon registration.",
        "Under Section 173(1) BNSS, police are mandated to register a Zero FIR if the crime occurred outside local station jurisdiction.",
        "If the police station refuses registration, you may send your complaint in writing to the Superintendent of Police under Section 175(3) BNSS."
    ]

    full_formal_draft = parsed.get("full_formal_draft") or (
        f"To,\n"
        f"The Station House Officer,\n"
        f"{complaint_meta['police_station']}, {complaint_meta['district']}\n\n"
        f"Subject: Formal Police Complaint regarding {title} - Reg. Section 173 BNSS, 2023\n\n"
        f"Sir/Madam,\n\n"
        f"I, {complaint_meta['complainant_name']}, resident of {complaint_meta['complainant_address']}, hereby lodge this complaint:\n\n"
        f"{chronological_statement}\n\n"
        f"Applicable Sections: {', '.join([s.get('section', '') for s in applicable_sections if isinstance(s, dict)])}\n\n"
        f"PRAYER:\n{prayer}\n\n"
        f"Yours sincerely,\n"
        f"{complaint_meta['complainant_name']}\n"
        f"Contact: {complaint_meta['complainant_contact']}"
    )

    return {
        "title": title,
        "incident_type": incident_type,
        "complaint_meta": complaint_meta,
        "applicable_sections": applicable_sections,
        "chronological_statement": chronological_statement,
        "stolen_or_damaged_property": stolen_or_damaged_property,
        "evidence_and_witnesses": evidence_and_witnesses,
        "prayer": prayer,
        "citizen_rights_guidance": citizen_rights,
        "full_formal_draft": full_formal_draft
    }


@router.post("/draft-fir")
async def draft_voice_fir(
    request: VoiceFIRRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Generates an official FIR and police complaint draft based on Section 173 of BNSS, 2023."""
    if not request.voice_transcript or len(request.voice_transcript.strip()) < 5:
        raise HTTPException(status_code=400, detail="Please provide a valid incident narrative or voice recording.")

    # Retrieve context from vectorstore
    vectorstore = get_vectorstore()
    context_text = ""
    if vectorstore:
        try:
            docs = vectorstore.similarity_search(request.voice_transcript, k=4)
            context_text = "\n\n".join([f"Source: {doc.metadata.get('source', 'BNS/BNSS')}\n{doc.page_content}" for doc in docs])
        except Exception as e:
            print(f"[NyayAssist] Vector retrieval notice: {e}")

    try:
        from ...llm_provider import get_llm
        llm = get_llm(temperature=0.1, max_tokens=3500)

        prompt = f"""You are an expert Senior Indian Legal Advocate and Police Procedure Specialist specializing in the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) and Bharatiya Nyaya Sanhita, 2023 (BNS).
Your task is to convert the citizen's voice incident narrative into an official, legally structured FIR / Police Complaint per Section 173 of BNSS, 2023.

Return ONLY a valid JSON object matching the exact schema below:

{{
  "title": "Short descriptive title of the complaint (e.g. Complaint Regarding Day-time Snatching and Criminal Assault)",
  "incident_type": "Primary Offense Classification (e.g., Cyber Fraud / Theft & Snatching / Criminal Breach of Trust / Assault)",
  "complaint_meta": {{
    "to": "The Station House Officer (SHO)",
    "police_station": "{request.police_station or 'Concerned Police Station'}",
    "district": "{request.location or 'Jurisdictional District'}",
    "complainant_name": "{request.complainant_name or 'Complainant'}",
    "complainant_contact": "{request.complainant_contact or 'Provided upon filing'}",
    "complainant_address": "{request.complainant_address or 'As per record'}",
    "date_of_incident": "Extracted from narrative or 'Recent'",
    "place_of_incident": "Extracted location/landmark",
    "accused_details": "Known accused with particulars or 'Unknown persons with physical descriptions'"
  }},
  "applicable_sections": [
    {{
      "act": "Bharatiya Nyaya Sanhita, 2023 (BNS)",
      "section": "e.g. Section 303(2) / Section 304 / Section 318(4)",
      "offense_name": "Offense name (e.g., Theft / Snatching / Cheating)",
      "classification": "Cognizable & Non-Bailable (or Bailable)",
      "punishment": "Prescribed punishment under BNS"
    }}
  ],
  "chronological_statement": "A formal, chronological, step-by-step narration of the incident written in first-person ('I, the complainant, state that...'). Include precise details of time, sequence of events, stolen/damaged items, and injuries.",
  "stolen_or_damaged_property": ["Item 1 with approximate value / details", "Item 2..."],
  "evidence_and_witnesses": ["Details of any eye-witnesses, CCTV camera locations, UPI transaction IDs, or call records"],
  "prayer": "Formal legal prayer requesting: 1. Immediate registration of FIR under Section 173 of BNSS, 2023; 2. Prompt investigation by dispatching an officer under Section 175 BNSS; 3. Apprehension of accused and recovery of property.",
  "citizen_rights_guidance": [
    "Right to Free Copy: Under Section 173(2) BNSS, 2023, you are entitled to receive a free copy of the FIR immediately upon registration.",
    "Zero FIR Mandate: If the crime occurred outside the local police station limits, police MUST register a Zero FIR and transfer it to the jurisdictional station.",
    "Remedy if Refused: If the SHO refuses to lodge the FIR, you have the statutory right to send the complaint to the Superintendent of Police (SP) under Section 175(3) BNSS or file an application before the Judicial Magistrate under Section 175(4) BNSS."
  ],
  "full_formal_draft": "The complete, ready-to-print official police complaint letter with standard Indian police formatting including header, subject, body paragraphs, prayer, verification declaration, and signature placeholder."
}}

Relevant Indian Law Context:
{context_text}

Citizen's Voice Narrative:
\"\"\"
{request.voice_transcript}
\"\"\"
"""
        response = llm.invoke(prompt)
        return parse_fir_json(response, request)
    except Exception as e:
        print(f"[Voice FIR] Generation error: {e}")
        # Return structured fallback directly
        return parse_fir_json({}, request)





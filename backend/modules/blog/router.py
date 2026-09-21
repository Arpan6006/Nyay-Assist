import re
import json
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from ..db_sync.db import get_db
from ..db_sync.schema import BlogPost, LawMapping
from ...llm_provider import get_llm

router = APIRouter(prefix="/blog", tags=["blog"])

class LawMappingResponse(BaseModel):
    old_act: str
    old_section: str
    new_act: str
    new_section: str
    remarks: Optional[str]

class BlogPostSummary(BaseModel):
    post_id: str
    title: str
    crime_type: str
    source_sections: str

class BlogSearchResponse(BaseModel):
    posts: List[BlogPostSummary]
    mappings: List[LawMappingResponse]

class BlogPostDetail(BaseModel):
    post_id: str
    title: str
    body: str
    crime_type: str
    source_sections: str
    mappings: List[LawMappingResponse]

class BlogQueryRequest(BaseModel):
    post_id: Optional[str] = None
    post_title: str
    crime_type: Optional[str] = None
    source_sections: Optional[str] = None
    post_body: Optional[str] = None
    question: str
    history: Optional[List[dict]] = None

class BlogQueryResponse(BaseModel):
    answer: str
    relevant_sections: List[str] = []
    suggested_followups: List[str] = []

@router.post("/ask", response_model=BlogQueryResponse)
def ask_blog_question(req: BlogQueryRequest, db: Session = Depends(get_db)):
    try:
        llm = get_llm(temperature=0.2, max_tokens=1500)
        
        system_instruction = (
            "You are NyayAssist's Specialized Legal Blog & Statutory AI Assistant.\n"
            "The user is currently reading the legal article:\n"
            f"Title: {req.post_title}\n"
            f"Category / Crime Type: {req.crime_type or 'General'}\n"
            f"Statutory References: {req.source_sections or 'BNS / BNSS / BSA'}\n"
            f"Article Content Excerpt:\n{req.post_body[:2500] if req.post_body else ''}\n\n"
            "User's Question: " + req.question + "\n\n"
            "FORMATTING & OUTPUT RULES:\n"
            "1. Answer clearly, authoritatively, and concisely based on Indian Law (Bharatiya Nyaya Sanhita 2023, BNSS 2023, BSA 2023, IPC, CrPC, IEA).\n"
            "2. DO NOT use ASCII/Markdown tables with pipe symbols (|---|---| or | col1 | col2 |). Instead, use clean structured bullet points, clear headings, or key-value lists.\n"
            "3. DO NOT output raw markdown symbols like '##' or '###' for headings. Use clean bold titles (e.g. **1. Cognizability & Bail Status:**) or regular section sentences.\n"
            "4. Use clean standard bullet points (- or •) and bold text (**term**). Avoid single asterisks for italics (*word*).\n"
            "5. If relevant, explain differences between the new law (BNS/BNSS/BSA) and the previous code (IPC/CrPC/IEA).\n"
            "6. At the very end of your response, output a JSON block with exactly this structure:\n"
            "```json\n"
            "{\n"
            '  "relevant_sections": ["Section 303 BNS", "Section 304 BNS"],\n'
            '  "suggested_followups": ["What is the bail process for this offense?", "What digital evidence is admissible under BSA?"]\n'
            "}\n"
            "```\n"
        )
        
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        messages = [SystemMessage(content=system_instruction)]
        
        if req.history:
            for h in req.history[-4:]:
                if h.get("role") == "user":
                    messages.append(HumanMessage(content=h.get("content", "")))
                elif h.get("role") == "assistant":
                    messages.append(AIMessage(content=h.get("content", "")))
                    
        messages.append(HumanMessage(content=req.question))
        
        res = llm.invoke(messages)
        res_text = res.content if hasattr(res, 'content') else str(res)
        
        relevant_sections = []
        suggested_followups = [
            f"What are the bail provisions under {req.source_sections or 'BNS'}?",
            "What evidence is required to prove this offense under BSA?",
            "How does this compare to the previous IPC/CrPC law?"
        ]
        
        json_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", res_text)
        if json_match:
            try:
                parsed = json.loads(json_match.group(1))
                if "relevant_sections" in parsed and isinstance(parsed["relevant_sections"], list):
                    relevant_sections = parsed["relevant_sections"]
                if "suggested_followups" in parsed and isinstance(parsed["suggested_followups"], list):
                    suggested_followups = parsed["suggested_followups"]
                res_text = res_text[:json_match.start()].strip()
            except Exception:
                pass
                
        return BlogQueryResponse(
            answer=res_text,
            relevant_sections=relevant_sections,
            suggested_followups=suggested_followups[:3]
        )
    except Exception as e:
        print(f"[NyayAssist] Blog AI Q&A error: {e}")
        return BlogQueryResponse(
            answer=f"Under statutory provisions relating to **{req.post_title}**, offenses and legal remedies are codified under the **Bharatiya Nyaya Sanhita, 2023 (BNS)** and procedural safeguards under the **BNSS, 2023**.\n\nFor detailed application to your case, refer to the cited sections ({req.source_sections or 'BNS'}) or start an interactive consultation in the Legal Chat tab.",
            relevant_sections=[s.strip() for s in (req.source_sections or "").split(",") if s.strip()],
            suggested_followups=[
                "What is the procedure to file an FIR under Section 173 BNSS?",
                "What are the bail conditions for this offense?",
                "How does BNS differ from IPC in this matter?"
            ]
        )


@router.get("/search", response_model=BlogSearchResponse)
def search_blog(
    q: Optional[str] = Query(None),
    crime_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    post_query = db.query(BlogPost)
    
    if q:
        post_query = post_query.filter(
            (BlogPost.title.ilike(f"%{q}%")) | (BlogPost.body.ilike(f"%{q}%"))
        )
    if crime_type:
        post_query = post_query.filter(BlogPost.crime_type == crime_type)
        
    posts = post_query.all()
    
    mappings = []
    # If there is a text query, check for exact section mapping
    if q:
        # Very basic check: Does the query match an old_section or new_section exactly?
        # e.g., "302", "IPC 302", "BNS 103"
        # We strip non-alphanumeric for a loose match
        clean_q = q.strip().lower()
        map_query = db.query(LawMapping).filter(
            (LawMapping.old_section.ilike(f"%{clean_q}%")) | 
            (LawMapping.new_section.ilike(f"%{clean_q}%")) |
            (LawMapping.old_act.ilike(f"%{clean_q}%")) |
            (LawMapping.new_act.ilike(f"%{clean_q}%"))
        )
        # To avoid massive results if they just search "the", we'll only do this if it looks like a section or act
        if re.search(r'\d+', clean_q) or clean_q in ["ipc", "bns", "crpc", "bnss", "iea", "bsa"]:
             mappings = map_query.limit(10).all()

    return {
        "posts": [
            BlogPostSummary(
                post_id=p.post_id,
                title=p.title,
                crime_type=p.crime_type,
                source_sections=p.source_sections
            ) for p in posts
        ],
        "mappings": [
            LawMappingResponse(
                old_act=m.old_act,
                old_section=m.old_section,
                new_act=m.new_act,
                new_section=m.new_section,
                remarks=m.remarks
            ) for m in mappings
        ]
    }

@router.get("/posts/{post_id}", response_model=BlogPostDetail)
def get_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
        
    # Get mappings for the cited source sections
    mappings = []
    if post.source_sections:
        try:
            # Assume source_sections is a comma-separated string or simple JSON
            sections = post.source_sections.split(',')
            for sec in sections:
                sec = sec.strip()
                matches = db.query(LawMapping).filter(LawMapping.new_section.ilike(f"%{sec}%")).all()
                mappings.extend(matches)
        except:
            pass # Ignore parsing errors on source sections
            
    return BlogPostDetail(
        post_id=post.post_id,
        title=post.title,
        body=post.body,
        crime_type=post.crime_type,
        source_sections=post.source_sections,
        mappings=[
            LawMappingResponse(
                old_act=m.old_act,
                old_section=m.old_section,
                new_act=m.new_act,
                new_section=m.new_section,
                remarks=m.remarks
            ) for m in mappings
        ]
    )

class BlogPostCreate(BaseModel):
    title: str
    body: str
    crime_type: str
    source_sections: str
    password: str

@router.post("")
def create_post(post: BlogPostCreate, db: Session = Depends(get_db)):
    from ..admin.router import verify_admin
    verify_admin(post.password)
    
    new_post = BlogPost(
        title=post.title,
        body=post.body,
        crime_type=post.crime_type,
        source_sections=post.source_sections
    )
    db.add(new_post)
    db.commit()
    return {"message": "Post created successfully"}

@router.put("/{post_id}")
def update_post(post_id: str, post: BlogPostCreate, db: Session = Depends(get_db)):
    from ..admin.router import verify_admin
    verify_admin(post.password)
    
    existing = db.query(BlogPost).filter(BlogPost.post_id == post_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
        
    existing.title = post.title
    existing.body = post.body
    existing.crime_type = post.crime_type
    existing.source_sections = post.source_sections
    
    db.commit()
    return {"message": "Post updated successfully"}

@router.delete("/{post_id}")
def delete_post(post_id: str, password: str, db: Session = Depends(get_db)):
    from ..admin.router import verify_admin
    verify_admin(password)
    
    post = db.query(BlogPost).filter(BlogPost.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    db.delete(post)
    db.commit()
    return {"message": "Post deleted successfully"}

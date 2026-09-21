import os
import re
import tempfile
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from ..db_sync.db import get_db
from ..auth.router import get_current_user
from .template_schema import list_document_types, get_document_schema, validate_required_fields
from .pdf_generator import create_legal_pdf
from docxtpl import DocxTemplate

router = APIRouter(prefix="/documents", tags=["document_generator"])
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    GENERATED_DIR = "/tmp/nyayassist_generated"
else:
    GENERATED_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "generated")
os.makedirs(GENERATED_DIR, exist_ok=True)

class DocumentPreviewRequest(BaseModel):
    type_id: str
    data: Dict[str, Any] = Field(default_factory=dict)

class ComplianceAuditRequest(BaseModel):
    type_id: str
    state: str = "Delhi"
    data: Dict[str, Any] = Field(default_factory=dict)

INDIAN_STATES = [
    "Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "Uttar Pradesh",
    "Telangana", "Gujarat", "West Bengal", "Rajasthan", "Haryana", "Kerala", "Other States / Central"
]

def calculate_state_stamp_duty(type_id: str, state: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates state-specific Indian stamp duty, registration fees, and statutory schedule."""
    state = state.strip()
    
    if type_id == "rental_agreement":
        try:
            rent = float(data.get("rent_amount") or 0)
        except Exception:
            rent = 0.0
        try:
            deposit = float(data.get("security_deposit") or 0)
        except Exception:
            deposit = 0.0
        try:
            months = int(data.get("duration_months") or 11)
        except Exception:
            months = 11

        is_registered_mandatory = months > 11

        if state == "Maharashtra":
            # Maharashtra: 0.25% of total consideration (Rent * months + non-refundable deposit + 10% refundable deposit * years)
            years = max(1.0, months / 12.0)
            total_consideration = (rent * months) + (deposit * 0.10 * years)
            calc_duty = max(100, round(total_consideration * 0.0025))
            reg_fee = 1000 if rent > 0 else 500
            return {
                "duty_amount": f"₹{calc_duty:,}",
                "duty_formula": f"0.25% of total consideration ({months} months rent + 10% refundable deposit interest)",
                "registration_fee": f"₹{reg_fee:,}",
                "registration_status": "Mandatory e-Registration under Section 55 of Maharashtra Rent Control Act, 1999 (even for <11 months).",
                "act_citation": "The Maharashtra Stamp Act (Schedule I, Article 36A)",
                "portal": "IGR Maharashtra e-Filing Portal (igrmaharashtra.gov.in)"
            }
        elif state == "Karnataka":
            # Karnataka Article 30: For <11 months, usually ₹500 e-Stamp or 0.5% of annual rent + deposit
            annual_val = (rent * min(months, 12)) + deposit
            calc_duty = 500 if months <= 11 else max(1000, round(annual_val * 0.01))
            reg_fee = 200 if months <= 11 else max(500, round(annual_val * 0.01))
            return {
                "duty_amount": f"₹{calc_duty:,}",
                "duty_formula": "₹500 flat for 11-month lease; 1% of total value for leases > 11 months",
                "registration_fee": f"₹{reg_fee:,}",
                "registration_status": "Mandatory registration under Section 17 Registration Act if lease > 11 months." if is_registered_mandatory else "Optional for 11-month agreement; Notarization with two witnesses recommended.",
                "act_citation": "The Karnataka Stamp Act, 1957 (Article 30)",
                "portal": "Kaveri 2.0 Karnataka Registration Portal (kaveri.karnataka.gov.in)"
            }
        elif state == "Delhi":
            calc_duty = 500 if months <= 11 else max(1000, round((rent * 12) * 0.02))
            reg_fee = 1000 if is_registered_mandatory else 0
            return {
                "duty_amount": f"₹{calc_duty:,}",
                "duty_formula": "₹100 - ₹500 e-Stamp for 11 months; 2% of average annual rent for > 11 months",
                "registration_fee": f"₹{reg_fee:,}" if is_registered_mandatory else "₹0 (Exempt for ≤ 11 months)",
                "registration_status": "Mandatory Registration at Sub-Registrar Office if lease > 11 months." if is_registered_mandatory else "11-Month lease valid on ₹500 e-Stamp paper with Notary attestation.",
                "act_citation": "The Delhi Stamp Rules & Indian Stamp Act (Schedule I-A, Article 35)",
                "portal": "Stock Holding Corporation of India (SHCIL Delhi e-Stamping)"
            }
        elif state == "Tamil Nadu":
            calc_duty = 100 if months <= 11 else max(500, round((rent * 12) * 0.01))
            reg_fee = 1000 if is_registered_mandatory else 200
            return {
                "duty_amount": f"₹{calc_duty:,}",
                "duty_formula": "1% of total rent + deposit (Min ₹100 for 11-month agreement)",
                "registration_fee": f"₹{reg_fee:,}",
                "registration_status": "Mandatory Registration under Tamil Nadu Tenancy Act, 2017 (TNRERA portal).",
                "act_citation": "The Tamil Nadu Stamp Act (Article 35)",
                "portal": "TNreginet Portal (tnreginet.gov.in)"
            }
        else:
            calc_duty = 100 if months <= 11 else 500
            reg_fee = 1000 if is_registered_mandatory else 0
            return {
                "duty_amount": f"₹{calc_duty:,}",
                "duty_formula": "Standard State Non-Judicial e-Stamp Paper (₹100 / ₹500)",
                "registration_fee": f"₹{reg_fee:,}" if is_registered_mandatory else "₹0 (Exempt for ≤ 11 months)",
                "registration_status": "Mandatory registration under Section 17 Registration Act if duration > 11 months.",
                "act_citation": "Indian Stamp Act, 1899 (Article 35)",
                "portal": "SHCIL e-Stamping / State e-GRAS Portal"
            }

    elif type_id == "nda":
        duty = 100 if state != "Maharashtra" else 500
        return {
            "duty_amount": f"₹{duty}",
            "duty_formula": f"Fixed duty for Commercial Agreement / MoU under {state} Schedule",
            "registration_fee": "₹0 (Exempt)",
            "registration_status": "Registration not required; enforceable under Section 10 Indian Contract Act.",
            "act_citation": f"{state} Stamp Act (Article 5 - Agreements)",
            "portal": "SHCIL e-Stamp or Digital e-Sign (Aadhaar / NeSL)"
        }

    elif type_id == "general_affidavit":
        duty = 100 if state in ["Maharashtra", "Karnataka", "Delhi"] else 50
        return {
            "duty_amount": f"₹{duty}",
            "duty_formula": "Non-Judicial Stamp Paper for Sworn Declaration",
            "registration_fee": "₹0 (Notary attestation fee ₹50-₹100 payable separately)",
            "registration_status": "Must be sworn and attested before a designated Notary Public or Oath Commissioner.",
            "act_citation": "Indian Stamp Act, 1899 (Article 4 - Affidavit)",
            "portal": "Available at all District Court / Civil Sub-Divisional Stamp Vendors"
        }

    elif type_id == "fir_draft":
        return {
            "duty_amount": "₹0 (Completely Free)",
            "duty_formula": "Statutory Exemption under Criminal Procedure",
            "registration_fee": "₹0 (Free)",
            "registration_status": "Mandatory registration of cognizable offences by Police under Section 173 BNSS 2023.",
            "act_citation": "Bharatiya Nagarik Suraksha Sanhita (BNSS, 2023 - Section 173)",
            "portal": "National Cyber Crime Reporting Portal (cybercrime.gov.in) / Local Police Station"
        }

    elif type_id == "legal_notice":
        return {
            "duty_amount": "₹0 (No Stamp Duty)",
            "duty_formula": "Issued as formal written legal communication",
            "registration_fee": "₹0 (Postal charges applicable for Registered Post AD)",
            "registration_status": "Must be dispatched via India Post Registered A.D. or Speed Post with delivery tracking.",
            "act_citation": "Code of Civil Procedure, 1908 (Sec 80) / Specific Relief Act",
            "portal": "India Post Speed Post Tracking"
        }

    elif type_id == "power_of_attorney":
        duty = 500 if state in ["Maharashtra", "Karnataka", "Delhi"] else 100
        return {
            "duty_amount": f"₹{duty}",
            "duty_formula": "Standard General Power of Attorney without consideration",
            "registration_fee": "₹500 - ₹1,000",
            "registration_status": "Mandatory registration at Sub-Registrar office if conferring power to sell/transfer real estate.",
            "act_citation": "Indian Stamp Act (Article 48 - Power of Attorney)",
            "portal": "State Sub-Registrar / e-Stamping Portal"
        }

    elif type_id == "will":
        return {
            "duty_amount": "₹0 (Exempt from Stamp Duty)",
            "duty_formula": "Testamentary instruments are 100% exempt from Indian Stamp Duty",
            "registration_fee": "₹100 - ₹500 (Optional registration)",
            "registration_status": "Registration under Section 18 of Registration Act is optional but highly recommended to prevent probate disputes.",
            "act_citation": "Indian Succession Act, 1925 & Registration Act, 1908 (Sec 18)",
            "portal": "Sub-Registrar Office in jurisdiction of testator's residence"
        }

    elif type_id == "employment_agreement":
        duty = 100 if state != "Maharashtra" else 500
        return {
            "duty_amount": f"₹{duty}",
            "duty_formula": "Agreement not otherwise provided for",
            "registration_fee": "₹0 (Exempt)",
            "registration_status": "Enforceable under Indian Contract Act, 1872; non-compete restraint after termination is void under Sec 27.",
            "act_citation": "Indian Stamp Act (Article 5)",
            "portal": "Internal Corporate HR Execution / e-Sign"
        }

    return {
        "duty_amount": "₹100",
        "duty_formula": "Standard Non-Judicial Stamp Paper",
        "registration_fee": "₹0",
        "registration_status": "Check local state schedule for execution rules.",
        "act_citation": "Indian Stamp Act, 1899",
        "portal": "State e-Stamping Portal"
    }

def audit_document_compliance(type_id: str, state: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Runs a deep pre-flight statutory and risk diagnostic on the document."""
    stamp_info = calculate_state_stamp_duty(type_id, state, data)
    checks: List[Dict[str, Any]] = []
    score = 100

    # Universal Checks
    empty_fields = [k for k, v in data.items() if not str(v).strip()]
    if empty_fields:
        penalty = min(20, len(empty_fields) * 5)
        score -= penalty
        checks.append({
            "status": "warning",
            "title": f"Incomplete Form Fields ({len(empty_fields)} missing)",
            "message": f"Fields [{', '.join([f.replace('_', ' ').title() for f in empty_fields[:3]])}] are currently empty. Complete them to prevent ambiguity in execution.",
            "statute": "Indian Evidence Act / BSA 2023 Sec 91 (Best Evidence Rule)"
        })
    else:
        checks.append({
            "status": "pass",
            "title": "All Core Form Fields Populated",
            "message": "All essential transactional variables and names are fully provided.",
            "statute": "Indian Contract Act, 1872 Sec 29 (Certainty of Terms)"
        })

    # Type Specific Checks
    if type_id == "rental_agreement":
        duration = int(data.get("duration_months") or 11)
        if duration > 11:
            score -= 10
            checks.append({
                "status": "action_required",
                "title": "Mandatory Sub-Registrar Registration Triggered",
                "message": f"Your tenure is {duration} months. Under Section 17(1)(d) of the Registration Act, 1908, any lease exceeding 11 months CANNOT be enforced in court without formal registration at the Sub-Registrar Office.",
                "statute": "Registration Act, 1908 (Section 17)"
            })
        else:
            checks.append({
                "status": "pass",
                "title": "11-Month Non-Registration Exemption Active",
                "message": "A lease tenure of 11 months is legally exempt from compulsory Sub-Registrar registration and can be executed on Non-Judicial e-Stamp paper with Notary attestation.",
                "statute": "Registration Act, 1908 (Section 17(1)(d) Exception)"
            })

        deposit_val = float(data.get("security_deposit") or 0)
        if deposit_val <= 0:
            score -= 5
            checks.append({
                "status": "warning",
                "title": "Zero Security Deposit Specified",
                "message": "Specify a refundable security deposit to protect the lessor against utility arrears or physical property damage.",
                "statute": "Model Tenancy Act / Standard Property Practice"
            })
        else:
            checks.append({
                "status": "pass",
                "title": "Security Deposit Clause Defined",
                "message": f"Refundable deposit of Rs. {deposit_val:,.0f} protects against tenant default.",
                "statute": "Transfer of Property Act, 1882"
            })

    elif type_id == "nda":
        years = int(data.get("duration_years") or 2)
        if years > 5:
            checks.append({
                "status": "warning",
                "title": "Long Confidentiality Duration (> 5 years)",
                "message": "Excessively long confidentiality terms (beyond trade secrets) may face scrutiny under Section 27 of Indian Contract Act if considered a restraint of trade.",
                "statute": "Indian Contract Act, 1872 (Section 27)"
            })
        else:
            checks.append({
                "status": "pass",
                "title": "Enforceable Confidentiality Period",
                "message": f"The {years}-year confidentiality duration is standard and enforceable in Indian commercial courts.",
                "statute": "Indian Contract Act, 1872 (Section 10)"
            })

    elif type_id == "general_affidavit":
        checks.append({
            "status": "action_required",
            "title": "Mandatory Notary Public Oath Attestation",
            "message": "The deponent must personally appear before an authorized Notary Public with government photo ID (Aadhaar/PAN) for entry into the Notary Register.",
            "statute": "Notaries Act, 1952 & Oaths Act, 1969"
        })

    elif type_id == "fir_draft":
        checks.append({
            "status": "pass",
            "title": "Statutory Police Cognizance under BNSS 2023",
            "message": "Drafted compliant with Section 173 of Bharatiya Nagarik Suraksha Sanhita (replacing CrPC Section 154). Zero FIR facility is available across all police stations.",
            "statute": "BNSS 2023 (Section 173 - Information in Cognizable Cases)"
        })

    elif type_id == "will":
        checks.append({
            "status": "action_required",
            "title": "Mandatory Dual Independent Witness Rule",
            "message": "Under Section 63 of Indian Succession Act, a Will MUST be attested by at least TWO witnesses who saw the testator sign. Beneficiaries must NEVER be attesting witnesses.",
            "statute": "Indian Succession Act, 1925 (Section 63(c))"
        })

    # Execution Checks
    checks.append({
        "status": "pass",
        "title": f"State Stamp Schedule Mapped ({state})",
        "message": f"Requires {stamp_info['duty_amount']} e-Stamp paper under {stamp_info['act_citation']}.",
        "statute": stamp_info['act_citation']
    })

    final_score = max(50, min(100, score))
    status_label = "Compliant" if final_score >= 90 else "Action Required" if final_score >= 70 else "High Risk"

    return {
        "overall_score": final_score,
        "status": status_label,
        "selected_state": state,
        "stamp_calculation": stamp_info,
        "checks": checks
    }

def get_compliance_info(type_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Provides Indian legal execution rules and stamp duty guidance for specific document types."""
    if type_id == "rental_agreement":
        duration = int(data.get("duration_months") or 11)
        registration_needed = duration > 11
        return {
            "stamp_duty_recommendation": "Execute on Non-Judicial e-Stamp Paper of ₹100 / ₹500 (as applicable in your State).",
            "registration_requirement": "Mandatory Registration with Sub-Registrar under Sec 17 of Registration Act if duration > 11 months." if registration_needed else "11-Month lease can be executed on e-Stamp paper with Notarization and two witness signatures.",
            "checklist": [
                "Print on Non-Judicial Stamp Paper (First page) or attach e-Stamp certificate",
                "Signatures of both Landlord and Tenant on all pages",
                "Two witnesses with valid Aadhaar / Voter ID proof",
                "Attach inventory checklist and electricity meter reading on start date"
            ]
        }
    elif type_id == "nda":
        return {
            "stamp_duty_recommendation": "Execute on Non-Judicial Stamp Paper of ₹100 or signed digitally via Aadhaar e-Sign / DocuSign.",
            "registration_requirement": "Registration not mandatory under Indian Contract Act, 1872; execution on stamp paper creates enforceable binding obligation.",
            "checklist": [
                "Clear identification of authorized corporate signatories or individuals",
                "Explicit definition of Confidential Information and Permitted Purpose",
                "Specify dispute jurisdiction courts and applicable state law"
            ]
        }
    elif type_id == "general_affidavit":
        return {
            "stamp_duty_recommendation": "Execute on Non-Judicial Stamp paper (₹10, ₹20, ₹50 or ₹100 as prescribed by State Stamp Act).",
            "registration_requirement": "Must be attested and sworn before a Notary Public / Oath Commissioner / Executive Magistrate.",
            "checklist": [
                "Deponent must personally appear before Notary Public with photo ID",
                "Notary seal, registration number, and serial entry in Notary register required",
                "Signature and thumb impression of deponent on verification clause"
            ]
        }
    elif type_id == "fir_draft":
        return {
            "stamp_duty_recommendation": "No stamp duty required. Filing a Police Complaint / FIR is completely free of charge.",
            "registration_requirement": "Submit to the Station House Officer (SHO) under Section 173 of Bharatiya Nagarik Suraksha Sanhita (BNSS 2023).",
            "checklist": [
                "Obtain a stamped Receiving Copy with Daily Diary (DD) / General Diary (GD) number from the police station",
                "Attach medical examination records (MLC) if physical assault occurred",
                "Provide digital evidence hash / transaction UTRs for cybercrime or financial frauds under Section 63 BSA"
            ]
        }
    elif type_id == "legal_notice":
        return {
            "stamp_duty_recommendation": "No stamp duty required. To be issued on Advocate letterhead or signed by the sender.",
            "registration_requirement": "Must be served via Registered Post A.D. (RPAD) or Speed Post with tracking receipt.",
            "checklist": [
                "Retain original postal dispatch slip and track delivery confirmation online",
                "Serve duplicate copy via Registered Email with read receipt",
                "Allow mandatory statutory reply period (usually 15 to 30 days) before filing suit"
            ]
        }
    elif type_id == "power_of_attorney":
        return {
            "stamp_duty_recommendation": "Execute on Stamp Paper as per State Stamp Schedule (typically ₹100 to ₹500 for general; % of property value if authorizing sale).",
            "registration_requirement": "Mandatory registration at Sub-Registrar office if authorizing transfer/sale of immovable property (Suraj Lamp case ruling).",
            "checklist": [
                "Two independent witnesses with photo identity proofs",
                "Passport size photographs and thumb impressions of Principal and Agent",
                "Clear specification of whether powers are revocable or irrevocable"
            ]
        }
    elif type_id == "will":
        return {
            "stamp_duty_recommendation": "No stamp duty required under Indian law. Can be drafted on plain paper (or parchment).",
            "registration_requirement": "Registration under Section 18 of Registration Act is optional but highly recommended to prevent future probate disputes.",
            "checklist": [
                "Testator must be of sound mind and memory (Medical fitness certificate recommended)",
                "Mandatory execution in presence of AT LEAST TWO WITNESSES who attest in presence of testator",
                "Beneficiary should NOT be an attesting witness to prevent conflict of interest"
            ]
        }
    elif type_id == "employment_agreement":
        return {
            "stamp_duty_recommendation": "Execute on company letterhead with ₹100 Non-Judicial Stamp Paper or valid digital signature.",
            "registration_requirement": "Registration not required; enforceable under Section 10 of Indian Contract Act, 1872.",
            "checklist": [
                "Ensure non-compete clauses comply with Section 27 of Indian Contract Act (post-employment restraint void)",
                "Clear definition of Intellectual Property assignment and notice period obligations",
                "Signed acceptance copy retained in employee HR records"
            ]
        }
    return {
        "stamp_duty_recommendation": "Execute on standard Non-Judicial Stamp Paper as applicable.",
        "registration_requirement": "Check local registration rules based on document consideration value.",
        "checklist": ["Verify identity of parties", "Obtain two witness signatures", "Retain signed original duplicate"]
    }

def generate_text_preview(type_id: str, data: Dict[str, Any]) -> str:
    """Renders a court-ready, clean plain text representation of the document with all variables injected."""
    def v(key: str, default: str = "") -> str:
        val = data.get(key)
        return str(val) if val and str(val).strip() else (default or f"[{key.replace('_', ' ').title()}]")

    if type_id == "rental_agreement":
        return f"""RESIDENTIAL RENTAL AGREEMENT

This Rental Agreement is made and executed on {v('start_date', 'DD/MM/YYYY')} by and between:

LANDLORD:
{v('landlord_name')}
(hereinafter referred to as the "LESSOR / LANDLORD", which expression shall include their heirs, successors, and assigns)

AND

TENANT:
{v('tenant_name')}
(hereinafter referred to as the "LESSEE / TENANT", which expression shall include their heirs, executors, and assigns)

1. PROPERTY DEMISED
The Landlord hereby agrees to let out and the Tenant agrees to take on lease the residential premises situated at:
{v('property_address')}

2. RENT AND PAYMENT
The Tenant shall pay a monthly rent of Rs. {v('rent_amount', '0')}/- (Rupees only) to the Landlord on or before the 5th day of each calendar month.

3. SECURITY DEPOSIT
The Tenant has deposited an interest-free refundable security deposit of Rs. {v('security_deposit', '0')}/- with the Landlord. The said deposit shall be refunded in full upon peaceful handover of possession at the termination of tenancy, subject only to deductions for unpaid rent or actual damages beyond normal wear and tear.

4. DURATION AND LOCK-IN
This Agreement shall be valid for a term of {v('duration_months', '11')} months commencing from {v('start_date', 'DD/MM/YYYY')}.

5. UTILITIES AND MAINTENANCE
The Tenant agrees to pay all actual electricity, water, and society maintenance charges consumed during the tenancy period.

6. TERMINATION AND NOTICE
Either party may terminate this agreement by providing one (1) month prior written notice to the other party.

IN WITNESS WHEREOF, both the Landlord and Tenant have set their hands to this Agreement on the day and year first above written.

_____________________________
LANDLORD (Signature)

_____________________________
TENANT (Signature)

WITNESS 1:
Name: ______________________
Signature: _________________

WITNESS 2:
Name: ______________________
Signature: _________________"""

    elif type_id == "nda":
        return f"""NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT

This Non-Disclosure Agreement (the "Agreement") is entered into on {v('effective_date', 'DD/MM/YYYY')}, by and between:

DISCLOSING PARTY:
{v('disclosing_party_name')}

AND

RECEIVING PARTY:
{v('receiving_party_name')}

1. PURPOSE OF DISCLOSURE
The Disclosing Party agrees to share certain proprietary and confidential information with the Receiving Party solely for the purpose of:
{v('purpose')}

2. CONFIDENTIALITY OBLIGATIONS
The Receiving Party agrees to hold and maintain the Proprietary Information in strictest confidence and shall not disclose, copy, or distribute such information to any third party without prior written consent of the Disclosing Party.

3. DURATION
The obligations of confidentiality under this Agreement shall remain in full force and effect for a period of {v('duration_years', '2')} years from the Effective Date.

4. GOVERNING LAW AND JURISDICTION
This Agreement shall be governed by and construed in accordance with the laws of India, and the courts of {v('jurisdiction_state', 'Delhi')} shall have exclusive jurisdiction over any disputes arising hereunder.

IN WITNESS WHEREOF, the parties hereto have executed this Non-Disclosure Agreement.

_____________________________
DISCLOSING PARTY

_____________________________
RECEIVING PARTY"""

    elif type_id == "general_affidavit":
        return f"""GENERAL AFFIDAVIT
BEFORE THE EXECUTIVE MAGISTRATE / NOTARY PUBLIC

I, {v('deponent_name')}, son/daughter/wife of {v('father_name')}, aged about {v('age', '__')} years, residing at {v('address')}, do hereby solemnly affirm and state on oath as under:

1. STATEMENT OF FACTS:
{v('statement')}

2. VERIFICATION:
I, the above-named deponent, do hereby solemnly verify and declare that the contents of paragraphs 1 above are true and correct to the best of my personal knowledge and belief. No part of it is false and nothing material has been concealed therefrom.

Solemnly affirmed and signed at _________________ on this {v('date', 'DD/MM/YYYY')}.

_____________________________
DEPONENT (Signature & Thumb Impression)

ATTESTATION / NOTARY PUBLIC:
Identified by me / Sworn before me on this date.
[Seal and Signature of Notary Public]"""

    elif type_id == "fir_draft":
        return f"""FIRST INFORMATION REPORT (DRAFT COMPLAINT)
UNDER SECTION 173, BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS, 2023)

To,
The Station House Officer (S.H.O),
Police Station: {v('police_station')},
City / District: {v('city')}

SUBJECT: Complaint Regarding Offence Occurred on {v('incident_date', 'DD/MM/YYYY')}

Respected Sir / Madam,

I, {v('complainant_name')}, resident of the district, wish to lodge this formal written complaint regarding a cognizable incident that occurred as detailed below:

1. INCIDENT DETAILS & CHRONOLOGY:
{v('incident_details')}

2. SUSPECT / ACCUSED DETAILS:
{v('suspect_details', 'Unknown / As identified in the investigation')}

3. PRAYER / ACTION REQUESTED:
In view of the aforesaid facts, it is respectfully prayed that a formal First Information Report (FIR) may kindly be registered against the culprit(s) under the applicable provisions of the Bharatiya Nyaya Sanhita (BNS, 2023), and strict legal action be initiated immediately.

Yours faithfully,

_____________________________
{v('complainant_name')}
(Complainant Signature & Contact Details)

Date: {v('incident_date', 'DD/MM/YYYY')}"""

    elif type_id == "legal_notice":
        return f"""LEGAL NOTICE
BY REGISTERED POST A.D. / SPEED POST / EMAIL

Date: {v('date', 'Current Date')}

To,
{v('recipient_name')},
{v('recipient_address')}

SUBJECT: {v('subject')}

Sir / Madam,

Under instructions from and on behalf of my client, {v('sender_name')}, I hereby serve you with this formal Legal Notice as follows:

1. STATEMENT OF FACTS & GRIEVANCE:
{v('notice_body')}

2. DEMAND AND CALL FOR ACTION:
You are hereby called upon to comply with the following demands:
{v('demand')}
within a period of {v('deadline_days', '15')} days from the date of receipt of this notice.

3. CAUTION:
Please take notice that in the event of your failure to comply with the above requisition within the stipulated period, my client shall be constrained to initiate appropriate civil, consumer, and/or criminal legal proceedings against you before the competent courts of law, entirely at your risk, costs, and consequences.

Yours faithfully,

_____________________________
Advocate / Legal Counsel on behalf of {v('sender_name')}"""

    elif type_id == "power_of_attorney":
        return f"""GENERAL POWER OF ATTORNEY

KNOW ALL MEN BY THESE PRESENTS that I, {v('principal_name')}, residing at {v('principal_address')} (hereinafter called the "PRINCIPAL"), do hereby nominate, constitute, and appoint {v('agent_name')}, residing at {v('agent_address')} (hereinafter called the "ATTORNEY / AGENT"), as my true and lawful attorney.

1. POWERS AND AUTHORITIES:
My attorney shall have full authority in my name and on my behalf to manage, execute, sign, appear, and represent me in all official, financial, and legal matters as necessary.

2. COMMENCEMENT AND VALIDITY:
This Power of Attorney shall come into force on {v('effective_date', 'DD/MM/YYYY')} and shall remain valid until expressly revoked by me in writing.

3. RATIFICATION:
I hereby agree to ratify and confirm all lawful acts, deeds, and things done by my said attorney pursuant to this instrument.

IN WITNESS WHEREOF, the Principal has executed this Power of Attorney.

_____________________________
PRINCIPAL

_____________________________
AGENT (Acceptance)

WITNESS 1: __________________
WITNESS 2: __________________"""

    elif type_id == "will":
        return f"""LAST WILL AND TESTAMENT

I, {v('testator_name')}, residing at {v('testator_address')}, being of sound mind, memory, and understanding, do hereby make, publish, and declare this as my Last Will and Testament, hereby revoking all prior Wills and testamentary dispositions made by me.

1. APPOINTMENT OF EXECUTOR:
I hereby appoint {v('executor_name')} to be the sole Executor of this my Last Will and Testament.

2. DISPOSITION AND BEQUEST OF ASSETS:
I direct that my movable and immovable properties and estate shall be distributed as follows:
{v('beneficiary_details')}

3. SIGNATURE OF TESTATOR:
I have signed this Will on {v('date', 'DD/MM/YYYY')} in the presence of the witnesses named below, who have signed in my presence and at my request.

_____________________________
TESTATOR (Signature)

ATTESTING WITNESSES:
We, the undersigned witnesses, certify that the Testator signed this Will in our presence while in sound mind.

WITNESS 1:
Name: ______________________
Address: ___________________
Signature: _________________

WITNESS 2:
Name: ______________________
Address: ___________________
Signature: _________________"""

    elif type_id == "employment_agreement":
        return f"""EMPLOYMENT AGREEMENT

This Employment Agreement is entered into on {v('start_date', 'DD/MM/YYYY')} between:

EMPLOYER:
{v('employer_name')}

AND

EMPLOYEE:
{v('employee_name')}

1. APPOINTMENT AND DESIGNATION:
The Employer hereby appoints the Employee, and the Employee accepts employment in the position of {v('job_title')}, commencing on {v('start_date', 'DD/MM/YYYY')}.

2. COMPENSATION AND REMUNERATION:
The Employee shall receive a monthly gross remuneration of Rs. {v('salary', '0')}/- subject to statutory deductions (PF, TDS).

3. NOTICE PERIOD AND TERMINATION:
Either party may terminate this employment by serving {v('notice_period', '1')} month(s) written notice or gross salary in lieu thereof.

4. CONFIDENTIALITY:
The Employee shall maintain strict confidentiality regarding all company trade secrets and proprietary data.

IN WITNESS WHEREOF, the parties hereto have signed this Agreement.

_____________________________
EMPLOYER

_____________________________
EMPLOYEE"""

    schema = get_document_schema(type_id)
    doc_name = schema["name"] if schema else "LEGAL DOCUMENT"
    fields_summary = "\n".join([f"{k.replace('_', ' ').title()}: {val}" for k, val in data.items() if val])
    return f"""{doc_name.upper()}

Date: {v('date', 'Current Date')}

DOCUMENT DETAILS:
{fields_summary if fields_summary else 'Please fill in the form fields to view the rendered preview.'}

IN WITNESS WHEREOF, the parties have executed this instrument.

_____________________________
Party 1 Signature

_____________________________
Party 2 Signature"""


@router.get("/types")
def get_types():
    return {"types": list_document_types()}

@router.get("/types/{type_id}/schema")
def get_schema(type_id: str):
    schema = get_document_schema(type_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Document type not found")
    return schema

@router.get("/states")
def get_states():
    return {"states": INDIAN_STATES}

@router.post("/compliance-audit")
def compliance_audit(req: ComplianceAuditRequest):
    schema = get_document_schema(req.type_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Document type not found")
    
    audit_res = audit_document_compliance(req.type_id, req.state, req.data)
    return audit_res

@router.post("/preview")
def preview_document(req: DocumentPreviewRequest):
    schema = get_document_schema(req.type_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Document type not found")
    
    text = generate_text_preview(req.type_id, req.data)
    words = len(text.split())
    est_pages = max(1, (words + 150) // 250)
    compliance = get_compliance_info(req.type_id, req.data)

    return {
        "title": schema["name"],
        "preview_text": text,
        "word_count": words,
        "estimated_pages": est_pages,
        "compliance": compliance
    }

@router.post("/generate")
def generate_document(
    type_id: str = Body(...),
    data: Dict[str, Any] = Body(...),
):
    schema = get_document_schema(type_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Document type not found")
    
    missing = validate_required_fields(type_id, data)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")
    
    template_path = os.path.join(TEMPLATES_DIR, f"{type_id}_template.docx")
    if not os.path.exists(template_path):
        raise HTTPException(status_code=500, detail="Template file not found on server")
    
    try:
        doc = DocxTemplate(template_path)
        doc.render(data)
        
        output_filename = f"{type_id}_generated_{os.urandom(4).hex()}.docx"
        output_path = os.path.join(GENERATED_DIR, output_filename)
        doc.save(output_path)
        
        return FileResponse(
            path=output_path,
            filename=f"{schema['name']}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-pdf")
def generate_pdf(
    type_id: str = Body(...),
    data: Dict[str, Any] = Body(...),
    state: Optional[str] = Body("Delhi"),
):
    schema = get_document_schema(type_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Document type not found")
    
    try:
        text_content = generate_text_preview(type_id, data)
        output_filename = f"{type_id}_generated_{os.urandom(4).hex()}.pdf"
        output_path = os.path.join(GENERATED_DIR, output_filename)
        
        create_legal_pdf(
            output_path=output_path,
            title=schema["name"],
            text_content=text_content,
            state=state or "Delhi"
        )
        
        clean_filename = f"{schema['name'].replace(' ', '_')}.pdf"
        return FileResponse(
            path=output_path,
            filename=clean_filename,
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


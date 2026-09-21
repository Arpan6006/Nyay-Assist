from typing import List, Dict, Any

DOCUMENT_TEMPLATES = {
    "nda": {
        "id": "nda",
        "name": "Non-Disclosure Agreement (NDA)",
        "description": "A standard NDA for protecting confidential information.",
        "fields": [
            {
                "id": "disclosing_party_name",
                "label": "Disclosing Party Name",
                "type": "text",
                "required": True,
                "placeholder": "e.g., Acme Corp or John Doe"
            },
            {
                "id": "receiving_party_name",
                "label": "Receiving Party Name",
                "type": "text",
                "required": True,
                "placeholder": "e.g., Beta Inc or Jane Smith"
            },
            {
                "id": "purpose",
                "label": "Purpose of Disclosure",
                "type": "textarea",
                "required": True,
                "placeholder": "Briefly describe why confidential info is being shared"
            },
            {
                "id": "effective_date",
                "label": "Effective Date",
                "type": "date",
                "required": True
            },
            {
                "id": "duration_years",
                "label": "Duration of Confidentiality (Years)",
                "type": "number",
                "required": True,
                "default": 2
            },
            {
                "id": "jurisdiction_state",
                "label": "Jurisdiction (State)",
                "type": "text",
                "required": True,
                "default": "Delhi"
            }
        ]
    },
    "rental_agreement": {
        "id": "rental_agreement",
        "name": "Residential Rental Agreement",
        "description": "A standard rent agreement for residential properties in India.",
        "fields": [
            {
                "id": "landlord_name",
                "label": "Landlord Name",
                "type": "text",
                "required": True
            },
            {
                "id": "tenant_name",
                "label": "Tenant Name",
                "type": "text",
                "required": True
            },
            {
                "id": "property_address",
                "label": "Property Address",
                "type": "textarea",
                "required": True
            },
            {
                "id": "rent_amount",
                "label": "Monthly Rent (₹)",
                "type": "number",
                "required": True
            },
            {
                "id": "security_deposit",
                "label": "Security Deposit (₹)",
                "type": "number",
                "required": True
            },
            {
                "id": "start_date",
                "label": "Start Date",
                "type": "date",
                "required": True
            },
            {
                "id": "duration_months",
                "label": "Duration (Months)",
                "type": "number",
                "required": True,
                "default": 11
            }
        ]
    },
    "general_affidavit": {
        "id": "general_affidavit",
        "name": "General Affidavit",
        "description": "A sworn statement of facts for general legal and official purposes.",
        "fields": [
            {"id": "deponent_name", "label": "Name of Deponent", "type": "text", "required": True},
            {"id": "father_name", "label": "Father's/Husband's Name", "type": "text", "required": True},
            {"id": "age", "label": "Age", "type": "number", "required": True},
            {"id": "address", "label": "Residential Address", "type": "textarea", "required": True},
            {"id": "statement", "label": "Statement of Facts", "type": "textarea", "required": True},
            {"id": "date", "label": "Date of Affidavit", "type": "date", "required": True},
        ]
    },
    "fir_draft": {
        "id": "fir_draft",
        "name": "FIR Draft",
        "description": "A draft for filing a First Information Report (FIR) to the police.",
        "fields": [
            {"id": "police_station", "label": "Police Station Name", "type": "text", "required": True},
            {"id": "city", "label": "City/District", "type": "text", "required": True},
            {"id": "complainant_name", "label": "Complainant Name", "type": "text", "required": True},
            {"id": "incident_date", "label": "Date of Incident", "type": "date", "required": True},
            {"id": "incident_details", "label": "Details of the Incident", "type": "textarea", "required": True},
            {"id": "suspect_details", "label": "Suspect Details (if any)", "type": "textarea", "required": False},
        ]
    },
    "legal_notice": {
        "id": "legal_notice",
        "name": "Legal Notice",
        "description": "A formal official letter/notice sent before initiating legal action.",
        "fields": [
            {"id": "sender_name", "label": "Sender Name", "type": "text", "required": True},
            {"id": "recipient_name", "label": "Recipient Name", "type": "text", "required": True},
            {"id": "recipient_address", "label": "Recipient Address", "type": "textarea", "required": True},
            {"id": "subject", "label": "Subject", "type": "text", "required": True},
            {"id": "notice_body", "label": "Notice Description", "type": "textarea", "required": True},
            {"id": "demand", "label": "Demand/Action Required", "type": "textarea", "required": True},
            {"id": "deadline_days", "label": "Deadline for Action (Days)", "type": "number", "required": True, "default": 15},
        ]
    },
    "power_of_attorney": {
        "id": "power_of_attorney",
        "name": "General Power of Attorney",
        "description": "A document authorizing someone to act on your behalf in legal and financial matters.",
        "fields": [
            {"id": "principal_name", "label": "Principal Name (Your Name)", "type": "text", "required": True},
            {"id": "principal_address", "label": "Principal Address", "type": "textarea", "required": True},
            {"id": "agent_name", "label": "Agent Name (Attorney-in-Fact)", "type": "text", "required": True},
            {"id": "agent_address", "label": "Agent Address", "type": "textarea", "required": True},
            {"id": "effective_date", "label": "Effective Date", "type": "date", "required": True},
        ]
    },
    "will": {
        "id": "will",
        "name": "Last Will and Testament",
        "description": "A standard Will outlining the distribution of your assets after death.",
        "fields": [
            {"id": "testator_name", "label": "Testator Name (Your Name)", "type": "text", "required": True},
            {"id": "testator_address", "label": "Your Address", "type": "textarea", "required": True},
            {"id": "executor_name", "label": "Executor Name (Person executing the Will)", "type": "text", "required": True},
            {"id": "beneficiary_details", "label": "Beneficiary & Asset Details", "type": "textarea", "required": True, "placeholder": "Describe who gets what (e.g. My house to John)"},
            {"id": "date", "label": "Date of Signing", "type": "date", "required": True},
        ]
    },
    "employment_agreement": {
        "id": "employment_agreement",
        "name": "Employment Agreement",
        "description": "A standard contract between an employer and an employee.",
        "fields": [
            {"id": "employer_name", "label": "Employer Name", "type": "text", "required": True},
            {"id": "employee_name", "label": "Employee Name", "type": "text", "required": True},
            {"id": "job_title", "label": "Job Title", "type": "text", "required": True},
            {"id": "start_date", "label": "Start Date", "type": "date", "required": True},
            {"id": "salary", "label": "Monthly Salary (₹)", "type": "number", "required": True},
            {"id": "notice_period", "label": "Notice Period (Months)", "type": "number", "required": True, "default": 1},
        ]
    }
}

def list_document_types() -> List[Dict[str, str]]:
    """Returns a list of available document templates."""
    return [{"id": v["id"], "name": v["name"], "description": v["description"]} for v in DOCUMENT_TEMPLATES.values()]

def get_document_schema(type_id: str) -> Dict[str, Any]:
    """Returns the schema (fields) for a specific document type."""
    if type_id in DOCUMENT_TEMPLATES:
        return DOCUMENT_TEMPLATES[type_id]
    return None

def validate_required_fields(type_id: str, data: Dict[str, Any]) -> List[str]:
    """Validates the input data against the schema. Returns a list of missing required fields."""
    schema = get_document_schema(type_id)
    if not schema:
        raise ValueError(f"Unknown document type: {type_id}")
    
    missing_fields = []
    for field in schema["fields"]:
        if field.get("required", False):
            if field["id"] not in data or data[field["id"]] is None or data[field["id"]] == "":
                missing_fields.append(field["id"])
    return missing_fields

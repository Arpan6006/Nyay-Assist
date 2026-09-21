import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from typing import Dict, Any, List

class BriefNumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0f172a"))
        
        # Header
        self.drawString(54, A4[1] - 36, "NYAYASSIST • PRE-CONSULTATION LEGAL STRATEGY BRIEF")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawRightString(A4[0] - 54, A4[1] - 36, "Confidential • Advocate-Ready Dossier")
        
        # Header line
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.75)
        self.line(54, A4[1] - 42, A4[0] - 54, A4[1] - 42)
        
        # Footer line
        self.line(54, 45, A4[0] - 54, 45)
        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(54, 32, "Generated via NyayAssist AI Intelligence • Privileged Client Preparation Dossier")
        self.drawRightString(A4[0] - 54, 32, f"Page {self._pageNumber} of {page_count}")
        
        self.restoreState()

def create_brief_pdf(output_path: str, brief_data: Dict[str, Any], lawyer_name: str, client_name: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'BriefTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        alignment=0,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )
    
    section_heading = ParagraphStyle(
        'BriefSectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#1e3a8a'), # Deep Navy
        spaceBefore=10,
        spaceAfter=5
    )
    
    body_style = ParagraphStyle(
        'BriefBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BriefBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor('#334155'),
        leftIndent=14,
        spaceAfter=4
    )

    meta_key = ParagraphStyle(
        'MetaKey',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#475569')
    )

    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0f172a')
    )

    story = []
    
    # Title
    case_title = brief_data.get("case_title", "LEGAL CONSULTATION STRATEGY DOSSIER")
    story.append(Paragraph(case_title.upper(), title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=8))
    
    # Metadata Info Box
    urgency = brief_data.get("urgency_level", "Standard")
    meta_table_data = [
        [
            Paragraph("Client Name:", meta_key),
            Paragraph(client_name or "Confidential Client", meta_val),
            Paragraph("Target Advocate:", meta_key),
            Paragraph(lawyer_name or "Legal Counsel", meta_val),
        ],
        [
            Paragraph("Practice Area:", meta_key),
            Paragraph(brief_data.get("practice_area", "General Civil / Criminal"), meta_val),
            Paragraph("Urgency Rating:", meta_key),
            Paragraph(f"<font color='{'#b91c1c' if urgency == 'Urgent' else '#0f172a'}'><b>{urgency}</b></font>", meta_val),
        ],
        [
            Paragraph("Jurisdiction:", meta_key),
            Paragraph(brief_data.get("jurisdiction", "State Courts / Tribunals"), meta_val),
            Paragraph("Prepared Date:", meta_key),
            Paragraph(brief_data.get("date", "Current Date"), meta_val),
        ]
    ]
    
    meta_table = Table(meta_table_data, colWidths=[80, 160, 95, 150])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#f1f5f9")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Section 1: Executive Summary
    story.append(Paragraph("1. EXECUTIVE CASE SUMMARY", section_heading))
    summary_text = brief_data.get("executive_summary", "")
    for p in summary_text.split("\n\n"):
        if p.strip():
            story.append(Paragraph(p.strip().replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), body_style))
    story.append(Spacer(1, 4))

    # Section 2: Chronology of Events
    chronology: List[Dict[str, str]] = brief_data.get("chronology", [])
    if chronology:
        story.append(Paragraph("2. CHRONOLOGY OF KEY EVENTS", section_heading))
        for item in chronology:
            date_str = item.get("date", "Timeline")
            desc_str = item.get("event", "")
            bullet_text = f"<b>[{date_str}]</b>: {desc_str}"
            story.append(Paragraph(bullet_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), bullet_style))
        story.append(Spacer(1, 4))

    # Section 3: Statutory Mapping & Potential Remedies
    statutes: List[str] = brief_data.get("applicable_statutes", [])
    remedies: List[str] = brief_data.get("legal_remedies", [])
    if statutes or remedies:
        story.append(Paragraph("3. APPLICABLE STATUTES & LEGAL REMEDIES", section_heading))
        if statutes:
            story.append(Paragraph("<b>Relevant Statutory Provisions:</b>", body_style))
            for stat in statutes:
                story.append(Paragraph(f"• {stat}".replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), bullet_style))
        if remedies:
            story.append(Spacer(1, 2))
            story.append(Paragraph("<b>Recommended Procedural Remedies:</b>", body_style))
            for rem in remedies:
                story.append(Paragraph(f"• {rem}".replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), bullet_style))
        story.append(Spacer(1, 4))

    # Section 4: Evidence & Document Checklist
    checklist: List[str] = brief_data.get("document_checklist", [])
    if checklist:
        story.append(Paragraph("4. MANDATORY DOCUMENT & EVIDENCE CHECKLIST", section_heading))
        story.append(Paragraph("<i>Bring original and photocopy sets of the following records to the consultation:</i>", body_style))
        for doc_item in checklist:
            story.append(Paragraph(f"[  ]  {doc_item}".replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), bullet_style))
        story.append(Spacer(1, 4))

    # Section 5: Strategic Questions to Ask Advocate
    questions: List[str] = brief_data.get("questions_for_advocate", [])
    if questions:
        story.append(Paragraph("5. STRATEGIC QUESTIONS FOR THE ADVOCATE", section_heading))
        for idx, q in enumerate(questions, 1):
            story.append(Paragraph(f"<b>Q{idx}.</b> {q}".replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), bullet_style))

    doc.build(story, canvasmaker=BriefNumberedCanvas)
    return output_path

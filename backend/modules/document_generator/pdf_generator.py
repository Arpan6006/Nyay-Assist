import os
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from typing import Dict, Any

class NumberedCanvas(canvas.Canvas):
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
        self.setFillColor(colors.HexColor("#1e293b"))
        
        # Header
        self.drawString(54, A4[1] - 36, "NYAYASSIST LEGAL DOCUMENT DRAFTING SYSTEM")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawRightString(A4[0] - 54, A4[1] - 36, "Court-Ready Draft • Indian Legal Jurisdiction")
        
        # Header separator line
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.75)
        self.line(54, A4[1] - 42, A4[0] - 54, A4[1] - 42)
        
        # Footer
        self.line(54, 45, A4[0] - 54, 45)
        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(54, 32, "Drafted via NyayAssist AI Engine • Execute on Non-Judicial e-Stamp Paper as prescribed by State Law")
        self.drawRightString(A4[0] - 54, 32, f"Page {self._pageNumber} of {page_count}")
        
        self.restoreState()

def create_legal_pdf(output_path: str, title: str, text_content: str, state: str = "Delhi"):
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
        'LegalDocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        alignment=1, # Center
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=12
    )
    
    body_style = ParagraphStyle(
        'LegalDocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=8
    )
    
    section_style = ParagraphStyle(
        'LegalDocSection',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=8,
        spaceAfter=4
    )

    story = []
    story.append(Spacer(1, 10))
    
    # Process the text into paragraphs and headings
    lines = text_content.strip().split("\n")
    
    is_first_title = True
    for line in lines:
        stripped = line.strip()
        if not stripped:
            story.append(Spacer(1, 6))
            continue
        
        # Check if line is title
        if is_first_title:
            story.append(Paragraph(stripped, title_style))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0f172a"), spaceAfter=14))
            is_first_title = False
            continue
        
        # Check if line looks like a numbered section header or uppercase title
        if (stripped.isupper() and len(stripped) < 40) or (stripped[0].isdigit() and "." in stripped[:4]):
            story.append(Paragraph(stripped.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), section_style))
        elif stripped.startswith("____"):
            story.append(Spacer(1, 8))
            story.append(Paragraph(stripped, body_style))
        else:
            story.append(Paragraph(stripped.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    return output_path

import os
import re
import pdfplumber

CORPUS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
RAW_PDFS_DIR = os.path.join(CORPUS_DIR, "corpus", "raw_pdfs")
OUTPUT_DIR = os.path.join(CORPUS_DIR, "corpus")

PDF_FILES = ["bns.pdf", "bnss.pdf", "bsa.pdf"]

# Regex to identify a Section header like "103. (1) Whoever commits..." or "Chapter II"
# We will use a basic heuristic: lines starting with a number followed by a dot.
SECTION_PATTERN = re.compile(r"^(\d+[a-zA-Z]?)\.\s*(.*)")

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a PDF file."""
    text_content = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_content.append(text)
    return "\n".join(text_content)

def chunk_by_section(text: str) -> list:
    """Chunk the raw text by statutory sections."""
    lines = text.split('\n')
    chunks = []
    current_chunk = []
    current_section = ""

    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        match = SECTION_PATTERN.match(line)
        if match:
            # Save the previous chunk if it exists
            if current_chunk:
                chunks.append("\n".join(current_chunk))
            
            # Start a new chunk
            current_section = match.group(1)
            current_chunk = [line]
        else:
            current_chunk.append(line)
            
    # Add the last chunk
    if current_chunk:
        chunks.append("\n".join(current_chunk))
        
    return chunks

def build_corpus():
    for pdf_filename in PDF_FILES:
        pdf_path = os.path.join(RAW_PDFS_DIR, pdf_filename)
        output_path = os.path.join(OUTPUT_DIR, pdf_filename.replace(".pdf", ".txt"))
        
        if not os.path.exists(pdf_path):
            print(f"Warning: {pdf_path} not found. Skipping.")
            continue
            
        print(f"Processing {pdf_filename}...")
        raw_text = extract_text_from_pdf(pdf_path)
        
        # We will save the raw extracted text as the txt file.
        # Indexing will handle the chunking logic.
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(raw_text)
            
        print(f"Saved extracted text to {output_path}")

if __name__ == "__main__":
    build_corpus()

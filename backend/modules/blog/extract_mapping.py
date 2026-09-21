import os
import pdfplumber
import sqlite3
import re
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from modules.db_sync.db import engine

SOURCE_PDFS_DIR = os.path.join(os.path.dirname(__file__), "law_mapping", "source_pdfs")
LOG_FILE = os.path.join(os.path.dirname(__file__), "law_mapping", "unparsed_rows.log")

def extract_bprd_pdfs():
    print("Starting BPR&D PDF extraction...")
    
    if not os.path.exists(SOURCE_PDFS_DIR):
        print(f"Directory {SOURCE_PDFS_DIR} not found. Skipping.")
        return
        
    pdf_files = [f for f in os.listdir(SOURCE_PDFS_DIR) if f.endswith(".pdf")]
    if not pdf_files:
        print("No BPR&D PDFs found in source directory.")
        return

    # Basic connection for one-off script
    conn = engine.connect()
    
    unparsed = []

    for filename in pdf_files:
        filepath = os.path.join(SOURCE_PDFS_DIR, filename)
        print(f"Processing {filename}...")
        
        # Determine act mapping from filename heuristics (since they are named predictably by the user per spec)
        lower_name = filename.lower()
        if "ipc" in lower_name and "bns" in lower_name:
            old_act, new_act = "IPC", "BNS"
        elif "crpc" in lower_name and "bnss" in lower_name:
            old_act, new_act = "CrPC", "BNSS"
        elif "iea" in lower_name and "bsa" in lower_name:
            old_act, new_act = "IEA", "BSA"
        else:
            print(f"Could not determine Act names from filename: {filename}. Skipping.")
            continue

        try:
            with pdfplumber.open(filepath) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    table = page.extract_table()
                    if not table:
                        continue
                    
                    # Usually row 0 is header. We'll skip it if it looks like a header.
                    for row_idx, row in enumerate(table):
                        if not row or len(row) < 2:
                            continue
                        
                        # Clean up row items
                        row = [str(item).strip().replace("\n", " ") if item else "" for item in row]
                        
                        if "Section" in row[0] or "Sl. No" in row[0]: # header heuristics
                            continue
                            
                        # Try to parse. Assuming columns: Old Section | New Section | Remarks
                        # The actual BPR&D PDFs might vary slightly. We will take first two numbers.
                        
                        # Find the first two non-empty columns that look like section strings
                        non_empty = [c for c in row if c]
                        
                        if len(non_empty) >= 2:
                            old_sec = non_empty[0]
                            new_sec = non_empty[1]
                            remarks = non_empty[2] if len(non_empty) > 2 else None
                            
                            # Insert into DB
                            from sqlalchemy import text
                            conn.execute(
                                text("INSERT INTO law_mapping (old_act, old_section, new_act, new_section, remarks) VALUES (:old_act, :old_sec, :new_act, :new_sec, :remarks)"),
                                {"old_act": old_act, "old_sec": old_sec, "new_act": new_act, "new_sec": new_sec, "remarks": remarks}
                            )
                        else:
                            unparsed.append(f"{filename} Page {page_num+1} Row {row_idx}: {row}")
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    conn.commit()
    conn.close()

    if unparsed:
        print(f"Some rows could not be parsed. Writing to {LOG_FILE}")
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            for line in unparsed:
                f.write(line + "\n")
    else:
        print("All tables parsed successfully.")

if __name__ == "__main__":
    extract_bprd_pdfs()

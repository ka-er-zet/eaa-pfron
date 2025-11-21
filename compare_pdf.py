import os
import json
from pypdf import PdfReader

def extract_and_compare(pdf_path, json_path, start_page, end_page):
    reader = PdfReader(pdf_path)
    pdf_text = ""
    for i in range(start_page - 1, end_page):
        pdf_text += reader.pages[i].extract_text()
    
    # Load JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    with open('discrepancies.md', 'w', encoding='utf-8') as report:
        report.write(f"# Discrepancies Report for {json_path}\n\n")
        
        # Check for specific strings from JSON in PDF
        # 1. Title
        if data['title'].replace('Audyt Klauzuli 5: ', '') in pdf_text:
             print(f"[OK] Title found: {data['title']}")
        else:
             msg = f"- **Title Mismatch**: `{data['title']}` not found exactly in PDF.\n"
             print(f"[WARN] {msg.strip()}")
             report.write(msg)

        # 2. Check a few random headings
        for item in data['content']:
            if item['type'] == 'heading':
                 # Remove "C." prefix which might be formatting
                 text = item['text']
                 
                 # Normalize spaces
                 import re
                 text_norm = re.sub(r'\s+', ' ', text)
                 pdf_text_norm = re.sub(r'\s+', ' ', pdf_text)

                 if text_norm in pdf_text_norm:
                     print(f"[OK] Heading found: {text}")
                 else:
                     msg = f"- **Heading Missing**: `{text}`\n"
                     print(f"[WARN] {msg.strip()}")
                     report.write(msg)
            
            if item['type'] == 'test':
                 # Check preconditions
                 if 'preconditions' in item:
                     for pre in item['preconditions']:
                         # PDF text might have line breaks
                         clean_pre = pre.replace('\n', ' ')
                         # Normalize spaces
                         import re
                         clean_pre_norm = re.sub(r'\s+', ' ', clean_pre)
                         pdf_text_norm = re.sub(r'\s+', ' ', pdf_text)
                         
                         if clean_pre_norm[:50] in pdf_text_norm: # Check first 50 chars normalized
                             print(f"[OK] Precondition found: {clean_pre[:50]}...")
                         else:
                             msg = f"- **Precondition Mismatch**: `{clean_pre}`\n"
                             print(f"[WARN] {msg.strip()}")
                             report.write(msg)

if __name__ == "__main__":
    pdf_file = "PN-ETSI-EN-301-549-V3.2.1_2021-09P_KOLOR.pdf"
    # Annex C starts on page 144. Clause 5 is likely at the beginning of Annex C.
    # Let's extract pages 144 to 150 for Clause 5 verification.
    extract_and_compare(pdf_file, "clauses_json/c5.json", 144, 155)

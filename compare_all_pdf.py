import os
import json
import re
import difflib
from pypdf import PdfReader

def normalize_text(text):
    """Normalize whitespace and remove non-printable characters."""
    return re.sub(r'\s+', ' ', text).strip()

def get_pdf_text(pdf_path, start_page, end_page):
    reader = PdfReader(pdf_path)
    text = ""
    for i in range(start_page - 1, min(end_page, len(reader.pages))):
        text += reader.pages[i].extract_text() + "\n"
    return normalize_text(text)

def find_best_match(query, text, window_size=50):
    """Find the best fuzzy match for query in text."""
    # This is a naive approach. For better results, we'd scan the text.
    # But since we want to show "what is in PDF", we can try to find the most similar substring.
    # Given the text size, difflib.get_close_matches on words or sentences might be better.
    
    # Let's try to find the location of the best match
    matcher = difflib.SequenceMatcher(None, query, text)
    match = matcher.find_longest_match(0, len(query), 0, len(text))
    
    if match.size > 10: # Arbitrary threshold for "found something relevant"
        start = max(0, match.b - 20)
        end = min(len(text), match.b + match.size + 50)
        return text[start:end]
    return None

def compare_all(pdf_path, json_dir, output_report):
    # Extract Annex C text (approx pages 144-248)
    print("Extracting PDF text...")
    pdf_text = get_pdf_text(pdf_path, 144, 248)
    
    report_lines = ["# Full Discrepancies Report (JSON vs PDF)\n"]
    
    json_files = sorted([f for f in os.listdir(json_dir) if f.endswith('.json')])
    
    for json_file in json_files:
        print(f"Processing {json_file}...")
        report_lines.append(f"\n## File: `{json_file}`\n")
        
        with open(os.path.join(json_dir, json_file), 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Check Title
        title = data['title'].replace('Audyt Klauzuli ', '').replace('Audyt klauzuli ', '')
        # Remove number prefix from title for search (e.g. "5: Wymagania..." -> "Wymagania...")
        title_clean = re.sub(r'^\d+(\.\d+)*:?\s*', '', title)
        
        if title_clean not in pdf_text:
             best_match = find_best_match(title_clean, pdf_text)
             report_lines.append(f"- **Title Mismatch**\n  - JSON: `{data['title']}`\n  - PDF Context: `{best_match if best_match else 'Not found'}`\n")

        # Check Content
        current_heading = "Unknown Clause"
        
        for item in data['content']:
            text_to_check = ""
            item_type = item['type']
            
            if item_type == 'heading':
                current_heading = item['text']
                text_to_check = item['text']
            elif item_type == 'test':
                # Check preconditions and procedure
                checks = []
                if 'preconditions' in item:
                    checks.extend(item['preconditions'])
                if 'procedure' in item:
                    checks.extend(item['procedure'])
                
                for check in checks:
                    # Remove number prefix for comparison if needed, but let's try exact first
                    check_norm = normalize_text(check)
                    
                    # Try exact match
                    if check_norm in pdf_text:
                        continue
                        
                    # Try without number "1. "
                    check_no_num = re.sub(r'^\d+\.\s*', '', check_norm)
                    if check_no_num in pdf_text:
                        continue
                        
                    # If we are here, it's a mismatch
                    best_match = find_best_match(check_no_num, pdf_text)
                    report_lines.append(f"- **Content Mismatch** (Clause: `{current_heading}`)\n  - JSON: `{check}`\n  - PDF Context: `{best_match if best_match else 'Not found'}`\n")

    with open(output_report, 'w', encoding='utf-8') as f:
        f.writelines(report_lines)
    print(f"Report generated: {output_report}")

if __name__ == "__main__":
    compare_all(
        "PN-ETSI-EN-301-549-V3.2.1_2021-09P_KOLOR.pdf",
        "clauses_json",
        "discrepancies_full.md"
    )

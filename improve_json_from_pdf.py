import json
import os
import re
from pypdf import PdfReader

# Configuration
PDF_PATH = "PN-ETSI-EN-301-549-V3.2.1_2021-09P_KOLOR.pdf"
JSON_DIR = "clauses_json"
OUTPUT_DIR = "clauses_json_pdf"

def extract_text_from_pdf(pdf_path):
    """Extracts text from the PDF, covering relevant chapters."""
    reader = PdfReader(pdf_path)
    text = ""
    # The standard is long. Annex C starts around page 108, but let's be safe.
    # We'll read from page 50 to the end to capture all clauses.
    start_page = 50 
    end_page = len(reader.pages)
    
    print(f"Processing pages {start_page} to {end_page}...")
    
    for i in range(start_page, end_page):
        try:
            page = reader.pages[i]
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        except Exception as e:
            print(f"Error reading page {i}: {e}")
            
    return text

def parse_pdf_text(text):
    """
    Parses the extracted PDF text into a structured dictionary.
    Handles multiple tests within same clause (Test nr 1, Test nr 2, etc.)
    Returns: { 'C.x.x.x': { 'preconditions': [...], 'procedure': [...], 'results': [...] },
               'C.x.x.x#2': { ... } }  # For second test in same clause
    """
    clauses = {}
    
    # Regex to find clause headings like C.5.1.2.1
    clause_pattern = re.compile(r"(C\.\d+(\.\d+)+)\s+(.+)")
    
    # Regex to detect "Test nr X" markers
    test_marker_pattern = re.compile(r"Test\s+nr\s+(\d+)", re.IGNORECASE)
    
    # Split text into lines for processing
    lines = text.split('\n')
    
    current_clause_id = None
    current_test_number = 1  # Track which test we're in
    current_section = None # 'preconditions', 'procedure', or 'results'
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check for clause heading
        match = clause_pattern.match(line)
        if match:
            current_clause_id = match.group(1)
            current_test_number = 1  # Reset test counter for new clause
            clauses[current_clause_id] = {
                'title': match.group(3),
                'preconditions': [],
                'procedure': [],
                'results': []
            }
            current_section = None
            continue
            
        if current_clause_id:
            # Check for "Test nr X" marker
            test_match = test_marker_pattern.search(line)
            if test_match:
                test_num = int(test_match.group(1))
                if test_num > 1:
                    # Create a new entry for this test
                    current_test_number = test_num
                    test_key = f"{current_clause_id}#{test_num}"
                    if test_key not in clauses:
                        clauses[test_key] = {
                            'title': clauses[current_clause_id]['title'],
                            'preconditions': [],
                            'procedure': [],
                            'results': []
                        }
                continue
            
            # Determine which clause entry to update
            if current_test_number == 1:
                active_key = current_clause_id
            else:
                active_key = f"{current_clause_id}#{current_test_number}"
            
            # Check for section headers
            lower_line = line.lower()
            if "warunki wstępne" in lower_line or "warunki wst pne" in lower_line:
                current_section = 'preconditions'
                # Check if there is content after the header
                if len(line) > 20:
                     cleaned = re.sub(r"Warunki wstępne\s*", "", line, flags=re.IGNORECASE)
                     cleaned = re.sub(r"Warunki wst pne\s*", "", cleaned, flags=re.IGNORECASE)
                     if cleaned.strip():
                         clauses[active_key][current_section].append(cleaned.strip())
                continue
            elif "procedura" in lower_line:
                current_section = 'procedure'
                if len(line) > 15:
                     cleaned = re.sub(r"Procedura\s*", "", line, flags=re.IGNORECASE)
                     if cleaned.strip():
                         clauses[active_key][current_section].append(cleaned.strip())
                continue
            elif "wynik" in lower_line:
                current_section = 'results'
                if len(line) > 10:
                     cleaned = re.sub(r"Wynik\s*", "", line, flags=re.IGNORECASE)
                     if cleaned.strip():
                         clauses[active_key][current_section].append(cleaned.strip())
                continue
                
            # Capture content
            if current_section:
                # Filter out obvious page footers/headers and table artifacts
                if "ETSI" in line or "Strona" in line:
                    continue
                if "Licencja Polskiego Komitetu Normalizacyjnego" in line:
                    continue
                    
                clauses[active_key][current_section].append(line)

    return clauses

def clean_extracted_list(lines):
    """
    Cleans up a list of lines extracted from PDF.
    Joins broken lines, handles list items.
    """
    cleaned = []
    current_item = ""
    
    # Regex for list items: "1. ", "2. ", "a) ", "b) "
    list_item_pattern = re.compile(r"^(\d+\.|[a-z]\))\s+")
    
    for line in lines:
        if list_item_pattern.match(line):
            if current_item:
                cleaned_item = current_item.strip().replace("ICT", "TIK")
                
                # Rephrase to direct imperative using regex
                cleaned_item = re.sub(r"^(\d+\.\s*)?Sprawdzić", r"\1Sprawdź", cleaned_item)
                cleaned_item = re.sub(r"^(\d+\.\s*)?Określić", r"\1Określ", cleaned_item)
                cleaned_item = re.sub(r"^(\d+\.\s*)?Zidentyfikować", r"\1Zidentyfikuj", cleaned_item)
                
                cleaned.append(cleaned_item)
            current_item = line
        else:
            # Continuation of previous line
            if current_item:
                current_item += " " + line
            else:
                # Maybe a start of a paragraph or just noise
                current_item = line
                
    # Process the last item
    if current_item:
        cleaned_item = current_item.strip()
        cleaned_item = cleaned_item.replace("ICT", "TIK")
        
        # Rephrase to direct imperative using regex to handle numbering
        cleaned_item = re.sub(r"^(\d+\.\s*)?Sprawdzić", r"\1Sprawdź", cleaned_item)
        cleaned_item = re.sub(r"^(\d+\.\s*)?Określić", r"\1Określ", cleaned_item)
        cleaned_item = re.sub(r"^(\d+\.\s*)?Zidentyfikować", r"\1Zidentyfikuj", cleaned_item)
        
        cleaned.append(cleaned_item)
        
    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for item in cleaned:
        if item not in seen:
            deduped.append(item)
            seen.add(item)
            
    return deduped

def generate_form_from_results(results_lines, clause_id, title):
    """
    Generates form structure from PDF results section.
    PDF extracts table as continuous text, so we need to split it.
    Expected format: "Pozytywny: ... Negatywny: ... Nie dotyczy: ..."
    """
    form = {
        "inputs": [],
        "legend": f"Wybierz wynik dla {clause_id} {title}",
        "noteId": f"notes-{clause_id.lower().replace('.', '-')}"
    }
    
    # Join all lines into one text block
    full_text = " ".join(results_lines)
    
    # Split by the three keywords
    pass_label = None
    fail_label = None
    na_label = None
    
    # Extract Pozytywny section
    if "Pozytywny:" in full_text:
        start = full_text.find("Pozytywny:") + len("Pozytywny:")
        # Find where Negatywny starts
        end = full_text.find("Negatywny:", start)
        if end != -1:
            pass_label = full_text[start:end].strip()
        else:
            pass_label = full_text[start:].strip()
    
    # Extract Negatywny section
    if "Negatywny:" in full_text:
        start = full_text.find("Negatywny:") + len("Negatywny:")
        # Find where Nie dotyczy starts
        end = full_text.find("Nie dotyczy:", start)
        if end != -1:
            fail_label = full_text[start:end].strip()
        else:
            fail_label = full_text[start:].strip()
    
    # Extract Nie dotyczy section
    if "Nie dotyczy:" in full_text:
        start = full_text.find("Nie dotyczy:") + len("Nie dotyczy:")
        na_label = full_text[start:].strip()
    
    if pass_label:
        form["inputs"].append({
            "value": "pass",
            "label": f"<strong>Zaliczone:</strong> {pass_label}"
        })
    
    if fail_label:
        form["inputs"].append({
            "value": "fail",
            "label": f"<strong>Niezaliczone:</strong> {fail_label}"
        })
    
    if na_label:
        form["inputs"].append({
            "value": "na",
            "label": f"<strong>Nie dotyczy:</strong> {na_label}"
        })
    
    return form if form["inputs"] else None

def transfer_links(old_lines, new_lines):
    """
    Transfers <a> tags from old_lines to new_lines based on heuristics.
    """
    if not old_lines or not new_lines:
        return new_lines
        
    result_lines = []
    
    # Helper to extract link info: url, text
    link_pattern = re.compile(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>')
    
    # Helper to find line by number prefix "1. ", "2. "
    def find_line_by_prefix(lines, prefix):
        for line in lines:
            if line.startswith(prefix):
                return line
        return None

    for new_line in new_lines:
        # Determine prefix of new line
        prefix_match = re.match(r"^(\d+\.|[a-z]\))\s", new_line)
        processed_line = new_line
        
        if prefix_match:
            prefix = prefix_match.group(0)
            old_line = find_line_by_prefix(old_lines, prefix)
            
            if not old_line:
                # Fallback: Try to match by WCAG number in text
                # Extract 1.2.2 from new_line
                wcag_in_new = re.search(r"WCAG\s*2\.1\s*[-–]?\s*(\d+\.\d+\.\d+)", new_line)
                if wcag_in_new:
                    ref_num = wcag_in_new.group(1)
                    # Find old line with this ref
                    for o_line in old_lines:
                        if ref_num in o_line and "WCAG" in o_line:
                            old_line = o_line
                            break
            
            if old_line:
                # Check for links in old line
                links = link_pattern.findall(old_line)
                for url, anchor_text in links:
                    link_tag_start = f'<a href="{url}" target="_blank" rel="noopener noreferrer">'
                    link_tag_end = '</a>'
                    
                    # Heuristic 1: Look for WCAG reference in new line
                    # e.g. "1.4.11"
                    wcag_match = re.search(r"(\d+\.\d+\.\d+)", anchor_text)
                    if wcag_match:
                        wcag_ref = wcag_match.group(1)
                        
                        # Try to find "WCAG 2.1 - 1.4.11" or just "1.4.11"
                        # We want to wrap "WCAG 2.1 - 1.4.11" if possible, or just "1.4.11"
                        
                        # Regex for "WCAG 2.1 ... 1.4.11"
                        # Handle various dashes and spaces
                        better_target_regex = r"WCAG\s*2\.1\s*[-–]?\s*" + re.escape(wcag_ref)
                        match_new = re.search(better_target_regex, processed_line, re.IGNORECASE)
                        
                        if match_new:
                            to_replace = match_new.group(0)
                            replacement = f'{link_tag_start}{to_replace}{link_tag_end}'
                            processed_line = processed_line.replace(to_replace, replacement)
                        elif wcag_ref in processed_line:
                            # Fallback: just wrap the number
                            processed_line = processed_line.replace(wcag_ref, f'{link_tag_start}{wcag_ref}{link_tag_end}')
                            
                    else:
                        # Heuristic 2: If no WCAG number, maybe exact text match?
                        if anchor_text in processed_line:
                             link_tag_start = f'<a href="{url}" target="_blank" rel="noopener noreferrer">'
                             link_tag_end = '</a>'
                             processed_line = processed_line.replace(anchor_text, f'{link_tag_start}{anchor_text}{link_tag_end}')
            else:
                 pass
                        
        result_lines.append(processed_line)
        
    return result_lines


def process_clauses(pdf_data):
    """
    Iterates through existing JSON files and updates them with PDF data.
    """
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    for filename in os.listdir(JSON_DIR):
        if not filename.endswith(".json"):
            continue
            
        json_path = os.path.join(JSON_DIR, filename)
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Traverse content to find tests
        last_seen_clause_id = None
        test_counter_for_clause = {}  # Track which test number we're on for each clause
        
        for item in data.get('content', []):
            if item.get('type') == 'heading':
                heading_text = item.get('text', '')
                match = re.match(r"(C\.\d+(\.\d+)+)", heading_text)
                if match:
                    last_seen_clause_id = match.group(1)
                    # Reset test counter for this clause
                    if last_seen_clause_id not in test_counter_for_clause:
                        test_counter_for_clause[last_seen_clause_id] = 0
                    
                    # Update heading text if available
                    if last_seen_clause_id in pdf_data:
                        new_title = pdf_data[last_seen_clause_id]['title']
                        new_heading_text = f"{last_seen_clause_id} {new_title}"
                        if item['text'] != new_heading_text:
                            item['text'] = new_heading_text
            
            if item.get('type') == 'test':
                if last_seen_clause_id:
                    # Increment test counter for this clause
                    test_counter_for_clause[last_seen_clause_id] += 1
                    current_test_num = test_counter_for_clause[last_seen_clause_id]
                    
                    # Determine which PDF data key to use
                    if current_test_num == 1:
                        pdf_key = last_seen_clause_id
                    else:
                        pdf_key = f"{last_seen_clause_id}#{current_test_num}"
                    
                    if pdf_key in pdf_data:
                        pdf_clause = pdf_data[pdf_key]
                        
                        # Update Preconditions
                        pdf_preconditions = clean_extracted_list(pdf_clause['preconditions'])
                        if pdf_preconditions:
                            item['preconditions'] = pdf_preconditions
                            
                        # Update Procedure
                        pdf_procedure = clean_extracted_list(pdf_clause['procedure'])
                        if pdf_procedure:
                            print(f"Updating {pdf_key} procedure")
                            item['procedure'] = pdf_procedure
                        
                        # Update Form from Results
                        pdf_results = clean_extracted_list(pdf_clause.get('results', []))
                        if pdf_results:
                            pdf_title = pdf_clause.get('title', '')
                            # Remove #X suffix from clause_id for display
                            display_id = pdf_key.split('#')[0]
                            generated_form = generate_form_from_results(pdf_results, display_id, pdf_title)
                            if generated_form:
                                print(f"Updating {pdf_key} form")
                                item['form'] = generated_form
                        
        # Save to new directory
        output_path = os.path.join(OUTPUT_DIR, filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Generated {output_path}")


def main():
    print("Extracting text from PDF...")
    text = extract_text_from_pdf(PDF_PATH)
    
    print("Parsing PDF structure...")
    
    # Debug: Dump raw text to see what's going on
    with open("debug_raw_text.txt", "w", encoding="utf-8") as f:
        f.write(text)
        
    pdf_data = parse_pdf_text(text)
    
    print(f"Found {len(pdf_data)} clauses in PDF.")
    # Dump keys for debugging
    with open("debug_keys.txt", "w", encoding="utf-8") as f:
        for k in sorted(pdf_data.keys()):
            f.write(f"{k}\n")
            
    print("Updating JSON files...")
    process_clauses(pdf_data)
    print("Done.")

if __name__ == "__main__":
    main()

import json
import os
from collections import defaultdict

JSON_DIR = "clauses_json_pdf"

def generate_detailed_report():
    """
    Generates a detailed report of potential errors in JSON files.
    Focuses on:
    1. Duplicate clauses within the same file
    2. Duplicate procedures across different clauses
    3. Duplicate results/forms across different clauses
    """
    
    report_lines = []
    report_lines.append("=" * 100)
    report_lines.append("DETAILED VALIDATION REPORT - POTENTIAL ERRORS ONLY")
    report_lines.append("=" * 100)
    report_lines.append("")
    
    # Track duplicates within same file
    file_duplicates = defaultdict(lambda: defaultdict(int))
    
    # Track procedures and results
    procedures_map = defaultdict(list)
    results_map = defaultdict(list)
    
    for filename in sorted(os.listdir(JSON_DIR)):
        if not filename.endswith(".json"):
            continue
            
        json_path = os.path.join(JSON_DIR, filename)
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        current_clause_id = None
        clause_ids_in_file = []
        
        for item in data.get('content', []):
            if item.get('type') == 'heading':
                heading_text = item.get('text', '')
                import re
                match = re.match(r"(C\.\d+(\.\d+)+)", heading_text)
                if match:
                    current_clause_id = match.group(1)
                    clause_ids_in_file.append(current_clause_id)
            
            if item.get('type') == 'test' and current_clause_id:
                # Track procedures
                procedures = item.get('procedure', [])
                if procedures:
                    proc_text = "\n".join(procedures)
                    procedures_map[proc_text].append((filename, current_clause_id))
                
                # Track results
                form = item.get('form', {})
                if form and form.get('inputs'):
                    form_sig = str(sorted([inp.get('label', '') for inp in form['inputs']]))
                    results_map[form_sig].append((filename, current_clause_id))
        
        # Check for duplicates within this file
        for clause_id in clause_ids_in_file:
            file_duplicates[filename][clause_id] += 1
    
    # Report 1: Duplicates within same file
    report_lines.append("SECTION 1: DUPLICATE CLAUSE IDs WITHIN SAME FILE")
    report_lines.append("=" * 100)
    report_lines.append("These are likely parsing errors where the same clause appears multiple times.")
    report_lines.append("")
    
    found_file_dups = False
    for filename, clause_counts in sorted(file_duplicates.items()):
        file_has_dups = False
        for clause_id, count in sorted(clause_counts.items()):
            if count > 1:
                if not file_has_dups:
                    report_lines.append(f"FILE: {filename}")
                    file_has_dups = True
                    found_file_dups = True
                report_lines.append(f"  - {clause_id}: appears {count} times")
        if file_has_dups:
            report_lines.append("")
    
    if not found_file_dups:
        report_lines.append("No duplicate clause IDs found within files.")
        report_lines.append("")
    
    # Report 2: Duplicate procedures
    report_lines.append("")
    report_lines.append("SECTION 2: DUPLICATE PROCEDURES ACROSS DIFFERENT CLAUSES")
    report_lines.append("=" * 100)
    report_lines.append("These may indicate copy-paste errors or legitimate reuse of test procedures.")
    report_lines.append("")
    
    dup_count = 0
    for text, locations in sorted(procedures_map.items(), key=lambda x: len(x[1]), reverse=True):
        if len(locations) > 1:
            dup_count += 1
            report_lines.append(f"{dup_count}. DUPLICATE PROCEDURE found in {len(locations)} places:")
            for filename, clause_id in sorted(locations):
                report_lines.append(f"   - {filename}: {clause_id}")
            report_lines.append(f"   Preview: {text[:150]}...")
            report_lines.append("")
    
    if dup_count == 0:
        report_lines.append("No duplicate procedures found.")
        report_lines.append("")
    
    # Report 3: Duplicate results/forms
    report_lines.append("")
    report_lines.append("SECTION 3: DUPLICATE RESULTS/FORMS ACROSS DIFFERENT CLAUSES")
    report_lines.append("=" * 100)
    report_lines.append("These may indicate copy-paste errors or legitimate reuse of result criteria.")
    report_lines.append("")
    
    dup_count = 0
    for sig, locations in sorted(results_map.items(), key=lambda x: len(x[1]), reverse=True):
        if len(locations) > 1:
            dup_count += 1
            report_lines.append(f"{dup_count}. DUPLICATE FORM found in {len(locations)} places:")
            for filename, clause_id in sorted(locations):
                report_lines.append(f"   - {filename}: {clause_id}")
            report_lines.append("")
    
    if dup_count == 0:
        report_lines.append("No duplicate forms found.")
        report_lines.append("")
    
    report_lines.append("=" * 100)
    report_lines.append("END OF REPORT")
    report_lines.append("=" * 100)
    
    return "\n".join(report_lines)

if __name__ == "__main__":
    report = generate_detailed_report()
    
    with open('detailed_validation_report.txt', 'w', encoding='utf-8') as f:
        f.write(report)
    
    print("Detailed validation report saved to detailed_validation_report.txt")

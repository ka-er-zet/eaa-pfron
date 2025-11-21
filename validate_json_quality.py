import json
import os
from collections import defaultdict

JSON_DIR = "clauses_json_pdf"

def validate_json_files():
    """
    Validates JSON files for duplicates and quality issues.
    """
    # Track all preconditions and procedures
    preconditions_map = defaultdict(list)  # text -> [(file, clause_id)]
    procedures_map = defaultdict(list)      # text -> [(file, clause_id)]
    results_map = defaultdict(list)         # text -> [(file, clause_id)]
    
    issues = []
    
    for filename in sorted(os.listdir(JSON_DIR)):
        if not filename.endswith(".json"):
            continue
            
        json_path = os.path.join(JSON_DIR, filename)
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        current_clause_id = None
        
        for item in data.get('content', []):
            # Track current clause ID from headings
            if item.get('type') == 'heading':
                heading_text = item.get('text', '')
                # Extract C.x.x.x from heading
                import re
                match = re.match(r"(C\.\d+(\.\d+)+)", heading_text)
                if match:
                    current_clause_id = match.group(1)
            
            if item.get('type') == 'test':
                # Check preconditions
                preconditions = item.get('preconditions', [])
                if preconditions:
                    prec_text = "\n".join(preconditions)
                    preconditions_map[prec_text].append((filename, current_clause_id))
                
                # Check procedures
                procedures = item.get('procedure', [])
                if procedures:
                    proc_text = "\n".join(procedures)
                    procedures_map[proc_text].append((filename, current_clause_id))
                
                # Check form/results
                form = item.get('form', {})
                if form and form.get('inputs'):
                    # Create a signature of the form
                    form_sig = str(sorted([inp.get('label', '') for inp in form['inputs']]))
                    results_map[form_sig].append((filename, current_clause_id))
    
    # Find duplicates
    print("=" * 80)
    print("VALIDATION REPORT FOR clauses_json_pdf")
    print("=" * 80)
    print()
    
    # Preconditions duplicates
    print("DUPLICATE PRECONDITIONS:")
    print("-" * 80)
    dup_count = 0
    for text, locations in preconditions_map.items():
        if len(locations) > 1:
            dup_count += 1
            print(f"\n{dup_count}. Found in {len(locations)} places:")
            for filename, clause_id in locations:
                print(f"   - {filename}: {clause_id}")
            print(f"   Text preview: {text[:200]}...")
    
    if dup_count == 0:
        print("   No duplicates found.")
    print()
    
    # Procedures duplicates
    print("DUPLICATE PROCEDURES:")
    print("-" * 80)
    dup_count = 0
    for text, locations in procedures_map.items():
        if len(locations) > 1:
            dup_count += 1
            print(f"\n{dup_count}. Found in {len(locations)} places:")
            for filename, clause_id in locations:
                print(f"   - {filename}: {clause_id}")
            print(f"   Text preview: {text[:200]}...")
    
    if dup_count == 0:
        print("   No duplicates found.")
    print()
    
    # Results duplicates
    print("DUPLICATE RESULTS/FORMS:")
    print("-" * 80)
    dup_count = 0
    for sig, locations in results_map.items():
        if len(locations) > 1:
            dup_count += 1
            print(f"\n{dup_count}. Found in {len(locations)} places:")
            for filename, clause_id in locations:
                print(f"   - {filename}: {clause_id}")
    
    if dup_count == 0:
        print("   No duplicates found.")
    print()
    
    print("=" * 80)
    print("VALIDATION COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    import sys
    
    # Redirect output to file
    with open('validation_report.txt', 'w', encoding='utf-8') as f:
        sys.stdout = f
        validate_json_files()
        sys.stdout = sys.__stdout__
    
    print("Validation report saved to validation_report.txt")

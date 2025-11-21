import json
import os
import difflib

# Configuration
DIR_A = "clauses_json"
DIR_B = "clauses_json_pdf"
OUTPUT_FILE = "json_diff_report.md"

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def compare_clauses(file_a, file_b, filename):
    data_a = load_json(file_a)
    data_b = load_json(file_b)
    diffs = []
    
    content_a = data_a.get('content', [])
    content_b = data_b.get('content', [])
    
    # Create a map of tests by some ID if possible, but here we rely on order
    # Assuming structure is similar
    
    for i, item_a in enumerate(content_a):
        if i >= len(content_b):
            break
        item_b = content_b[i]
        
        if item_a.get('type') == 'heading':
            text_a = item_a.get('text', '')
            text_b = item_b.get('text', '')
            if text_a != text_b:
                diffs.append(f"### {filename} - Item {i} (Heading)")
                diffs.append("```diff")
                diffs.append(f"- {text_a}")
                diffs.append(f"+ {text_b}")
                diffs.append("```")

        if item_a.get('type') == 'test':
            # Compare Preconditions
            prec_a = item_a.get('preconditions', [])
            prec_b = item_b.get('preconditions', [])
            
            if prec_a != prec_b:
                diffs.append(f"### {filename} - Item {i} (Test) - Preconditions")
                diffs.append("```diff")
                for line in difflib.unified_diff(prec_a, prec_b, fromfile='Original', tofile='PDF-Extracted', lineterm=''):
                    diffs.append(line)
                diffs.append("```")
            
            # Compare Procedure
            proc_a = item_a.get('procedure', [])
            proc_b = item_b.get('procedure', [])
            
            if proc_a != proc_b:
                diffs.append(f"### {filename} - Item {i} (Test) - Procedure")
                diffs.append("```diff")
                for line in difflib.unified_diff(proc_a, proc_b, fromfile='Original', tofile='PDF-Extracted', lineterm=''):
                    diffs.append(line)
                diffs.append("```")
                
    return diffs

def main():
    all_diffs = []
    all_diffs.append("# JSON Version Comparison Report")
    all_diffs.append(f"Comparing `{DIR_A}` (Original) vs `{DIR_B}` (PDF Extracted)\n")
    
    if not os.path.exists(DIR_B):
        print(f"Directory {DIR_B} does not exist.")
        return

    files = sorted(os.listdir(DIR_A))
    for filename in files:
        if not filename.endswith(".json"):
            continue
            
        path_a = os.path.join(DIR_A, filename)
        path_b = os.path.join(DIR_B, filename)
        
        if not os.path.exists(path_b):
            all_diffs.append(f"## {filename}")
            all_diffs.append(f"**Missing in {DIR_B}**")
            continue
            
        file_diffs = compare_clauses(path_a, path_b, filename)
        if file_diffs:
            all_diffs.append(f"## {filename}")
            all_diffs.extend(file_diffs)
            
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(all_diffs))
        
    print(f"Report generated: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()

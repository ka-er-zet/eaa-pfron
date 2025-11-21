import os
import json
import re

DIFF_REPORT = "json_diff_report.md"
JSON_DIR = "clauses_json"

def restore_headings():
    if not os.path.exists(DIFF_REPORT):
        print("Diff report not found.")
        return

    with open(DIFF_REPORT, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    current_file = None
    current_item_index = None
    
    # Regex to match "### c10.json - Item 6 (Heading)"
    header_pattern = re.compile(r"### (c\d+\.json) - Item (\d+) \(Heading\)")
    
    # Regex to match "- C.10.1.2.1 Tylko audio i tylko wideo (nagrane)"
    # We need to capture the text after "- "
    diff_pattern = re.compile(r"^- (.+)")

    changes_map = {} # filename -> {index: original_text}

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        match = header_pattern.match(line)
        if match:
            filename = match.group(1)
            index = int(match.group(2))
            
            # Look ahead for the diff block
            # usually followed by ```diff then - line
            found_diff = False
            for j in range(i+1, min(i+10, len(lines))):
                dline = lines[j].strip()
                if dline.startswith("- ") and not dline.startswith("---"):
                    original_text = dline[2:].strip()
                    
                    if filename not in changes_map:
                        changes_map[filename] = {}
                    changes_map[filename][index] = original_text
                    found_diff = True
                    break
            
            if found_diff:
                i = j
        
        i += 1

    # Apply changes
    for filename, updates in changes_map.items():
        filepath = os.path.join(JSON_DIR, filename)
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            continue
            
        print(f"Restoring {filename}...")
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        content = data.get('content', [])
        modified = False
        
        for index, original_text in updates.items():
            if index < len(content):
                item = content[index]
                if item.get('type') == 'heading':
                    current_text = item.get('text', '')
                    if current_text != original_text:
                        print(f"  Item {index}: '{current_text}' -> '{original_text}'")
                        item['text'] = original_text
                        modified = True
                    else:
                        print(f"  Item {index}: already matches '{original_text}'")
                else:
                    print(f"  WARNING: Item {index} is not a heading (type: {item.get('type')})")
            else:
                print(f"  WARNING: Index {index} out of bounds")
                
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Saved {filename}")
        else:
            print(f"No changes needed for {filename}")

if __name__ == "__main__":
    restore_headings()

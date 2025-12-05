import json
import re
import os

FILE_PATH = 'clauses_json/c10.json'

def clean_labels(data):
    count = 0
    if isinstance(data, dict):
        if 'label' in data and isinstance(data['label'], str):
            original = data['label']
            if "EN 301" in original:
                print(f"Found artifact in label: {original}")
                # Remove "EN 301 549 V3.2.1 (2021-03)" and any preceding whitespace/punctuation if it looks like a suffix
                # Pattern:  . EN 301 549 V3.2.1 (2021-03)
                cleaned = re.sub(r'\s*EN 301 549.*$', '', original)
                
                if cleaned != original:
                    print(f"Cleaning to: {cleaned}")
                    data['label'] = cleaned
                    count += 1
        
        for key, value in data.items():
            count += clean_labels(value)
            
    elif isinstance(data, list):
        for item in data:
            count += clean_labels(item)
            
    return count

def main():
    if not os.path.exists(FILE_PATH):
        print(f"File {FILE_PATH} not found.")
        return

    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = json.load(f)

    updated_count = clean_labels(content)

    if updated_count > 0:
        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        print(f"Cleaned {updated_count} labels in {FILE_PATH}")
    else:
        print("No labels needed cleaning.")

if __name__ == "__main__":
    main()

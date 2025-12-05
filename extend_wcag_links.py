import json
import re
import os

FILE_PATH = 'clauses_json/c9.json'

def extend_links(data):
    if isinstance(data, dict):
        for key, value in data.items():
            data[key] = extend_links(value)
    elif isinstance(data, list):
        for i in range(len(data)):
            data[i] = extend_links(data[i])
    elif isinstance(data, str):
        # Pattern to find: <a ...>WCAG 2.1 – X.Y.Z</a> Name.
        # We want to capture the Name and put it inside the <a> tag.
        
        # Regex explanation:
        # (<a href="[^"]+"[^>]*>)  -> Group 1: Opening <a> tag
        # (WCAG 2\.1 – [\d\.]+)    -> Group 2: "WCAG 2.1 – X.Y.Z"
        # (</a>)                   -> Group 3: Closing </a> tag
        # \s+                      -> Whitespace
        # ([^<\.]+)                -> Group 4: The Name (text until < or .)
        # (\.?)                    -> Group 5: Optional trailing dot
        
        pattern = r'(<a href="[^"]+"[^>]*>)(WCAG 2\.1 – [\d\.]+)(</a>)\s+([^<\.]+)(\.?)'
        
        def replacement(match):
            open_tag = match.group(1)
            wcag_part = match.group(2)
            close_tag = match.group(3)
            name_part = match.group(4)
            dot = match.group(5)
            
            # Construct new string: <a ...>WCAG 2.1 – X.Y.Z Name</a>.
            return f'{open_tag}{wcag_part} {name_part}{close_tag}{dot}'

        # Apply replacement
        if "WCAG 2.1 –" in data and "</a>" in data:
            new_data = re.sub(pattern, replacement, data)
            if new_data != data:
                # print(f"Changed:\n  {data}\nTo:\n  {new_data}\n")
                return new_data
            
    return data

def main():
    if not os.path.exists(FILE_PATH):
        print(f"File {FILE_PATH} not found.")
        return

    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = json.load(f)

    updated_content = extend_links(content)

    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(updated_content, f, ensure_ascii=False, indent=2)
    
    print(f"Updated links in {FILE_PATH}")

if __name__ == "__main__":
    main()

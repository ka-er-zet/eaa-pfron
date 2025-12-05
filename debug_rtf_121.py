
import re

def clean_text(text):
    # Remove RTF control words and braces
    text = re.sub(r'[{}]', '', text)
    text = re.sub(r'\\[a-z0-9]+ ?', ' ', text)
    # Remove multiple spaces
    text = re.sub(r'\s+', ' ', text)
    return text

file_path = 'Lista_kontrolna_do_badania_dostępności_cyfrowej_stron_www_-_wersja_22.rtf'

try:
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        
    # Find "Czy"
    indices = [m.start() for m in re.finditer(r'Czy ', content)]
    print(f"Found {len(indices)} occurrences of 'Czy '")
    
    found_count = 0
    for i, idx in enumerate(indices):
        start = max(0, idx - 500)
        end = min(len(content), idx + 500)
        chunk = content[start:end]
        cleaned = clean_text(chunk)
        
        if "1.2.1" in cleaned:
            print(f"\n--- Occurrence {i+1} (Contains 1.2.1) ---")
            print(cleaned)
            found_count += 1
            
    if found_count == 0:
        print("No occurrences of 'Czy' found near '1.2.1'")
            
except Exception as e:
    print(f"Error: {e}")

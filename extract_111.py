
import re

def clean_rtf_text(text):
    # Remove RTF control words
    text = re.sub(r'\\[a-z]+\d*', ' ', text)
    text = re.sub(r'\{.*?\}', ' ', text)
    text = re.sub(r'\}', ' ', text)
    # Fix common Polish chars in RTF (cp1250/1252 mix)
    # \'b9 -> ą, \'e6 -> ć, \'ea -> ę, \'b3 -> ł, \'f3 -> ó, \'9c -> ś, \'9f -> ź, \'bf -> ż
    # \'a5 -> Ą, \'c6 -> Ć, \'ca -> Ę, \'a3 -> Ł, \'d3 -> Ó, \'8c -> Ś, \'8f -> Ź, \'af -> Ż
    replacements = {
        r"\'b9": "ą", r"\'e6": "ć", r"\'ea": "ę", r"\'b3": "ł", r"\'f3": "ó", r"\'9c": "ś", r"\'9f": "ź", r"\'bf": "ż",
        r"\'a5": "Ą", r"\'c6": "Ć", r"\'ca": "Ę", r"\'a3": "Ł", r"\'d3": "Ó", r"\'8c": "Ś", r"\'8f": "Ź", r"\'af": "Ż",
        r"\'9f": "ź", # duplicate?
        r"\tab": " ",
        r"\par": "\n"
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    
    # Remove other hex escapes
    text = re.sub(r"\'[0-9a-f]{2}", "", text)
    
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text)
    return text

with open("Lista_kontrolna_do_badania_dostępności_cyfrowej_stron_www_-_wersja_22.rtf", "r", encoding="cp1252", errors="ignore") as f:
    content = f.read()

# Find start of 1.1.1
start_marker = "Kryterium 1.1.1"
end_marker = "Kryterium 1.2.1"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1:
    if end_idx == -1: end_idx = len(content)
    section = content[start_idx:end_idx]
    cleaned = clean_rtf_text(section)
    print(f"--- Extracted Content for 1.1.1 ---\n{cleaned[:2000]}...")
else:
    print("Could not find start marker")

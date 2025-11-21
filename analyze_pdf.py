import os
from pypdf import PdfReader

def find_annex_c(pdf_path):
    reader = PdfReader(pdf_path)
    print(f"Total pages: {len(reader.pages)}")
    
    search_terms = ["Załącznik C", "Annex C"]
    
    for term in search_terms:
        print(f"Searching for '{term}'...")
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if term in text:
                print(f"Found '{term}' on page {i + 1}")
                print(f"Context: {text[:200]}...")
                print("-" * 20)
                # If we found it, let's print a bit more to confirm it's the start
                if "normatywny" in text.lower() or "normative" in text.lower():
                     print("Likely the start of the Annex.")

if __name__ == "__main__":
    pdf_file = "PN-ETSI-EN-301-549-V3.2.1_2021-09P_KOLOR.pdf"
    find_annex_c(pdf_file)

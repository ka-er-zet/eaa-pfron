import json
import re
import os

C9_PATH = 'clauses_json/c9.json'
C10_PATH = 'clauses_json/c10.json'

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def extract_knowledge_from_c9(c9_data):
    """
    Extracts a map of WCAG ID (e.g., "1.1.1") to:
    - link_slug: The anchor part of the URL (e.g., "tresc-nietekstowa")
    - link_text: The full text of the link (e.g., "WCAG 2.1 – 1.1.1 Treść nietekstowa")
    - checklist: The detailedChecklist array
    """
    knowledge = {}
    
    def traverse(node):
        if isinstance(node, dict):
            # Check if this is a test node with procedure and checklist
            if node.get('type') == 'test' and 'procedure' in node:
                # Try to find WCAG ID in procedure
                proc_text = " ".join(node['procedure'])
                # Match: <a href="...#slug">WCAG 2.1 – 1.1.1 Name</a>
                match = re.search(r'href="[^"]+#([^"]+)"[^>]*>(WCAG 2\.1 – (\d+\.\d+\.\d+)[^<]*)</a>', proc_text)
                
                if match:
                    slug = match.group(1)
                    full_link_text = match.group(2)
                    wcag_id = match.group(3)
                    
                    checklist = node.get('detailedChecklist', [])
                    
                    knowledge[wcag_id] = {
                        'slug': slug,
                        'link_text': full_link_text,
                        'checklist': checklist
                    }
            
            # Recurse
            for key, value in node.items():
                traverse(value)
        elif isinstance(node, list):
            for item in node:
                traverse(item)

    traverse(c9_data)
    return knowledge

MANUAL_KNOWLEDGE = {
    "1.4.4": {
        "slug": "zmiana-rozmiaru-tekstu",
        "link_text": "WCAG 2.1 – 1.4.4 Zmiana rozmiaru tekstu",
        "checklist": [] # Will be overridden by C10_OVERRIDES
    }
}

C10_OVERRIDES = {
    "1.1.1": [
        "<strong>Tekst alternatywny:</strong> Sprawdź, czy obrazy i grafiki mają zdefiniowany tekst alternatywny we właściwościach obiektu (np. w Word: Formatuj obraz -> Tekst alternatywny; w PDF: Właściwości tagu Figure -> Tekst alternatywny).",
        "<strong>Elementy dekoracyjne:</strong> Upewnij się, że elementy dekoracyjne są oznaczone jako artefakty (PDF) lub nie mają tekstu alternatywnego, jeśli nie wnoszą treści.",
        "<strong>Wykresy i diagramy:</strong> Złożone grafiki powinny mieć krótki opis alternatywny oraz odniesienie do pełnego opisu w treści dokumentu."
    ],
    "1.3.1": [
        "<strong>Nagłówki:</strong> Sprawdź, czy struktura nagłówków (H1-H6) jest zdefiniowana za pomocą stylów (Word) lub tagów (PDF), a nie tylko wizualnie (pogrubienie, czcionka).",
        "<strong>Listy:</strong> Upewnij się, że listy są tworzone za pomocą narzędzi do list (tagi L, LI, LBody), a nie ręcznie wpisywanych znaków.",
        "<strong>Tabele:</strong> Sprawdź, czy tabele mają zdefiniowane nagłówki wierszy i/lub kolumn (tagi TH) i czy struktura tabeli jest logiczna."
    ],
    "1.3.2": [
        "<strong>Kolejność odczytu:</strong> Sprawdź w panelu 'Tagi' (PDF) lub 'Kolejność' (Acrobat Pro), czy kolejność elementów w drzewie struktury odpowiada logicznej kolejności czytania dokumentu.",
        "<strong>Elementy wielokolumnowe:</strong> Upewnij się, że tekst w układzie wielokolumnowym jest odczytywany w poprawnej kolejności (kolumna po kolumnie)."
    ],
    "1.3.3": [
        "<strong>Właściwości zmysłowe:</strong> Sprawdź, czy instrukcje w dokumencie nie polegają wyłącznie na właściwościach zmysłowych, takich jak kształt, rozmiar, kolor czy lokalizacja (np. unikaj \"zobacz tekst w czerwonej ramce\", użyj \"zobacz tekst w ramce 'Ważne'\")."
    ],
    "1.3.5": [
        "<strong>Określenie celu pola:</strong> W dokumentach zawierających formularze (np. PDF), sprawdź, czy pola zbierające dane o użytkowniku są jednoznacznie opisane (np. poprzez nazwę pola lub etykietę/tooltip), co pozwala technologiom asystującym na identyfikację ich celu."
    ],
    "1.4.2": [
        "<strong>Kontrola dźwięku:</strong> Jeśli jakikolwiek dźwięk w dokumencie jest odtwarzany automatycznie przez więcej niż 3 sekundy, sprawdź, czy dostępny jest mechanizm pozwalający na wstrzymanie lub zatrzymanie odtwarzania, albo mechanizm kontroli głośności dźwięku niezależny od głośności systemu.",
        "<strong>Zakres:</strong> Wymóg ten dotyczy wszystkich treści w dokumencie, ponieważ dźwięk zakłócający może uniemożliwić korzystanie z całego dokumentu."
    ],
    "1.4.3": [
        "<strong>Kontrast tekstu:</strong> Sprawdź, czy tekst dokumentu zachowuje minimalny kontrast 4.5:1 względem tła. Użyj narzędzia do pobierania kolorów (np. Colour Contrast Analyser), aby zmierzyć wartości w dokumencie."
    ],
    "1.4.4": [
        "<strong>Powiększanie tekstu:</strong> Sprawdź, czy tekst w dokumencie można powiększyć do 200% bez utraty treści i funkcjonalności (np. używając opcji powiększenia w przeglądarce PDF lub Word).",
        "<strong>Skalowanie:</strong> Upewnij się, że przy powiększeniu tekst nie nakłada się na inne elementy i nie jest ucinany."
    ],
    "1.4.10": [
        "<strong>Dopasowanie do ekranu (Reflow):</strong> Sprawdź, czy treść dokumentu może być prezentowana bez utraty informacji lub funkcjonalności i bez konieczności przewijania w dwóch wymiarach dla:",
        "- Treści przewijanej pionowo przy szerokości równoważnej 320 pikseli CSS (odpowiada to szerokości 1280 px przy powiększeniu 400%).",
        "- Treści przewijanej poziomo przy wysokości równoważnej 256 pikseli CSS.",
        "<strong>Wyjątki:</strong> Wymóg nie dotyczy treści wymagających układu dwuwymiarowego (np. obrazy, mapy, diagramy, tabele danych, wideo)."
    ],
    "2.1.1": [
        "<strong>Obsługa klawiaturą:</strong> Sprawdź, czy wszystkie elementy interaktywne w dokumencie (np. linki, pola formularzy, przyciski, multimedia) są dostępne i obsługiwalne wyłącznie za pomocą klawiatury.",
        "<strong>Nawigacja:</strong> Upewnij się, że możesz dotrzeć do każdego elementu interaktywnego używając klawisza Tab i aktywować go (np. Enter lub Spacja), nie używając myszki."
    ],
    "2.4.2": [
        "<strong>Tytuł dokumentu:</strong> Sprawdź we właściwościach pliku (Plik -> Właściwości), czy pole 'Tytuł' jest wypełnione i opisuje zawartość.",
        "<strong>Wyświetlanie tytułu (PDF):</strong> W plikach PDF sprawdź w ustawieniach początkowych (Właściwości -> Widok początkowy), czy opcja 'Pokaż' jest ustawiona na 'Tytuł dokumentu', a nie 'Nazwa pliku'."
    ],
    "3.1.1": [
        "<strong>Język dokumentu:</strong> Sprawdź we właściwościach pliku (Plik -> Właściwości -> Zaawansowane), czy główny język dokumentu jest poprawnie ustawiony (np. Polski)."
    ],
    "3.1.2": [
        "<strong>Język części:</strong> Jeśli w dokumencie występują fragmenty w innym języku, sprawdź w drzewie tagów (PDF), czy odpowiednie elementy (np. Span) mają ustawiony atrybut języka (Lang)."
    ],
    "4.1.2": [
        "<strong>Formularze:</strong> Sprawdź, czy pola formularzy w PDF mają zdefiniowane etykiety (Tooltips) i czy są dostępne dla czytników ekranu.",
        "<strong>Poprawność tagowania:</strong> Upewnij się, że wszystkie istotne treści są objęte odpowiednimi tagami (P, H1, Figure itp.), a elementy nieistotne są oznaczone jako artefakty."
    ]
}

def adapt_checklist_for_documents(checklist, wcag_id):
    """
    Adapt checklist for documents, using overrides if available.
    """
    if wcag_id in C10_OVERRIDES:
        return C10_OVERRIDES[wcag_id]

    new_checklist = []
    for item in checklist:
        # Replace common web terms with document terms where appropriate
        # This is a heuristic and might need manual review, but it's a good start.
        text = item
        text = text.replace("strona internetowa", "dokument")
        text = text.replace("strony internetowej", "dokumentu")
        text = text.replace("na stronie", "w dokumencie")
        text = text.replace("całą stronę", "cały dokument")
        text = text.replace("witryna", "dokument")
        text = text.replace("serwis", "dokument")
        text = text.replace("kod HTML", "struktura dokumentu")
        text = text.replace("w kodzie", "w strukturze tagów")
        text = text.replace("znacznik", "tag")
        text = text.replace("atrybut", "właściwość")
        text = text.replace("przeglądarka", "czytnik dokumentów")
        new_checklist.append(text)
    return new_checklist

def update_c10(c10_data, knowledge):
    updated_count = 0
    current_wcag_id = None
    
    SLUG_OVERRIDES = {
        "1.4.4": "zmiana-rozmiaru-tekstu"
    }
    
    def traverse(node):
        nonlocal updated_count
        nonlocal current_wcag_id
        
        if isinstance(node, list):
            for item in node:
                traverse(item)
        elif isinstance(node, dict):
            # Update context from headings
            if node.get('type') == 'heading':
                text = node.get('text', '')
                # Match C.10.1.4.2 -> 1.4.2
                match = re.search(r'C\.10\.(\d+\.\d+\.\d+)', text)
                if match:
                    current_wcag_id = match.group(1)

            if node.get('type') == 'test' and 'procedure' in node:
                # Find WCAG ID in current C10 procedure
                proc_text = node['procedure'][0]
                match = re.search(r'WCAG 2\.1 – (\d+\.\d+\.\d+)', proc_text)
                
                wcag_id = None
                if match:
                    wcag_id = match.group(1)
                elif current_wcag_id:
                    # Fallback to context from last heading
                    wcag_id = current_wcag_id
                
                if wcag_id and wcag_id in knowledge:
                    info = knowledge[wcag_id]
                    
                    # 1. Update Link (only if we found the old link pattern)
                    if match:
                        slug = SLUG_OVERRIDES.get(wcag_id, info["slug"])
                        new_link = f'<a href="https://www.w3.org/Translations/WCAG21-pl/#{slug}" target="_blank" rel="noopener noreferrer">{info["link_text"]}</a>'
                        old_link_pattern = f'<a href="[^"]+"[^>]*>WCAG 2\\.1 – {re.escape(wcag_id)}</a>\\s*[^<]*'
                        new_proc_text = re.sub(old_link_pattern, new_link, proc_text)
                        node['procedure'][0] = new_proc_text
                    
                    # 2. Inject Checklist
                    node['detailedChecklist'] = adapt_checklist_for_documents(info['checklist'], wcag_id)
                    
                    updated_count += 1
            
            for key, value in node.items():
                traverse(value)

    traverse(c10_data)
    return updated_count

def main():
    print("Loading C9 data...")
    c9_data = load_json(C9_PATH)
    knowledge = extract_knowledge_from_c9(c9_data)
    knowledge.update(MANUAL_KNOWLEDGE)
    print(f"Extracted knowledge for {len(knowledge)} WCAG criteria.")
    # Debug: print keys
    # print(sorted(knowledge.keys()))

    print("Loading C10 data...")
    c10_data = load_json(C10_PATH)
    
    print("Updating C10...")
    count = update_c10(c10_data, knowledge)
    
    print(f"Saving C10 data... ({count} items updated)")
    save_json(C10_PATH, c10_data)

if __name__ == "__main__":
    main()

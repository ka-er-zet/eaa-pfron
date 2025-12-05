import json
import re

# Mapping of WCAG 2.1 Criterion ID (e.g. "1.1.1") to Polish anchor slug
WCAG_ANCHORS = {
    "1.1.1": "tresc-nietekstowa",
    "1.2.1": "tylko-audio-lub-tylko-wideo-nagranie",
    "1.2.2": "napisy-rozszerzone-nagranie",
    "1.2.3": "audiodeskrypcja-lub-alternatywa-tekstowa-dla-mediow-nagranie",
    "1.2.4": "napisy-rozszerzone-na-zywo",
    "1.2.5": "audiodeskrypcja-nagranie",
    "1.3.1": "informacje-i-relacje",
    "1.3.2": "zrozumiala-kolejnosc",
    "1.3.3": "wlasciwosci-zmyslowe",
    "1.3.4": "orientacja",
    "1.3.5": "okreslenie-pozadanej-wartosci",
    "1.4.1": "uzycie-koloru",
    "1.4.2": "kontrola-odtwarzania-dzwieku",
    "1.4.3": "kontrast-minimum",
    "1.4.4": "zmiana-rozmiaru-tekstu",
    "1.4.5": "obrazy-tekstu",
    "1.4.10": "dopasowanie-do-ekranu",
    "1.4.11": "kontrast-elementow-nietekstowych",
    "1.4.12": "odstepy-w-tekscie",
    "1.4.13": "tresc-spod-kursora-lub-fokusu",
    "2.1.1": "klawiatura",
    "2.1.2": "bez-pulapki-na-klawiature",
    "2.1.4": "jednoznakowe-skroty-klawiaturowe",
    "2.2.1": "dostosowanie-czasu",
    "2.2.2": "pauza-zatrzymanie-ukrycie",
    "2.3.1": "trzy-blyski-lub-wartosci-ponizej-progu",
    "2.4.1": "mozliwosc-pominiecia-blokow",
    "2.4.2": "tytul-strony",
    "2.4.3": "kolejnosc-fokusu",
    "2.4.4": "cel-lacza-w-kontekscie",
    "2.4.5": "wiele-drog",
    "2.4.6": "naglowki-i-etykiety",
    "2.4.7": "widoczny-fokus",
    "2.5.1": "gesty-dotykowe",
    "2.5.2": "rezygnacja-ze-wskazania",
    "2.5.3": "etykieta-w-nazwie",
    "2.5.4": "aktywowanie-ruchem",
    "3.1.1": "jezyk-strony",
    "3.1.2": "jezyk-czesci",
    "3.2.1": "po-otrzymaniu-fokusu",
    "3.2.2": "podczas-wprowadzania-danych",
    "3.2.3": "spojna-nawigacja",
    "3.2.4": "spojna-identyfikacja",
    "3.3.1": "identyfikacja-bledu",
    "3.3.2": "etykiety-lub-instrukcje",
    "3.3.3": "sugestie-korekty-bledow",
    "3.3.4": "zapobieganie-bledom-prawnym-finansowym-w-danych",
    "4.1.1": "poprawnosc-kodu",
    "4.1.2": "nazwa-rola-wartosc",
    "4.1.3": "komunikaty-o-stanie"
}

def fix_links():
    file_path = 'clauses_json/c9.json'
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        return

    content_list = data.get('content', [])
    updated_count = 0

    for item in content_list:
        if item.get('type') == 'test':
            procedure = item.get('procedure', [])
            new_procedure = []
            for step in procedure:
                # Look for WCAG 2.1 - X.Y.Z pattern
                match = re.search(r'WCAG 2\.1 – (\d+\.\d+\.\d+)', step)
                if match:
                    wcag_id = match.group(1)
                    if wcag_id in WCAG_ANCHORS:
                        correct_anchor = WCAG_ANCHORS[wcag_id]
                        # Replace the href in the step
                        # Regex to find href="..." and replace it
                        # We assume the link is to translations/WCAG21-pl
                        
                        # This regex looks for the specific link structure to replace the anchor
                        step_updated = re.sub(
                            r'href="https://www\.w3\.org/Translations/WCAG21-pl/#[^"]+"',
                            f'href="https://www.w3.org/Translations/WCAG21-pl/#{correct_anchor}"',
                            step
                        )
                        if step_updated != step:
                            updated_count += 1
                            step = step_updated
                new_procedure.append(step)
            item['procedure'] = new_procedure

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Successfully updated links for {updated_count} criteria in {file_path}")

if __name__ == "__main__":
    fix_links()

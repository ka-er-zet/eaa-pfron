import json
import re

# Dictionary mapping Criterion ID (e.g., "C.9.1.1.1") to a list of checklist items (HTML strings)
# This content is generated based on WCAG 2.1 / EN 301 549 knowledge.

NEW_CONTENT = {
    "C.9.1.1.1": [
        "<strong>Elementy graficzne (img):</strong> Sprawdź, czy każdy element <code>&lt;img&gt;</code> przekazujący informację posiada atrybut <code>alt</code> z opisem tej informacji.",
        "<strong>Grafiki dekoracyjne:</strong> Sprawdź, czy elementy graficzne pełniące funkcję wyłącznie dekoracyjną mają pusty atrybut <code>alt=\"\"</code> lub są ukryte przed czytnikami (np. <code>aria-hidden=\"true\"</code>).",
        "<strong>Linki graficzne:</strong> Sprawdź, czy grafiki będące linkami mają tekst alternatywny opisujący cel linku lub funkcję przycisku, a nie wygląd obrazka.",
        "<strong>CAPTCHA:</strong> Jeśli występuje CAPTCHA, sprawdź, czy dostępna jest alternatywa dla osób niewidomych (np. CAPTCHA dźwiękowa) i czy cel zadania jest opisany.",
        "<strong>Wykresy i diagramy:</strong> Sprawdź, czy złożone grafiki (wykresy, schematy) mają krótki opis w <code>alt</code> oraz odesłanie do pełnego opisu tekstowego (np. w treści strony lub przez <code>aria-describedby</code>).",
        "<strong>Multimedia:</strong> Sprawdź, czy elementy audio i wideo mają tekstową alternatywę (np. tytuł, krótki opis) identyfikującą je dla użytkowników czytników ekranu."
    ],
    "C.9.1.2.1": [
        "<strong>Tylko audio (nagranie):</strong> Sprawdź, czy dla nagrań dźwiękowych (np. podcastów) dostępna jest transkrypcja tekstowa zawierająca wszystkie dialogi i istotne dźwięki.",
        "<strong>Tylko wideo (nagranie):</strong> Sprawdź, czy dla nagrań wideo bez dźwięku (np. animacji instruktażowych) dostępna jest alternatywa tekstowa lub ścieżka audio opisująca to, co dzieje się na ekranie."
    ],
    "C.9.1.2.2": [
        "<strong>Napisy:</strong> Sprawdź, czy wszystkie nagrania wideo z dźwiękiem (dialogi, istotne odgłosy) posiadają zsynchronizowane napisy dla niesłyszących.",
        "<strong>Kompletność napisów:</strong> Sprawdź, czy napisy zawierają nie tylko dialogi, ale także informacje o istotnych dźwiękach (np. [muzyka], [śmiech], [dzwonek do drzwi])."
    ],
    "C.9.1.2.3": [
        "<strong>Audiodeskrypcja lub tekst:</strong> Sprawdź, czy nagrania wideo posiadają audiodeskrypcję (dodatkową ścieżkę lektora opisującą obraz) LUB pełną alternatywę tekstową (transkrypcję opisową), która pozwala zrozumieć treść wizualną bez oglądania."
    ],
    "C.9.1.2.4": [
        "<strong>Napisy na żywo:</strong> Jeśli strona transmituje wideo na żywo z dźwiękiem, sprawdź, czy dostępne są napisy generowane w czasie rzeczywistym."
    ],
    "C.9.1.2.5": [
        "<strong>Audiodeskrypcja:</strong> Sprawdź, czy nagrania wideo posiadają audiodeskrypcję, jeśli informacje wizualne są kluczowe i nie wynikają ze ścieżki dźwiękowej (wymagane dla poziomu AA)."
    ],
    "C.9.1.3.1": [
        "<strong>Nagłówki (h1-h6):</strong> Sprawdź, czy nagłówki są oznaczone w kodzie (znaczniki <code>&lt;h1&gt;</code>-<code>&lt;h6&gt;</code>) i czy tworzą logiczną strukturę dokumentu (nie używaj nagłówków tylko do formatowania wyglądu).",
        "<strong>Listy:</strong> Sprawdź, czy listy (wypunktowane, numerowane) są oznaczone odpowiednimi znacznikami (<code>&lt;ul&gt;</code>, <code>&lt;ol&gt;</code>, <code>&lt;dl&gt;</code>), a nie są tylko wizualnie sformatowanym tekstem.",
        "<strong>Tabele danych:</strong> Sprawdź, czy tabele prezentujące dane mają poprawnie oznaczone nagłówki kolumn i wierszy (<code>&lt;th&gt;</code>) oraz czy są powiązane z komórkami danych.",
        "<strong>Formularze:</strong> Sprawdź, czy pola formularzy mają etykiety powiązane programowo (znacznik <code>&lt;label&gt;</code> z atrybutem <code>for</code> lub atrybuty ARIA), aby czytniki ekranu mogły je poprawnie zidentyfikować.",
        "<strong>Znaczenie wizualne:</strong> Sprawdź, czy relacje widoczne wizualnie (np. powiązanie opisu ze zdjęciem) są również odzwierciedlone w kodzie lub treści tekstowej."
    ],
    "C.9.1.3.2": [
        "<strong>Kolejność odczytu:</strong> Sprawdź, czy kolejność treści w kodzie HTML odpowiada logicznej kolejności wizualnej. Wyłącz style CSS i sprawdź, czy treść nadal ma sens.",
        "<strong>Kolejność nawigacji:</strong> Upewnij się, że nawigacja klawiaturą (Tab) podąża za logicznym układem strony."
    ],
    "C.9.1.3.3": [
        "<strong>Instrukcje zmysłowe:</strong> Sprawdź, czy instrukcje nie polegają wyłącznie na właściwościach zmysłowych, takich jak kształt, rozmiar, lokalizacja wizualna czy dźwięk (np. unikaj \"kliknij zielony przycisk po prawej\", użyj \"kliknij zielony przycisk 'Zatwierdź' po prawej\")."
    ],
    "C.9.1.3.4": [
        "<strong>Orientacja ekranu:</strong> Sprawdź, czy strona nie wymusza jednej orientacji ekranu (poziomej lub pionowej), chyba że jest to niezbędne (np. pianino, czek bankowy). Treść powinna być dostępna w obu orientacjach."
    ],
    "C.9.1.3.5": [
        "<strong>Autouzupełnianie (Autocomplete):</strong> Sprawdź, czy pola formularzy zbierające dane o użytkowniku (np. imię, e-mail) mają poprawny atrybut <code>autocomplete</code>, pozwalający przeglądarce na automatyczne wypełnienie danych."
    ],
    "C.9.1.4.1": [
        "<strong>Kolor jako jedyny wyróżnik:</strong> Sprawdź, czy kolor nie jest jedynym sposobem przekazywania informacji (np. błędy w formularzu oznaczone tylko czerwoną ramką). Należy dodać ikonę lub tekst.",
        "<strong>Linki w tekście:</strong> Sprawdź, czy linki wewnątrz bloków tekstu są wyróżnione czymś więcej niż tylko kolorem (np. podkreśleniem) lub czy mają wystarczający kontrast względem otoczenia (3:1) i tła."
    ],
    "C.9.1.4.2": [
        "<strong>Automatyczne odtwarzanie:</strong> Sprawdź, czy dźwięk odtwarzany automatycznie dłużej niż 3 sekundy ma mechanizm do jego zatrzymania lub wyciszenia."
    ],
    "C.9.1.4.3": [
        "<strong>Kontrast tekstu:</strong> Sprawdź, czy tekst zwykły ma kontrast do tła co najmniej 4.5:1.",
        "<strong>Kontrast dużego tekstu:</strong> Sprawdź, czy duży tekst (powyżej 18pt lub 14pt pogrubiony) ma kontrast co najmniej 3:1.",
        "<strong>Tekst na obrazach:</strong> Upewnij się, że tekst na grafikach również spełnia wymogi kontrastu."
    ],
    "C.9.1.4.4": [
        "<strong>Skalowanie tekstu:</strong> Sprawdź, czy stronę można powiększyć do 200% (używając funkcji zoom przeglądarki) bez utraty treści i funkcjonalności.",
        "<strong>Czytelność po powiększeniu:</strong> Upewnij się, że po powiększeniu tekst nie nakłada się na siebie i nie jest ucinany."
    ],
    "C.9.1.4.5": [
        "<strong>Tekst jako grafika:</strong> Sprawdź, czy tekst nie jest prezentowany w formie obrazka (chyba że jest to logo lub jest to niezbędne, np. wykres). Należy używać prawdziwego tekstu, aby był skalowalny i dostępny dla czytników."
    ],
    "C.9.1.4.10": [
        "<strong>Responsywność (Reflow):</strong> Sprawdź, czy przy szerokości ekranu 320px (lub przy powiększeniu 400% na desktopie) strona nie wymaga przewijania w dwóch wymiarach (poziomym i pionowym). Treść powinna się \"przelewac\" do jednej kolumny."
    ],
    "C.9.1.4.11": [
        "<strong>Kontrast elementów nietekstowych:</strong> Sprawdź, czy elementy interfejsu (przyciski, pola formularzy) oraz ważne elementy graficzne (wykresy) mają kontrast co najmniej 3:1 względem sąsiadujących kolorów."
    ],
    "C.9.1.4.12": [
        "<strong>Odstępy w tekście:</strong> Sprawdź, czy użytkownik może zmienić odstępy w tekście (interlinia, odstępy między akapitami, słowami, literami) bez utraty treści lub funkcjonalności (np. używając skryptozakładki testowej)."
    ],
    "C.9.1.4.13": [
        "<strong>Treść spod kursora (Hover):</strong> Sprawdź, czy treści pojawiające się po najechaniu myszą (tooltipy, menu) można odrzucić (klawiszem Esc), czy można na nie najechać kursorem bez ich znikania, i czy nie znikają same bez zmiany fokusu."
    ],
    "C.9.2.1.1": [
        "<strong>Dostępność klawiatury:</strong> Sprawdź, czy wszystkie elementy interaktywne (linki, przyciski, formularze) są dostępne i obsługiwalne wyłącznie za pomocą klawiatury (Tab, Enter, Spacja, Strzałki).",
        "<strong>Brak myszki:</strong> Spróbuj obsłużyć całą stronę bez użycia myszki."
    ],
    "C.9.2.1.2": [
        "<strong>Pułapka na klawiaturę:</strong> Sprawdź, czy fokus nie zostaje uwięziony w żadnym elemencie (np. w odtwarzaczu wideo, oknie modalnym) i czy można z niego wyjść standardowymi klawiszami (np. Tab, Esc)."
    ],
    "C.9.2.1.4": [
        "<strong>Skróty jednoliterowe:</strong> Jeśli strona obsługuje skróty klawiszowe oparte na pojedynczych literach, sprawdź, czy można je wyłączyć lub zmienić, aby uniknąć przypadkowego uruchomienia (np. podczas dyktowania tekstu)."
    ],
    "C.9.2.2.1": [
        "<strong>Limity czasowe:</strong> Jeśli na stronie występują limity czasowe (np. sesja logowania), sprawdź, czy użytkownik może je wyłączyć, dostosować lub przedłużyć przed upływem czasu."
    ],
    "C.9.2.2.2": [
        "<strong>Pauza, zatrzymanie, ukrycie:</strong> Sprawdź, czy ruszające się, migające lub przewijające się automatycznie treści (np. karuzele, tickery) można zatrzymać, zapauzować lub ukryć."
    ],
    "C.9.2.3.1": [
        "<strong>Błyski:</strong> Sprawdź, czy strona nie zawiera elementów błyskających częściej niż 3 razy na sekundę (może to wywołać atak padaczki)."
    ],
    "C.9.2.4.1": [
        "<strong>Pomięcie bloków (Skip links):</strong> Sprawdź, czy dostępny jest mechanizm (np. link \"Przejdź do treści\") pozwalający pominąć powtarzające się bloki nawigacyjne i przejść bezpośrednio do głównej treści."
    ],
    "C.9.2.4.2": [
        "<strong>Tytuł strony:</strong> Sprawdź, czy każda podstrona ma unikalny i opisowy tytuł (widoczny na karcie przeglądarki), który pozwala zidentyfikować jej treść i kontekst."
    ],
    "C.9.2.4.3": [
        "<strong>Kolejność fokusu:</strong> Sprawdź, czy kolejność nawigacji klawiaturą (Tab) jest logiczna i przewidywalna (zazwyczaj od lewej do prawej, od góry do dołu)."
    ],
    "C.9.2.4.4": [
        "<strong>Cel linku:</strong> Sprawdź, czy treść każdego linku (lub linku wraz z kontekstem) jasno określa, dokąd on prowadzi. Unikaj linków typu \"kliknij tutaj\" bez kontekstu."
    ],
    "C.9.2.4.5": [
        "<strong>Wiele dróg:</strong> Sprawdź, czy istnieje więcej niż jeden sposób dotarcia do podstrony (np. menu nawigacyjne, wyszukiwarka, mapa strony, lista linków).",
    ],
    "C.9.2.4.6": [
        "<strong>Nagłówki i etykiety:</strong> Sprawdź, czy nagłówki i etykiety jasno opisują temat lub cel sekcji/pola formularza."
    ],
    "C.9.2.4.7": [
        "<strong>Widoczny fokus:</strong> Sprawdź, czy każdy element interaktywny ma wyraźnie widoczne obramowanie (fokus) podczas nawigacji klawiaturą."
    ],
    "C.9.2.5.1": [
        "<strong>Gesty punktowe:</strong> Sprawdź, czy funkcje wymagające gestów wielopunktowych (np. pinch-to-zoom) lub ścieżkowych można obsłużyć również za pomocą prostego kliknięcia/dotknięcia."
    ],
    "C.9.2.5.2": [
        "<strong>Rezygnacja ze wskazania:</strong> Sprawdź, czy funkcjonalność jest aktywowana przy zwolnieniu wskaźnika (up-event), co pozwala na anulowanie (np. przez przesunięcie kursora poza element). Jeśli aktywacja następuje przy naciśnięciu, upewnij się, że istnieje mechanizm cofnięcia lub zachowanie to jest niezbędne."
    ],
    "C.9.2.5.3": [
        "<strong>Etykieta w nazwie:</strong> Sprawdź, czy widoczna etykieta tekstowa elementu (np. przycisku) jest zawarta w jego nazwie dostępnej (Accessible Name) dla czytników ekranu."
    ],
    "C.9.2.5.4": [
        "<strong>Aktywowanie ruchem:</strong> Jeśli funkcja jest aktywowana ruchem urządzenia (np. potrząśnięcie), sprawdź, czy można ją wyłączyć lub obsłużyć interfejsem."
    ],
    "C.9.3.1.1": [
        "<strong>Język strony:</strong> Sprawdź, czy w kodzie HTML zdefiniowany jest poprawny język strony (atrybut <code>lang</code> w znaczniku <code>&lt;html&gt;</code>)."
    ],
    "C.9.3.1.2": [
        "<strong>Język części:</strong> Sprawdź, czy fragmenty tekstu w innym języku niż domyślny mają odpowiedni atrybut <code>lang</code>."
    ],
    "C.9.3.2.1": [
        "<strong>Po otrzymaniu fokusu:</strong> Sprawdź, czy otrzymanie fokusu przez element nie powoduje nieoczekiwanej zmiany kontekstu (np. automatycznego wysłania formularza, otwarcia nowego okna)."
    ],
    "C.9.3.2.2": [
        "<strong>Podczas wprowadzania danych:</strong> Sprawdź, czy zmiana ustawienia elementu interfejsu (np. wybór z listy) nie powoduje nieoczekiwanej zmiany kontekstu, chyba że użytkownik został o tym uprzedzony."
    ],
    "C.9.3.2.3": [
        "<strong>Spójna nawigacja:</strong> Sprawdź, czy mechanizmy nawigacyjne (menu, wyszukiwarka) pojawiają się w tym samym względnym porządku na różnych podstronach."
    ],
    "C.9.3.2.4": [
        "<strong>Spójna identyfikacja:</strong> Sprawdź, czy elementy pełniące tę samą funkcję są konsekwentnie identyfikowane (mają te same etykiety i ikony) w całym serwisie."
    ],
    "C.9.3.3.1": [
        "<strong>Identyfikacja błędu:</strong> Sprawdź, czy błędy w formularzu są automatycznie wykrywane, a użytkownik otrzymuje jasną informację tekstową, które pole zawiera błąd i na czym on polega."
    ],
    "C.9.3.3.2": [
        "<strong>Etykiety lub instrukcje:</strong> Sprawdź, czy pola wymagające danych w określonym formacie posiadają odpowiednie instrukcje lub przykłady."
    ],
    "C.9.3.3.3": [
        "<strong>Sugestie korekty:</strong> Sprawdź, czy w przypadku błędu system podpowiada poprawną wartość (jeśli jest to możliwe)."
    ],
    "C.9.3.3.4": [
        "<strong>Zapobieganie błędom:</strong> Dla stron prawnych/finansowych: sprawdź, czy użytkownik może zweryfikować, potwierdzić lub cofnąć transakcję przed jej finalizacją."
    ],
    "C.9.4.1.1": [
        "<strong>Poprawność kodu (Parsing):</strong> <em>Uwaga: W WCAG 2.2 to kryterium zostało usunięte. W WCAG 2.1 (EN 301 549) uznaje się je za spełnione, chyba że błędy uniemożliwiają działanie technologii asystujących.</em><br>Sprawdź kod wyłącznie pod kątem krytycznych błędów:<ol><li>zduplikowanych atrybutach <code>id</code>,</li><li>zduplikowanych atrybutach w tym samym znaczniku,</li><li>błędnym zagnieżdżeniu elementów.</li></ol>"
    ],
    "C.9.4.1.2": [
        "<strong>Nazwa, rola, wartość:</strong> Sprawdź, czy niestandardowe elementy interfejsu (np. własne przyciski, zakładki) mają poprawnie zdefiniowaną nazwę, rolę i stan (np. przy użyciu ARIA), aby były dostępne dla czytników ekranu."
    ],
    "C.9.4.1.3": [
        "<strong>Komunikaty o stanie:</strong> Sprawdź, czy komunikaty o statusie (np. \"Wyszukiwanie...\", \"Dodano do koszyka\") są ogłaszane przez czytnik ekranu bez konieczności przenoszenia fokusu (użycie ARIA live regions)."
    ],
    "C.9.6": [
        "<strong>1. Poziom zgodności:</strong> Sprawdź, czy strona spełnia wszystkie kryteria sukcesu poziomu A i AA (lub posiada wersję alternatywną).",
        "<strong>2. Całe strony:</strong> Sprawdź, czy ocena dostępności dotyczy całej strony internetowej, a nie tylko jej fragmentu. Nie można wykluczyć części strony (np. nagłówka czy stopki) z oceny.",
        "<strong>3. Całe procesy:</strong> Jeśli strona jest częścią procesu (np. zakupy, logowanie), sprawdź, czy wszystkie kroki tego procesu są dostępne. Dostępność tylko jednego kroku nie wystarcza, jeśli użytkownik nie może ukończyć całego zadania.",
        "<strong>4. Użycie technologii obsługujących dostępność:</strong> Sprawdź, czy informacje i funkcje są dostępne przy użyciu technologii, które są wspierane przez narzędzia użytkownika (przeglądarki, czytniki ekranu). Unikaj technologii, które blokują dostępność.",
        "<strong>5. Bez zakłóceń:</strong> Sprawdź, czy technologie, które nie są wspierane w zakresie dostępności, nie blokują dostępu do reszty strony (np. czy nie powodują pułapki na klawiaturę, migania, czy nie zasłaniają treści)."
    ]
}

def update_c9_json():
    file_path = 'clauses_json/c9.json'
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        return

    content_list = data.get('content', [])
    
    current_heading_id = None
    updated_count = 0

    for item in content_list:
        if item.get('type') == 'heading':
            # Extract ID from heading text, e.g., "C.9.1.1.1 Treść nietekstowa" -> "C.9.1.1.1"
            text = item.get('text', '')
            match = re.match(r'(C\.9\.\d+\.\d+(\.\d+)?)', text)
            if match:
                current_heading_id = match.group(1)
            else:
                # Try simpler match if the above fails or for shorter headings
                match_simple = re.match(r'(C\.9\.\d+(\.\d+)?)', text)
                if match_simple:
                     current_heading_id = match_simple.group(1)

        elif item.get('type') == 'test':
            if current_heading_id and current_heading_id in NEW_CONTENT:
                item['detailedChecklist'] = NEW_CONTENT[current_heading_id]
                updated_count += 1
                # print(f"Updated {current_heading_id}")
            elif current_heading_id:
                # Optional: Clear old garbage if we don't have new content yet, 
                # or leave it. For now, let's leave it but log it.
                # print(f"No new content for {current_heading_id}")
                pass

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Successfully updated {updated_count} criteria in {file_path}")

if __name__ == "__main__":
    update_c9_json()

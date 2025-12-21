# Raport zgodności z EAA

Raport zgodności z EAA (EAA-CR).
To aplikacja webowa umożliwiająca przeprowadzanie audytów dostępności zgodnych z normą EN 301 549 V3.2.1 (2021-03). Narzedzie umożliwia generowanie raportów w formatach ODT, CSV i JSON (EARL)..

## Funkcje

- **Konfiguracja audytu**: Wybór produktu i klauzul do sprawdzenia z obsługą profili produktów/usług.
- **Profile produktów/usług**: Automatyczne zaznaczanie klauzul na podstawie wybranego profilu (np. strona internetowa, aplikacja mobilna).
- **Przeprowadzanie testów**: Interaktywne testowanie wymagań dostępności z opcjami ocen (Zaliczone, Nie dotyczy, Nie do sprawdzenia, Niezaliczone).
- **Dostępność (WCAG 2.1 AA)**: Narzędzie jest dostępne z klawiatury, obsługuje czytniki ekranowe, ma odpowiednie kontrasty i nawigację.
- **PWA (Progressive Web App)**: Działa offline, może być zainstalowane jako aplikacja natywna, automatyczne aktualizacje.
- **Responsywność**: Dostosowuje się do różnych rozmiarów ekranów i urządzeń.
- **Zarządzanie stanem**: Zapisywanie i wczytywanie postępów audytu lokalnie w przeglądarce z bezpiecznymi zmianami.
- **Generowanie raportów**: Eksport wyników do formatów ODT (dokument tekstowy), CSV (arkusz kalkulacyjny) i JSON (format EARL zgodny ze standardem W3C).
- **Motywy**: Obsługa motywów jasnego i ciemnego.

## Instalacja i uruchomienie

Narzędzie jest aplikacją webową, która może działać zarówno lokalnie, jak i na serwerze WWW. Wszystkie pliki są statyczne (HTML, CSS, JS, JSON), więc nie wymaga specjalnego środowiska serwerowego poza podstawowym serwerem HTTP.

### Wymagania systemowe

- **Przeglądarka**: Nowoczesna przeglądarka z obsługą ES6+ i localStorage (Chrome 70+, Firefox 65+, Edge 79+, Safari 12+).
- **Serwer**: Dowolny serwer HTTP obsługujący statyczne pliki. Dla pełnej funkcjonalności PWA wymagane HTTPS.
- **Zasoby**: Brak dodatkowych zależności – aplikacja działa całkowicie offline po załadowaniu.
- **Przestrzeń dyskowa**: ~5MB dla wszystkich plików.

### Instalacja lokalna (dla testowania i rozwoju)

Najprostszy sposób uruchomienia aplikacji lokalnie:

1. **Pobierz pliki**: Skopiuj wszystkie pliki projektu do lokalnego katalogu na dysku.
2. **Uruchom serwer lokalny**:
   - **Python 3**: Otwórz terminal w katalogu projektu i uruchom `python -m http.server 8000`
   - **Node.js**: Zainstaluj `http-server` globalnie (`npm install -g http-server`) i uruchom `http-server`
   - **VS Code**: Użyj rozszerzenia "Live Server" lub podobnego
   - **Inne narzędzia**: Apache, Nginx, lub dowolny serwer HTTP wskazujący na katalog projektu
3. **Uruchom w przeglądarce**: Otwórz `http://localhost:8000/index.html`
4. **Rozpocznij**: Przejdź przez konfigurację nowego audytu

**Uwaga**: Bezpośrednie otwieranie `index.html` z dysku (file://) nie działa z powodu restrykcji bezpieczeństwa przeglądarek dotyczących ładowania plików JSON.

### Instalacja na serwerze WWW (produkcyjna)

Aby udostępnić aplikację online dla wielu użytkowników:

#### Opcja 1: GitHub Pages (bezpłatne, proste)
1. Prześlij projekt do repozytorium GitHub
2. W ustawieniach repozytorium włącz GitHub Pages
3. Wybierz branch `main` i folder `/` (root)
4. Aplikacja będzie dostępna pod adresem `https://twoja-nazwa.github.io/nazwa-repo/`

#### Opcja 2: Własny serwer hostingowy
1. **Wymagania serwera**:
   - Obsługa HTTPS (wymagane dla PWA)
   - Serwer HTTP (Apache, Nginx, IIS, itp.)
   - Brak potrzeby bazy danych czy PHP/Node.js
2. **Przesyłanie plików**:
   - Prześlij wszystkie pliki projektu do katalogu publicznego serwera (np. `public_html/`, `www/`)
   - Upewnij się, że pliki JSON są dostępne (bez restrykcji `.htaccess`)
3. **Konfiguracja**:
   - Dla Apache: Brak specjalnej konfiguracji potrzebnej
   - Dla Nginx: Dodaj w konfiguracji:
     ```
     location / {
         try_files $uri $uri/ /index.html;
     }
     ```
4. **Dostęp**: Aplikacja będzie dostępna pod Twoją domeną

#### Opcja 3: Serwer VPS/Cloud (AWS, DigitalOcean, itp.)
1. Skonfiguruj serwer z systemem Linux/Windows
2. Zainstaluj serwer HTTP (np. Nginx na Ubuntu: `sudo apt install nginx`)
3. Skopiuj pliki do katalogu `/var/www/html/` (lub odpowiedniego)
4. Skonfiguruj HTTPS za pomocą Let's Encrypt (bezpłatne certyfikaty)
5. Aplikacja działa natychmiast po skonfigurowaniu

### Konfiguracja PWA (opcjonalna)

Dla pełnej funkcjonalności Progressive Web App:

1. **HTTPS**: Wymagane dla instalacji jako aplikacji natywnej
2. **Service Worker**: Automatycznie zarejestrowany w `service-worker.js`
3. **Manifest**: Skonfigurowany w `manifest.webmanifest`
4. **Instalacja**: Użytkownicy mogą zainstalować aplikację z przeglądarki

### Rozwiązywanie problemów z instalacją

- **Błędy CORS przy ładowaniu JSON**: Upewnij się, że serwer obsługuje pliki JSON bez restrykcji
- **PWA nie instaluje się**: Sprawdź czy strona jest serwowana przez HTTPS
- **Pliki nie ładują się**: Sprawdź ścieżki URL – aplikacja używa ścieżek względnych
- **Cache przeglądarki**: Wyczyść cache (Ctrl+Shift+R) po aktualizacji plików

Po instalacji aplikacja jest gotowa do użycia – wszystkie dane są przechowywane lokalnie w przeglądarce użytkownika.

## Struktura projektu

- `index.html`: Strona główna aplikacji.
- `new-audit.html`: Strona konfiguracji nowego audytu z obsługą profili.
- `audit.html`: Główna strona przeprowadzania audytu.
- `summary.html`: Strona podsumowania i eksportu raportów.
- `js/`: Skrypty JavaScript:
  - `utils.js`: Funkcje pomocnicze (zarządzanie stanem, generowanie EARL, XML escaping, dostępność).
  - `landing.js`: Logika strony głównej (wczytywanie plików).
  - `setup.js`: Konfiguracja nowego audytu z profilami i synchronizacją.
  - `audit.js`: Logika audytu i nawigacji.
  - `summary.js`: Renderowanie podsumowania i eksport z komunikatami dostępności.
  - `messages-pl.js`: Słownik tłumaczeń (polski).
  - `service-worker.js`: Service Worker dla PWA.
- `css/`: Style CSS (`style.css`, `pico.min.css`).
- `clauses_json/`: Pliki JSON z definicjami klauzul i testów dostępności.
- `img/`, `js/`: Zasoby statyczne (ikony, biblioteki).
- `manifest.webmanifest`: Manifest PWA.

## Jak używać (dla użytkowników)

1. **Rozpocznij nowy audyt**: Na stronie głównej kliknij "Nowy Audyt", skonfiguruj produkt i wybierz klauzule.
2. **Przeprowadź testy**: Przechodź przez testy, oceniaj wymagania i dodawaj notatki.
3. **Zapisz postęp**: Użyj Ctrl+S (Cmd+S na Mac) do zapisania stanu jako plik JSON.
4. **Wczytaj audyt**: Na stronie głównej kliknij "Wczytaj audyt" i wybierz plik JSON.
5. **Generuj raport**: Po zakończeniu przejdź do podsumowania i pobierz raport w wybranym formacie.

### Funkcje dostępności

Aplikacja jest zgodna z WCAG 2.1 AA i zawiera następujące funkcje dostępności:

- **Nawigacja klawiaturowa**: Wszystkie elementy interaktywne są dostępne z klawiatury.
- **Czytniki ekranowe**: Komunikaty statusu są ogłaszane przez regiony `aria-live`.
- **Odpowiednie kontrasty**: Kolory spełniają wymagania kontrastu WCAG.
- **Hierarchia nagłówków**: Poprawna struktura nagłówków dla lepszej nawigacji.
- **Focus management**: Logiczne przemieszczanie fokusu między elementami.
- **Alternatywy tekstowe**: Wszystkie ikony mają etykiety `aria-label`.

### Progressive Web App (PWA)

Aplikacja może działać jako PWA:

- **Instalacja**: W przeglądarkach obsługujących PWA można zainstalować aplikację na urządzeniu.
- **Tryb offline**: Podstawowe funkcje działają bez połączenia internetowego.
- **Automatyczne aktualizacje**: Service Worker aktualizuje aplikację w tle.
- **Responsywność**: Dostosowuje się do ekranów mobilnych i desktopowych.

### Bezpieczeństwo i zarządzanie stanem

- **Lokalne przechowywanie**: Wszystkie dane są przechowywane lokalnie w przeglądarce (localStorage).
- **Potwierdzenia zmian**: Bezpieczne usuwanie klauzul z potwierdzeniami, aby uniknąć utraty danych.
- **Czyszczenie stanu**: Automatyczne czyszczenie danych przy rozpoczynaniu nowego audytu.
- **Synchronizacja**: Poprawna synchronizacja stanów przy ładowaniu istniejących audytów.

### Oceny wymagań

- **Zaliczone**: Wymaganie spełnione.
- **Nie dotyczy**: Wymaganie nie dotyczy produktu.
- **Nie do sprawdzenia**: Wymaganie nie może być sprawdzone z powodu niespełnienia warunków wstępnych.
- **Niezaliczone**: Wymaganie nie spełnione.

## Konfiguracja aplikacji (dla użytkowników i administratorów)

Narzędzie jest zaprojektowane tak, aby jego konfiguracja była możliwa do samodzielnego utrzymania przez użytkowników bez głębokiej wiedzy technicznej. Wszystkie ustawienia są przechowywane w plikach JSON w folderze `clauses_json/`. Możesz edytować te pliki w dowolnym edytorze tekstu (np. Notepad, VS Code, Notion) lub nawet w arkuszach kalkulacyjnych (eksportując do JSON).

### Dlaczego JSON?

JSON to prosty format tekstowy do przechowywania danych strukturalnych. Jest czytelny dla ludzi i łatwy do edycji. Nie wymaga specjalistycznego oprogramowania – wystarczy edytor tekstu. Zmiany w plikach JSON są natychmiast widoczne po odświeżeniu strony (Ctrl+F5).

### Pliki konfiguracyjne

Wszystkie pliki konfiguracyjne znajdują się w folderze `clauses_json/`:

- `clauses_config.json`: Główna konfiguracja klauzul – tytuły, ikony, opisy.
- `products_services_map.json`: Definicje profili produktów i usług.
- `c5.json`, `c6.json`, ..., `c13.json`: Szczegółowe definicje testów dla każdej klauzuli.

### Jak edytować pliki JSON

1. **Otwórz plik**: Kliknij prawym przyciskiem na pliku JSON i wybierz "Otwórz za pomocą" > edytor tekstu.
2. **Edytuj**: Zmieniaj wartości w cudzysłowach. Zachowaj strukturę nawiasów `{}` i nawiasów kwadratowych `[]`.
3. **Zapisz**: Zapisz plik.
4. **Przetestuj**: Odśwież stronę aplikacji w przeglądarce (Ctrl+F5) i sprawdź zmiany.
5. **Walidacja**: Jeśli coś nie działa, sprawdź składnię JSON na stronie [jsonlint.com](https://jsonlint.com).

**Wskazówka**: Zawsze twórz kopię zapasową pliku przed edycją!

### Dodawanie nowej klauzuli

Klauzule to główne sekcje audytu (np. "C.5 Wymagania ogólne"). Aby dodać nową klauzulę:

1. **Zaktualizuj clauses_config.json**:
   ```json
   {
     "clauses": [
       // Istniejące klauzule...
       {
         "id": "c14",
         "title": "C.14 Nowa klauzula - Przykład",
         "icon": "settings",
         "description": "Krótki opis nowej klauzuli dla audytorów."
       }
     ]
   }
   ```

2. **Utwórz plik c14.json** w folderze `clauses_json/` z podstawową strukturą:
   ```json
   {
     "id": "c14",
     "title": "C.14 Nowa klauzula - Przykład",
     "content": [
       {
         "type": "heading",
         "level": 3,
         "text": "C.14.1 Pierwszy test",
         "wcag_level": "A"
       },
       {
         "type": "test",
         "evaluationType": "Inspekcja",
         "preconditions": [
           "Produkt ma funkcję XYZ"
         ],
         "procedure": [
           "Sprawdź czy funkcja XYZ działa poprawnie",
           "Zweryfikuj dostępność z klawiatury"
         ],
         "form": {
           "inputs": [
             {
               "value": "Zaliczone",
               "label": "Funkcja działa poprawnie"
             },
             {
               "value": "Niezaliczone",
               "label": "Funkcja ma problemy z dostępnością"
             }
           ],
           "legend": "Ocena funkcji XYZ",
           "noteId": "c14-1-note"
         }
       }
     ]
   }
   ```

3. **Zaktualizuj profile** (opcjonalnie): Jeśli nowa klauzula powinna być domyślnie zaznaczana dla pewnych profili, dodaj ją do `products_services_map.json`.

4. **Przetestuj**: Uruchom aplikację i sprawdź, czy nowa klauzula pojawia się w konfiguracji.

### Edycja istniejącej klauzuli

1. Otwórz odpowiedni plik JSON (np. `c5.json`).
2. Znajdź sekcję do edycji (np. tytuł, opis, testy).
3. Zmodyfikuj tekst w cudzysłowach.
4. Zapisz i odśwież aplikację.

**Przykład zmiany tytułu**:
```json
{
  "title": "C.5 Wymagania ogólne - zaktualizowany tytuł"
}
```

### Dodawanie nowego testu do klauzuli

Testy to konkretne punkty do sprawdzenia w ramach klauzuli.

1. Otwórz plik klauzuli (np. `c5.json`).
2. Znajdź tablicę `content`.
3. Dodaj nowy obiekt typu `"test"`:
   ```json
   {
     "type": "test",
     "evaluationType": "Inspekcja",
     "preconditions": [
       "Warunek 1",
       "Warunek 2"
     ],
     "procedure": [
       "Krok 1: Zrób coś",
       "Krok 2: Sprawdź coś"
     ],
     "form": {
       "inputs": [
         {
           "value": "Zaliczone",
           "label": "Wszystko w porządku"
         },
         {
           "value": "Niezaliczone",
           "label": "Znaleziono problemy"
         }
       ],
       "legend": "Ocena nowego testu",
       "noteId": "unikalne-id-notatki"
     },
     "notes": [
       "Dodatkowa informacja dla audytora"
     ],
     "detailedChecklist": [
       "Podpunkt 1",
       "Podpunkt 2"
     ]
   }
   ```

4. **Formatowanie tekstu**: Możesz używać podstawowego Markdown:
   - `*kursywa*` → kursywa
   - `**pogrubienie**` → pogrubienie
   - `[link](url)` → link
   - `- lista` → lista punktowana

### Dodawanie lub edycja profili produktów/usług

Profile automatycznie zaznaczają odpowiednie klauzule dla danego typu produktu.

1. Otwórz `products_services_map.json`.
2. Znajdź sekcję `"products"` lub `"services"`.
3. Dodaj nowy profil:
   ```json
   {
     "category": "Nowa kategoria",
     "items": [
       {
         "name": "Nowy produkt",
         "clauses": ["c5", "c6", "c12"]
       }
     ]
   }
   ```

4. **Klauzule**: Lista ID klauzul, które powinny być zaznaczone dla tego profilu.

**Przykład**: Dla aplikacji mobilnej możesz stworzyć profil z klauzulami `["c5", "c6", "c7", "c9", "c11", "c12", "c13"]`.

### Ikony

Ikony są używane do wizualnego oznaczenia klauzul. Używamy biblioteki Lucide Icons.

- **Gdzie znaleźć ikony**: Odwiedź [lucide.dev](https://lucide.dev) i wyszukaj nazwę ikony (np. "accessibility", "eye", "settings").
- **Jak dodać**: W `clauses_config.json` użyj nazwy ikony z Lucide (bez prefiksu "lucide-").
- **Przykłady popularnych ikon**:
  - `"accessibility"` - dostępność
  - `"eye"` - widoczność
  - `"mouse-pointer"` - interakcja
  - `"volume-2"` - dźwięk
  - `"settings"` - ustawienia
  - `"globe"` - web
  - `"smartphone"` - mobilne
  - `"monitor"` - komputer

### Zaawansowane funkcje: Testy pochodne i implikacje

#### Testy pochodne (automatyczne obliczanie wyników)

Niektóre testy mogą mieć wynik obliczany automatycznie na podstawie innych testów.

**Przykład**: Jeśli test A i B są zaliczone, test C automatycznie staje się zaliczony.

W pliku JSON dodaj:
```json
{
  "type": "test",
  "derivations": {
    "sources": "^C\\.5\\.[1-2]",  // Regex pasujący do ID innych testów
    "mode": "strict-pass"  // Wszystkie muszą być "Zaliczone"
  }
}
```

- `sources`: Wyrażenie regularne (regex) pasujące do ID testów źródłowych.
- `mode`: 
  - `"strict-pass"`: Wszystkie źródłowe muszą być "Zaliczone"
  - `"worst-case"`: Bierze najgorszy wynik ze źródłowych
  - `"any-subgroup-pass"`: Bardziej złożone warunki

#### Implikacje (automatyczne ustawianie innych testów)

Jeden test może automatycznie wpływać na wyniki innych testów.

**Przykład**: Jeśli test bezpieczeństwa jest zaliczony, niektóre testy prywatności stają się "Nie dotyczy".

W pliku JSON dodaj:
```json
{
  "type": "test",
  "implications": [
    {
      "whenStatus": "Zaliczone",
      "targetScope": "^C\\.11\\..*",  // Regex dla testów docelowych
      "setStatus": "Nie dotyczy",
      "setNote": "Automatycznie ustawione na podstawie testu bezpieczeństwa"
    }
  ]
}
```

### Rozwiązywanie problemów z konfiguracją

- **Aplikacja nie wczytuje zmian**: Odśwież stronę z wyczyszczeniem cache (Ctrl+Shift+R).
- **Błąd składni JSON**: Użyj walidatora [jsonlint.com](https://jsonlint.com) do sprawdzenia pliku.
- **Ikona nie wyświetla się**: Sprawdź nazwę ikony na [lucide.dev](https://lucide.dev).
- **Nowy test nie pojawia się**: Upewnij się, że `id` w pliku JSON jest unikalne i plik jest w folderze `clauses_json/`.
- **Profil nie zaznacza klauzul**: Sprawdź, czy ID klauzul w `products_services_map.json` pasują do tych w `clauses_config.json`.
- **Tekst nie formatuje się**: Pamiętaj, że Markdown działa tylko w określonych polach (procedure, notes).

### Przykład kompletnej konfiguracji nowej klauzuli

Załóżmy, że chcesz dodać klauzulę "C.15 Multimedia" dla testów wideo/audio.

1. **clauses_config.json**:
   ```json
   {
     "clauses": [
       // ... istniejące
       {
         "id": "c15",
         "title": "C.15 Multimedia",
         "icon": "volume-2",
         "description": "Wymagania dotyczące dostępności multimediów"
       }
     ]
   }
   ```

2. **c15.json**:
   ```json
   {
     "id": "c15",
     "title": "C.15 Multimedia",
     "content": [
       {
         "type": "heading",
         "level": 3,
         "text": "C.15.1 Napisy do wideo",
         "wcag_level": "A"
       },
       {
         "type": "test",
         "evaluationType": "Inspekcja",
         "preconditions": [
           "Produkt zawiera wideo dłuższe niż 5 minut"
         ],
         "procedure": [
           "Odtwórz wideo",
           "Sprawdź obecność napisów",
           "Zweryfikuj synchronizację napisów z dźwiękiem"
         ],
         "form": {
           "inputs": [
             {
               "value": "Zaliczone",
               "label": "Napisy są obecne i poprawne"
             },
             {
               "value": "Niezaliczone",
               "label": "Brak napisów lub są nieprawidłowe"
             },
             {
               "value": "Nie dotyczy",
               "label": "Brak wideo w produkcie"
             }
           ],
           "legend": "Ocena dostępności wideo",
           "noteId": "c15-1-note"
         },
         "notes": [
           "**Wskazówka**: Napisy powinny być zgodne z WCAG 2.1 poziom A"
         ]
       }
     ]
   }
   ```

3. **products_services_map.json** (dodaj do istniejących profili):
   ```json
   {
     "name": "Aplikacja mobilna z multimedia",
     "clauses": ["c5", "c6", "c7", "c9", "c11", "c12", "c13", "c15"]
   }
   ```

Po zapisaniu plików odśwież aplikację – nowa klauzula powinna pojawić się w konfiguracji!

## Dla deweloperów i utrzymujących

### Generowanie EARL

Raporty JSON są w formacie EARL (Evaluation and Report Language), standardzie W3C dla raportów dostępności. Funkcja `generateEARL` w `utils.js` konwertuje stan aplikacji na obiekt EARL.

- **Kontekst**: Definiuje prefiksy dla URI (earl, dct, foaf, itp.).
- **Assertor**: Narzędzie lub użytkownik jako podmiot oceniający.
- **Test Subject**: Produkt poddany audytowi.
- **Wyniki**: Lista asercji z wynikami testów.

### Aktualizacje i utrzymanie

- **Aktualizacja treści klauzul**: Edytuj pliki JSON w `clauses_json/`.
- **Dodawanie profili**: Dodaj nowe profile w `setup.js` i tłumaczeniach.
- **Dostępność**: Testuj z czytnikami ekranowymi i narzędziami do testowania dostępności.
- **PWA**: Aktualizuj `manifest.webmanifest` i `service-worker.js` przy zmianach.
- **Dodawanie funkcji**: Modyfikuj pliki JS, dodając komentarze w języku polskim wyjaśniające nowe komponenty.
- **Testowanie**: Uruchom aplikację lokalnie, przetestuj wszystkie ścieżki (nowy audyt, wczytywanie, eksport, dostępność).
- **Wersjonowanie**: Aktualizuj wersję w `utils.js` (dct:hasVersion).

## Licencja

[Określ licencję, np. MIT lub GPL].

## Kontakt

Dla pytań dotyczących utrzymania skontaktuj się z [kontakt].

```json
{
  "id": "c5",
  "title": "Audyt Klauzuli 5: Wymagania ogólne",
  "content": [
    {
      "type": "heading",
      "level": 3,
      "text": "C.5.1 Funkcjonalność zamknięta"
    },
    {
      "type": "test",
      "preconditions": ["Warunek wstępny"],
      "procedure": ["Krok 1", "Krok 2"],
      "form": {
        "inputs": [
          {
            "value": "Zaliczone",
            "label": "Opis"
          }
        ],
        "legend": "Legenda",
        "noteId": "id-notatki"
      },
      "evaluationType": "Inspekcja"
    }
  ]
}
```

- **Typy elementów**:
  - `"heading"`: Nagłówek z poziomem (level) i tekstem.
  - `"informative"`: Tekst informacyjny.
  - `"test"`: Test z warunkami wstępnymi (preconditions), procedurą (procedure), formularzem (form) i typem oceny (evaluationType).

- **Formularz testu**:
  - `inputs`: Lista opcji wyboru z `value` (ocena) i `label` (opis).
  - Dostępne wartości: `"Zaliczone"`, `"Niezaliczone"`, `"Nie dotyczy"`, `"Nie do sprawdzenia"`.
  - `legend`: Opis legendy formularza.
  - `noteId`: Identyfikator dla notatek.

#### Dodawanie nowych klauzul lub testów

1. Utwórz nowy plik JSON w `clauses_json/` (np. `c14.json`).
2. Skopiuj strukturę z istniejącego pliku.
3. Zaktualizuj `id`, `title` i `content`.
4. Dodaj odpowiednie testy z warunkami wstępnymi i opcjami wyboru.
5. Jeśli potrzebne, zaktualizuj `new-audit.html` lub inne pliki, aby uwzględnić nową klauzulę w wyborze.

#### Autowypełnianie klauzul

Niektóre klauzule mają dynamiczne elementy, gdzie dostępne opcje zależą od warunków wstępnych lub innych testów. Obecnie zdefiniowane są dwa przypadki:

1. **Testy pochodne (derived tests)**: Wynik testu jest automatycznie wyliczany na podstawie wyników innych testów. Jeśli test ma pole `derivations` (lista ID zależnych testów) lub jest objęty aktywną implikacją (`activeImp`), to:
   - Nie pokazuje formularza wyboru – status jest obliczany automatycznie.
   - Jeśli status już obliczony, wyświetla ikonę i etykietę (np. "Zaliczone" z zieloną ikoną).
   - Jeśli nie, pokazuje komunikat "Wynik tego testu zostanie wyliczony automatycznie po uzupełnieniu powiązanych testów."
   - Przykład: Testy z `derivations: ["c6.1.1", "c6.1.2"]` – jeśli oba zależne są "Zaliczone", ten test automatycznie staje się "Zaliczone".

   - **Jak ustawić w JSON**: Dodaj pola do elementów `content`:
     ```json
     {
       "type": "test",
       "derivations": {
         "sources": "^C\\.6\\.1\\.[1-2]",
         "mode": "strict-pass"
       },
       // ... reszta pól
     }
     ```
     - `sources`: Wyrażenie regularne pasujące do ID zależnych testów (np. "^C\.6\.1\.[1-2]").
     - `mode`: Tryb obliczania ("strict-pass", "worst-case", "any-subgroup-pass"). W "strict-pass" wynik jest "Zaliczone" tylko jeśli wszystkie zależne są "Zaliczone". Jeśli jakikolwiek zależny jest "Niezaliczone", wynik jest "Niezaliczone".
     - Alternatywnie, użyj `activeImp` dla bardziej złożonych implikacji (np. logicznych warunków).

2. **Implikacje (implications)**: Wynik jednego testu automatycznie ustawia statusy innych testów.

   - **Jak ustawić w JSON**: Dodaj pole `implications` do elementów `content`:
     ```json
     {
       "type": "test",
       "implications": [
         {
           "whenStatus": "Zaliczone",
           "targetScope": "^C\\.11\\.5\\.2\\..*",
           "setStatus": "Nie dotyczy",
           "setNote": "Nie dotyczy, ponieważ funkcjonalność zamknięta jest zgodna z klauzulą 5.1 (zgodnie z wynikiem C.11.5.1)."
         }
       ],
       // ... reszta pól
     }
     ```
     - `whenStatus`: Status tego testu, który wyzwala implikację (np. "Zaliczone").
     - `targetScope`: Wyrażenie regularne pasujące do ID docelowych testów (np. "^C\.11\.5\.2\..*").
     - `setStatus`: Status do ustawienia dla pasujących testów (np. "Nie dotyczy").
     - `setNote`: Opcjonalna notka do dodania do docelowych testów.

   - Przykład: Jeśli test C.11.5.1 jest "Zaliczone", wszystkie testy C.11.5.2.* automatycznie stają się "Nie dotyczy" z odpowiednią notką.

### Generowanie EARL

Raporty JSON są w formacie EARL (Evaluation and Report Language), standardzie W3C dla raportów dostępności. Funkcja `generateEARL` w `utils.js` konwertuje stan aplikacji na obiekt EARL.

- **Kontekst**: Definiuje prefiksy dla URI (earl, dct, foaf, itp.).
- **Assertor**: Narzędzie lub użytkownik jako podmiot oceniający.
- **Test Subject**: Produkt poddany audytowi.
- **Wyniki**: Lista asercji z wynikami testów.

### Aktualizacje i utrzymanie

- **Aktualizacja treści klauzul**: Edytuj pliki JSON w `clauses_json/`.
- **Dodawanie profili**: Dodaj nowe profile w `setup.js` i tłumaczeniach.
- **Dostępność**: Testuj z czytnikami ekranowymi i narzędziami do testowania dostępności.
- **PWA**: Aktualizuj `manifest.webmanifest` i `service-worker.js` przy zmianach.
- **Dodawanie funkcji**: Modyfikuj pliki JS, dodając komentarze w języku polskim wyjaśniające nowe komponenty.
- **Testowanie**: Uruchom aplikację lokalnie, przetestuj wszystkie ścieżki (nowy audyt, wczytywanie, eksport, dostępność).
- **Wersjonowanie**: Aktualizuj wersję w `utils.js` (dct:hasVersion).

## Licencja

[Określ licencję, np. MIT lub GPL].

## Kontakt

Dla pytań dotyczących utrzymania skontaktuj się z [kontakt].
# Raport zgodności z EAA

Raport zgodności z EAA - narzędzie wspomagające audyt dostępności cyfrowej zgodnie z normą EN 301 549 V3.2.1 (2021-03). Aplikacja webowa umożliwiająca przeprowadzanie audytów dostępności, generowanie raportów w formatach ODT, CSV i JSON (EARL), oraz zarządzanie stanem audytu lokalnie w przeglądarce.

## Funkcje

- **Konfiguracja audytu**: Wybór produktu i klauzul do sprawdzenia.
- **Przeprowadzanie testów**: Interaktywne testowanie wymagań dostępności z opcjami ocen (Zaliczone, Nie dotyczy, Nie do sprawdzenia, Niezaliczone).
- **Generowanie raportów**: Eksport wyników do formatów ODT (dokument tekstowy), CSV (arkusz kalkulacyjny) i JSON (format EARL zgodny ze standardem W3C).
- **Zarządzanie stanem**: Zapisywanie i wczytywanie postępów audytu lokalnie w przeglądarce.
- **Dostępność**: Narzędzie jest dostępne z klawiatury, obsługuje motywy jasny/ciemny.

## Instalacja i uruchomienie

Narzędzie jest aplikacją webową działającą lokalnie w przeglądarce. Wymaga uruchomienia lokalnego serwera HTTP, ponieważ bezpośrednie otwieranie plików z dysku blokuje ładowanie plików JSON ze względów bezpieczeństwa.

1. **Pobierz pliki**: Skopiuj wszystkie pliki projektu do lokalnego katalogu.
2. **Uruchom serwer lokalny**: Użyj prostego serwera HTTP, np. w Pythonie: `python -m http.server 8000` (lub innego narzędzia jak Live Server w VS Code).
3. **Uruchom w przeglądarce**: Otwórz `http://localhost:8000/index.html` w nowoczesnej przeglądarce (zalecane Chrome, Firefox, Edge).
4. **Rozpocznij**: Przejdź przez konfigurację nowego audytu lub wczytaj istniejący plik JSON.

### Wymagania

- Nowoczesna przeglądarka z obsługą ES6+ i localStorage.
- Brak dodatkowych zależności – wszystko działa offline.

## Struktura projektu

- `index.html`: Strona główna aplikacji.
- `new-audit.html`: Strona konfiguracji nowego audytu.
- `audit.html`: Główna strona przeprowadzania audytu.
- `summary.html`: Strona podsumowania i eksportu raportów.
- `js/`: Skrypty JavaScript:
  - `utils.js`: Funkcje pomocnicze (zarządzanie stanem, generowanie EARL, XML escaping).
  - `landing.js`: Logika strony głównej (wczytywanie plików).
  - `setup.js`: Konfiguracja nowego audytu.
  - `audit.js`: Logika audytu i nawigacji.
  - `summary.js`: Renderowanie podsumowania i eksport.
- `css/`: Style CSS (`style.css`, `pico.min.css`).
- `clauses_json/`: Pliki JSON z definicjami klauzul i testów dostępności.
- `img/`, `js/`: Zasoby statyczne (ikony, biblioteki).

## Jak używać (dla użytkowników)

1. **Rozpocznij nowy audyt**: Na stronie głównej kliknij "Nowy Audyt", skonfiguruj produkt i wybierz klauzule.
2. **Przeprowadź testy**: Przechodź przez testy, oceniaj wymagania i dodawaj notatki.
3. **Zapisz postęp**: Użyj Ctrl+S (Cmd+S na Mac) do zapisania stanu jako plik JSON.
4. **Wczytaj audyt**: Na stronie głównej kliknij "Wczytaj audyt" i wybierz plik JSON.
5. **Generuj raport**: Po zakończeniu przejdź do podsumowania i pobierz raport w wybranym formacie.

### Oceny wymagań

- **Zaliczone**: Wymaganie spełnione.
- **Nie dotyczy**: Wymaganie nie dotyczy produktu.
- **Nie do sprawdzenia**: Wymaganie nie może być sprawdzone z powodu niespełnienia warunków wstępnych.
- **Niezaliczone**: Wymaganie nie spełnione.

## Dla deweloperów i utrzymujących

### Modyfikacja plików JSON (klauzule)

#### Narzędzia developerskie — i18n checker
Dodano proste narzędzie do lokalnego sprawdzania pokrycia kluczy lokalizacyjnych.

- Lokalizacja skryptu: `tools/i18n-check.js`
- Uruchomienie: `node tools/i18n-check.js` (wyjście non-zero przy brakujących kluczach)
- Opcje: `--no-exit` (nie ustawia kodu wyjścia), `--html-dir=.` (ustaw katalog do skanowania), `--msgs=js/messages.pl.js,js/messages.en.js` (lista plików słowników)

Używaj tego narzędzia przed commitami/PR by znaleźć brakujące klucze `data-i18n`.

Uwaga na konwencję kluczy: wprowadziliśmy aliasy dla niektórych nazw (np. `fileLoad.*` ↔ `error.load.*`) aby ułatwić stopniową unifikację komunikatów. Narzędzie i runtime spróbują rozwiązać brakujące klucze przez zmapowanie prefiksów; jednak zalecane jest ujednolicenie i wykorzystanie nowego namespace `error.load.*` gdy dodajesz nowe komunikaty. W ramach migracji dodaliśmy też odpowiedniki kluczy `load`, `loadSuccess` i `loadError` pod `error.load.*`, więc nowe implementacje powinny używać `error.load.*` bez obawy o brakujące tłumaczenia.

### Tworzenie i aktualizacja klauzul

Pliki JSON w `clauses_json/` definiują testy dostępności. Każdy plik odpowiada jednej klauzuli (np. `c5.json` dla klauzuli 5).

#### Struktura pliku JSON

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
- **Dodawanie funkcji**: Modyfikuj pliki JS, dodając komentarze w języku polskim wyjaśniające nowe komponenty.
- **Testowanie**: Uruchom aplikację lokalnie, przetestuj wszystkie ścieżki (nowy audyt, wczytywanie, eksport).
- **Wersjonowanie**: Aktualizuj wersję w `utils.js` (dct:hasVersion).

## Licencja

[Określ licencję, np. MIT lub GPL].

## Kontakt

Dla pytań dotyczących utrzymania skontaktuj się z [kontakt].
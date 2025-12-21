/* =========================================================
   messages-pl.js
   Słownik komunikatów – język polski
   Raport zgodności z EAA (EN 301 549 / WCAG)
   ========================================================= */

export const MESSAGES_PL = {

  /* ---------- Utils / Global ---------- */
  utils: {
    saveError: "Błąd zapisu stanu aplikacji. Sprawdź ustawienia przeglądarki.",
    saveSuccess: "Zapisano raport i pobrano plik.",
    ok: "OK",
    updateAvailable: "Dostępna jest nowa wersja aplikacji. Odśwież stronę, aby ją zastosować."
  },

  /* ---------- Ogólne ---------- */
  app: {
    accessibilityAudit: "Audyt dostępności",
    loadingData: "Ładowanie danych…"
  },

  /* ---------- Nawigacja i opuszczanie ekranu ---------- */
  navigation: {
    unsavedChangesTitle: "Niezapisane zmiany",
    unsavedChangesBody:
      "Wprowadzono niezapisane informacje. Opuszczenie tego ekranu spowoduje ich utratę.",
    goToHomeQuestion: "Czy przejść do strony startowej?",
    confirmStay: "Pozostań",
    confirmLeave: "Opuść ekran",

    skipToContent: "Pomiń nawigację",

    // Header / Navbar tooltips
    menu: "Menu",
    home: "Strona główna",
    saveAudit: "Zapisz audyt",
    saveConfig: "Zapisz konfigurację",
    editConfig: "Edytuj konfigurację",
    editResponses: "Edytuj odpowiedzi",
    toggleTheme: "Przełącz motyw",
    themeModeHelp: "Tryb jasny/ciemny",
    themeDark: "Tryb ciemny",
    themeLight: "Tryb jasny",
    themeSet: "Ustawiono motyw: {mode}.",
    toggleTo: "Przełącz na motyw {mode}",
    saveAuditHelp: "Zapisz audyt (zapisz bieżący postęp jako wersję roboczą)",
    saveConfigHelp: "Zapisz konfigurację audytu jako wersję roboczą",
    editConfigHelp: "Edytuj konfigurację audytu",
    editResponsesHelp: "Przejdź do edycji odpowiedzi audytu",
    backToTestsHelp: "Wróć do testów (przejdź do strony testów)",
    homeHelp: "Przejdź do strony głównej",
    loadAuditHelp: "Wczytaj plik audytu (JSON)" ,
    backToTests: "Powrót do testów",

    returnToHomeTitle: "Powrót do strony startowej",
    returnToHomeBody:
      "Powrót do strony startowej spowoduje utratę niezapisanych danych."
  },


  /* ---------- Konfiguracja audytu ---------- */
  setup: {
    missingConfiguration:
      "Nie znaleziono konfiguracji audytu. Przejdź do strony startowej, aby skonfigurować nowy audyt.",

    pageTitle: "Raport zgodności z EAA - Konfiguracja audytu",
    headerSubtitle: "Konfiguracja audytu",
    h1: "Konfiguracja Audytu",

    incompleteForm:
      "Uzupełnij nazwę badanej aplikacji oraz wybierz co najmniej jedną klauzulę.",

    auditSavedDraft: "Zapisano konfigurację audytu jako wersję roboczą.",

    // UI strings
    saveConfig: "Zapisz konfigurację",
    productNameLabel: "Nazwa produktu / usługi",
    productNameHelper: "np. Portal Usług Publicznych 2.0",
    productDescLabel: "Opis / Wersja / URL",
    productDescHelper: "np. v1.2.4, https://example.com",
    auditorNameLabel: "Audytor / Organizacja",
    auditorNameHelper: "Imię i nazwisko lub nazwa firmy przeprowadzającej audyt",
    section1Title: "1. Przedmiot audytu",
    clausesHelper: "Zaznacz obszary, które podlegają ocenie.",

    // Edit & clause removal confirmation
    removeClausesTitle: "Usuwanie klauzul",
    removeClausesBody: "Usunięcie tej klauzuli spowoduje trwałą utratę odpowiedzi dla {count}. Nie będzie można ich przywrócić. Czy kontynuować?",
    removeClausesConfirm: "Usuń",
    removeClausesCancel: "Anuluj",
    removedClausesNotice: "Odpowiedzi zostały usunięte i nie można ich przywrócić.",
    
    testWordGenitiveSingular: "testu",
    testWordGenitivePlural: "testów",

    // Status messages
    editingConfig: "Edycja konfiguracji audytu.",
    loadedAudit: "Wczytano audyt z pliku.",
    testsInitialized: "Zainicjalizowano testy audytu.",

    // Profile selection messages
    profileNoneSelected: "Wybrano: Brak profilu / Wybór ręczny",
    profileNoneSelectedLive: "Wybrano: Brak profilu / Wybór ręczny. Wszystkie klauzule odznaczone.",
    profileSelected: "Wybrano profil: {profile}. Zaznaczono klauzule: {clauses}",
    profileSelectedLive: "Wybrano profil: {profile}. Powiązane klauzule: {clauses}",
    dataRestored: "Dane zostały przywrócone.",
    clauseRequiredUnselected: "Odznaczono klauzulę wymaganą przez profil. Profil ustawiony na ręczny.",
    clauseToggled: "Klauzula {clause} {action}",
    clausesChangedToManual: "Zmieniono klauzule w stosunku do profilu. Profil ustawiony na ręczny.",
    selectedClauses: "Wybrane klauzule: {clauses}",
    noSelectedClauses: "Brak wybranych klauzul",
    saveSuccess: "Konfiguracja zapisana pomyślnie.",

    profileTitle: "2. Profil produktu / usługi",
    profileIntro: "Wybierz profil, aby automatycznie zaznaczyć powiązane klauzule. Klauzule możesz też ustawić lub zmienić ręcznie w sekcji „Zakres audytu”.",
    sectionScopeTitle: "3. Zakres audytu (Klauzule)",
    clausesRequiredError: "Proszę wybrać przynajmniej jeden zakres audytu.",
    productNameRequiredError: "Proszę podać nazwę produktu."
  },


  /* ---------- Audyt / testy ---------- */
  audit: {
    auditLoaded: "Audyt wczytany.",
    clausesLoaded: "Wczytano klauzule audytu.",
    returnToEdit: "Powrót do edycji odpowiedzi.",
    testLoaded: "Wczytano test {testId}: {title}.",
    testResultSet:
      "Ustawiono wynik testu {testId}: {status}.",
    prevTestBase: "Poprzedni test",
    nextTestBase: "Następny test",
    gotoTest: "Przejdź do testu {testId}: {title}. Status: {status}.",
    prevButton: "Poprzedni",
    nextButton: "Następny",
    finishAuditButton: "Zakończ Audyt",
    evaluationLabel: "Ocena",
    notesLabel: "Uwagi / Obserwacje",
    autoCommentTitle: "Automatyczny komentarz",
    notesHeading: "Uwagi",
    evalLegend: "Ocena wyniku testu {testId}: {title}",

    pageTitle: "Raport zgodności z EAA - Audyt",
    headerSubtitle: "Audyt w toku",
    sidebarLabel: "Lista kontrolna",

    derivedResultInfo:
      "Wynik tego testu został wyliczony automatycznie.",

    derivedResultPending:
      "Wynik tego testu zostanie wyliczony po uzupełnieniu powiązanych testów.",

    autoNote:
      "Wynik wyliczony automatycznie na podstawie testów składowych.",

    noNotes: "Brak uwag.",

    saveProgressSuccess:
      "Zapisano postęp audytu i pobrano plik raportu.",

    progressLabel: "Postęp audytu"
  },

  /* ---------- Statusy testów ---------- */
  status: {
    pass: "Zaliczone",
    fail: "Niezaliczone",
    na: "Nie dotyczy",
    nt: "Nie do sprawdzenia",
    pending: "Do sprawdzenia"
  },

  /* ---------- Podsumowanie / werdykt ---------- */
  summary: {
    noAuditData:
      "Nie znaleziono danych audytu. Przejdź do strony startowej, aby skonfigurować i przeprowadzić nowy audyt.",

    pageTitle: "Raport zgodności z EAA - Podsumowanie",
    reportTitle: "Podsumowanie audytu",
    headerSubtitle: "Podsumowanie audytu",

    verdictFailed: "Niezaliczony",
    verdictPassed: "Zaliczony",
    verdictInProgress: "Niezakończony",
    verdictNoNonconformities: "Brak niezgodności",

    saveAsTitle: "Eksport raportu",
    newAuditButton: "Rozpocznij nowy audyt",

    executiveSummaryPlaceholder:
      "Wpisz syntetyczny komentarz podsumowujący wyniki audytu.",

    noDataTitle: "Brak danych audytu",
    notProvided: "Nie podano",
    auditLoadedStatus: "Wczytano audyt. Status: {status}.",
    verdictDescFailed: "Niespełnione wymagania: {failed}<br>Wymagania nieocenione: {verify}",
    verdictDescInProgress: "Do sprawdzenia: {count}",

    // Verdict status
    statusFailed: "Niezaliczony",
    statusInProgress: "Niezakończony",
    statusPassed: "Zaliczony",

    // Verdict descriptions
    verdictAllNA: "Wszystkie wymagania oznaczono jako <q>Nie dotyczy</q>.",
    verdictAllPassed: "Wszystkie wymagania zostały spełnione.",
    verdictPassedCount: "Spełnione wymagania: {count}",
    verdictNACount: "Oznaczone jako nie dotyczy: {count}",
    verdictNTCount: "Nietestowalne: {count}",
    noItemsInSection: "Brak elementów w tej sekcji."
  },

  /* ---------- Eksport ---------- */
  export: {
    saveReportSuccess:
      "Zapisano raport i pobrano plik.",

    exportJson: "Zapisz jako JSON",
    exportCsv: "Zapisz jako CSV",
    exportOdt: "Zapisz jako ODT"
  },

  /* ---------- Wczytywanie plików ---------- */
  fileLoad: {
    unknownFormat: "Nieznany format pliku.",
    invalidData: "Nieprawidłowa struktura danych audytu.",
    loadError:
      "Wystąpił błąd podczas wczytywania pliku audytu.",
    loadSuccess:
      "Plik audytu został poprawnie wczytany.",
    load: "Wybierz plik audytu"
  },

  /* Error namespace (mapped to fileLoad for compatibility) */
  error: {
    load: {
      unknownFormat: "Nieznany format pliku.",
      invalidData: "Nieprawidłowy format danych.",
      // Klucze kompatybilne z `fileLoad.*`
      load: "Wybierz plik audytu",
      loadSuccess: "Plik audytu został poprawnie wczytany.",
      loadError: "Wystąpił błąd podczas wczytywania pliku audytu.",
      generic: "Błąd podczas wczytywania pliku:"
    }
  },

  /* ---------- Pomoc / Jak korzystać z narzędzia ---------- */
  help: {
    title: "Jak korzystać z narzędzia?",
    intro: "Krótki przewodnik po najważniejszych funkcjach i dobrych praktykach — przeczytaj, aby szybko rozpocząć audyt.",
    privacyTitle: "Prywatność i bezpieczeństwo",
    privacyBody: "To narzędzie działa w Twojej przeglądarce i nie wysyła danych na serwer — wszystkie pliki i zasoby są przetwarzane lokalnie.",
    startTitle: "Zaczynamy / Nowy audyt",
    startBody: "Aby rozpocząć nowy audyt, kliknij 'Nowy audyt', skonfiguruj produkt i wybierz klauzule, które chcesz testować.",
    saveLoadTitle: "Wczytywanie i zapisywanie audytu",
    saveLoadBody: "Pamiętaj o częstym zapisywaniu postępów: naciśnij Ctrl+S (Cmd+S na macOS) lub kliknij ikonę dyskietki, aby pobrać plik JSON z postępami. Aby wczytać wcześniej zapisany audyt, użyj 'Wczytaj plik...'.",
    assessTitle: "Jak oceniać wymagania",
    assessBody: "Wybierz jedną z ocen: Zaliczone, Nie dotyczy, Nie do sprawdzenia, Niezaliczone. Dodaj notatki i dowody przy wynikach 'Niezaliczone'.",
    exportTitle: "Generowanie raportów i eksport",
    exportBody: "W podsumowaniu wygenerujesz raporty: ODT, CSV lub JSON (EARL). JSON jest zgodny ze standardem W3C.",
    howToCheckTitle: "Jak to sprawdzić",
    howToCheckBody: "W szczegółach każdego testu znajdziesz wskazówki, odwołania do kryteriów WCAG i praktyczne sugestie.",
    tipsTitle: "Wskazówki i dobre praktyki",
    tipsBody: "Zapisuj często, dodawaj notatki i zrzuty ekranu, oraz korzystaj z sekcji 'Jak to sprawdzić' przy każdym teście.",
    faqTitle: "Rozwiązywanie problemów (FAQ)",
    faqItems: {
      fileNotLoading: {
        label: "Plik się nie wczytuje:",
        body: "sprawdź, czy to poprawny plik JSON pobrany z narzędzia oraz czy rozszerzenie to .json."
      },
      missingAnswers: {
        label: "Nie widzę zapisanych odpowiedzi:",
        body: "upewnij się, że plik zapisu pochodzi z tego narzędzia i nie został zmodyfikowany."
      },
      unexpected: {
        label: "Błąd/nieoczekiwane zachowanie:",
        body: "odśwież stronę i wczytaj ponownie plik audytu; jeśli problem się powtarza, zapisz kopię i zgłoś problem."
      }
    },
    sourcesTitle: "Źródła i odnośniki",
    sourcesBody: "Przydatne źródła:",
    sourcesLinks: {
      wcagLabel: "WCAG",
      wcagUrl: "https://www.w3.org/Translations/WCAG21-pl/",
      en301Label: "EN 301 549",
      en301Url: "https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility",
      docsLabel: "Dokumentacja projektu",
      docsUrl: "README.md"
    }
  },

  /* ---------- Strona główna / UI ---------- */
  home: {
    skipLink: "Pomiń nawigację",
    headerTitle: "EAA-CR",
    headerSubtitle: "Raport zgodności z EAA",
    pageTitle: "Raport zgodności z EAA (EAA-CR)",
    newAudit: {
      title: "Nowy audyt",
      body: "Rozpocznij nową ocenę dostępności. Skonfiguruj produkt, wybierz klauzule i rozpocznij testowanie.",
      button: "Rozpocznij"
    },
    loadAudit: {
      title: "Wczytaj audyt",
      body: "Kontynuuj pracę nad wcześniej zapisanym audytem. Wczytaj plik JSON z postępem prac.",
      button: "Wczytaj plik..."
    }
  },

  /* ---------- Nowy audyt ---------- */
  reset: {
    newAuditTitle: "Nowy audyt",
    newAuditBody:
      "Rozpoczęcie nowego audytu spowoduje utratę niezapisanych danych.",
    confirmNo: "Anuluj",
    confirmYes: "Rozpocznij nowy audyt"
  },

  /* ---------- Profile produktów/usług (UI) ---------- */
  profile: {
    title: "Dostępne profile"
  }

};

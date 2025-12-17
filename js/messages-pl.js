/* =========================================================
   messages.pl.js
   Słownik komunikatów – język polski
   Aplikacja audytowa EN 301 549 / WCAG
   ========================================================= */

export const MESSAGES_PL = {

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
    home: "Strona główna",
    saveAudit: "Zapisz audyt",
    saveConfig: "Zapisz konfigurację",
    editConfig: "Edytuj konfigurację",
    editResponses: "Edytuj odpowiedzi",
    toggleTheme: "Przełącz motyw",
    backToTests: "Powrót do testów",

    returnToHomeTitle: "Powrót do strony startowej",
    returnToHomeBody:
      "Powrót do strony startowej spowoduje utratę niezapisanych danych."
  },


  /* ---------- Konfiguracja audytu ---------- */
  setup: {
    missingConfiguration:
      "Brak konfiguracji audytu. Nastąpi przekierowanie do strony startowej.",

    incompleteForm:
      "Uzupełnij nazwę badanej aplikacji oraz wybierz co najmniej jedną klauzulę.",

    auditSavedDraft: "Zapisano konfigurację audytu jako wersję roboczą.",

    // Edit & clause removal confirmation
    removeClausesTitle: "Usuwanie klauzul",
    removeClausesBody: "Usunięcie tej klauzuli spowoduje trwałą utratę odpowiedzi dla {count}. Nie będzie można ich przywrócić. Czy kontynuować?",
    removeClausesConfirm: "Usuń",
    removeClausesCancel: "Anuluj",
    removedClausesNotice: "Dane zostały trwale usunięte i nie można ich przywrócić." 
  },

  /* ---------- Audyt / testy ---------- */
  audit: {
    testResultSet:
      "Ustawiono wynik testu {testId}: {status}.",

    derivedResultInfo:
      "Wynik tego testu został wyliczony automatycznie.",

    derivedResultPending:
      "Wynik tego testu zostanie wyliczony po uzupełnieniu powiązanych testów.",

    autoNote:
      "Wynik wyliczony automatycznie na podstawie testów składowych.",

    noNotes: "Brak uwag.",

    saveProgressSuccess:
      "Zapisano postęp audytu i pobrano plik raportu."
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
      "Brak danych audytu. Nastąpi przekierowanie do strony startowej.",

    verdictFailed: "Niezaliczony",
    verdictPassed: "Zaliczony",
    verdictInProgress: "Niezakończony",
    verdictNoNonconformities: "Brak niezgodności",

    executiveSummaryPlaceholder:
      "Wpisz syntetyczny komentarz podsumowujący wyniki audytu."
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
      "Plik audytu został poprawnie wczytany."
  },

  /* ---------- Nowy audyt ---------- */
  reset: {
    newAuditTitle: "Nowy audyt",
    newAuditBody:
      "Rozpoczęcie nowego audytu spowoduje utratę niezapisanych danych.",
    confirmNo: "Anuluj",
    confirmYes: "Rozpocznij nowy audyt"
  }

};

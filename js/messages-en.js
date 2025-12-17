/* =========================================================
   messages-en.js
   Message dictionary – English
   Accessibility Audit Tool (EN 301 549 / WCAG)
   ========================================================= */

export const MESSAGES_EN = {

  /* ---------- General ---------- */
  app: {
    accessibilityAudit: "Accessibility audit",
    loadingData: "Loading data…"
  },

  /* ---------- Navigation ---------- */
  navigation: {
    unsavedChangesTitle: "Unsaved changes",
    unsavedChangesBody:
      "Some information has not been saved. Leaving this screen will result in data loss.",
    goToHomeQuestion: "Do you want to return to the start page?",
    confirmStay: "Stay",
    confirmLeave: "Leave screen",

    returnToHomeTitle: "Return to start page",
    returnToHomeBody:
      "Returning to the start page will result in loss of unsaved data."
    ,
    skipToContent: "Skip navigation",

    // Header / Navbar tooltips
    menu: "Menu",
    home: "Home",
    saveAudit: "Save audit",
    saveConfig: "Save configuration",
    editConfig: "Edit configuration",
    editResponses: "Edit responses",
    toggleTheme: "Toggle theme",
    themeModeHelp: "Light/dark mode",
    saveAuditHelp: "Save audit (save progress as a draft)",
    saveConfigHelp: "Save audit configuration as a draft",
    editConfigHelp: "Edit audit configuration",
    editResponsesHelp: "Edit audit responses",
    backToTestsHelp: "Back to tests (go to the tests page)",
    homeHelp: "Go to the home page",
    loadAuditHelp: "Load an audit file (JSON)" ,
    backToTests: "Back to tests"
  },

  /* ---------- Audit setup ---------- */
  setup: {
    missingConfiguration:
      "Audit configuration is missing. You will be redirected to the start page.",

    pageTitle: "EAA compliance report - Audit configuration",
    headerSubtitle: "Audit configuration",
    h1: "Audit configuration",

    incompleteForm:
      "Enter the product name and select at least one clause.",

    auditSavedDraft:
      "Audit configuration has been saved as a draft.",

    // UI strings
    saveConfig: "Save configuration",
    productNameLabel: "Product / System name",
    productNameHelper: "e.g. Public Services Portal 2.0",
    productDescLabel: "Description / Version / URL",
    productDescHelper: "e.g. v1.2.4, https://example.com",
    auditorNameLabel: "Auditor / Organisation",
    auditorNameHelper: "Full name or organisation name conducting the audit",
    sectionScopeTitle: "Audit scope (Clauses)",
    section1Title: "1. Product under audit",
    clausesHelper: "Select areas to audit.",

    // Edit & clause removal confirmation
    removeClausesTitle: "Remove clauses",
    removeClausesBody: "Removing this clause will permanently delete responses for {count} tests. They cannot be restored. Continue?",
    removeClausesConfirm: "Remove",
    removeClausesCancel: "Cancel",
    removedClausesNotice: "Data was permanently deleted and cannot be restored." 
  },

  /* ---------- Audit / tests ---------- */
  audit: {
    auditLoaded: "Audit loaded.",
    testResultSet:
      "Test result set for {testId}: {status}.",

    pageTitle: "EAA Compliance Report - Audit",
    headerSubtitle: "Audit in progress",
    sidebarLabel: "Checklist",

    derivedResultInfo:
      "This test result has been calculated automatically.",

    derivedResultPending:
      "This test result will be calculated after related tests are completed.",

    autoNote:
      "Result calculated automatically based on related tests.",

    noNotes: "No notes.",

    saveProgressSuccess:
      "Audit progress has been saved and the report file downloaded.",

    progressLabel: "Audit progress"
  },

  /* ---------- Test statuses ---------- */
  status: {
    pass: "Passed",
    fail: "Failed",
    na: "Not applicable",
    nt: "Not testable",
    pending: "To be verified"
  },

  /* ---------- Summary / verdict ---------- */
  summary: {
    noAuditData:
      "No audit data available. You will be redirected to the start page.",

    pageTitle: "EAA compliance report - Summary",
    reportTitle: "Final report",
    headerSubtitle: "Audit outcome",

    verdictFailed: "Failed",
    verdictPassed: "Passed",
    verdictInProgress: "In progress",
    verdictNoNonconformities: "No nonconformities",

    saveAsTitle: "Save report as:",
    newAuditButton: "Start new audit",

    executiveSummaryPlaceholder:
      "Enter a concise executive summary of the audit results."
  },

  /* ---------- Export ---------- */
  export: {
    saveReportSuccess:
      "The report has been saved and downloaded.",

    exportJson: "Save as JSON",
    exportCsv: "Save as CSV",
    exportOdt: "Save as ODT"
  },

  /* ---------- File loading ---------- */
  fileLoad: {
    unknownFormat: "Unknown file format.",
    invalidData: "Invalid audit data structure.",
    loadError:
      "An error occurred while loading the audit file.",
    loadSuccess:
      "The audit file has been loaded successfully.",
    load: "Choose audit file"
  },

  /* Error namespace (mapped to fileLoad for compatibility) */
  error: {
    load: {
      unknownFormat: "Unknown file format.",
      invalidData: "Invalid data format.",
      // Backwards-compatible keys mirroring `fileLoad.*`
      load: "Choose audit file",
      loadSuccess: "The audit file has been loaded successfully.",
      loadError: "An error occurred while loading the audit file.",
      generic: "An error occurred while loading the file:"
    }
  },

  /* ---------- Help / How to use the tool ---------- */
  help: {
    title: "How to use the tool",
    intro: "A short guide to the main features and recommended practices — read to quickly start an audit.",
    privacyTitle: "Privacy and security",
    privacyBody: "This tool runs in your browser and does not send data to any server — files and resources are processed locally.",
    startTitle: "Getting started / New audit",
    startBody: "To start a new audit, click 'New audit', configure the product and select clauses to test.",
    saveLoadTitle: "Loading and saving audits",
    saveLoadBody: "Remember to save frequently: press Ctrl+S (Cmd+S on macOS) or click the floppy icon to download the JSON file with progress. To load a saved audit, use 'Load file...'.",
    assessTitle: "How to assess requirements",
    assessBody: "Choose one of the statuses: Pass, Not applicable, Cannot test, Fail. Add notes and evidence for 'Fail' results.",
    exportTitle: "Generating reports and export",
    exportBody: "In Summary you can generate reports: ODT, CSV or JSON (EARL). JSON is compatible with W3C EARL format.",
    howToCheckTitle: "How to check",
    howToCheckBody: "Each test includes instructions, WCAG references and practical suggestions — use them as a starting point for manual testing.",
    tipsTitle: "Tips and best practices",
    tipsBody: "Save often, add notes and screenshots, and use the 'How to check' section for each test.",
    faqTitle: "Troubleshooting (FAQ)",
    faqItems: {
      fileNotLoading: {
        label: "File not loading:",
        body: "verify the file is a JSON exported by this tool and that it has the .json extension."
      },
      missingAnswers: {
        label: "Missing saved answers:",
        body: "ensure the file came from this tool and has not been modified."
      },
      unexpected: {
        label: "Unexpected error or behaviour:",
        body: "refresh the page and reload the audit file; if it persists, save a copy and report the issue."
      }
    },
    sourcesTitle: "Sources and references",
    sourcesBody: "Useful sources:",
    sourcesLinks: {
      wcagLabel: "WCAG",
      wcagUrl: "https://www.w3.org/TR/WCAG21/",
      en301Label: "EN 301 549",
      en301Url: "https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility",
      docsLabel: "Project documentation",
      docsUrl: "README.md"
    }
  },

  /* ---------- Home / UI ---------- */
  home: {
    skipLink: "Skip navigation",
    headerTitle: "EAA-CR",
    headerSubtitle: "Reporting tool",
    pageTitle: "EAA compliance report (EAA-CR)",
    newAudit: {
      title: "New audit",
      body: "Start a new accessibility assessment. Configure the product, select clauses and begin testing.",
      button: "Start"
    },
    loadAudit: {
      title: "Load audit",
      body: "Continue work on a previously saved audit. Load the JSON file containing progress.",
      button: "Load file..."
    }
  },

  /* ---------- New audit ---------- */
  reset: {
    newAuditTitle: "New audit",
    newAuditBody:
      "Starting a new audit will result in loss of unsaved data.",
    confirmNo: "Cancel",
    confirmYes: "Start new audit"
  }

};

/* =========================================================
   messages.en.js
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
    skipToContent: "Skip navigation"
  },

  /* ---------- Audit setup ---------- */
  setup: {
    missingConfiguration:
      "Audit configuration is missing. You will be redirected to the start page.",

    incompleteForm:
      "Enter the product name and select at least one clause.",

    auditSavedDraft:
      "Audit configuration has been saved as a draft."
  },

  /* ---------- Audit / tests ---------- */
  audit: {
    testResultSet:
      "Test result set for {testId}: {status}.",

    derivedResultInfo:
      "This test result has been calculated automatically.",

    derivedResultPending:
      "This test result will be calculated after related tests are completed.",

    autoNote:
      "Result calculated automatically based on related tests.",

    noNotes: "No notes.",

    saveProgressSuccess:
      "Audit progress has been saved and the report file downloaded."
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

    verdictFailed: "Failed",
    verdictPassed: "Passed",
    verdictInProgress: "In progress",
    verdictNoNonconformities: "No nonconformities",

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
      "The audit file has been loaded successfully."
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

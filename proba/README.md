# Audyt EAA — repo (local)

This project is a static HTML/JS based tool for auditing compliance with EN 301 549.

What I changed in this update:

- Added a JSON-based clause format. Example: `clauses/c5.json` now contains a structured representation for the clause.
- Modernized `js/main.js`: it now attempts to fetch `clauses/<clause>.json` only and will not fall back to `clauses/<clause>.html`.
- Added localStorage autosave: users can `Zapisz lokalnie`, `Wczytaj zapis lokalny` and `Usuń lokalny zapis` via the UI.
  * The app autosaves changes when a radio button or textarea is modified.
- Updated the `service-worker.js` to cache JSON clause files and switch to cache-first with dynamic caching for fetched assets.
- Added `scripts/convert_clauses.js`: a Node script that converts `clauses/*.html` files to `clauses/*.json` using the existing `<section>` content as `html` in the JSON.

The canonical source of structured JSON is the Annex C PDF. Use the Python parser to regenerate canonical `clauses/*.json` files from the normative PDF.

How to regenerate `clauses/*.json` from the Annex C PDF (canonical flow):
- Ensure Python3 + a virtual environment with PyMuPDF is set up.
- In PowerShell (from the repository root):

```powershell
# regenerate from the official EN 301 549 PDF and validate
C:/Users/marci/OneDrive/Documents/EAA/.venv/Scripts/python.exe .\scripts\convert_pdf_annexC_to_json.py
C:/Users/marci/OneDrive/Documents/EAA/.venv/Scripts/python.exe .\scripts\validate_clauses_json.py
```

Or run one wrapper command that regenerates and validates the results:

```powershell
.\scripts\regenerate_clauses.ps1
```

NOTE: Node-based converter `scripts/convert_clauses_structured.js` exists only as a legacy migration helper. The project no longer uses Node-based conversion for app runtime. If you don't need the legacy HTML files, you may remove `scripts/convert_clauses_structured.js` and `scripts/convert_clauses.js`.

How the new flow works:
- The app always fetches `clauses/<clause>.json` and renders from structured nodes.
If a JSON file is missing, the UI will show a missing JSON message instead of falling back to HTML.
- After fetching and rendering, test result radios and notes are observed; changes are saved to localStorage.
- The service worker caches the JSON files and other assets for offline use.

Next steps (recommended):
- Convert rest of `clauses/*.html` to `clauses/*.json` using the convert script.
- Decide whether to remove the old HTML clause files and rely solely on JSON.
- Consider extracting a structured data format instead of storing raw HTML in JSON (for i18n and easier templating).
- Optionally move to bundler (Vite) for more advanced development features.

If you'd like, I can:
- Convert all clauses to JSON using the script and check everything.
- Replace HTML fallback entirely with JSON rendering using a structured representation (then we should migrate HTML to structured fields like `title`, `steps`, `notes`).
- Improve `service-worker` to cache `jszip` and other remote assets for full offline install.

Developer instructions: structured JSON and testing
1. Install Node.js and dependencies in the project root:

```powershell
npm install
```

2. Regenerate canonical structured JSON from the normative PDF (recommended):

```powershell
# parse the PDF and generate clauses/*.json
C:/Users/marci/OneDrive/Documents/EAA/.venv/Scripts/python.exe .\scripts\convert_pdf_annexC_to_json.py
```

3. Run unit tests (requires Node installed):

```powershell
npm test
```

4. For offline ODT exports, put a full `jszip.min.js` build in `js/vendor/jszip.min.js`, or ensure CDN fallback is available.
5. The PDF parser is the canonical path: re-run it to rebuild clauses from the normative EN 301 549 Annex C and validate using the included validator.

```powershell
C:/Users/marci/OneDrive/Documents/EAA/.venv/Scripts/python.exe .\scripts\convert_pdf_annexC_to_json.py
C:/Users/marci/OneDrive/Documents/EAA/.venv/Scripts/python.exe .\scripts\validate_clauses_json.py
```

Manual review may still be required: the parser uses heuristics and can occasionally need small edits for clarity or translations.



What do you want me to do next? (e.g., convert all clauses, migrate content to structured JSON, or just continue with localStorage & PWA improvements.)

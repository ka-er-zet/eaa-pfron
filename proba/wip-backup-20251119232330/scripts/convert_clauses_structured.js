/*
 Node script to convert clause HTML files to structured JSON.
 Requires: npm install jsdom

 Usage (PowerShell):
   node .\scripts\convert_clauses_structured.js

 NOTE: This script is provided as a helper for legacy HTML -> JSON conversions.
 The canonical source of truth is the Annex C PDF; prefer using
 `scripts/convert_pdf_annexC_to_json.py` which parses the normative PDF and
 generates the structured JSON files. Use this Node converter only for cases
 where the HTML has special UI cues (like `input` radio `name`) you want
 to preserve; otherwise prefer the PDF-driven JSON.

 The output JSON format is simplified and structured to make rendering and translation easier:
 {
   id: "c9",
   title: "Audyt Klauzuli 9...",
   nodes: [
     { type: 'heading', level: 2, text: 'Audyt Klauzuli 9...'},
     { type: 'test', id: 'res-c9-1-1-1', title: 'Treści nietekstowe', level: 'A', assessmentType: 'inspection', preconditions: ['...'], procedure: ['...']}
   ]
 }

 This script attempts to find each <section> and extract headings and audit-item entries.
 It produces reasonably-structured JSON so the renderer can build DOM elements programatically.
*/
// DEPRECATED.
// This Node-based HTML -> JSON conversion helper was used for legacy content migration.
// It is not part of the runtime that the app uses; the app now loads structured JSON only
// (generated from the Annex C canonical PDF). Keep this script for one-off migrations only.
// node .\scripts\convert_clauses_structured.js

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const clausesDir = path.join(__dirname, '..', 'clauses');

if (!fs.existsSync(clausesDir)) {
  console.error('Clauses directory not found:', clausesDir);
  process.exit(1);
}

const files = fs.readdirSync(clausesDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filepath = path.join(clausesDir, file);
  const html = fs.readFileSync(filepath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const section = doc.querySelector('section');
  if (!section) {
    console.warn('No <section> found in', file);
    return;
  }

  const title = section.querySelector('h2') ? section.querySelector('h2').textContent.trim() : '';
  const nodes = [];

  // Walk children and classify headings and audit-item blocks (improved)
  let testIndex = 0;
  section.childNodes.forEach(node => {
    if (node.nodeType !== 1) return; // ELEMENT_NODE only
    const tagName = node.tagName.toLowerCase();
    if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
      nodes.push({ type: 'heading', level: parseInt(tagName.replace('h',''), 10), text: node.textContent.trim() });
      return;
    }

    if (node.classList && node.classList.contains('audit-item')) {
      // If this is an informative block (no user test), store as info
      if (node.classList.contains('informative')) {
        const text = node.textContent.trim();
        nodes.push({ type: 'info', text: text, html: node.innerHTML });
        return;
      }

      // parse audit-item into a structured test node
      const testDetails = node.querySelector('.test-details');
      // title extraction: prefer legend, otherwise headings inside the audit-item
      const testTitleEl = node.querySelector('fieldset legend') || node.querySelector('h4') || node.querySelector('h5') || node.querySelector('h6');
      const testTitle = testTitleEl ? testTitleEl.textContent.trim() : '';

      // input-based id (radio name) is the most stable against translation
      const inputEl = node.querySelector('input[type="radio"]');
      const inputName = inputEl ? inputEl.name : null;
      const id = inputName || `${section.id || file.replace('.html','')}-test-${testIndex++}`;

      // level/priority label (A/AA/AAA) if present
      const levelSpan = node.querySelector('.poziom');
      const levelText = levelSpan ? levelSpan.textContent.trim() : '';

      // Parse fields more robustly, looking for strong labels and corresponding content
      let assessmentType = 'Inspection';
      const preconditions = [];
      const procedure = [];
      const results = [];
      const freeTextParts = [];

      if (testDetails) {
        const paragraphs = Array.from(testDetails.querySelectorAll('p'));
        paragraphs.forEach(p => {
          const strong = p.querySelector('strong');
          const key = strong ? strong.textContent.trim().toLowerCase() : null;
          const rest = strong ? p.textContent.replace(strong.textContent, '').trim() : p.textContent.trim();
          if (key && (key.includes('typ oceny') || key.includes('type of assessment'))) {
            assessmentType = rest || assessmentType;
          } else if (key && (key.includes('warunki') || key.includes('pre-condition') || key.includes('pre-conditions'))) {
            // The actual preconditions are often in the following <ol>
            const nextOl = p.nextElementSibling && p.nextElementSibling.tagName.toLowerCase() === 'ol' ? p.nextElementSibling : null;
            if (nextOl) {
              nextOl.querySelectorAll('li').forEach(li => preconditions.push(li.textContent.trim()));
            }
          } else if (key && (key.includes('procedura') || key.includes('procedure'))) {
            const nextOl = p.nextElementSibling && p.nextElementSibling.tagName.toLowerCase() === 'ol' ? p.nextElementSibling : null;
            if (nextOl) {
              nextOl.querySelectorAll('li').forEach(li => procedure.push(li.textContent.trim()));
            }
          } else if (key && (key.includes('wynik') || key.includes('result'))) {
            // results may follow as paragraphs or lists
            const nextOl = p.nextElementSibling && p.nextElementSibling.tagName.toLowerCase() === 'ol' ? p.nextElementSibling : null;
            if (nextOl) {
              nextOl.querySelectorAll('li').forEach(li => results.push(li.textContent.trim()));
            } else if (rest) {
              results.push(rest);
            }
          } else {
            // not labeled; keep it as free text for the test
            if (p.textContent && p.textContent.trim()) freeTextParts.push(p.textContent.trim());
          }
        });

        // If there were no labeled ols, fallback to the order of any <ol>
        if (!preconditions.length || !procedure.length) {
          const ols = testDetails.querySelectorAll('ol');
          if (ols.length > 0 && !preconditions.length) {
            ols[0].querySelectorAll('li').forEach(li => preconditions.push(li.textContent.trim()));
          }
          if (ols.length > 1 && !procedure.length) {
            ols[1].querySelectorAll('li').forEach(li => procedure.push(li.textContent.trim()));
          }
        }
      }

      // Fieldset: results radio values and the legend text can provide a title
      const fieldset = node.querySelector('fieldset');
      if (fieldset) {
        const radios = Array.from(fieldset.querySelectorAll('input[type="radio"]'));
        if (radios.length) {
          radios.forEach(r => results.push(r.value));
        }
      }

      const testNode = {
        type: 'test',
        id,
        title: testTitle,
        level: levelText,
        assessmentType: assessmentType,
        preconditions,
        procedure,
        results: results,
        text: freeTextParts.join('\n'),
        html: node.innerHTML
      };
      nodes.push(testNode);
      return;
    }

    // Keep other elements as info nodes with raw HTML
    nodes.push({ type: 'info', text: node.textContent.trim(), html: node.innerHTML });
  });

  const outJson = {
    id: (section.id && section.id.replace('audit-', '')) || file.replace('.html', ''),
    title: title,
    nodes
  };

  const outPath = path.join(clausesDir, `${outJson.id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(outJson, null, 2), 'utf8');
  console.log('Wygenerowano', outPath);
});

console.log('Konwersja strukturalna zakończona.');

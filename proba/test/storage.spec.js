const { expect } = require('chai');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('localStorage save/load migration', () => {
  it('should migrate legacy storage object without version into versioned wrapper and restore selections', async () => {
    // Load clausesRenderer and main.js into a JSDOM environment
    const mainScript = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');
    const rendererScript = fs.readFileSync(path.join(__dirname, '..', 'js', 'clausesRenderer.js'), 'utf8');

    // Create a minimal index HTML so main.js finds expected DOM elements
    const html = `<!doctype html><html><body>
      <form id="selection-form">
        <label><input type="checkbox" name="clause" value="c5"> c5</label>
        <label><input type="checkbox" name="clause" value="c9"> c9</label>
        <button id="generate-btn">Gen</button>
      </form>
      <div id="audit-container"></div>
      <div id="export-options"></div>
    </body></html>`;

    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost' });
    // Evaluate renderer first
    dom.window.eval(rendererScript);
    // Provide a simple fetch polyfill that returns minimal JSON for clause JSON requests
    dom.window.fetch = (url) => {
      const name = url.split('/').pop().replace('.json', '');
      // Return a minimal structured JSON for the clause
      const payload = { title: 'Clause ' + name.toUpperCase(), nodes: [ { type: 'heading', level: 2, text: 'Clause ' + name.toUpperCase() } ] };
      return Promise.resolve({ ok: true, json: async () => payload });
    };
    // Evaluate main script in that context and trigger DOMContentLoaded so the script initializes
    dom.window.eval(mainScript);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    // Prepare a legacy payload (without version) to test migration
    const legacyPayload = { report: { clauses: [{ title: 'c5', result: 'pass', notes: 'ok' }] }, selectedClauses: ['c5'] };
    dom.window.localStorage.setItem('eaa_audit_save_v1', JSON.stringify(legacyPayload));

    // Call load
    const loaded = await dom.window.loadAuditFromLocalStorage();
    expect(loaded).to.exist;
    // Should now be stored under new key 'eaa_audit_save'
    const newRaw = dom.window.localStorage.getItem('eaa_audit_save');
    expect(newRaw).to.exist;
    const parsed = JSON.parse(newRaw);
    expect(parsed.version).to.equal(2);
    expect(parsed.payload.selectedClauses).to.include('c5');
    // Checkbox c5 should be selected
    const cb = dom.window.document.querySelector('input[value="c5"]');
    expect(cb.checked).to.be.true;
  });
});

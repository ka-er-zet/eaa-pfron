/*
 Simple DOM renderer for structured clause JSON.
 The renderer exports a single function: renderClause(container, clauseJSON, options)
 JSON-only: no raw HTML fallback is used by this renderer.
*/

(function () {
  'use strict';

  function createEl(tag, attrs, text) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) el.setAttribute(k, attrs[k]);
    }
    if (text) el.textContent = text;
    return el;
  }

  function renderHeading(container, node) {
    const el = createEl('h' + node.level, null, node.text);
    container.appendChild(el);
  }

  function renderTest(container, node) {
    const wrapper = createEl('div', { class: 'audit-item' });

    // Add test heading using node level when provided (clamp to 3..6), otherwise H3
    const testLevel = (node.level && node.level >= 3 && node.level <= 6) ? node.level : 3;
    const testTitle = createEl('h' + testLevel, null, node.title || 'Test');
    wrapper.appendChild(testTitle);

    // Test description
    if (node.text) {
      const desc = createEl('p', { class: 'test-desc' }, node.text);
      wrapper.appendChild(desc);
    }
    // Test details container
    const testDetails = createEl('div', { class: 'test-details' });
    const typeP = createEl('p');
    // Localized/clean assessment type label
    const assessmentMap = { 'Inspection': 'Inspekcja', 'Testing': 'Badanie' };
    let assessmentLabel = assessmentMap[node.assessmentType] || node.assessmentType || 'Inspection';
    typeP.innerHTML = `<strong>Typ oceny:</strong> ${assessmentLabel}`;
    testDetails.appendChild(typeP);

    if (node.preconditions && node.preconditions.length) {
      const ol = createEl('ol');
      node.preconditions.forEach(p => {
        const li = createEl('li', null, p);
        ol.appendChild(li);
      });
      testDetails.appendChild(createEl('p', null, 'Warunki wstępne:'));
      testDetails.appendChild(ol);
    }

    if (node.procedure && node.procedure.length) {
      const ol = createEl('ol');
      node.procedure.forEach(p => {
        const li = createEl('li', null, p);
        ol.appendChild(li);
      });
      testDetails.appendChild(createEl('p', null, 'Procedura:'));
      testDetails.appendChild(ol);
    }
    // If no preconditions/procedure/results/text, mark as informative for styling
    if ((!node.preconditions || node.preconditions.length === 0) && (!node.procedure || node.procedure.length === 0) && (!node.results || node.results.length === 0) && (!node.text || node.text.trim().length === 0)) {
      wrapper.classList.add('informative');
    }
    // If it's informative, change the assessment label to a translated 'Informacyjna'
    if (wrapper.classList.contains('informative')) {
      typeP.innerHTML = `<strong>Typ oceny:</strong> Informacyjna`;
    }

    wrapper.appendChild(testDetails);

    // user-facing inputs (radio group, notes)
    const fieldset = createEl('fieldset', { class: 'test-result-user' });
    fieldset.appendChild(createEl('legend', null, (node.title || 'Test')));
    // Render result choices based on node.results if provided, otherwise fall back to pass/fail/na
    const resultMapping = { 'pass': 'Zaliczone', 'fail': 'Niezaliczone', 'na': 'Nie dotyczy', 'not applicable': 'Nie dotyczy' };
    const radioGroup = node.id || 'res-' + Math.random().toString(36).slice(2);
    if (node.results && node.results.length) {
      node.results.forEach((r, idx) => {
        const type = (r.type || '').toLowerCase();
        let value = 'other-' + idx;
        if (type.indexOf('pass') !== -1) value = 'pass';
        if (type.indexOf('fail') !== -1) value = 'fail';
        if (type.indexOf('not') !== -1 || type.indexOf('not applicable') !== -1 || type.indexOf('not applicable') !== -1) value = 'na';
        const div = createEl('div');
        const label = createEl('label');
        const input = createEl('input', { type: 'radio', name: radioGroup, value: value });
        label.appendChild(input);
        label.appendChild(document.createTextNode(' '));
        // If the node provides a label like 'Pass: Check 2 is true', try to clean it
        let labelText = r.label || r.type || (value === 'pass' ? 'Pass' : value === 'fail' ? 'Fail' : 'Nie dotyczy');
        labelText = labelText.replace(/^Pass:\s*/i, '').replace(/^Fail:\s*/i, '').replace(/^Not applicable:\s*/i, '');
        const strong = createEl('strong', null, resultMapping[value] || (r.type || 'Wynik'));
        label.appendChild(strong);
        label.appendChild(document.createTextNode(' ' + labelText));
        div.appendChild(label);
        fieldset.appendChild(div);
      });
    } else {
      const names = ['pass', 'fail', 'na'];
      names.forEach(name => {
        const div = createEl('div');
        const label = createEl('label');
        const input = createEl('input', { type: 'radio', name: radioGroup, value: name });
        label.appendChild(input);
        label.appendChild(document.createTextNode(' '));
        label.appendChild(createEl('strong', null, name === 'pass' ? 'Zaliczone:' : name === 'fail' ? 'Niezaliczone:' : 'Nie dotyczy:'));
        label.appendChild(document.createTextNode(' ' + (name === 'pass' ? 'Spełnione' : name === 'fail' ? 'Nie spełnione' : 'Nie dotyczy')));
        div.appendChild(label);
        fieldset.appendChild(div);
      });
    }
    const notes = createEl('div', { class: 'test-notes' });
    const notesLabel = createEl('label', { for: 'notes-' + (node.id || Math.random().toString(36).slice(2)) }, 'Uwagi:');
    const textarea = createEl('textarea', { id: 'notes-' + (node.id || Math.random().toString(36).slice(2)) });
    notes.appendChild(notesLabel);
    notes.appendChild(textarea);
    fieldset.appendChild(notes);

    wrapper.appendChild(fieldset);
    container.appendChild(wrapper);
  }

  function renderClause(container, clauseJSON, options) {
    options = options || {};
    // JSON-only renderer: ignore any `html` field and only render structured nodes

    container.innerHTML = '';
    if (!clauseJSON || !clauseJSON.nodes) return;
    clauseJSON.nodes.forEach(node => {
      if (node.type === 'heading') {
        renderHeading(container, node);
      } else if (node.type === 'test') {
        renderTest(container, node);
      }
    });
  }

  // Expose on window for now
  window.clausesRenderer = {
    renderClause
  };

})();

const { expect } = require('chai');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('clausesRenderer.renderClause', () => {
  it('should render structured JSON nodes into DOM', async () => {
    const rendererScript = fs.readFileSync(path.join(__dirname, '..', 'js', 'clausesRenderer.js'), 'utf8');
    const dom = new JSDOM('<!doctype html><html><body><div id="container"></div></body></html>', { runScripts: 'outside-only' });
    // evaluate the script in the Window
    dom.window.eval(rendererScript);

    const container = dom.window.document.getElementById('container');
    const clauseJson = {
      title: 'Test Clause',
      nodes: [
        { type: 'heading', level: 2, text: 'Test Clause' },
        { type: 'test', id: 'res-t1', title: 'Test check', level: 'A', assessmentType: 'Inspection', preconditions: ['p1'], procedure: ['step1'] }
      ]
    };

    expect(dom.window.clausesRenderer).to.exist;
    dom.window.clausesRenderer.renderClause(container, clauseJson);

    const h2 = container.querySelector('h2');
    expect(h2).to.exist;
    expect(h2.textContent).to.equal('Test Clause');

    const auditItem = container.querySelector('.audit-item');
    expect(auditItem).to.exist;
    const legend = auditItem.querySelector('fieldset.test-result-user legend');
    expect(legend).to.exist;
    // legend uses node.title
    expect(legend.textContent).to.equal('Test check');
  });
});

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // State Management
    const state = {
        product: '',
        tests: [], // Flattened list of all tests from selected clauses
        results: {}, // Key: testId, Value: { status: null, note: '' }
        currentIdx: 0
    };

    // --- Setup View Logic ---

    window.toggleScope = function (el, clauseId) {
        el.classList.toggle('checked');
        const icon = el.querySelector('i');
        if (el.classList.contains('checked')) {
            icon.classList.add('text-primary');
            icon.style.color = 'var(--primary)';
        } else {
            icon.classList.remove('text-primary');
            icon.style.color = 'var(--muted-color)';
        }
    };

    const startBtn = document.getElementById('start-audit-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startAudit);
    }

    async function startAudit() {
        const nameInput = document.getElementById('product-name');
        const name = nameInput.value.trim();
        if (!name) {
            alert("Proszę podać nazwę produktu.");
            return;
        }
        state.product = name;

        const selectedCards = document.querySelectorAll('.scope-card.checked');
        if (selectedCards.length === 0) {
            alert("Proszę wybrać przynajmniej jeden zakres audytu.");
            return;
        }

        const clausesToLoad = Array.from(selectedCards).map(card => card.dataset.clause);

        // Show loading state?
        startBtn.textContent = "Ładowanie...";
        startBtn.disabled = true;

        try {
            await loadClauses(clausesToLoad);

            // Switch View
            document.getElementById('view-setup').classList.add('hidden');
            document.getElementById('view-audit').classList.remove('hidden');
            document.getElementById('active-badge').classList.remove('hidden');
            document.getElementById('app-layout').classList.add('with-sidebar');

            renderNav();
            renderTest(0);
        } catch (error) {
            console.error("Failed to load clauses:", error);
            alert("Wystąpił błąd podczas ładowania danych audytu.");
            startBtn.textContent = "Rozpocznij Audyt";
            startBtn.disabled = false;
        }
    }

    async function loadClauses(clauses) {
        state.tests = [];
        state.results = {};

        for (const clauseId of clauses) {
            const response = await fetch(`clauses_json/${clauseId}.json`);
            if (!response.ok) throw new Error(`Failed to load ${clauseId}`);
            const data = await response.json();

            // Flatten content to find tests
            processClauseContent(data.content, clauseId);
        }
    }

    function processClauseContent(content, clauseId) {
        let currentHeading = null;
        let testCounter = 0;

        content.forEach(item => {
            if (item.type === 'heading') {
                currentHeading = item;
            } else if (item.type === 'test') {
                testCounter++;
                // Generate a unique ID for the test
                // Try to use the heading text as ID if it looks like a clause number, otherwise generate one
                let testId = `test-${clauseId}-${state.tests.length}`;
                let title = "Test";
                let wcag = "";

                if (currentHeading) {
                    // Extract C.x.x.x from heading text
                    const match = currentHeading.text.match(/(C\.\d+(\.\d+)+(\.[a-z])?)/);
                    if (match) {
                        testId = match[1];
                        if (testCounter > 1) {
                            testId += `#${testCounter}`;
                        }
                        title = currentHeading.text; // Full text including number
                    } else {
                        title = currentHeading.text;
                    }

                    if (currentHeading.wcag_level) {
                        wcag = currentHeading.wcag_level;
                    }
                }

                const testItem = {
                    id: testId,
                    clauseId: clauseId,
                    title: title,
                    wcag: wcag,
                    preconditions: item.preconditions || [],
                    procedure: item.procedure || [],
                    form: item.form,
                    notes: item.notes || []
                };

                state.tests.push(testItem);
                state.results[testId] = { status: null, note: '' };
            }
        });
    }

    // --- Navigation & Rendering ---

    function renderNav() {
        const container = document.getElementById('nav-container');
        container.innerHTML = '';
        let completed = 0;

        state.tests.forEach((item, idx) => {
            const res = state.results[item.id].status;
            const active = idx === state.currentIdx;
            if (res) completed++;

            let icon = 'circle';
            let color = 'var(--muted-color)';

            if (res === 'pass') { icon = 'check-circle-2'; color = 'var(--pass-color)'; }
            if (res === 'fail') { icon = 'x-circle'; color = 'var(--fail-color)'; }
            if (res === 'na') { icon = 'minus-circle'; color = 'var(--na-color)'; }
            if (res === 'nt') { icon = 'help-circle'; color = 'var(--nt-color)'; }

            const div = document.createElement('div');
            div.className = `nav-item ${active ? 'active' : ''}`;
            div.onclick = () => renderTest(idx);
            div.innerHTML = `
                <i data-lucide="${icon}" style="color: ${color}; width: 18px;"></i>
                <div style="line-height: 1.2; overflow: hidden;">
                    <span style="font-family: monospace; font-size: 0.75rem; opacity: 0.7;">${item.id}</span>
                    <div style="font-size: 0.85rem; font-weight: 500; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${item.title}</div>
                </div>
            `;
            container.appendChild(div);
        });

        // Update Progress
        document.getElementById('progress-text').innerText = `${completed}/${state.tests.length}`;
        document.getElementById('main-progress').value = state.tests.length ? (completed / state.tests.length) * 100 : 0;

        lucide.createIcons();

        // Scroll active item into view
        const activeItem = container.querySelector('.nav-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    window.renderTest = function (idx) {
        if (idx < 0 || idx >= state.tests.length) return;

        state.currentIdx = idx;
        const item = state.tests[idx];
        const res = state.results[item.id];
        renderNav();

        const container = document.getElementById('test-renderer');

        let preconditionsHtml = '';
        if (item.preconditions && item.preconditions.length > 0) {
            preconditionsHtml = `<div class="test-details"><strong>Warunki wstępne:</strong><ul>${item.preconditions.map(p => `<li>${p}</li>`).join('')}</ul></div>`;
        }

        let procedureHtml = '';
        if (item.procedure && item.procedure.length > 0) {
            procedureHtml = `<div class="test-details"><strong>Procedura:</strong><ol>${item.procedure.map(p => `<li>${p}</li>`).join('')}</ol></div>`;
        }

        let notesHtml = '';
        if (item.notes && item.notes.length > 0) {
            notesHtml = `<div class="informative" style="margin-top: 1rem;"><strong>UWAGA:</strong><ul>${item.notes.map(n => `<li>${n}</li>`).join('')}</ul></div>`;
        }

        let wcagBadge = '';
        if (item.wcag) {
            const levelClass = item.wcag === 'AA' ? 'poziom-aa' : 'poziom-a';
            wcagBadge = `<span class="${levelClass}">Poziom ${item.wcag}</span>`;
        }

        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;">
                    <span class="badge" style="background: var(--primary);">${item.id}</span>
                    ${wcagBadge}
                </div>
                <h2 style="margin: 0; color: white;">${item.title}</h2>
            </div>

            <article style="border-left: 4px solid var(--primary);">
                <div style="padding: 1.5rem;">
                    ${preconditionsHtml}
                    ${procedureHtml}
                    ${notesHtml}
                </div>
            </article>

            <h5 style="margin-top: 2rem; padding-bottom: 0.5rem; border-bottom: 1px solid #334155; color: var(--muted-color);">Ocena</h5>

            <div class="eval-grid">
                <div class="eval-btn pass ${res.status === 'pass' ? 'selected' : ''}" onclick="setResult('${item.id}', 'pass')">
                    <i data-lucide="check" size="28"></i>
                    <strong>Zaliczone</strong>
                </div>
                <div class="eval-btn fail ${res.status === 'fail' ? 'selected' : ''}" onclick="setResult('${item.id}', 'fail')">
                    <i data-lucide="x" size="28"></i>
                    <strong>Niezaliczone</strong>
                </div>
                <div class="eval-btn na ${res.status === 'na' ? 'selected' : ''}" onclick="setResult('${item.id}', 'na')">
                    <i data-lucide="minus" size="28"></i>
                    <strong>Nie dotyczy</strong>
                </div>
                <div class="eval-btn nt ${res.status === 'nt' ? 'selected' : ''}" onclick="setResult('${item.id}', 'nt')">
                    <i data-lucide="help-circle" size="28"></i>
                    <strong>Nietestowalne</strong>
                </div>
            </div>

            <div style="margin-top: 2rem;">
                <label style="color: var(--muted-color);">Uwagi / Obserwacje</label>
                <textarea rows="4" placeholder="Wpisz swoje uwagi tutaj..." oninput="updateNote('${item.id}', this.value)">${res.note}</textarea>
            </div>

            <div style="display: flex; justify-content: space-between; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #334155;">
                <button class="outline secondary" ${idx === 0 ? 'disabled' : ''} onclick="renderTest(${idx - 1})">
                    <i data-lucide="arrow-left" style="margin-right: 8px;"></i> Poprzedni
                </button>
                ${idx === state.tests.length - 1
                ? `<button onclick="finishAudit()" style="background: var(--pass-color); border:none;">Zakończ Audyt <i data-lucide="check-circle" style="margin-left: 8px;"></i></button>`
                : `<button onclick="renderTest(${idx + 1})">Następny <i data-lucide="arrow-right" style="margin-left: 8px;"></i></button>`
            }
            </div>
        `;
        lucide.createIcons();
    };

    window.setResult = function (id, status) {
        state.results[id].status = status;
        renderNav();
        // Re-render current test to update selection UI
        renderTest(state.currentIdx);
    };

    window.updateNote = function (id, val) {
        state.results[id].note = val;
    };

    window.finishAudit = function () {
        document.getElementById('view-audit').classList.add('hidden');
        document.getElementById('view-setup').classList.add('hidden'); // Explicitly hide setup
        document.getElementById('app-layout').classList.remove('with-sidebar');
        document.getElementById('view-summary').classList.remove('hidden');

        // Summary Stats
        const vals = Object.values(state.results);
        document.getElementById('summary-product').innerText = state.product;
        document.getElementById('res-pass').innerText = vals.filter(x => x.status === 'pass').length;
        document.getElementById('res-fail').innerText = vals.filter(x => x.status === 'fail').length;
        document.getElementById('res-na').innerText = vals.filter(x => x.status === 'na').length;
        document.getElementById('res-nt').innerText = vals.filter(x => x.status === 'nt').length;

        lucide.createIcons();
    };

    window.resetAudit = function () {
        // Reset State
        state.product = '';
        state.tests = [];
        state.results = {};
        state.currentIdx = 0;

        // Reset UI Inputs
        document.getElementById('product-name').value = '';
        document.querySelectorAll('.scope-card.checked').forEach(el => {
            el.classList.remove('checked');
            const icon = el.querySelector('i');
            icon.classList.remove('text-primary');
            icon.style.color = 'var(--muted-color)';
        });

        // Reset Views
        document.getElementById('view-summary').classList.add('hidden');
        document.getElementById('view-audit').classList.add('hidden');
        document.getElementById('view-setup').classList.remove('hidden');
        document.getElementById('active-badge').classList.add('hidden');
        document.getElementById('app-layout').classList.remove('with-sidebar');

        // Reset Sidebar
        document.getElementById('nav-container').innerHTML = '';
        document.getElementById('progress-text').innerText = '0/0';
        document.getElementById('main-progress').value = 0;

        // Reset Button
        const startBtnReset = document.getElementById('start-audit-btn');
        startBtnReset.textContent = "Rozpocznij Audyt";
        startBtnReset.disabled = false;
    };

    // --- Export Functions ---

    document.getElementById('export-json-btn').addEventListener('click', () => {
        const report = {
            title: "Raport z badania zgodności z normą EN 301 549",
            product: state.product,
            date: new Date().toISOString(),
            results: state.results,
            tests: state.tests.map(t => ({
                id: t.id,
                title: t.title,
                result: state.results[t.id].status,
                note: state.results[t.id].note
            }))
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "raport_eaa.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('export-csv-btn').addEventListener('click', () => {
        let csv = `Produkt;${state.product}\nData;${new Date().toLocaleString()}\n\n`;
        csv += `ID;Tytuł;Wynik;Uwagi\n`;

        state.tests.forEach(t => {
            const res = state.results[t.id];
            const title = (t.title || '').replace(/[;\n\r]/g, ' ');
            const status = (res.status || 'not-tested');
            const note = (res.note || '').replace(/[;\n\r]/g, ' ');
            csv += `${t.id};${title};${status};${note}\n`;
        });

        const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', 'raport_eaa.csv');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('export-odt-btn').addEventListener('click', () => {
        const zip = new JSZip();
        const reportTitle = `Raport: ${state.product}`;

        const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
    <office:styles>
        <style:style style:name="Standard" style:family="paragraph" />
        <style:style style:name="T1" style:family="paragraph" style:parent-style-name="Standard">
            <style:text-properties fo:font-size="24pt" fo:font-weight="bold" />
        </style:style>
        <style:style style:name="Tbl1" style:family="table">
            <style:table-properties table:border-model="collapsing" />
        </style:style>
        <style:style style:name="Tbl1.A" style:family="table-column"><style:table-column-properties style:column-width="4cm"/></style:style>
        <style:style style:name="Tbl1.B" style:family="table-column"><style:table-column-properties style:column-width="8cm"/></style:style>
        <style:style style:name="Tbl1.C" style:family="table-column"><style:table-column-properties style:column-width="3cm"/></style:style>
        <style:style style:name="Tbl1.D" style:family="table-column"><style:table-column-properties style:column-width="5cm"/></style:style>
    </office:styles>
</office:document-styles>`;

        let contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
    <office:body>
        <office:text>
            <text:h text:style-name="T1">${xmlEscape(reportTitle)}</text:h>
            <text:p>Data badania: ${new Date().toLocaleString('pl-PL')}</text:p>
            
            <table:table table:name="ReportTable" table:style-name="Tbl1">
                <table:table-column table:style-name="Tbl1.A"/>
                <table:table-column table:style-name="Tbl1.B"/>
                <table:table-column table:style-name="Tbl1.C"/>
                <table:table-column table:style-name="Tbl1.D"/>
                <table:table-header-rows>
                    <table:table-row>
                        <table:table-cell office:value-type="string"><text:p>ID</text:p></table:table-cell>
                        <table:table-cell office:value-type="string"><text:p>Tytuł</text:p></table:table-cell>
                        <table:table-cell office:value-type="string"><text:p>Wynik</text:p></table:table-cell>
                        <table:table-cell office:value-type="string"><text:p>Uwagi</text:p></table:table-cell>
                    </table:table-row>
                </table:table-header-rows>`;

        state.tests.forEach(t => {
            const res = state.results[t.id];
            contentXml += `<table:table-row>
                <table:table-cell office:value-type="string"><text:p>${xmlEscape(t.id)}</text:p></table:table-cell>
                <table:table-cell office:value-type="string"><text:p>${xmlEscape(t.title)}</text:p></table:table-cell>
                <table:table-cell office:value-type="string"><text:p>${xmlEscape(res.status || 'brak')}</text:p></table:table-cell>
                <table:table-cell office:value-type="string"><text:p>${xmlEscape(res.note || '')}</text:p></table:table-cell>
            </table:table-row>`;
        });

        contentXml += `</table:table>
        </office:text>
    </office:body>
</office:document-content>`;

        const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
    <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
    <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
    <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
</manifest:manifest>`;

        zip.file("mimetype", "application/vnd.oasis.opendocument.text");
        zip.file("styles.xml", stylesXml);
        zip.file("content.xml", contentXml);
        zip.folder("META-INF").file("manifest.xml", manifestXml);

        zip.generateAsync({ type: "blob", mimeType: "application/vnd.oasis.opendocument.text" }).then(function (content) {
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", URL.createObjectURL(content));
            downloadAnchorNode.setAttribute("download", "raport_eaa.odt");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    });

    function xmlEscape(str) {
        if (!str) return '';
        return str.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }
});
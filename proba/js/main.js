document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const auditContainer = document.getElementById('audit-container');
    const form = document.getElementById('selection-form'); // Użyj ID dla pewności
    const exportOptions = document.getElementById('export-options'); // Nowa linia

    // Dodaj atrybut, aby ogłaszać zmiany
    auditContainer.setAttribute('aria-live', 'polite');

    // When true: don't fall back to HTML, require JSON structured clauses to exist
    const CANONICAL_JSON_ONLY = true;

    async function fetchClause(clause) {
        // JSON-only: fetch and return structured JSON. On error, return an error result.
        try {
            const jsonResp = await fetch(`clauses/${clause}.json`);
            if (jsonResp.ok) {
                const data = await jsonResp.json();
                if (data && data.nodes) return { type: 'structured', data };
            }
        } catch (e) {
            console.warn('Błąd ładowania JSON klauzuli', clause, e);
        }
        // Missing or invalid JSON
        return { type: 'error', data: `<p>Brak strukturalnego JSON dla klauzuli ${clause}.</p>` };
    }

    async function generateAudit(selectedClauses) {
        auditContainer.innerHTML = 'Ładowanie...';
        const fetches = selectedClauses.map(fetchClause);
        const results = await Promise.all(fetches);
        const definition = '<p class="info">We wszystkich poniższych klauzulach skrót <strong>TIK</strong> oznacza <strong>Technologie informacyjno-komunikacyjne</strong>.</p>';
        auditContainer.innerHTML = definition;
        // Build a small source summary for debugging/visibility
        let sourceInfo = document.getElementById('source-info');
        if (!sourceInfo) {
            sourceInfo = document.createElement('div');
            sourceInfo.id = 'source-info';
            sourceInfo.style.cssText = 'background:#fff7cc;border:1px solid #ffe08a;padding:0.5em;margin-bottom:1em;';
            auditContainer.parentNode.insertBefore(sourceInfo, auditContainer);
        }
        sourceInfo.innerHTML = '<strong>Źródła klauzul:</strong> ';
        // Render each clause via structured JSON. No HTML fallback allowed.
        for (let i = 0; i < selectedClauses.length; i++) {
            const clauseId = selectedClauses[i];
            const result = results[i];
            const section = document.createElement('section');
            section.className = 'audit-section';
            section.id = 'audit-' + clauseId;
            // If structured data
            if (result && result.type === 'structured') {
                // If nodes already start with an H2 heading (level 2), avoid duplicating the heading
                const firstNodeIsH2 = result.data && Array.isArray(result.data.nodes) && result.data.nodes.length > 0 && result.data.nodes[0].type === 'heading' && result.data.nodes[0].level === 2;
                if (!firstNodeIsH2 && typeof result.data.title === 'string') {
                    const titleEl = document.createElement('h2');
                    titleEl.textContent = result.data.title;
                    section.appendChild(titleEl);
                }
                if (window.clausesRenderer && window.clausesRenderer.renderClause) {
                    window.clausesRenderer.renderClause(section, result.data);
                } else {
                    // No renderer available — show diagnostic error. No raw HTML is used.
                    section.innerHTML = `<p>Brak renderer-a dla strukturalnego JSON.</p>`;
                }
                console.info('Rendered', clauseId, 'from structured JSON');
                sourceInfo.innerHTML += `<span style="margin-right:0.6em;color:green">${clauseId} (JSON)</span>`;
            } else if (result && result.type === 'error') {
                section.innerHTML = result.data;
                sourceInfo.innerHTML += `<span style="margin-right:0.6em;color:red">${clauseId} (missing JSON)</span>`;
                console.warn('Missing JSON for clause: ', clauseId);
            } else {
                section.innerHTML = `<p>Błąd ładowania klauzuli ${clauseId}.</p>`;
                sourceInfo.innerHTML += `<span style="margin-right:0.6em;color:red">${clauseId} (error)</span>`;
            }
            auditContainer.appendChild(section);
        }
        // Po załadowaniu treści, ustaw fokus i uruchom obserwacje
        const firstHeading = auditContainer.querySelector('h2');
        if (firstHeading) {
            firstHeading.setAttribute('tabindex', '-1');
            firstHeading.focus();
        }
        exportOptions.style.display = 'block';
        afterAuditGenerated();
    }

    generateBtn.addEventListener('click', async () => {
        const selectedClauses = Array.from(form.querySelectorAll('input[type="checkbox"]:checked'))
                                     .map(cb => cb.value);
        
        if (selectedClauses.length === 0) {
            auditContainer.innerHTML = '<p>Proszę wybrać przynajmniej jedną klauzulę.</p>';
            return;
        }
        // generate using JSON fallback
        await generateAudit(selectedClauses);
    });

    // Prefetch all clause JSONs to help offline availability and warm cache
    async function prefetchAllClauses() {
        const checkboxes = Array.from(document.querySelectorAll('input[name="clause"]'));
        const clauses = checkboxes.map(cb => cb.value);
        try {
            await Promise.all(clauses.map(c => fetch(`clauses/${c}.json`).catch(() => {})));
            console.info('Prefetched clause JSONs');
        } catch (e) {
            console.warn('Prefetching clauses failed', e);
        }
    }

    document.body.addEventListener('click', (event) => {
        if (event.target.id === 'export-json-btn') {
            const report = generateReportData();
            downloadJson(report);
        }
        if (event.target.id === 'export-odt-btn') {
            const report = generateReportData();
            downloadOdt(report);
        }
        if (event.target.id === 'export-csv-btn') {
            const report = generateReportData();
            downloadCsv(report);
        }
    });

    // Local Storage: auto-save and manual actions
    const LOCAL_KEY = 'eaa_audit_save';
    const LOCAL_STORAGE_VERSION = 2;

    function saveAuditToLocalStorage() {
        try {
            const report = generateReportData();
            // Save also selected clauses
            const selectedClauses = Array.from(form.querySelectorAll('input[type="checkbox"]:checked'))
                                         .map(cb => cb.value);
            const wrapper = { version: LOCAL_STORAGE_VERSION, payload: { report, selectedClauses } };
            localStorage.setItem(LOCAL_KEY, JSON.stringify(wrapper));
            console.info('Zapisano audyt do localStorage');
        } catch (err) {
            console.warn('Nie udało się zapisać do localStorage', err);
        }
    }

    function clearLocalAudit() {
        // Also clear legacy key if present
        const legacy = 'eaa_audit_save_v1';
        localStorage.removeItem(LOCAL_KEY);
        localStorage.removeItem(legacy);
        console.info('Usunięto zapis audytu z localStorage');
    }

    async function loadAuditFromLocalStorage() {
        try {
            const legacyKey = 'eaa_audit_save_v1';
            const raw = localStorage.getItem(LOCAL_KEY) || localStorage.getItem(legacyKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            // If old format (no version) => migrate
            let dataWrapper = parsed;
            if (!parsed.version) dataWrapper = { version: 1, payload: parsed };
            // select checkboxes
            const checkboxes = form.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = dataWrapper.payload.selectedClauses.includes(cb.value));
            // generate UI
            await generateAudit(dataWrapper.payload.selectedClauses);
            // apply saved choices to DOM
            const data = dataWrapper.payload.report;
            if (data && Array.isArray(data.clauses)) {
                data.clauses.forEach(c => {
                    const title = c.title;
                    // find corresponding audit-item by title in nearby headings
                    const matches = Array.from(document.querySelectorAll('.audit-item'));
                    for (const item of matches) {
                        // find closest preceding header
                        let prev = item.previousElementSibling;
                        let heading = null;
                        while (prev) {
                            if (prev.matches('h2, h3, h4, h5, h6')) {
                                heading = prev;
                                break;
                            }
                            prev = prev.previousElementSibling;
                        }
                        if (heading && heading.textContent && heading.textContent.trim() === title.trim()) {
                            if (c.result && c.result !== 'not-tested') {
                                const radio = item.querySelector(`input[type="radio"][value="${c.result}"]`);
                                if (radio) radio.checked = true;
                            }
                            if (c.notes) {
                                const ta = item.querySelector('textarea');
                                if (ta) ta.value = c.notes;
                            }
                        }
                    }
                });
            }
            updateAuditSummary();
                        // If the version differs, write back a migrated copy
                        if (dataWrapper.version !== LOCAL_STORAGE_VERSION) {
                            const migrated = { version: LOCAL_STORAGE_VERSION, payload: dataWrapper.payload };
                            localStorage.setItem(LOCAL_KEY, JSON.stringify(migrated));
                            dataWrapper = migrated;
                        }
                        return dataWrapper;
        } catch (err) {
            console.warn('Nie udało się wczytać audytu z localStorage', err);
            return null;
        }
    }

    // Bind the local storage buttons
    document.body.addEventListener('click', (event) => {
        if (event.target.id === 'save-local-btn') {
            saveAuditToLocalStorage();
        }
        if (event.target.id === 'load-local-btn') {
            loadAuditFromLocalStorage();
        }
        if (event.target.id === 'clear-local-btn') {
            clearLocalAudit();
        }
    });

    // Attempt to autoload an audit from localStorage on page load
    (async function init() {
        // Prefetch all known clauses to prime service worker cache and speed up first use
        prefetchAllClauses();
        // Try to load saved state if exists
        const saved = await loadAuditFromLocalStorage();
        if (saved) {
            console.info('Loaded saved audit from localStorage');
        }
    })();

    // Expose functions for automation/tests
    window.saveAuditToLocalStorage = saveAuditToLocalStorage;
    window.loadAuditFromLocalStorage = loadAuditFromLocalStorage;

    // Funkcja do podsumowania testów
    function updateAuditSummary() {
        const summaryDiv = document.getElementById('audit-summary');
        const auditSections = Array.from(document.querySelectorAll('.audit-section'));
        let summaryHtml = '';
        let hasTests = false;

        auditSections.forEach(section => {
            const sectionTitle = section.querySelector('h2, h3, h4, h5, h6');
            const allRadioGroups = Array.from(section.querySelectorAll('.audit-item fieldset.test-result-user'));
            const totalTests = allRadioGroups.length;
            let completedTests = 0;
            let passed = 0;
            let failed = 0;
            let na = 0;
            let nt = 0;
            let score = 0;
            let maxScore = totalTests;

            allRadioGroups.forEach(fieldset => {
                const checked = fieldset.querySelector('input[type="radio"]:checked');
                if (checked) {
                    completedTests++;
                    if (checked.value === 'pass') {
                        score += 1;
                        passed++;
                    } else if (checked.value === 'fail') {
                        score -= 1;
                        failed++;
                    } else if (checked.value === 'na') {
                        na++;
                    } else if (checked.value === 'nt') {
                        nt++;
                    }
                }
            });

            if (totalTests > 0) {
                hasTests = true;
                summaryHtml += `<div style="margin-bottom:1.5em;">
                    <h3 style=\"margin-bottom:0.2em;\">${sectionTitle ? sectionTitle.textContent : 'Klauzula'}</h3>
                    Liczba testów do wykonania: <strong>${totalTests}</strong><br>
                    Liczba testów wykonanych: <strong>${completedTests}</strong><br>
                    Liczba zaliczonych: <strong>${passed}</strong><br>
                    Liczba niezaliczonych: <strong>${failed}</strong><br>
                    Liczba testów z oceną \"nie dotyczy\": <strong>${na}</strong><br>
                    Liczba testów z oceną \"nietestowalne\": <strong>${nt}</strong><br>
                    Zdobyta punktacja: <strong>${score} / ${maxScore}</strong>
                </div>`;
            }
        });

        if (hasTests) {
            summaryDiv.style.display = '';
            summaryDiv.innerHTML = `<h2>Podsumowanie testów:</h2>${summaryHtml}`;
            document.getElementById('score-explanation').style.display = '';
        } else {
            summaryDiv.style.display = 'none';
            document.getElementById('score-explanation').style.display = 'none';
        }
    }

    // Nasłuchiwanie zmian w audycie
    function observeAuditRadios() {
        document.addEventListener('change', function(e) {
            if (e.target.matches('.audit-item input[type="radio"]')) {
                updateAuditSummary();
                saveAuditToLocalStorage();
            }
            if (e.target.matches('.audit-item textarea')) {
                saveAuditToLocalStorage();
            }
        });
        // Also autosave textarea input on input event
        document.addEventListener('input', function(e) {
            if (e.target.matches('.audit-item textarea')) {
                saveAuditToLocalStorage();
            }
        });
    }

    // Wywołanie po wygenerowaniu audytu
    function afterAuditGenerated() {
        updateAuditSummary();
        observeAuditRadios();
    }

    function getAuditSummaries() {
        const auditSections = Array.from(document.querySelectorAll('.audit-section'));
        let summaries = [];
        auditSections.forEach(section => {
            const sectionTitle = section.querySelector('h2, h3, h4, h5, h6');
            const allRadioGroups = Array.from(section.querySelectorAll('.audit-item fieldset.test-result-user'));
            const totalTests = allRadioGroups.length;
            let completedTests = 0;
            let passed = 0;
            let failed = 0;
            let na = 0;
            let nt = 0;
            let score = 0;
            let maxScore = totalTests;
            allRadioGroups.forEach(fieldset => {
                const checked = fieldset.querySelector('input[type="radio"]:checked');
                if (checked) {
                    completedTests++;
                    if (checked.value === 'pass') {
                        score += 1;
                        passed++;
                    } else if (checked.value === 'fail') {
                        score -= 1;
                        failed++;
                    } else if (checked.value === 'na') {
                        na++;
                    } else if (checked.value === 'nt') {
                        nt++;
                    }
                }
            });
            if (totalTests > 0) {
                summaries.push({
                    title: sectionTitle ? sectionTitle.textContent : 'Klauzula',
                    totalTests,
                    completedTests,
                    passed,
                    failed,
                    na,
                    nt,
                    score,
                    maxScore
                });
            }
        });
        return summaries;
    }

    function generateReportData() {
        const report = {
            title: "Raport z badania zgodności z normą EN 301 549",
            date: new Date().toISOString(),
            summary: getAuditSummaries(),
            clauses: []
        };

        const auditItems = auditContainer.querySelectorAll('.audit-item:not(.informative)');

        auditItems.forEach(auditItem => {
            let previousElement = auditItem.previousElementSibling;
            let heading = null;
            while (previousElement) {
                if (previousElement.matches('h2, h3, h4, h5, h6')) {
                    heading = previousElement;
                    break;
                }
                previousElement = previousElement.previousElementSibling;
            }

            if (heading) {
                const title = heading.textContent.trim();
                const resultInput = auditItem.querySelector('input[type="radio"]:checked');
                const notesTextarea = auditItem.querySelector('textarea');

                report.clauses.push({
                    title: title,
                    result: resultInput ? resultInput.value : 'not-tested',
                    notes: notesTextarea ? notesTextarea.value : ''
                });
            }
        });

        return report;
    }

    function downloadJson(data) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "raport_eaa.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    function xmlEscape(str) {
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

    function downloadOdt(data) {
        if (typeof JSZip === 'undefined') {
            alert('Brak JSZip: aby korzystać z eksportu ODT offline, umieść bibliotekę JSZip w js/vendor/jszip.min.js lub załaduj stronę w trybie online, aby użyć CDN.');
            return;
        }
        const zip = new JSZip();

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
        <style:style style:name="Tbl1.A" style:family="table-column"><style:table-column-properties style:column-width="8cm"/></style:style>
        <style:style style:name="Tbl1.B" style:family="table-column"><style:table-column-properties style:column-width="3cm"/></style:style>
        <style:style style:name="Tbl1.C" style:family="table-column"><style:table-column-properties style:column-width="6cm"/></style:style>
    </office:styles>
</office:document-styles>`;

        let contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
    <office:body>
        <office:text>
            <text:h text:style-name="T1">${data.title}</text:h>
            <text:p>Data badania: ${new Date(data.date).toLocaleString('pl-PL')}</text:p>
            <text:p><text:span text:style-name="T1">Podsumowanie testów:</text:span></text:p>
            ${data.summary.map(s =>
                `<text:p><text:span text:style-name="T1">${xmlEscape(s.title)}</text:span></text:p>
                <text:p>Liczba testów do wykonania: ${s.totalTests}</text:p>
                <text:p>Liczba testów wykonanych: ${s.completedTests}</text:p>
                <text:p>Liczba zaliczonych: ${s.passed}</text:p>
                <text:p>Liczba niezaliczonych: ${s.failed}</text:p>
                <text:p>Liczba testów z oceną \"nie dotyczy\": ${s.na}</text:p>
                <text:p>Liczba testów z oceną \"nietestowalne\": ${s.nt}</text:p>
                <text:p>Zdobyta punktacja: ${s.score} / ${s.maxScore}</text:p>`
            ).join('')}
            <table:table table:name="ReportTable" table:style-name="Tbl1">
                <table:table-column table:style-name="Tbl1.A"/>
                <table:table-column table:style-name="Tbl1.B"/>
                <table:table-column table:style-name="Tbl1.C"/>
                <table:table-header-rows>
                    <table:table-row>
                        <table:table-cell office:value-type="string"><text:p>Klauzula</text:p></table:table-cell>
                        <table:table-cell office:value-type="string"><text:p>Wynik</text:p></table:table-cell>
                        <table:table-cell office:value-type="string"><text:p>Uwagi</text:p></table:table-cell>
                    </table:table-row>
                </table:table-header-rows>`;

        data.clauses.forEach(clause => {
            contentXml += `<table:table-row>
                <table:table-cell office:value-type="string"><text:p>${xmlEscape(clause.title)}</text:p></table:table-cell>
                <table:table-cell office:value-type="string"><text:p>${xmlEscape(clause.result)}</text:p></table:table-cell>
                <table:table-cell office:value-type="string"><text:p>${xmlEscape(clause.notes)}</text:p></table:table-cell>
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

        zip.generateAsync({type:"blob", mimeType: "application/vnd.oasis.opendocument.text"}).then(function(content) {
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", URL.createObjectURL(content));
            downloadAnchorNode.setAttribute("download", "raport_eaa.odt");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    }

    function downloadCsv(data) {
        let csv = `${data.title}\nData: ${data.date}\nPodsumowanie testów:\n`;
        data.summary.forEach(s => {
            csv += `${s.title}\n`;
            csv += `Liczba testów do wykonania: ${s.totalTests}\n`;
            csv += `Liczba testów wykonanych: ${s.completedTests}\n`;
            csv += `Liczba zaliczonych: ${s.passed}\n`;
            csv += `Liczba niezaliczonych: ${s.failed}\n`;
            csv += `Liczba testów z oceną \"nie dotyczy\": ${s.na}\n`;
            csv += `Liczba testów z oceną \"nietestowalne\": ${s.nt}\n`;
            csv += `Zdobyta punktacja: ${s.score} / ${s.maxScore}\n`;
        });
        csv += `Klauzula;Wynik;Uwagi\n`;
        data.clauses.forEach(clause => {
            // Zamień średnik i nową linię w polach na spacje, aby nie psuły CSV
            const title = (clause.title || '').replace(/[;\n\r]/g, ' ');
            const result = (clause.result || '').replace(/[;\n\r]/g, ' ');
            const notes = (clause.notes || '').replace(/[;\n\r]/g, ' ');
            csv += `${title};${result};${notes}\n`;
        });
        const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', 'raport_eaa.csv');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
});
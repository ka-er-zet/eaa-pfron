document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Load State
    const state = window.utils.loadState();
    if (!state.product && state.tests.length === 0) {
        alert("Brak danych audytu. Przekierowanie do strony startowej.");
        window.location.href = 'index.html';
        return;
    }

    // 1. Calculate Stats
    const results = state.results || {};
    // Filter out headings, only keep actual tests
    const tests = (state.tests || []).filter(t => t.type === 'test');
    
    const failedTests = tests.filter(t => results[t.id]?.status === 'fail' || results[t.id]?.status === 'Niezaliczone');
    const passedTests = tests.filter(t => results[t.id]?.status === 'pass' || results[t.id]?.status === 'Zaliczone');
    const naTests = tests.filter(t => results[t.id]?.status === 'na' || results[t.id]?.status === 'Nie dotyczy');
    const ntTests = tests.filter(t => results[t.id]?.status === 'nt' || results[t.id]?.status === 'Nietestowalne');
    
    // "To Verify" = All tests - (Failed + Passed + NA + NT)
    const processedIds = new Set([...failedTests, ...passedTests, ...naTests, ...ntTests].map(t => t.id));
    const verifyTests = tests.filter(t => !processedIds.has(t.id));

    // 2. Render Header
    document.getElementById('summary-product').innerText = state.product || 'Audyt Dostępności';

    // 3. Render Verdict
    const verdictCard = document.getElementById('verdict-card');
    const verdictTitle = document.getElementById('verdict-title');
    const verdictDesc = document.getElementById('verdict-desc');
    const verdictIcon = document.getElementById('verdict-icon');

    // Reset classes
    verdictCard.classList.remove('failed', 'passed', 'in-progress');

    if (failedTests.length > 0) {
        verdictCard.classList.add('failed');
        verdictTitle.innerText = "NIEZALICZONY";
        verdictDesc.innerHTML = `Niespełnione wymagania: ${failedTests.length}<br>Wymagania nieocenione: ${verifyTests.length}`;
        verdictIcon.setAttribute('data-lucide', 'shield-alert');
    } else if (verifyTests.length > 0) {
        // Warning / In Progress
        verdictCard.classList.add('in-progress');
        verdictTitle.innerText = "NIEZAKOŃCZONY";
        verdictDesc.innerText = `Pozostało ${verifyTests.length} testów do sprawdzenia`;
        verdictIcon.setAttribute('data-lucide', 'clock');
    } else {
        verdictCard.classList.add('passed');
        
        if (passedTests.length === 0 && naTests.length > 0 && ntTests.length === 0) {
            verdictTitle.innerText = "BRAK NIEZGODNOŚCI";
            verdictDesc.innerText = "Wszystkie wymagania oznaczono jako 'Nie dotyczy'.";
            verdictIcon.setAttribute('data-lucide', 'check-circle'); // Or 'minus-circle' if preferred
        } else {
            verdictTitle.innerText = "ZALICZONY";
            
            if (naTests.length > 0 || ntTests.length > 0) {
                let desc = `Spełnione wymagania: ${passedTests.length}`;
                if (naTests.length > 0) desc += `<br>Oznaczone jako nie dotyczy: ${naTests.length}`;
                if (ntTests.length > 0) desc += `<br>Nietestowalne: ${ntTests.length}`;
                verdictDesc.innerHTML = desc;
            } else {
                verdictDesc.innerText = "Wszystkie wymagania zostały spełnione.";
            }
            
            verdictIcon.setAttribute('data-lucide', 'check-circle');
        }
    }
    lucide.createIcons();

    // 4. Render Lists
    const renderList = (containerId, items, type) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        
        if (items.length === 0) {
            container.innerHTML = '<div class="issue-item" style="color: var(--muted-color); font-style: italic;">Brak elementów w tej sekcji.</div>';
            return;
        }

        items.forEach(t => {
            const el = document.createElement('div');
            el.className = 'issue-item';
            const res = results[t.id];
            const note = res?.note ? `<div class="issue-note">${res.note}</div>` : '';
            
            let desc = '';
            
            // For Passed/NA, show status label
            let statusLabel = '';
            if (type === 'pass') {
                let statusText = 'Zaliczone';
                if (res?.status === 'na' || res?.status === 'Nie dotyczy') statusText = 'Nie dotyczy';
                if (res?.status === 'nt' || res?.status === 'Nietestowalne') statusText = 'Nietestowalne';
                statusLabel = `<span style="font-size: 0.75rem; opacity: 0.7;">[${statusText}]</span> `;
            }

            // Clean title (remove ID if present at start)
            let displayTitle = t.title;
            const idBase = t.id.split('#')[0];
            if (displayTitle.startsWith(idBase)) {
                displayTitle = displayTitle.substring(idBase.length).trim();
            }
            // Remove leading punctuation
            displayTitle = displayTitle.replace(/^[:\.\-]\s*/, '');

            el.innerHTML = `
                <div class="issue-title">
                    <span class="issue-id">${t.id}</span>
                    <span class="issue-text">${statusLabel}${displayTitle}</span>
                </div>
                ${desc}
                ${note}
            `;
            container.appendChild(el);
        });
    };

    renderList('list-fail', failedTests, 'fail');
    renderList('list-verify', verifyTests, 'verify');
    renderList('list-pass-na', [...passedTests, ...naTests, ...ntTests], 'pass');

    // Update Counts
    document.getElementById('count-fail').innerText = failedTests.length;
    document.getElementById('count-verify').innerText = verifyTests.length;
    document.getElementById('count-pass-na').innerText = passedTests.length + naTests.length + ntTests.length;

    // 5. Executive Summary
    const summaryText = document.getElementById('executive-summary');
    if (state.executiveSummary) {
        summaryText.value = state.executiveSummary;
    }
    summaryText.addEventListener('input', (e) => {
        state.executiveSummary = e.target.value;
        window.utils.saveState(state);
    });

    // New Audit Button
    window.resetAudit = async function () {
        const stay = await window.utils.confirm(
            "Czy na pewno chcesz rozpocząć nowy audyt? Wszystkie niezapisane dane zostaną utracone.",
            "Nowy Audyt",
            "Nie",
            "Tak"
        );
        if (!stay) {
            window.utils.clearState();
            window.location.href = 'index.html';
        }
    };

    // Helper to generate filename
    const getFilename = (ext) => {
        const date = new Date().toISOString().split('T')[0];
        const product = (state.product || 'produkt').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return `raport_eaa_${product}_${date}.${ext}`;
    };

    // --- Export Functions ---

    document.getElementById('export-json-btn').addEventListener('click', () => {
        // EARL Context
        const context = {
            "earl": "http://www.w3.org/ns/earl#",
            "dct": "http://purl.org/dc/terms/",
            "foaf": "http://xmlns.com/foaf/0.1/",
            "sch": "http://schema.org/",
            "xsd": "http://www.w3.org/2001/XMLSchema#"
        };

        // Assertor (The Tool)
        const assertor = {
            "@id": "_:assertor",
            "@type": ["earl:Software", "earl:Assertor"],
            "dct:title": "A11y Audit Tool",
            "dct:description": "Narzędzie do audytu dostępności cyfrowej wg EN 301 549",
            "dct:hasVersion": "1.0.0"
        };

        // Human Assertor (if provided)
        let mainAssertor = assertor;
        if (state.auditor) {
            const humanAssertor = {
                "@id": "_:humanAssertor",
                "@type": ["foaf:Person", "earl:Assertor"],
                "foaf:name": state.auditor
            };
            
            // Create a compound assertor
            mainAssertor = {
                "@id": "_:compoundAssertor",
                "@type": "earl:Assertor",
                "earl:mainAssertor": { "@id": "_:humanAssertor" },
                "dct:description": "Audyt przeprowadzony przez człowieka przy użyciu narzędzia"
            };
        }

        // Test Subject (The Product)
        const testSubject = {
            "@id": "_:subject",
            "@type": ["earl:TestSubject", "sch:Product"],
            "dct:title": state.product || "Nieznany produkt",
            "dct:description": state.productDesc || '',
            "dct:date": new Date().toISOString()
        };

        // Assertions
        const assertions = state.tests.map(t => {
            const res = state.results[t.id] || { status: 'not-tested', note: '' };
            
            let outcome = 'earl:untested';
            if (res.status === 'pass' || res.status === 'Zaliczone') outcome = 'earl:passed';
            else if (res.status === 'fail' || res.status === 'Niezaliczone') outcome = 'earl:failed';
            else if (res.status === 'na' || res.status === 'Nie dotyczy') outcome = 'earl:inapplicable';
            else if (res.status === 'nt' || res.status === 'Nietestowalne') outcome = 'earl:cantTell';

            return {
                "@type": "earl:Assertion",
                "earl:assertedBy": { "@id": state.auditor ? "_:compoundAssertor" : "_:assertor" },
                "earl:subject": { "@id": "_:subject" },
                "earl:test": {
                    "@type": "earl:TestCriterion",
                    "dct:title": t.title,
                    "dct:identifier": t.id
                },
                "earl:result": {
                    "@type": "earl:TestResult",
                    "earl:outcome": { "@id": outcome },
                    "dct:description": res.note || '',
                    "dct:date": new Date().toISOString()
                },
                "earl:mode": { "@id": "earl:manual" }
            };
        });

        const graph = [assertor, testSubject, ...assertions];
        if (state.auditor) {
            graph.unshift({
                "@id": "_:humanAssertor",
                "@type": ["foaf:Person", "earl:Assertor"],
                "foaf:name": state.auditor
            });
            graph.unshift(mainAssertor);
        }

        const report = {
            "@context": context,
            "@graph": graph,
            "dct:title": "Raport z badania zgodności z normą EN 301 549",
            "dct:date": new Date().toISOString(),
            "dct:description": state.executiveSummary || ''
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", getFilename('json'));
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('export-csv-btn').addEventListener('click', () => {
        let csv = `Produkt;${state.product}\n`;
        if (state.productDesc) csv += `Opis;${state.productDesc.replace(/[\n\r;]/g, ' ')}\n`;
        if (state.auditor) csv += `Audytor;${state.auditor}\n`;
        csv += `Data;${new Date().toLocaleString()}\n`;
        csv += `Podsumowanie;${(state.executiveSummary || '').replace(/[\n\r;]/g, ' ')}\n\n`;
        csv += `ID;Tytuł;Wynik;Uwagi\n`;

        state.tests.forEach(t => {
            const res = state.results[t.id] || { status: 'not-tested', note: '' };
            const title = (t.title || '').replace(/[;\n\r]/g, ' ');
            const status = (res.status || 'not-tested');
            const note = (res.note || '').replace(/[;\n\r]/g, ' ');
            csv += `${t.id};${title};${status};${note}\n`;
        });

        const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', getFilename('csv'));
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // PDF Export (mapped to ODT for now)
    document.getElementById('export-odt-btn').addEventListener('click', () => {
         exportToODT(state);
    });

    function exportToODT(state) {
        const zip = new JSZip();
        const reportTitle = `Raport: ${state.product}`;

        const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
    <office:styles>
        <style:style style:name="Standard" style:family="paragraph" />
        <style:style style:name="T1" style:family="paragraph" style:parent-style-name="Standard">
            <style:text-properties fo:font-size="24pt" fo:font-weight="bold" />
        </style:style>
        <style:style style:name="H1" style:family="paragraph" style:parent-style-name="Standard">
            <style:text-properties fo:font-size="18pt" fo:font-weight="bold" />
        </style:style>
        <style:style style:name="H2" style:family="paragraph" style:parent-style-name="Standard">
            <style:text-properties fo:font-size="14pt" fo:font-weight="bold" />
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
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" office:version="1.2">
    <office:body>
        <office:text>
            <text:p text:style-name="T1">${window.utils.xmlEscape(reportTitle)}</text:p>
            <text:p>Data: ${new Date().toLocaleString()}</text:p>`;
        
        if (state.auditor) {
            contentXml += `<text:p>Audytor: ${window.utils.xmlEscape(state.auditor)}</text:p>`;
        }
        if (state.productDesc) {
            contentXml += `<text:p>Opis: ${window.utils.xmlEscape(state.productDesc)}</text:p>`;
        }

        contentXml += `<text:p>Podsumowanie: ${window.utils.xmlEscape(state.executiveSummary || 'Brak')}</text:p>
            <text:h text:style-name="H1">Wyniki szczegółowe</text:h>
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
            const res = state.results[t.id] || { status: 'brak', note: '' };
            contentXml += `<table:table-row>
                <table:table-cell office:value-type="string"><text:p>${window.utils.xmlEscape(t.id)}</text:p></table:table-cell>
                <table:table-cell office:value-type="string"><text:p>${window.utils.xmlEscape(t.title)}</text:p></table:table-cell>
                <table:table-cell office:value-type="string"><text:p>${window.utils.xmlEscape(res.status || 'brak')}</text:p></table:table-cell>
                <table:table-cell office:value-type="string"><text:p>${window.utils.xmlEscape(res.note || '')}</text:p></table:table-cell>
            </table:table-row>`;
        });

        contentXml += `</table:table></office:text></office:body></office:document-content>`;

        const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
    <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
    <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
    <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;

        zip.file("mimetype", "application/vnd.oasis.opendocument.text");
        zip.file("META-INF/manifest.xml", manifestXml);
        zip.file("content.xml", contentXml);
        zip.file("styles.xml", stylesXml);

        zip.generateAsync({ type: "blob", mimeType: "application/vnd.oasis.opendocument.text" }).then(function (content) {
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", URL.createObjectURL(content));
            downloadAnchorNode.setAttribute("download", getFilename('odt'));
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    }

    // Handle Home Link Click
    const homeLink = document.getElementById('app-logo');
    if (homeLink) {
        homeLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const stay = await window.utils.confirm(
                "Czy na pewno chcesz wrócić do strony głównej? Wszystkie niezapisane dane (w tym raport) zostaną utracone.",
                "Powrót do strony głównej",
                "Nie",
                "Tak"
            );
            if (!stay) {
                window.utils.clearState();
                window.location.href = 'index.html';
            }
        });
    }
});

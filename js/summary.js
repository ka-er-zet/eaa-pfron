document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Załaduj stan
    const state = window.utils.loadState();
    if (!state.product && state.tests.length === 0) {
        alert("Brak danych audytu. Przekierowanie do strony startowej.");
        window.location.href = 'index.html';
        return;
    }

    // 1. Oblicz statystyki
    const stats = window.utils.getAuditStats(state);
    const results = state.results || {};
    
    const failedTests = stats.lists.failed;
    const passedTests = stats.lists.passed;
    const naTests = stats.lists.na;
    const ntTests = stats.lists.nt;
    const verifyTests = stats.lists.verify;

    // 2. Renderuj nagłówek
    document.getElementById('summary-product').innerText = state.product || 'Audyt Dostępności';

    // 3. Renderuj werdykt
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

    // 4. Renderuj listy
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


            // Clean title (remove ID if present at start)
            let displayTitle = t.title;
            const idBase = t.id.split('#')[0];
            if (displayTitle.startsWith(idBase)) {
                displayTitle = displayTitle.substring(idBase.length).trim();
            }
            // Remove leading punctuation
            displayTitle = displayTitle.replace(/^[:\.\-]\s*/, '');
            displayTitle = window.utils.fixOrphans(displayTitle);

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
    renderList('list-na', naTests, 'na');
    renderList('list-nt', ntTests, 'nt');
    renderList('list-pass', passedTests, 'pass');

    // Update Counts
    document.getElementById('count-fail').innerText = failedTests.length;
    document.getElementById('count-verify').innerText = verifyTests.length;
    document.getElementById('count-na').innerText = naTests.length;
    document.getElementById('count-nt').innerText = ntTests.length;
    document.getElementById('count-pass').innerText = passedTests.length;

    // 5. Podsumowanie wykonawcze
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

    // Handle Ctrl+S / Cmd+S to save
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            
            // 1. Zapisz do localStorage
            window.utils.saveState(state);

            // 2. Generuj raport EARL
            const report = window.utils.generateEARL(state);

            // 3. Pobierz stan jako JSON (format EARL)
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", getFilename('json'));
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            
            // 4. Dostępna informacja zwrotna (tylko dla czytników ekranu)
            // We can reuse the live region if it exists in summary.html, or create a temp one.
            // summary.html doesn't seem to have 'audit-status-live' based on previous reads, let's check.
            // Actually, I'll just add a simple alert or reuse the toast logic if I hadn't deleted it.
            // The user asked to REMOVE the toast. So I will only use aria-live if possible.
            
            let liveRegion = document.getElementById('a11y-live-region');
            if (!liveRegion) {
                liveRegion = document.createElement('div');
                liveRegion.id = 'a11y-live-region';
                liveRegion.className = 'visually-hidden';
                liveRegion.setAttribute('aria-live', 'polite');
                document.body.appendChild(liveRegion);
            }
            liveRegion.innerText = 'Zapisano raport i pobrano plik.';
        }
    });

    // --- Export Functions ---

    document.getElementById('export-json-btn').addEventListener('click', () => {
        const report = window.utils.generateEARL(state);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", getFilename('json'));
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('export-csv-btn').addEventListener('click', () => {
        const stats = window.utils.getAuditStats(state);
        // Add BOM for Excel compatibility with UTF-8
        let csv = '\uFEFF';
        csv += `Produkt;${state.product}\n`;
        if (state.productDesc) csv += `Opis;${state.productDesc.replace(/[\n\r;]/g, ' ')}\n`;
        if (state.auditor) csv += `Audytor;${state.auditor}\n`;
        csv += `Data;${new Date().toLocaleString()}\n`;
        csv += `Wynik audytu;${stats.verdictLabel}\n`;
        csv += `Statystyki;Zaliczone: ${stats.passed} | Niezaliczone: ${stats.failed} | Nie dotyczy: ${stats.na} | Nietestowalne: ${stats.nt} | Do sprawdzenia: ${stats.toVerify}\n`;
        csv += `Komentarz audytora;${(state.executiveSummary || '').replace(/[\n\r;]/g, ' ')}\n\n`;
        csv += `ID;Tytuł;Wynik;Uwagi\n`;

        const tests = (state.tests || []).filter(t => t.type === 'test');
        tests.forEach(t => {
            const res = state.results[t.id] || { status: 'not-tested', note: '' };
            const title = (t.title || '').replace(/[;\n\r]/g, ' ');
            const status = window.utils.getStatusLabel(res.status);
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

    // ODT Export
    document.getElementById('export-odt-btn').addEventListener('click', () => {
         exportToODT(state);
    });

    function exportToODT(state) {
        console.log('Exporting to ODT with new styles...');
        const stats = window.utils.getAuditStats(state);
        const zip = new JSZip();
        const reportTitle = `Raport: ${state.product}`;

        const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
    <office:styles>
        <style:style style:name="Standard" style:family="paragraph">
            <style:text-properties fo:language="pl" fo:country="PL" />
        </style:style>
        <style:style style:name="T1" style:family="paragraph" style:parent-style-name="Standard">
            <style:text-properties fo:font-size="24pt" fo:font-weight="bold" />
        </style:style>
        <style:style style:name="H1" style:family="paragraph" style:parent-style-name="Standard">
            <style:text-properties fo:font-size="18pt" fo:font-weight="bold" />
        </style:style>
        <style:style style:name="H2" style:family="paragraph" style:parent-style-name="Standard">
            <style:text-properties fo:font-size="16pt" fo:font-weight="bold" />
        </style:style>
        <style:style style:name="P1" style:family="paragraph" style:parent-style-name="Standard">
            <style:text-properties fo:font-size="12pt" />
        </style:style>
        <style:style style:name="H3" style:family="paragraph" style:parent-style-name="Standard">
            <style:text-properties fo:font-size="12pt" fo:font-weight="bold" />
        </style:style>
        <style:style style:name="Tbl1" style:family="table">
            <style:table-properties table:border-model="collapsing" />
        </style:style>
        <style:style style:name="Tbl1.A" style:family="table-column"><style:table-column-properties style:column-width="4cm"/></style:style>
        <style:style style:name="Tbl1.B" style:family="table-column"><style:table-column-properties style:column-width="8cm"/></style:style>
        <style:style style:name="Tbl1.C" style:family="table-column"><style:table-column-properties style:column-width="3cm"/></style:style>
        <style:style style:name="Tbl1.D" style:family="table-column"><style:table-column-properties style:column-width="5cm"/></style:style>
        <style:style style:name="Tbl1.A1" style:family="table-cell">
            <style:table-cell-properties fo:border="0.5pt solid #000000" fo:padding="0.1cm" fo:background-color="#ffcccc"/>
            <style:text-properties fo:font-weight="bold"/>
        </style:style>
        <style:style style:name="Tbl1.A2" style:family="table-cell">
            <style:table-cell-properties fo:border="0.5pt solid #000000" fo:padding="0.1cm"/>
        </style:style>
        <style:style style:name="Tbl1.Row" style:family="table-row">
            <style:table-row-properties fo:keep-together="auto" fo:margin-bottom="0.2cm"/>
        </style:style>
    </office:styles>
    <office:automatic-styles>
        <style:page-layout style:name="Mpm1">
            <style:page-layout-properties fo:page-width="29.7cm" fo:page-height="21cm" style:print-orientation="landscape" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="2cm" fo:margin-right="2cm"/>
        </style:page-layout>
    </office:automatic-styles>
    <office:master-styles>
        <style:master-page style:name="Standard" style:page-layout-name="Mpm1"/>
    </office:master-styles>
</office:document-styles>`;

        let contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" office:version="1.2">
    <office:body>
        <office:text>
            <text:h text:style-name="H1" text:outline-level="1">Raport</text:h>
            <text:h text:style-name="H2" text:outline-level="2">${window.utils.xmlEscape(state.product || 'Audyt Dostępności')}</text:h>
            <text:p></text:p>
            <text:p text:style-name="P1">Data: ${new Date().toLocaleString()}</text:p>`;
        
        if (state.auditor) {
            contentXml += `<text:p text:style-name="P1">Audytor: ${window.utils.xmlEscape(state.auditor)}</text:p>`;
        }
        if (state.productDesc) {
            contentXml += `<text:p text:style-name="P1">Opis: ${window.utils.xmlEscape(state.productDesc)}</text:p>`;
        }

        contentXml += `<text:p></text:p><text:h text:style-name="H2" text:outline-level="2">Audyt ${stats.verdictLabel.toLowerCase()}</text:h>
            <text:p></text:p>
            <text:h text:style-name="H3" text:outline-level="3">Komentarz audytora:</text:h>
            <text:p text:style-name="P1">${window.utils.xmlEscape(state.executiveSummary || 'Brak')}</text:p>
            <text:p></text:p>
            <text:h text:style-name="H3" text:outline-level="3">Statystyki</text:h>
            <text:p></text:p>
            <text:p text:style-name="P1"> - Zaliczone: ${stats.passed}</text:p>
            <text:p text:style-name="P1"> - Niezaliczone: ${stats.failed}</text:p>
            <text:p text:style-name="P1"> - Nie dotyczy: ${stats.na}</text:p>
            <text:p text:style-name="P1"> - Nietestowalne: ${stats.nt}</text:p>
            <text:p text:style-name="P1"> - Do sprawdzenia: ${stats.toVerify}</text:p>
            <text:p></text:p>`;

        const tests = (state.tests || []).filter(t => t.type === 'test');

        // Szczegółowe wyniki po klauzulach
        for (let i = 5; i <= 13; i++) {
            const clause = `C.${i}`;
            const clauseTests = tests.filter(t => t.id.startsWith(clause + '.'));
            if (clauseTests.length === 0) continue;

            contentXml += `<text:h text:style-name="H3" text:outline-level="3">Klauzula ${clause}</text:h>
            <text:p></text:p>
            <table:table table:name="ReportTable${i}" table:style-name="Tbl1">
                <table:table-column table:style-name="Tbl1.A"/>
                <table:table-column table:style-name="Tbl1.B"/>
                <table:table-column table:style-name="Tbl1.C"/>
                <table:table-column table:style-name="Tbl1.D"/>
                <table:table-header-rows>
                    <table:table-row table:style-name="Tbl1.Row">
                        <table:table-cell table:style-name="Tbl1.A1" office:value-type="string"><text:p>ID</text:p></table:table-cell>
                        <table:table-cell table:style-name="Tbl1.A1" office:value-type="string"><text:p>Tytuł</text:p></table:table-cell>
                        <table:table-cell table:style-name="Tbl1.A1" office:value-type="string"><text:p>Wynik</text:p></table:table-cell>
                        <table:table-cell table:style-name="Tbl1.A1" office:value-type="string"><text:p>Uwagi</text:p></table:table-cell>
                    </table:table-row>
                </table:table-header-rows>`;

            clauseTests.forEach(t => {
                const res = state.results[t.id] || { status: 'brak', note: '' };
                contentXml += `<table:table-row table:style-name="Tbl1.Row">
                    <table:table-cell table:style-name="Tbl1.A2" office:value-type="string"><text:p>${window.utils.xmlEscape(t.id)}</text:p></table:table-cell>
                    <table:table-cell table:style-name="Tbl1.A2" office:value-type="string"><text:p>${window.utils.xmlEscape(t.title.replace(t.id.split('#')[0] + ' ', ''))}</text:p></table:table-cell>
                    <table:table-cell table:style-name="Tbl1.A2" office:value-type="string"><text:p>${window.utils.xmlEscape(window.utils.getStatusLabel(res.status))}</text:p></table:table-cell>
                    <table:table-cell table:style-name="Tbl1.A2" office:value-type="string"><text:p>${window.utils.xmlEscape(res.note || '')}</text:p></table:table-cell>
                </table:table-row>`;
            });

            contentXml += `</table:table>
            <text:p></text:p>`;
        }

        contentXml += `</office:text></office:body></office:document-content>`;

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

import { MESSAGES_PL as M } from './messages-pl.js';
// docelowo: const M = window.i18n.getMessages();
window.M = M;

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Apply localization from data-i18n attributes FIRST
    try {
        if (window.utils && typeof window.utils.applyDataI18n === 'function') {
            window.utils.applyDataI18n(M, document);
            if (location.search.includes('i18n-check') && typeof window.utils.checkDataI18n === 'function') {
                window.utils.checkDataI18n(M, document);
            }
        }
    } catch (e) {
        console.warn('Failed to apply data-i18n on summary page', e);
    }

    // Enhance icon-only buttons with visible labels on hover/focus AFTER i18n is applied
    try {
        if (typeof enhanceIconButtons === 'function') enhanceIconButtons();
    } catch (e) {
        console.warn('Could not enhance icon buttons', e);
    }

    // Załaduj stan
    const state = window.utils.loadState();
    console.log('Loaded state:', state); // Debug
    if (!state.product && state.tests.length === 0) {
        if (typeof window.utils.setStatusMessage === 'function') {
            window.utils.setStatusMessage(M.summary.noAuditData, 5000);
        }
        // Show alert modal with navigation option
        window.utils.alert(
            M.summary.noAuditData,
            M.summary.noDataTitle || 'Brak danych audytu'
        ).then(() => {
            window.location.href = 'index.html';
        });
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

    // Announce audit load status
    const verdict = failedTests.length > 0 ? (M.summary.statusFailed || 'Niezaliczony') : verifyTests.length > 0 ? (M.summary.statusInProgress || 'Niezakończony') : (M.summary.statusPassed || 'Zaliczony');
    if (typeof window.utils.setStatusMessage === 'function') {
        window.utils.setStatusMessage((M.summary.auditLoadedStatus || 'Wczytano audyt. Status: {status}.').replace('{status}', verdict), 5000);
    }

    // 2. Renderuj nagłówek
    // Dodaj szczegóły audytu
    const detailsContainer = document.createElement('dl');
    detailsContainer.className = 'audit-info';
    detailsContainer.innerHTML = `
        <div class="info-item">
            <dt>${M.setup.productNameLabel}</dt>
            <dd>${state.product || (M.summary.notProvided || 'Nie podano')}</dd>
        </div>
        <div class="info-item">
            <dt>${M.setup.productDescLabel}</dt>
            <dd>${state.productDesc || (M.summary.notProvided || 'Nie podano')}</dd>
        </div>
        <div class="info-item">
            <dt>${M.setup.auditorNameLabel}</dt>
            <dd>${state.auditor || (M.summary.notProvided || 'Nie podano')}</dd>
        </div>
    `;
    const headerSection = document.querySelector('.summary-header-section h1');
    headerSection.parentNode.insertBefore(detailsContainer, headerSection.nextSibling);

    // 3. Renderuj werdykt
    const verdictCard = document.getElementById('verdict-card');
    const verdictTitle = document.getElementById('verdict-title');
    const verdictDesc = document.getElementById('verdict-desc');
    const verdictIcon = document.getElementById('verdict-icon');

    // Reset classes
    verdictCard.classList.remove('failed', 'passed', 'in-progress');

    if (failedTests.length > 0) {
        verdictCard.classList.add('failed');
        verdictTitle.innerText = M.summary.verdictFailed;
        verdictDesc.innerHTML = (M.summary.verdictDescFailed || 'Niespełnione wymagania: {failed}<br>Wymagania nieocenione: {verify}')
            .replace('{failed}', failedTests.length)
            .replace('{verify}', verifyTests.length);
        verdictIcon.setAttribute('data-lucide', 'shield-alert');
    } else if (verifyTests.length > 0) {
        // Warning / In Progress
        verdictCard.classList.add('in-progress');
        verdictTitle.innerText = M.summary.verdictInProgress;
        verdictDesc.innerText = (M.summary.verdictDescInProgress || 'Do sprawdzenia: {count}').replace('{count}', verifyTests.length);
        verdictIcon.setAttribute('data-lucide', 'clock');
    } else {
        verdictCard.classList.add('passed');

        if (passedTests.length === 0 && naTests.length > 0 && ntTests.length === 0) {
            verdictTitle.innerText = M.summary.verdictNoNonconformities;
            verdictDesc.innerHTML = M.summary.verdictAllNA || "Wszystkie wymagania oznaczono jako <q>Nie dotyczy</q>.";
            verdictIcon.setAttribute('data-lucide', 'check-circle'); // Or 'minus-circle' if preferred
        } else {
            verdictTitle.innerText = M.summary.verdictPassed;

            if (naTests.length > 0 || ntTests.length > 0) {
                let desc = (M.summary.verdictPassedCount || 'Spełnione wymagania: {count}').replace('{count}', passedTests.length);
                if (naTests.length > 0) desc += `<br>${(M.summary.verdictNACount || 'Oznaczone jako nie dotyczy: {count}').replace('{count}', naTests.length)}`;
                if (ntTests.length > 0) desc += `<br>${(M.summary.verdictNTCount || 'Nietestowalne: {count}').replace('{count}', ntTests.length)}`;
                verdictDesc.innerHTML = desc;
            } else {
                verdictDesc.innerText = M.summary.verdictAllPassed || "Wszystkie wymagania zostały spełnione.";
            }

            verdictIcon.setAttribute('data-lucide', 'check-circle');
        }
    }
    lucide.createIcons();

    // 4. Renderuj listy
    const renderList = (containerId, items, type) => {
        let container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = `<li class="issue-item" style="color: var(--muted-color); padding: 1rem 1.5rem;">${M.summary.noItemsInSection || 'Brak elementów w tej sekcji.'}</li>`;
            return;
        }

        // Create ul if not exists
        if (container.tagName !== 'UL') {
            const ul = document.createElement('ul');
            ul.id = containerId;
            ul.className = container.className;
            container.parentNode.replaceChild(ul, container);
            container = ul;
        }

        items.forEach(t => {
            const el = document.createElement('li');
            el.className = 'issue-item';
            const res = results[t.id];
            const note = res?.note ? `<div class="issue-note" style="font-style: normal;">${res.note}</div>` : '';

            let desc = '';

            // For Passed/NA, show status label
            let statusLabel = '';
            if (type === 'fail') statusLabel = 'Niezaliczony: ';
            else if (type === 'pass') statusLabel = 'Zaliczony: ';
            else if (type === 'na') statusLabel = 'Nie dotyczy: ';
            else if (type === 'nt') statusLabel = 'Nie do sprawdzenia: ';
            else if (type === 'verify') statusLabel = 'Do sprawdzenia: ';


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
                <header class="issue-title">
                    <span class="issue-id">${t.id}</span>
                    <span class="issue-status">${statusLabel.slice(0, -2)}</span>
                </header>
                <h4 class="issue-title-line2">${displayTitle}</h4>
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

    // Announce the verdict and list updates for screen readers
    let liveRegion = document.getElementById('status-message');
    if (liveRegion) {
        const verdictAnnouncement = verdictTitle.innerText + '. ' + verdictDesc.innerText.replace(/<br>/g, '. ').replace(/<[^>]*>/g, '');
        const listAnnouncement = `Znaleziono ${failedTests.length} niezgodności, ${verifyTests.length} do sprawdzenia, ${passedTests.length} zaliczonych, ${naTests.length} nie dotyczy, ${ntTests.length} nietestowalnych.`;
        liveRegion.innerText = verdictAnnouncement + ' ' + listAnnouncement;
    }

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
        const confirmed = await window.utils.confirm(
            M.reset.newAuditBody,
            M.reset.newAuditTitle,
            M.reset.confirmYes,
            M.navigation.confirmStay,
            'cancel'
        );
        if (confirmed) {
            // User confirmed starting a new audit: clear state and return to home
            window.utils.clearState();
            window.location.href = 'index.html';
        }
    };

    // Helper to generate filename (Removed - using window.utils.getFilename in utils.js)

    // Handle Ctrl+S / Cmd+S to save
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            window.utils.downloadAudit(state);

            // Dostępna informacja zwrotna
            const liveRegion = document.getElementById('status-message');
            if (liveRegion) {
                liveRegion.innerText = M.export.saveReportSuccess;
            }
        }
    });

    // --- Export Functions ---

    document.getElementById('export-json-btn').addEventListener('click', () => {
        window.utils.downloadAudit(state, false); // Final export (no draft_ prefix)
    });



    // Save Button Handler
    const saveBtn = document.getElementById('btn-save-audit');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            window.utils.downloadAudit(state, true); // Draft save
        });
    }

    // Helper used by navigation functions to sanitize test IDs for fragment links
    function sanitizeForDomId(str) {
        return String(str).replace(/[^a-zA-Z0-9_-]/g, '-');
    }

    // Edit responses button (takes user back to audit view)
    const editResponsesBtn = document.getElementById('btn-edit-responses');
    if (editResponsesBtn) {
        editResponsesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.setItem('returning-to-audit', 'true');
            // Navigate to the first clause's first test (if possible)
            const firstTest = (state.tests || []).find(t => t.clauseId) || (state.tests && state.tests[0]);
            const fragment = (firstTest && firstTest.id) ? `#test-${sanitizeForDomId(firstTest.id)}` : '';
            window.location.href = `audit.html${fragment}`;
        });
    }

    // Bottom edit responses button (under verdict card) — same behavior and accessibility helper
    const editResponsesBottom = document.getElementById('btn-edit-responses-bottom');
    if (editResponsesBottom) {
        editResponsesBottom.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.setItem('returning-to-audit', 'true');
            const firstTest = (state.tests || []).find(t => t.clauseId) || (state.tests && state.tests[0]);
            const fragment = (firstTest && firstTest.id) ? `#test-${sanitizeForDomId(firstTest.id)}` : '';
            window.location.href = `audit.html${fragment}`;
        });
    }

    // Edit config button
    const editBtn = document.getElementById('btn-edit-config');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.setItem('editing-audit', 'true');
            window.location.href = 'new-audit.html';
        });
    }

    // Ensure buttons reflect current theme state (role/aria-checked and sr-only state)
    try {
        if (typeof updateThemeToggleButtons === 'function') updateThemeToggleButtons(document.documentElement.getAttribute('data-theme'));
        // Remove redundant .theme-helper spans from theme toggles
        document.querySelectorAll('button[onclick*="toggleTheme"] .theme-helper').forEach(span => span.remove());
    } catch (e) {
        console.warn('Could not update theme toggle labels with state', e);
    }

    // App logo tooltip
    const appLogo = document.getElementById('app-logo');
    if (appLogo) appLogo.setAttribute('aria-label', M.navigation.home || appLogo.getAttribute('aria-label') || 'Strona główna');

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
        downloadAnchorNode.setAttribute('download', window.utils.getFilename(state.product, 'csv'));
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        // Dostępna informacja zwrotna
        const liveRegion = document.getElementById('status-message');
        if (liveRegion) {
            liveRegion.innerText = M.export.saveReportSuccess;
        }
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
            downloadAnchorNode.setAttribute("download", window.utils.getFilename(state.product, 'odt'));
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();

            // Dostępna informacja zwrotna
            const liveRegion = document.getElementById('status-message');
            if (liveRegion) {
                liveRegion.innerText = M.export.saveReportSuccess;
            }
        });
    }

    // Handle Home Link Click
    const homeLink = document.getElementById('app-logo');
    if (homeLink) {
        homeLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const confirmed = await window.utils.confirm(
                M.reset.newAuditBody,
                M.reset.newAuditTitle,
                M.reset.confirmYes,
                M.navigation.confirmStay,
                'cancel'
            );
            if (confirmed) {
                window.utils.clearState();
                window.location.href = 'index.html';
            }
        });
    }

    // Focus on verdict card for accessibility
    if (verdictCard) {
        verdictCard.focus();
    }
});

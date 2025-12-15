// Funkcje pomocnicze dla Narzędzia Audytowego EAA

const STORAGE_KEY = 'eaa_audit_state';

/**
 * Ładuje stan aplikacji z localStorage.
 * @returns {Object} Zapisany stan lub domyślny stan początkowy.
 */
function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Błąd parsowania zapisanego stanu:", e);
        }
    }
    return {
        product: '',
        executiveSummary: '', // Tekst podsumowania wykonawczego
        clauses: [], // Lista wybranych identyfikatorów klauzul
        tests: [],   // Spłaszczona lista wszystkich testów
        results: {}, // Klucz: testId, Wartość: { status: null, note: '' }
        currentIdx: 0
    };
}

/**
 * Zapisuje stan aplikacji do localStorage.
 * @param {Object} state Obiekt stanu do zapisania.
 */
function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Błąd zapisu stanu:", e);
        alert("Błąd zapisu stanu aplikacji. Sprawdź ustawienia przeglądarki.");
    }
}

/**
 * Czyści stan aplikacji z localStorage.
 */
function clearState() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Escapes XML special characters for ODT export.
 * @param {string} str The string to escape.
 * @returns {string} Escaped string.
 */
function xmlEscape(str) {
    if (!str) return '';
    // Zamień spacje niełamliwe na zwykłe spacje
    str = str.replace(/&nbsp;/g, ' ');
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

// App version for cache-busting verification
window.EAA_APP_VERSION = 'v13';
console.log('EAA App Version:', window.EAA_APP_VERSION);

/**
 * Inicjalizuje motyw na podstawie localStorage lub preferencji systemu.
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme ? savedTheme : (systemDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

/**
 * Przełącza motyw między jasnym a ciemnym.
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        if (theme === 'dark') {
            icon.setAttribute('data-lucide', 'sun');
        } else {
            icon.setAttribute('data-lucide', 'moon');
        }
        lucide.createIcons();
    }
}

/**
 * Wyświetla niestandardowe okno potwierdzenia.
 * @param {string} message Wiadomość do wyświetlenia.
 * @param {string} title Tytuł okna.
 * @param {string} confirmText Tekst przycisku potwierdzenia.
 * @param {string} cancelText Tekst przycisku anulowania.
 * @returns {Promise<boolean>} Promise rozwiązujący się na true jeśli potwierdzone, false w przeciwnym razie.
 */
/**
 * Wyświetla niestandardowe okno potwierdzenia.
 * @param {string} message Treść wiadomości
 * @param {string} title Tytuł dialogu
 * @param {string} confirmText Tekst przycisku potwierdzenia (wykona akcję)
 * @param {string} cancelText Tekst przycisku anulowania (anuluje akcję)
 * @param {string} focusOn Which button should be focused and placed on the right by default: 'confirm' or 'cancel'
 */
function confirmModal(message, title = "Potwierdzenie", confirmText = "Potwierdź", cancelText = "Anuluj", focusOn = 'confirm') {
    return new Promise((resolve) => {
        let dialog = document.getElementById('app-confirm-dialog');
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'app-confirm-dialog';
            dialog.setAttribute('aria-labelledby', 'dialog-title');
            // aria-describedby removed to prevent repetitive reading on child focus in VoiceOver
            dialog.innerHTML = `
                <h3 id="dialog-title" style="margin-top: 0;"></h3>
                <p id="dialog-message"></p>
                <div class="dialog-actions">
                    <button id="dialog-cancel" class="outline secondary"></button>
                    <button id="dialog-confirm"></button>
                </div>
            `;
            document.body.appendChild(dialog);
        }

        const titleEl = dialog.querySelector('#dialog-title');
        const msgEl = dialog.querySelector('#dialog-message');
        const cancelBtn = dialog.querySelector('#dialog-cancel');
        const confirmBtn = dialog.querySelector('#dialog-confirm');

        titleEl.textContent = title;
        msgEl.textContent = message;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        const close = (result) => {
            dialog.close();
            resolve(result);
        };

        cancelBtn.onclick = () => {
            console.log('confirmModal: cancelBtn clicked -> resolving false');
            close(false);
        };
        confirmBtn.onclick = () => {
            console.log('confirmModal: confirmBtn clicked -> resolving true');
            close(true);
        };

        // Handle ESC
        dialog.oncancel = (e) => {
            e.preventDefault();
            close(false);
        };

        const actions = dialog.querySelector('.dialog-actions');
        if (focusOn === 'cancel') {
            // Place the cancel button on the right and make it the primary (focused) action
            actions.classList.add('reverse-buttons');
            // Swap visual styling: make cancel primary, confirm secondary
            cancelBtn.classList.remove('outline','secondary');
            confirmBtn.classList.add('outline','secondary');
            cancelBtn.focus();
        } else {
            actions.classList.remove('reverse-buttons');
            // Ensure default styling: confirm is primary
            confirmBtn.classList.remove('outline','secondary');
            cancelBtn.classList.add('outline','secondary');
            confirmBtn.focus();
        }

        dialog.showModal();
    });
}

/**
 * Generuje raport EARL ze stanu aplikacji.
 * @param {Object} state Stan aplikacji.
 * @returns {Object} Obiekt raportu EARL.
 */
function generateEARL(state) {
    const context = {
        "earl": "http://www.w3.org/ns/earl#",
        "dct": "http://purl.org/dc/terms/",
        "foaf": "http://xmlns.com/foaf/0.1/",
        "sch": "http://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "eaa": "https://github.com/ka-er-zet/eaa-pfron#"
    };

    // Assertor (Narzędzie)
    const assertor = {
        "@id": "_:assertor",
        "@type": ["earl:Software", "earl:Assertor"],
        "dct:title": "Narzędzie Audytowe EAA",
        "dct:description": "Narzędzie do audytu dostępności cyfrowej wg EN 301 549",
        "dct:hasVersion": "1.0.0"
    };

    // Human Assertor (jeśli podany)
    let mainAssertor = assertor;
    if (state.auditor) {
        const humanAssertor = {
            "@id": "_:humanAssertor",
            "@type": ["foaf:Person", "earl:Assertor"],
            "foaf:name": state.auditor
        };

        // Utwórz złożony assertor
        mainAssertor = {
            "@id": "_:compoundAssertor",
            "@type": "earl:Assertor",
            "earl:mainAssertor": { "@id": "_:humanAssertor" },
            "dct:description": "Audyt przeprowadzony przez człowieka przy użyciu narzędzia"
        };
    }

    // Test Subject (Produkt)
    const testSubject = {
        "@id": "_:subject",
        "@type": ["earl:TestSubject", "sch:Product"],
        "dct:title": state.product || "Nieznany produkt",
        "dct:description": state.productDesc || '',
        "dct:date": new Date().toISOString()
    };

    // App Configuration (Custom extension to preserve state)
    const appConfig = {
        "@type": "eaa:Configuration",
        "eaa:clauses": state.clauses || [],
        "eaa:currentIdx": state.currentIdx || 0,
        "eaa:executiveSummary": state.executiveSummary || ''
    };

    // Assertions
    const assertions = state.tests.filter(t => t.type === 'test').map(t => {
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

    const graph = [assertor, testSubject, appConfig, ...assertions];
    if (state.auditor) {
        graph.unshift({
            "@id": "_:humanAssertor",
            "@type": ["foaf:Person", "earl:Assertor"],
            "foaf:name": state.auditor
        });
        graph.unshift(mainAssertor);
    }

    return {
        "@context": context,
        "@graph": graph
    };
}

/**
 * Parses an EARL report back into an application state object.
 * @param {Object} earlData The EARL report object.
 * @returns {Object} The reconstructed application state.
 */
function parseEARL(earlData) {
    const graph = earlData['@graph'] || [];

    // Find Config
    const config = graph.find(item => item['@type'] === 'eaa:Configuration') || {};

    // Find Subject
    const subject = graph.find(item => {
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        return types.includes('earl:TestSubject') || types.includes('sch:Product');
    }) || {};

    // Find Assertor (Human)
    const human = graph.find(item => {
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        return types.includes('foaf:Person');
    });

    const state = {
        product: subject['dct:title'] || '',
        productDesc: subject['dct:description'] || '',
        auditor: human ? human['foaf:name'] : '',
        executiveSummary: config['eaa:executiveSummary'] || '',
        clauses: config['eaa:clauses'] || [],
        currentIdx: config['eaa:currentIdx'] || 0,
        tests: [], // Will be re-populated by the app based on clauses
        results: {}
    };

    // Parse Assertions
    graph.forEach(item => {
        if (item['@type'] === 'earl:Assertion') {
            const testId = item['earl:test']?.['dct:identifier'];
            const result = item['earl:result'];

            if (testId && result) {
                let status = null;
                const outcome = result['earl:outcome']?.['@id'] || result['earl:outcome'];

                if (outcome === 'earl:passed') status = 'pass';
                else if (outcome === 'earl:failed') status = 'fail';
                else if (outcome === 'earl:inapplicable') status = 'na';
                else if (outcome === 'earl:cantTell') status = 'nt';

                state.results[testId] = {
                    status: status,
                    note: result['dct:description'] || ''
                };
            }
        }
    });

    return state;
}

/**
 * Oblicza statystyki audytu i werdykt na podstawie stanu.
 * @param {Object} state Stan aplikacji.
 * @returns {Object} Obiekt statystyk { total, passed, failed, na, nt, toVerify, verdict, verdictLabel }
 */
function getAuditStats(state) {
    const results = state.results || {};
    const tests = (state.tests || []).filter(t => t.type === 'test');

    const failedTests = tests.filter(t => results[t.id]?.status === 'fail' || results[t.id]?.status === 'Niezaliczone');
    const passedTests = tests.filter(t => results[t.id]?.status === 'pass' || results[t.id]?.status === 'Zaliczone');
    const naTests = tests.filter(t => results[t.id]?.status === 'na' || results[t.id]?.status === 'Nie dotyczy');
    const ntTests = tests.filter(t => results[t.id]?.status === 'nt' || results[t.id]?.status === 'Nietestowalne' || results[t.id]?.status === 'Nie do sprawdzenia');

    // "To Verify" = All tests - (Failed + Passed + NA + NT)
    const processedIds = new Set([...failedTests, ...passedTests, ...naTests, ...ntTests].map(t => t.id));
    const verifyTests = tests.filter(t => !processedIds.has(t.id));

    let verdict = 'in-progress';
    let verdictLabel = 'NIEZAKOŃCZONY';

    if (failedTests.length > 0) {
        verdict = 'failed';
        verdictLabel = 'NIEZALICZONY';
    } else if (verifyTests.length > 0) {
        verdict = 'in-progress';
        verdictLabel = 'NIEZAKOŃCZONY';
    } else {
        verdict = 'passed';
        if (passedTests.length === 0 && naTests.length > 0 && ntTests.length === 0) {
            verdictLabel = 'BRAK NIEZGODNOŚCI';
        } else {
            verdictLabel = 'ZALICZONY';
        }
    }

    return {
        total: tests.length,
        passed: passedTests.length,
        failed: failedTests.length,
        na: naTests.length,
        nt: ntTests.length,
        toVerify: verifyTests.length,
        verdict,
        verdictLabel,
        lists: {
            passed: passedTests,
            failed: failedTests,
            na: naTests,
            nt: ntTests,
            verify: verifyTests
        }
    };
}

/**
 * Fixes orphaned conjunctions in text by adding non-breaking spaces.
 * @param {string} text The text to fix.
 * @returns {string} The fixed text.
 */
function fixOrphans(text) {
    if (!text) return text;
    // Replace space + single letter (a, i, o, u, w, z) + space with space + letter + &nbsp;
    // Case insensitive.
    return text.replace(/(\s|^)([aiouwzAIOWZ])\s+/g, '$1$2&nbsp;');
}

/**
 * Returns the Polish label for a given status code.
 * @param {string} status The status code (pass, fail, na, nt, etc.)
 * @returns {string} The Polish label.
 */
function getStatusLabel(status) {
    if (!status || status === 'not-tested' || status === 'brak') return 'Nietestowany';
    if (status === 'pass' || status === 'Zaliczone') return 'Zaliczone';
    if (status === 'fail' || status === 'Niezaliczone') return 'Niezaliczone';
    if (status === 'na' || status === 'Nie dotyczy') return 'Nie dotyczy';
    if (status === 'nt' || status === 'Nietestowalne' || status === 'Nie do sprawdzenia') return 'Nietestowany';
    return status;
}

// Ensure skip links move focus programmatically for keyboard users
document.addEventListener('click', function (e) {
    const target = e.target;
    if (target && target.classList && target.classList.contains('skip-link')) {
        e.preventDefault();
        const href = target.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        const id = href.slice(1);
        const el = document.getElementById(id);
        if (el) {
            // Ensure element can be focused
            if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
            el.focus();
            // Update location hash without scrolling if possible
            if (history.replaceState) {
                history.replaceState(null, '', '#' + id);
            } else {
                window.location.hash = id;
            }
        }
    }
}, false);

/**
 * Generuje nazwę pliku dla raportu.
 * @param {string} product Nazwa produktu
 * @param {string} ext Rozszerzenie pliku (bez kropki)
 * @param {string} prefix Prefiks nazwy pliku (domyślnie 'raport_eaa_')
 * @returns {string} Nazwa pliku
 */
function getFilename(product, ext, prefix = 'raport_eaa_') {
    const date = new Date().toISOString().split('T')[0];
    const safeProduct = (product || 'produkt').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${prefix}${safeProduct}_${date}.${ext}`;
}

/**
 * Zapisuje stan i pobiera plik JSON z audytem (format EARL).
 * @param {Object} state Stan aplikacji
 * @param {boolean} isDraft Czy jest to wersja robocza (dodaje prefiks 'draft_')
 */
function downloadAudit(state, isDraft = true) {
    // 1. Zapisz do localStorage
    saveState(state);

    // 2. Generuj raport EARL
    const report = generateEARL(state);

    // 3. Pobierz stan jako JSON (format EARL)
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);

    const prefix = isDraft ? 'draft_raport_eaa_' : 'raport_eaa_';
    downloadAnchorNode.setAttribute("download", getFilename(state.product, 'json', prefix));

    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    // 4. Feedback dla czytników ekranu
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

// Expose functions globally
window.utils = {
    loadState,
    saveState,
    clearState,
    xmlEscape,
    initTheme,
    toggleTheme,
    confirm: confirmModal,
    generateEARL,
    parseEARL,
    fixOrphans,
    getAuditStats,
    fixOrphans,
    getAuditStats,
    getStatusLabel,
    downloadAudit
};

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
});

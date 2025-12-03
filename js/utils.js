// Utility functions for A11y Audit Tool

const STORAGE_KEY = 'eaa_audit_state';

/**
 * Loads the application state from localStorage.
 * @returns {Object} The saved state or a default initial state.
 */
function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse saved state:", e);
        }
    }
    return {
        product: '',
        executiveSummary: '', // Executive summary text
        clauses: [], // List of selected clause IDs
        tests: [],   // Flattened list of all tests
        results: {}, // Key: testId, Value: { status: null, note: '' }
        currentIdx: 0
    };
}

/**
 * Saves the application state to localStorage.
 * @param {Object} state The state object to save.
 */
function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save state:", e);
        alert("Błąd zapisu stanu aplikacji. Sprawdź ustawienia przeglądarki.");
    }
}

/**
 * Clears the application state from localStorage.
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

/**
 * Initializes the theme based on localStorage or system preference.
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme ? savedTheme : (systemDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

/**
 * Toggles the theme between light and dark.
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
 * Shows a custom confirmation modal.
 * @param {string} message The message to display.
 * @param {string} title The title of the modal.
 * @param {string} confirmText Text for the confirm button.
 * @param {string} cancelText Text for the cancel button.
 * @returns {Promise<boolean>} Promise resolving to true if confirmed, false otherwise.
 */
function confirmModal(message, title = "Potwierdzenie", confirmText = "Potwierdź", cancelText = "Anuluj") {
    return new Promise((resolve) => {
        let dialog = document.getElementById('app-confirm-dialog');
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'app-confirm-dialog';
            dialog.setAttribute('aria-labelledby', 'dialog-title');
            dialog.setAttribute('aria-describedby', 'dialog-message');
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

        cancelBtn.onclick = () => close(false);
        confirmBtn.onclick = () => close(true);
        
        // Handle ESC
        dialog.oncancel = (e) => {
            e.preventDefault();
            close(false);
        };

        dialog.showModal();
        confirmBtn.focus();
    });
}

/**
 * Generates an EARL report from the application state.
 * @param {Object} state The application state.
 * @returns {Object} The EARL report object.
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

    // App Configuration (Custom extension to preserve state)
    const appConfig = {
        "@type": "eaa:Configuration",
        "eaa:clauses": state.clauses || [],
        "eaa:currentIdx": state.currentIdx || 0,
        "eaa:executiveSummary": state.executiveSummary || ''
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
    parseEARL
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

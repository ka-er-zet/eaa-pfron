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

// Expose functions globally
window.utils = {
    loadState,
    saveState,
    clearState,
    xmlEscape,
    initTheme,
    toggleTheme
};

// Initialize theme on load
document.addEventListener('DOMContentLoaded', initTheme);

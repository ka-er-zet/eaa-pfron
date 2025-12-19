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
        console.warn('Failed to apply data-i18n on landing page', e);
    }

    // Enhance icon-only buttons with visible labels on hover/focus AFTER i18n is applied
    try {
        if (typeof enhanceIconButtons === 'function') enhanceIconButtons();
    } catch (e) {
        console.warn('Could not enhance icon buttons', e);
    }

    const btnLoad = document.getElementById('btn-load-audit');
    const fileInput = document.getElementById('file-input-audit');
    // Prevent accidental re-activation of the file chooser when confirming a file selection
    let fileActivationLocked = false;

    if (btnLoad && fileInput) {
        // Clicking the label will activate the file input; also support Enter/Space keyboard activation
        // Click on a native <label for="file-input-audit"> will activate the file picker automatically.
        // We avoid calling fileInput.click() here to prevent double-activation.
        btnLoad.addEventListener('click', (e) => {
            // No-op for mouse clicks: native label activation handles it.
            return;
        });
        btnLoad.addEventListener('keydown', (e) => {
            if (fileActivationLocked) return;
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                fileActivationLocked = true;
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', async (e) => {
            // Lock activation to prevent immediate re-opening when user confirms the file dialog
            fileActivationLocked = true;
            const file = e.target.files[0];
            if (!file) {
                // No file chosen (user cancelled) -> unlock
                fileActivationLocked = false;
                return;
            }

            // Remove focus from the load control so lingering keypresses don't re-trigger it
            if (btnLoad && typeof btnLoad.blur === 'function') btnLoad.blur();

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const json = event.target.result;
                    const data = JSON.parse(json);
                    let state;

                    if (data.tests && Array.isArray(data.tests)) {
                        state = data;
                    } else if (data['@graph'] || data['@context']) {
                        state = window.utils.parseEARL(data);
                    } else {
                        throw new Error(M.error.load.unknownFormat);
                    }

                    if (!state || typeof state !== 'object') {
                        throw new Error(M.error.load.invalidData);
                    }

                    window.utils.saveState(state);
                    // Indicate we loaded an audit file so the setup page can prefill the form
                    sessionStorage.setItem('loaded-audit', 'true');
                    // Mark that this navigation originates from an actual file load (used to announce success to screen readers)
                    sessionStorage.setItem('loaded-audit-success', 'true');

                    // Notify the user with an accessible alert before navigating
                    await window.utils.alert(M.error.load && M.error.load.loadSuccess ? M.error.load.loadSuccess : 'Plik audytu został poprawnie wczytany.');

                    window.location.href = 'new-audit.html';
                } catch (err) {
                    console.error(err);
                    await window.utils.alert(
                        `${M.error.load.loadError}\n\n${err.message}`
                    );
                } finally {
                    // ensure we unlock activation after a short delay to allow any lingering key events to settle
                    setTimeout(() => { fileActivationLocked = false; }, 200);
                }
            };
            reader.readAsText(file);
            fileInput.value = '';
        });
    }

    // Localize header button titles
    try {
        try {
            if (typeof updateThemeToggleButtons === 'function') updateThemeToggleButtons(document.documentElement.getAttribute('data-theme'));
            // Remove redundant .theme-helper spans from theme toggles
            document.querySelectorAll('button[onclick*="toggleTheme"] .theme-helper').forEach(span => span.remove());
        } catch (e) {
            console.warn('Could not update theme toggle labels with state', e);
        }

        const appIcon = document.querySelector('.header-icon-container');
        if (appIcon) {
            appIcon.setAttribute('aria-label', M.navigation.home || appIcon.getAttribute('aria-label') || 'Strona główna');
        }

        // Apply data-i18n attributes (use as single source of truth for localized strings)
        const getMessageByKey = (key) => {
            if (!key) return undefined;
            const parts = key.split('.');
            let cur = M;
            for (const p of parts) {
                if (!cur || !(p in cur)) return undefined;
                cur = cur[p];
            }
            return cur;
        };

        try {
            // Use shared helper to fill data-i18n attributes
            if (window.utils && typeof window.utils.applyDataI18n === 'function') {
                window.utils.applyDataI18n(M, document);
                if (location.search.includes('i18n-check') && typeof window.utils.checkDataI18n === 'function') {
                    window.utils.checkDataI18n(M, document);
                }
            }
        } catch (e) {
            console.warn('Failed to apply data-i18n localization', e);
        }
    } catch (e) {
        console.warn('Failed to set header titles on landing page', e);
    }
});

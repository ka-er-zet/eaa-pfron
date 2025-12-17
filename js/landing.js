import { MESSAGES_PL as M } from './messages.pl.js';
// docelowo: const M = window.i18n.getMessages();


document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const btnLoad = document.getElementById('btn-load-audit');
    const fileInput = document.getElementById('file-input-audit');

    if (btnLoad && fileInput) {
        btnLoad.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = event.target.result;
                    const data = JSON.parse(json);
                    let state;

                    if (data.tests && Array.isArray(data.tests)) {
                        state = data;
                    } else if (data['@graph'] || data['@context']) {
                        state = window.utils.parseEARL(data);
                    } else {
                        throw new Error(M.fileLoad.unknownFormat);
                    }

                    if (!state || typeof state !== 'object') {
                        throw new Error(M.fileLoad.invalidData);
                    }

                    window.utils.saveState(state);
                    // Indicate we loaded an audit file so the setup page can prefill the form
                    sessionStorage.setItem('loaded-audit', 'true');
                    // Mark that this navigation originates from an actual file load (used to announce success to screen readers)
                    sessionStorage.setItem('loaded-audit-success', 'true');
                    window.location.href = 'new-audit.html';

                } catch (err) {
                    console.error(err);
                    alert(
                        `${M.fileLoad.loadError}\n${err.message}`
                    );
                }
            };
            reader.readAsText(file);
            fileInput.value = '';
        });
    }

    // Localize header button titles
    try {
        // Only theme buttons
        document.querySelectorAll('button[onclick*="toggleTheme"]').forEach(el => {
            el.title = M.navigation.toggleTheme || el.title || 'Przełącz motyw';
        });

        const loadBtn = document.getElementById('btn-load-audit');
        if (loadBtn) loadBtn.title = M.navigation.home || loadBtn.title || 'Wczytaj audyt';

        const appIcon = document.querySelector('.header-icon-container');
        if (appIcon) appIcon.title = M.navigation.home || appIcon.title || 'Strona główna';
    } catch (e) {
        console.warn('Failed to set header titles on landing page', e);
    }
});

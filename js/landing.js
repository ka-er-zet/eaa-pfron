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
                    window.location.href = 'audit.html';

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
});

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // --- PWA Install Logic ---
    let deferredPrompt;
    const installContainer = document.getElementById('pwa-install-container');
    const installBtn = document.getElementById('pwa-install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI notify the user they can install the PWA
        if (installContainer) {
            installContainer.classList.remove('hidden');
        }
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (installContainer) {
                installContainer.classList.add('hidden');
            }
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        if (installContainer) {
            installContainer.classList.add('hidden');
        }
        deferredPrompt = null;
        console.log('PWA was installed');
    });
    // -------------------------

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

                    // Determine format
                    if (data.tests && Array.isArray(data.tests)) {
                        // Legacy/Internal State Format
                        state = data;
                    } else if (data['@graph'] || data['@context']) {
                        // EARL Format
                        state = window.utils.parseEARL(data);
                    } else {
                        throw new Error("Nieznany format pliku.");
                    }

                    // Basic Validation
                    if (!state || typeof state !== 'object') {
                        throw new Error("Nieprawidłowy format danych.");
                    }

                    // Save to localStorage
                    window.utils.saveState(state);

                    // Redirect
                    window.location.href = 'audit.html';

                } catch (err) {
                    console.error(err);
                    alert("Błąd podczas wczytywania pliku:\n" + err.message);
                }
            };
            reader.readAsText(file);
            
            // Reset input so same file can be selected again if needed
            fileInput.value = '';
        });
    }
});

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

                    // Określ format
                    if (data.tests && Array.isArray(data.tests)) {
                        // Starszy/Wewnętrzny Format Stanu
                        state = data;
                    } else if (data['@graph'] || data['@context']) {
                        // Format EARL
                        state = window.utils.parseEARL(data);
                    } else {
                        throw new Error("Nieznany format pliku.");
                    }

                    // Podstawowa walidacja
                    if (!state || typeof state !== 'object') {
                        throw new Error("Nieprawidłowy format danych.");
                    }

                    // Zapisz do localStorage
                    window.utils.saveState(state);

                    // Przekieruj
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

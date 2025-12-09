document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Obsługa kliknięcia linku do strony głównej
    const homeLink = document.getElementById('app-logo');
    if (homeLink) {
        homeLink.addEventListener('click', async (e) => {
            e.preventDefault(); // Zawsze zapobiegaj domyślnej nawigacji najpierw

            const nameInput = document.getElementById('product-name');
            const selectedCheckboxes = document.querySelectorAll('input[name="clauses"]:checked');
            
            // Sprawdź, czy formularz jest zmieniony
            const isDirty = (nameInput && nameInput.value.trim() !== '') || (selectedCheckboxes.length > 0);

            if (isDirty) {
                const stay = await window.utils.confirm(
                    "Wypełniłeś część formularza. Jeśli go opuścisz, stracisz te informacje. Czy chcesz przejść na stronę główną?",
                    "Niezapisane zmiany",
                    "Nie", // Główny przycisk (Potwierdź) -> Zwraca true -> Zostań
                    "Tak"  // Drugi przycisk (Anuluj) -> Zwraca false -> Wyjdź
                );
                
                // Jeśli użytkownik kliknął "Tak" (Drugi/Anuluj), stay jest false.
                if (!stay) {
                    window.location.href = 'index.html';
                }
            } else {
                // Brak zmian, bezpieczna nawigacja
                window.location.href = 'index.html';
            }
        });
    }

    // Wyczyść poprzedni stan przy wejściu na stronę konfiguracji
    window.utils.clearState();

    const form = document.getElementById('audit-setup-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            startAudit();
        });

        // Clear error on input
        const nameInput = document.getElementById('product-name');
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                nameInput.removeAttribute('aria-invalid');
                nameInput.setAttribute('aria-describedby', 'product-name-helper');
                const nameError = document.getElementById('product-name-error');
                if (nameError) nameError.classList.add('hidden');
            });
        }

        // Clear error on clauses change
        const clausesFieldset = document.getElementById('clauses-fieldset');
        if (clausesFieldset) {
            clausesFieldset.addEventListener('change', () => {
                clausesFieldset.removeAttribute('aria-invalid');
                const clausesError = document.getElementById('clauses-error');
                const clausesHelper = document.getElementById('clauses-helper');
                
                if (clausesError) clausesError.classList.add('hidden');
                if (clausesHelper) clausesHelper.classList.remove('hidden');
            });
        }
    }

    // Handle Ctrl+S to save configuration
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveConfiguration();
        }
    });

    function saveConfiguration() {
        const nameInput = document.getElementById('product-name');
        const descInput = document.getElementById('product-desc');
        const auditorInput = document.getElementById('auditor-name');
        const selectedCheckboxes = document.querySelectorAll('input[name="clauses"]:checked');
        
        const name = nameInput.value.trim();
        const desc = descInput ? descInput.value.trim() : '';
        const auditor = auditorInput ? auditorInput.value.trim() : '';
        const clausesToLoad = Array.from(selectedCheckboxes).map(cb => cb.value);

        // Basic validation for save
        if (!name || clausesToLoad.length === 0) {
            // Trigger standard validation UI
            startAudit(true); // Pass true to only validate/show errors
            return;
        }

        const initialState = {
            product: name,
            productDesc: desc,
            auditor: auditor,
            clauses: clausesToLoad,
            tests: [],
            results: {},
            currentIdx: 0
        };

        // Generate EARL
        const report = window.utils.generateEARL(initialState);
        
        // Download
        const date = new Date().toISOString().split('T')[0];
        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `config_eaa_${safeName}_${date}.json`;
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        // Feedback
        let liveRegion = document.getElementById('a11y-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'a11y-live-region';
            liveRegion.className = 'visually-hidden';
            liveRegion.setAttribute('aria-live', 'polite');
            document.body.appendChild(liveRegion);
        }
        liveRegion.innerText = 'Zapisano konfigurację audytu.';
    }

    async function startAudit(validateOnly = false) {
        const nameInput = document.getElementById('product-name');
        const descInput = document.getElementById('product-desc');
        const auditorInput = document.getElementById('auditor-name');
        
        const nameError = document.getElementById('product-name-error');
        const clausesError = document.getElementById('clauses-error');
        const clausesHelper = document.getElementById('clauses-helper');
        const clausesFieldset = document.getElementById('clauses-fieldset');
        
        const name = nameInput.value.trim();
        const desc = descInput ? descInput.value.trim() : '';
        const auditor = auditorInput ? auditorInput.value.trim() : '';
        
        // Reset errors
        nameInput.removeAttribute('aria-invalid');
        nameInput.setAttribute('aria-describedby', 'product-name-helper');
        if (clausesFieldset) clausesFieldset.removeAttribute('aria-invalid');
        if (nameError) nameError.classList.add('hidden');
        if (clausesError) clausesError.classList.add('hidden');
        if (clausesHelper) clausesHelper.classList.remove('hidden');

        let hasError = false;

        if (!name) {
            nameInput.setAttribute('aria-invalid', 'true');
            nameInput.setAttribute('aria-describedby', 'product-name-helper product-name-error');
            if (nameError) nameError.classList.remove('hidden');
            nameInput.focus();
            hasError = true;
        }

        const selectedCheckboxes = document.querySelectorAll('input[name="clauses"]:checked');
        if (selectedCheckboxes.length === 0) {
            if (clausesFieldset) clausesFieldset.setAttribute('aria-invalid', 'true');
            if (clausesError) {
                clausesError.classList.remove('hidden');
                if (clausesHelper) clausesHelper.classList.add('hidden');
                lucide.createIcons(); // Refresh icons for the new error message
            }
            
            // If name was valid, focus clauses. If name was invalid, we keep focus on name (first error).
            if (!hasError && clausesFieldset) {
                clausesFieldset.focus();
                // Scroll to the error message so it is clearly visible
                if (clausesError) {
                    clausesError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    clausesFieldset.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            hasError = true;
        }

        if (hasError || validateOnly) return;

        const clausesToLoad = Array.from(selectedCheckboxes).map(cb => cb.value);

        // Initialize State
        const initialState = {
            product: name,
            productDesc: desc,
            auditor: auditor,
            clauses: clausesToLoad,
            tests: [],
            results: {},
            currentIdx: 0
        };

        // Save to localStorage
        window.utils.saveState(initialState);

        // Redirect to Audit Page
        window.location.href = 'audit.html';
    }
});

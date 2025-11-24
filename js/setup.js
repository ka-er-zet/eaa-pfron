document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Clear any previous state when on setup page
    window.utils.clearState();

    const startBtn = document.getElementById('start-audit-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startAudit);
    }

    async function startAudit() {
        const nameInput = document.getElementById('product-name');
        const name = nameInput.value.trim();
        if (!name) {
            alert("Proszę podać nazwę produktu.");
            return;
        }

        const selectedCheckboxes = document.querySelectorAll('input[name="clauses"]:checked');
        if (selectedCheckboxes.length === 0) {
            alert("Proszę wybrać przynajmniej jeden zakres audytu.");
            return;
        }

        const clausesToLoad = Array.from(selectedCheckboxes).map(cb => cb.value);

        // Initialize State
        const initialState = {
            product: name,
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

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Clear any previous state when on setup page
    window.utils.clearState();

    // Toggle Scope Logic
    window.toggleScope = function (el, clauseId) {
        el.classList.toggle('checked');
        const isChecked = el.classList.contains('checked');
        el.setAttribute('aria-pressed', isChecked);

        const icon = el.querySelector('svg');
        if (isChecked) {
            icon.classList.add('text-primary');
            icon.style.color = 'var(--primary)';
        } else {
            icon.classList.remove('text-primary');
            icon.style.color = 'var(--muted-color)';
        }
    };

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

        const selectedCards = document.querySelectorAll('.scope-card.checked');
        if (selectedCards.length === 0) {
            alert("Proszę wybrać przynajmniej jeden zakres audytu.");
            return;
        }

        const clausesToLoad = Array.from(selectedCards).map(card => card.dataset.clause);

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

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Clear any previous state when on setup page
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

    async function startAudit() {
        const nameInput = document.getElementById('product-name');
        const nameError = document.getElementById('product-name-error');
        const clausesError = document.getElementById('clauses-error');
        const clausesHelper = document.getElementById('clauses-helper');
        const clausesFieldset = document.getElementById('clauses-fieldset');
        
        const name = nameInput.value.trim();
        
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
                // Scroll to the top of the fieldset to show the error message
                clausesFieldset.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            hasError = true;
        }

        if (hasError) return;

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

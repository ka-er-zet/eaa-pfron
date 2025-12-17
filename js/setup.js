import { MESSAGES_PL as M } from './messages-pl.js';
// docelowo: const M = window.i18n.getMessages();



document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Apply localization from data-i18n attributes
    try {
        if (window.utils && typeof window.utils.applyDataI18n === 'function') {
            window.utils.applyDataI18n(M, document);
            if (location.search.includes('i18n-check') && typeof window.utils.checkDataI18n === 'function') {
                window.utils.checkDataI18n(M, document);
            }
        }
    } catch (e) {
        console.warn('Failed to apply data-i18n on setup page', e);
    }

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
                // Ask the user before navigating away. Use consistent ordering:
                // confirm = "Leave", cancel = "Stay" and focus the safe option (cancel).
                const confirmed = await window.utils.confirm(
                    M.navigation.unsavedChangesBody,
                    M.navigation.unsavedChangesTitle,
                    M.navigation.confirmLeave,
                    M.navigation.confirmStay,
                    'cancel'
                );

                // If the user confirmed (chose "Leave"), navigate to the home page.
                if (confirmed) {
                    window.location.href = 'index.html';
                }
            } else {
                // Brak zmian, bezpieczna nawigacja
                window.location.href = 'index.html';
            }
        });
    }

    // If we arrived after loading a saved audit or via Edit → pre-fill the setup form from saved state
    const loadedFlag = sessionStorage.getItem('loaded-audit');
    const editingFlag = sessionStorage.getItem('editing-audit');
    if (loadedFlag || editingFlag) {
        const loaded = window.utils.loadState();
        if (loaded && typeof loaded === 'object') {
            const nameInput = document.getElementById('product-name');
            const descInput = document.getElementById('product-desc');
            const auditorInput = document.getElementById('auditor-name');

            if (nameInput && loaded.product) nameInput.value = loaded.product;
            if (descInput && loaded.productDesc) descInput.value = loaded.productDesc;
            if (auditorInput && loaded.auditor) auditorInput.value = loaded.auditor;

            // Pre-check clause checkboxes
            if (Array.isArray(loaded.clauses)) {
                const checkboxes = document.querySelectorAll('input[name="clauses"]');
                checkboxes.forEach(cb => {
                    if (loaded.clauses.includes(cb.value)) cb.checked = true;
                });
            }

            // If we loaded an audit file, ensure tests are populated so removal checks can detect existing answers
            if ((!Array.isArray(loaded.tests) || loaded.tests.length === 0) && Array.isArray(loaded.clauses) && loaded.clauses.length > 0) {
                // Lightweight reproduction of audit's test initialization; runs asynchronously so UI stays responsive
                const clauseCheckboxes = document.querySelectorAll('input[name="clauses"]');
                clauseCheckboxes.forEach(cb => cb.disabled = true);
                const clausesFieldsetEl = document.getElementById('clauses-fieldset');
                if (clausesFieldsetEl) clausesFieldsetEl.setAttribute('aria-busy', 'true');

                (async () => {
                    const tests = [];

                    const sanitizeForDomId = (str) => String(str).replace(/[^a-zA-Z0-9_-]/g, '-');

                    const processClauseContentLight = (content, clauseId, clauseTitle = null) => {
                        let currentHeading = null;
                        let testCounter = 0;

                        content.forEach(item => {
                            if (item.type === 'heading') {
                                currentHeading = item;
                                testCounter = 0;

                                const headingDomId = `heading-${sanitizeForDomId(item.text)}`;
                                tests.push({
                                    type: 'heading',
                                    id: headingDomId,
                                    title: item.text,
                                    level: item.level,
                                    wcag: item.wcag_level,
                                    clauseId: clauseId,
                                    clauseTitle: clauseTitle
                                });
                            } else if (item.type === 'test') {
                                testCounter++;
                                let testId = `test-${clauseId}-${tests.length}`;
                                let title = 'Test';
                                let wcag = '';

                                if (currentHeading) {
                                    const match = currentHeading.text.match(/(C\.\d+(?:\.\d+)+(?:\.[a-z])?)/);
                                    if (match) {
                                        testId = match[1];
                                        if (testCounter > 1) testId += `#${testCounter}`;
                                        title = currentHeading.text;
                                    } else {
                                        title = currentHeading.text;
                                    }

                                    if (currentHeading.wcag_level) wcag = currentHeading.wcag_level;
                                }

                                const testItem = {
                                    type: 'test',
                                    id: testId,
                                    clauseId: clauseId,
                                    title: title,
                                    wcag: wcag,
                                    evaluationType: item.evaluationType || null,
                                    preconditions: item.preconditions || [],
                                    procedure: item.procedure || [],
                                    form: item.form,
                                    notes: item.notes || [],
                                    detailedChecklist: item.detailedChecklist || [],
                                    implications: item.implications || [],
                                    derivations: item.derivations || null,
                                    clauseTitle: clauseTitle
                                };

                                // Avoid duplicating a heading immediately before an identical test title
                                const lastItem = tests[tests.length - 1];
                                if (lastItem && lastItem.type === 'heading' && lastItem.title === title) {
                                    if ((lastItem.level || 3) > 5) {
                                        tests.pop();
                                    }
                                }

                                tests.push(testItem);
                            }
                        });
                    };

                    try {
                        for (const clauseId of loaded.clauses) {
                            try {
                                const response = await fetch(`clauses_json/${clauseId}.json?v=${new Date().getTime()}`);
                                if (!response.ok) throw new Error(`Failed to load ${clauseId}`);
                                const data = await response.json();

                                const rawTitle = data.title || clauseId;
                                let titleSuffix = rawTitle;
                                if (rawTitle.indexOf(':') !== -1) {
                                    titleSuffix = rawTitle.split(':').slice(1).join(':').trim();
                                } else {
                                    const parts = rawTitle.split('-');
                                    if (parts.length > 1) titleSuffix = parts.slice(1).join('-').trim();
                                }
                                const clauseLabel = clauseId.toUpperCase().replace(/^C?([0-9]+)/, 'C.$1');
                                const clauseTitle = `${clauseLabel} ${titleSuffix}`;

                                processClauseContentLight(data.content || [], clauseId, clauseTitle);
                            } catch (e) {
                                console.warn('Failed to load clause in setup prefill:', clauseId, e);
                            }
                        }

                        // Save populated tests and ensure results entries exist
                        loaded.tests = tests;
                        loaded.results = loaded.results || {};
                        loaded.tests.forEach(t => {
                            if (t.type === 'test' && !loaded.results[t.id]) {
                                loaded.results[t.id] = { status: null, note: '' };
                            }
                        });

                        window.utils.saveState(loaded);

                        // Ensure that any results loaded from EARL that don't have matching test items
                        // are represented in `loaded.tests` so the UI can detect affected tests.
                        const existingTestIds = new Set((loaded.tests || []).map(t => t.id));
                        const orphanResultIds = Object.keys(loaded.results || {}).filter(id => !existingTestIds.has(id));
                        if (orphanResultIds.length > 0) {
                            orphanResultIds.forEach(rid => {
                                // Try to infer clauseId from result id
                                let inferredClause = null;
                                const m = rid.match(/^test-(c[0-9]+)-/i);
                                if (m && m[1]) {
                                    inferredClause = m[1].toLowerCase();
                                }

                                if (!inferredClause) {
                                    const matchC = rid.match(/(C\.\d+)/i);
                                    if (matchC && matchC[1]) {
                                        const num = matchC[1].replace('C.', '');
                                        inferredClause = `c${num}`;
                                    }
                                }

                                if (inferredClause) {
                                    loaded.tests.push({ type: 'test', id: rid, clauseId: inferredClause, title: rid, wcag: '' });
                                }
                            });
                            // Save again after adding inferred tests
                            window.utils.saveState(loaded);
                        }

                        // Re-enable checkboxes and announce completion for screen reader users
                        clauseCheckboxes.forEach(cb => cb.disabled = false);
                        if (clausesFieldsetEl) clausesFieldsetEl.removeAttribute('aria-busy');
                        ensureLiveRegion('Zainicjalizowano testy audytu.');
                    } catch (err) {
                        console.error('Error while populating tests for loaded audit:', err);
                    }
                })();
            }

            // Move focus to the product name so user can verify/adjust
            if (nameInput) nameInput.focus();
        }
        // Remove the flags so a normal navigation to setup behaves as usual
        sessionStorage.removeItem('loaded-audit');
        sessionStorage.removeItem('editing-audit');


    } else {
        window.utils.clearState();
    }

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

    // Handle Save Button
    const saveBtn = document.getElementById('btn-save-audit');
    if (saveBtn) {
        saveBtn.title = M.navigation.saveConfig || saveBtn.title || 'Zapisz konfigurację';
        if (!saveBtn.querySelector('.nav-helper')) {
            const span = document.createElement('span');
            span.className = 'sr-only nav-helper';
            span.textContent = M.navigation.saveConfigHelp || 'Zapisz konfigurację audytu';
            // Ensure no inline style makes it visible accidentally
            span.style.cssText = '';
            saveBtn.appendChild(span);
        }
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveConfiguration();
        });
    }

    // Theme toggle tooltip — target only buttons that call toggleTheme (avoid overwriting other actions)
    document.querySelectorAll('button[onclick*="toggleTheme"]').forEach(el => {
        el.title = M.navigation.toggleTheme || el.title || 'Przełącz motyw';
        if (!el.querySelector('.theme-helper')) {
            const span = document.createElement('span');
            span.className = 'sr-only theme-helper';
            span.textContent = M.navigation.themeModeHelp || 'Tryb jasny/ciemny';
            el.appendChild(span);
        }
    });

    // App logo tooltip
    const appLogo = document.getElementById('app-logo');
    if (appLogo) appLogo.setAttribute('aria-label', M.navigation.home || appLogo.getAttribute('aria-label') || 'Strona główna');

    // Helper to announce important a11y changes to screen readers
    function ensureLiveRegion(text) {
        let liveRegion = document.getElementById('a11y-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'a11y-live-region';
            liveRegion.className = 'sr-only';
            liveRegion.setAttribute('aria-live', 'polite');
            document.body.appendChild(liveRegion);
        }
        liveRegion.innerText = text;
    }

    // Polish-specific pluralization helper for 'test' in genitive after "dla"
    function pluralizeTests(n) {
        // Use genitive singular for 1, genitive plural otherwise
        return n === 1 ? 'testu' : 'testów';
    }

    // Handle clause checkbox immediate archive/restore behavior
    (function attachClauseHandlers() {
        const checkboxes = document.querySelectorAll('input[name="clauses"]');
        if (!checkboxes || checkboxes.length === 0) return;


        checkboxes.forEach(cb => {
            cb.addEventListener('change', async (e) => {
                const clauseId = cb.value;
                const state = window.utils.loadState();
                if (!state) return;

                // User is checking the clause -> attempt to restore archived data if present
                if (cb.checked) {
                    if (state._archived && state._archived[clauseId]) {
                        const archived = state._archived[clauseId];
                        state.results = state.results || {};
                        Object.assign(state.results, archived.results || {});
                        delete state._archived[clauseId];
                        if (!Array.isArray(state.clauses)) state.clauses = [];
                        if (!state.clauses.includes(clauseId)) state.clauses.push(clauseId);
                        window.utils.saveState(state);
                        ensureLiveRegion(M.setup.removedClausesNotice);
                    } else {
                        // Normal add
                        if (!Array.isArray(state.clauses)) state.clauses = [];
                        if (!state.clauses.includes(clauseId)) {
                            state.clauses.push(clauseId);
                            window.utils.saveState(state);
                        }
                    }
                    return;
                }

                // User is unchecking the clause -> check if there are answers to archive
                const affected = (state.tests || []).filter(t => t.clauseId === clauseId && state.results && state.results[t.id] && (state.results[t.id].status || state.results[t.id].note));
                if (!affected || affected.length === 0) {
                    // Safe to remove without confirmation
                    state.clauses = (state.clauses || []).filter(c => c !== clauseId);
                    window.utils.saveState(state);
                    return;
                }

                // Confirm archiving immediately
                const testsPhrase = `${affected.length} ${pluralizeTests(affected.length)}`;
                const message = (M.setup.removeClausesBody || 'Usunięcie tej klauzuli spowoduje utratę odpowiedzi dla {count}. Czy kontynuować?').replace('{count}', testsPhrase);
                const confirmed = await window.utils.confirm(
                    message,
                    M.setup.removeClausesTitle || 'Usuwanie klauzul',
                    M.setup.removeClausesConfirm || 'Usuń i archiwizuj',
                    M.setup.removeClausesCancel || 'Anuluj',
                    'cancel'
                );

                if (!confirmed) {
                    // revert checkbox
                    cb.checked = true;
                    cb.focus();
                    return;
                }

                // Permanently remove results and tests for this clause
                affected.forEach(t => {
                    if (state.results && state.results[t.id]) {
                        delete state.results[t.id];
                    }
                });
                // Remove tests from the active tests list
                state.tests = (state.tests || []).filter(t => t.clauseId !== clauseId);
                // Remove clause from selected list
                state.clauses = (state.clauses || []).filter(c => c !== clauseId);
                window.utils.saveState(state);

                // Inform user via live region (permanent deletion)
                ensureLiveRegion(M.setup.removedClausesNotice || 'Dane z tej klauzuli zostały trwale usunięte.');
            });
        });
    })();

    // Announce that a file was successfully loaded only if this navigation originated from a load action
    try {
        const loadedSuccess = sessionStorage.getItem('loaded-audit-success');
        if (loadedSuccess) {
            ensureLiveRegion(M.error.load && M.error.load.loadSuccess ? M.error.load.loadSuccess : 'Plik audytu został poprawnie wczytany.');
            sessionStorage.removeItem('loaded-audit-success');
        }
    } catch (e) {
        console.warn('Error announcing loaded-audit-success', e);
    }

    async function saveConfiguration() {
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

        // If user is removing previously-selected clauses that have answers, confirm archiving
        const existing = window.utils.loadState();
        if (existing && Array.isArray(existing.clauses)) {
            const removedClauses = existing.clauses.filter(c => !clausesToLoad.includes(c));
            if (removedClauses.length > 0 && Array.isArray(existing.tests) && existing.tests.length > 0) {
                const affected = existing.tests.filter(t => removedClauses.includes(t.clauseId) && existing.results && existing.results[t.id] && (existing.results[t.id].status || existing.results[t.id].note));
                if (affected && affected.length > 0) {
                    const testsPhrase = `${affected.length} ${pluralizeTests(affected.length)}`;
                    const message = (M.setup.removeClausesBody || 'Usunięcie tej klauzuli spowoduje trwałą utratę odpowiedzi dla {count}. Czy kontynuować?').replace('{count}', testsPhrase);
                    const confirmed = await window.utils.confirm(
                        message,
                        M.setup.removeClausesTitle || 'Usuwanie klauzul',
                        M.setup.removeClausesConfirm || 'Usuń i archiwizuj',
                        M.setup.removeClausesCancel || 'Anuluj',
                        'cancel'
                    );

                    if (!confirmed) {
                        // Re-check the removed checkboxes so UI reflects aborted removal
                        removedClauses.forEach(id => {
                            const cb = document.querySelector(`input[name="clauses"][value="${id}"]`);
                            if (cb) cb.checked = true;
                        });
                        const first = document.querySelector(`input[name="clauses"][value="${removedClauses[0]}"]`);
                        if (first) first.focus();
                        return;
                    }

                    // If confirmed, permanently remove affected data from the saved state so the draft reflects deletion
                    affected.forEach(t => {
                        if (existing.results && existing.results[t.id]) delete existing.results[t.id];
                    });
                    existing.tests = (existing.tests || []).filter(t => !removedClauses.includes(t.clauseId));
                    existing.clauses = (existing.clauses || []).filter(c => clausesToLoad.includes(c));
                    window.utils.saveState(existing);
                    ensureLiveRegion(M.setup.removedClausesNotice || 'Dane z tej klauzuli zostały trwale usunięte.');
                }
            }
        }

        // Preserve any existing test definitions/results that apply to the selected clauses
        let preservedTests = [];
        let preservedResults = {};
        let preservedIdx = 0;

        if (existing && Array.isArray(existing.tests) && existing.tests.length > 0) {
            // Keep only tests that belong to one of the chosen clauses
            preservedTests = existing.tests.filter(t => clausesToLoad.includes(t.clauseId));
        }

        if (existing && existing.results && preservedTests.length > 0) {
            preservedTests.forEach(t => {
                if (existing.results[t.id]) preservedResults[t.id] = existing.results[t.id];
            });
        }

        // Try to preserve the currently selected index if applicable
        if (existing && typeof existing.currentIdx === 'number' && preservedTests.length > 0) {
            const currentTest = (existing.tests || [])[existing.currentIdx];
            if (currentTest) {
                const newIdx = preservedTests.findIndex(t => t.id === currentTest.id);
                if (newIdx >= 0) preservedIdx = newIdx;
            }
        }

        const initialState = {
            product: name,
            productDesc: desc,
            auditor: auditor,
            clauses: clausesToLoad,
            tests: preservedTests,
            results: preservedResults,
            currentIdx: preservedIdx
        };

        // Generate and download using shared utility (as draft)
        window.utils.downloadAudit(initialState, true);
        ensureLiveRegion(M.setup.saveSuccess || 'Konfiguracja zapisana pomyślnie.');
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
            if (nameError) {
                nameError.classList.remove('hidden');
                lucide.createIcons(); // Render the alert icon
            }
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
            if (!hasError) {
                const firstCheckbox = document.getElementById('clause-c5');
                if (firstCheckbox) {
                    firstCheckbox.focus();
                }
                // Scroll to the error message so it is clearly visible
                if (clausesError) {
                    clausesError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else if (firstCheckbox) {
                    firstCheckbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            hasError = true;
        }

        if (hasError || validateOnly) return;

        const clausesToLoad = Array.from(selectedCheckboxes).map(cb => cb.value);

        // Initialize State (preserve any previously loaded results/tests)
        const existing = window.utils.loadState();
        const initialState = {
            product: name,
            productDesc: desc,
            auditor: auditor,
            clauses: clausesToLoad,
            tests: (existing && Array.isArray(existing.tests) && existing.tests.length > 0) ? existing.tests : [],
            results: (existing && existing.results) ? existing.results : {},
            currentIdx: (existing && typeof existing.currentIdx === 'number') ? existing.currentIdx : 0,
            executiveSummary: (existing && existing.executiveSummary) ? existing.executiveSummary : ''
        };

        // Save to localStorage
        window.utils.saveState(initialState);

        // Redirect to Audit Page
        window.location.href = 'audit.html';
    }
});

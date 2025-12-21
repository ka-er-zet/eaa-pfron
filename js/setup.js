import { MESSAGES_PL as M } from './messages-pl.js';
// docelowo: const M = window.i18n.getMessages();
window.M = M;

let profilesData = null;
let clausesConfig = null;
let previousProfileBeforeChange = null;
let previousProfileClauses = [];
let isLoadingAudit = false;

// Polish-specific pluralization helper for 'test' in genitive after "dla"
function pluralizeTests(n) {
    // Use genitive singular for 1, genitive plural otherwise
    return n === 1 ? (M.setup.testWordGenitiveSingular || 'testu') : (M.setup.testWordGenitivePlural || 'testów');
}

// Handle profile selection to auto-select clauses
async function handleProfileChange(e) {
    if (e.target.name !== 'profile') return;
    const selectedValue = e.target.value;
    const previousSelected = previousProfileBeforeChange || null;
    previousProfileBeforeChange = null;
    const clauseCheckboxes = document.querySelectorAll('input[name="clauses"]');
    
    // Temporarily set the new profile to calculate changes
    let newCheckedClauses = [];
    if (selectedValue === 'none') {
        // No clauses checked
    } else {
        // Find the item with matching name
        let selectedClauses = [];
        if (profilesData) {
            for (const category of profilesData.products) {
                const item = category.items.find(i => i.name === selectedValue);
                if (item) {
                    selectedClauses = item.clauses;
                    break;
                }
            }
            // Also check services
            if (selectedClauses.length === 0) {
                for (const category of profilesData.services) {
                    const item = category.items.find(i => i.name === selectedValue);
                    if (item) {
                        selectedClauses = item.clauses;
                        break;
                    }
                }
            }
        }
        newCheckedClauses = selectedClauses;
    }
    
    // Check which clauses would be removed
    const currentChecked = Array.from(clauseCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
    const removedClauses = currentChecked.filter(c => !newCheckedClauses.includes(c));
    
    // If removing clauses with answers, confirm
    if (removedClauses.length > 0) {
        const state = window.utils.loadState();
        if (state && Array.isArray(state.tests) && state.tests.length > 0) {
            const affected = state.tests.filter(t => removedClauses.includes(t.clauseId) && state.results && state.results[t.id] && (state.results[t.id].status || state.results[t.id].note));
            if (affected && affected.length > 0) {
                const testsPhrase = `${affected.length} ${pluralizeTests(affected.length)}`;
                const message = (M.setup.removeClausesBody || 'Zmiana profilu spowoduje utratę odpowiedzi dla {count}. Czy kontynuować?').replace('{count}', testsPhrase);
                const confirmed = await window.utils.confirm(
                    message,
                    M.setup.removeClausesTitle || 'Zmiana profilu',
                    M.setup.removeClausesConfirm || 'Zmień profil',
                    M.setup.removeClausesCancel || 'Anuluj',
                    'cancel'
                );
                if (!confirmed) {
                    // Revert to previous profile
                    if (previousSelected) {
                        const prevRadio = document.querySelector(`input[name="profile"][value="${previousSelected}"]`);
                        if (prevRadio) prevRadio.checked = true;
                    }
                    return;
                }
            }
        }
    }
    
    // Apply the changes
    if (selectedValue === 'none') {
        clauseCheckboxes.forEach(cb => cb.checked = false);
        updateProfileStatus(M.setup.profileNoneSelected || 'Wybrano: Brak profilu / Wybór ręczny');
        ensureLiveRegion(M.setup.profileNoneSelectedLive || 'Wybrano: Brak profilu / Wybór ręczny. Wszystkie klauzule odznaczone.');
    } else {
        // Check the corresponding clauses
        clauseCheckboxes.forEach(cb => {
            cb.checked = newCheckedClauses.includes(cb.value);
        });
        
        // Also set additional clauses checkboxes: c12 always checked, c13 only if in profile
        const additionalClauses = ['c12', 'c13'];
        additionalClauses.forEach(clause => {
            const additionalCb = document.querySelector(`input[name="additional_clauses"][value="${clause}"]`);
            if (additionalCb) {
                if (clause === 'c12') {
                    additionalCb.checked = true; // c12 is always required
                    // Also set main checkbox
                    const mainCb = document.getElementById(`clause-${clause}`);
                    if (mainCb) mainCb.checked = true;
                } else {
                    additionalCb.checked = newCheckedClauses.includes(clause);
                    // Also set main checkbox if in profile
                    if (newCheckedClauses.includes(clause)) {
                        const mainCb = document.getElementById(`clause-${clause}`);
                        if (mainCb) mainCb.checked = true;
                    }
                }
            }
        });
        
        // Remember which clauses were set by this profile
        previousProfileClauses = [...newCheckedClauses];
        
        // Sync additional checkboxes
        const c12Additional = document.querySelector('input[name="additional_clauses"][value="c12"]');
        if (c12Additional) c12Additional.checked = true;
        const c13Additional = document.querySelector('input[name="additional_clauses"][value="c13"]');
        if (c13Additional) {
            c13Additional.checked = newCheckedClauses.includes('c13');
            c13Additional.closest('label').style.display = newCheckedClauses.includes('c13') ? 'none' : 'block';
        }
        
        updateProfileStatus((M.setup.profileSelected || 'Wybrano profil: {profile}. Zaznaczono klauzule: {clauses}').replace('{profile}', selectedValue).replace('{clauses}', newCheckedClauses.join(', ')));
        
        // Announce to screen readers
        const profileName = selectedValue === 'none' ? 'Brak profilu / Wybór ręczny' : selectedValue;
        const clausesList = newCheckedClauses.length > 0 ? newCheckedClauses.map(cid => {
            const clause = clausesConfig.find(c => c.id === cid);
            return clause ? clause.title : cid;
        }).join(', ') : 'brak';
        ensureLiveRegion((M.setup.profileSelectedLive || 'Wybrano profil: {profile}. Powiązane klauzule: {clauses}').replace('{profile}', profileName).replace('{clauses}', clausesList));
    }
    
    // Save the selected profile to localStorage
    const existing = window.utils.loadState() || {};
    existing.selectedProfile = selectedValue;
    window.utils.saveState(existing);
}

// Handle additional clauses checkboxes
async function handleAdditionalClauses(e) {
    if (e.target.name !== 'additional_clauses') return;
    if (isLoadingAudit) return; // Skip during audit loading

    const clause = e.target.value;
    const cb = document.getElementById(`clause-${clause}`);
    if (!cb) return;

    const state = window.utils.loadState();
    if (!state) return;

    // If checking the additional clause -> attempt to restore archived data if present
    if (e.target.checked) {
        if (state._archived && state._archived[clause]) {
            const archived = state._archived[clause];
            state.results = state.results || {};
            Object.assign(state.results, archived.results || {});
            delete state._archived[clause];
            if (!Array.isArray(state.clauses)) state.clauses = [];
            if (!state.clauses.includes(clause)) state.clauses.push(clause);
            window.utils.saveState(state);
            ensureLiveRegion(M.setup.dataRestored || 'Dane zostały przywrócone.');
        } else {
            // Normal add
            if (!Array.isArray(state.clauses)) state.clauses = [];
            if (!state.clauses.includes(clause)) {
                state.clauses.push(clause);
                window.utils.saveState(state);
            }
        }
        cb.checked = true;
    } else {
        // If unchecking -> check if there are answers to archive
        const affected = (state.tests || []).filter(t => t.clauseId === clause && state.results && state.results[t.id] && (state.results[t.id].status || state.results[t.id].note));
        if (!affected || affected.length === 0) {
            // Safe to remove without confirmation
            state.clauses = (state.clauses || []).filter(c => c !== clause);
            window.utils.saveState(state);
            cb.checked = false;
        } else {
            // Confirm archiving
            const testsPhrase = `${affected.length} ${pluralizeTests(affected.length)}`;
            const message = (window.M?.setup?.removeClausesBody || 'Usunięcie tej klauzuli spowoduje trwałą utratę odpowiedzi dla {count}. Czy kontynuować?').replace('{count}', testsPhrase);
            const confirmed = await window.utils.confirm(
                message,
                window.M?.setup?.removeClausesTitle || 'Usuwanie klauzul',
                window.M?.setup?.removeClausesConfirm || 'Usuń',
                window.M?.setup?.removeClausesCancel || 'Anuluj',
                'cancel'
            );

            if (!confirmed) {
                // Revert checkbox
                e.target.checked = true;
                return;
            }

            // Permanently remove
            affected.forEach(t => {
                if (state.results && state.results[t.id]) {
                    delete state.results[t.id];
                }
            });
            state.tests = (state.tests || []).filter(t => t.clauseId !== clause);
            state.clauses = (state.clauses || []).filter(c => c !== clause);
            window.utils.saveState(state);
            cb.checked = false;
            ensureLiveRegion(window.M?.setup?.removedClausesNotice || 'Dane z tej klauzuli zostały trwale usunięte.');
        }
    }

    // Additional logic for profile switching
    const currentProfile = document.querySelector('input[name="profile"]:checked')?.value;
    const profileRequiresClause = currentProfile && profilesData && 
        (profilesData.products.some(p => p.id === currentProfile && p.clauses.includes(clause)) ||
         profilesData.services.some(s => s.id === currentProfile && s.clauses.includes(clause)));
    if (clause === 'c12' || clause === 'c13') {
        if (!e.target.checked && profileRequiresClause) {
            // Unchecking a clause required by profile -> switch to none
            const noneRadio = document.querySelector('input[name="profile"][value="none"]');
            if (noneRadio) {
                noneRadio.checked = true;
                updateProfileStatus(M.setup.clauseRequiredUnselected || 'Odznaczono klauzulę wymaganą przez profil. Profil ustawiony na ręczny.');
            }
        }
    } else {
        updateProfileStatus((M.setup.clauseToggled || 'Klauzula {clause} {action}').replace('{clause}', clause).replace('{action}', e.target.checked ? 'zaznaczona' : 'odznaczona'));
    }
}

// Apply additional clauses based on their checkboxes
function applyAdditionalClauses() {
    const additionalCheckboxes = document.querySelectorAll('input[name="additional_clauses"]');
    additionalCheckboxes.forEach(checkbox => {
        const clause = checkbox.value;
        const cb = document.getElementById(`clause-${clause}`);
        if (cb) {
            cb.checked = checkbox.checked;
        }
    });
}

// Update profile status for screen readers
function updateProfileStatus(message) {
    const statusDiv = document.getElementById('profile-status');
    if (statusDiv) {
        statusDiv.textContent = message;
    }
}

// Update clauses status for screen readers
function updateClausesStatus(message) {
    const statusDiv = document.getElementById('clauses-status');
    if (statusDiv) {
        statusDiv.textContent = message;
    }
}



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
        console.warn('Failed to apply data-i18n on setup page', e);
    }

    // Enhance icon-only buttons with visible labels on hover/focus AFTER i18n is applied
    try {
        if (typeof enhanceIconButtons === 'function') enhanceIconButtons();
    } catch (e) {
        console.warn('Could not enhance icon buttons', e);
    }

    // Load clauses configuration and product/service profiles from JSON
    const form = document.getElementById('audit-setup-form');
    loadClausesConfig().then(() => {
        // Load profiles after clauses config
        return loadProfiles();
    }).then(() => {

    // Handle profile selection to auto-select clauses
    const profileFieldsetEl = document.getElementById('profile-fieldset');
    if (profileFieldsetEl) {
        // Capture previous selection before change occurs
        profileFieldsetEl.addEventListener('pointerdown', (ev) => {
            previousProfileBeforeChange = document.querySelector('input[name="profile"]:checked')?.value || null;
        });
        profileFieldsetEl.addEventListener('change', handleProfileChange);
        
        // Handle additional clauses
        profileFieldsetEl.addEventListener('change', handleAdditionalClauses);
    }
    
    // Handle manual changes to clauses - switch to manual profile if deviating from profile settings
    document.getElementById('clauses-fieldset').addEventListener('change', (e) => {
        if (e.target.name === 'clauses') {
            // Sync additional checkboxes for c12/c13
            if (e.target.value === 'c12' || e.target.value === 'c13') {
                const additionalCb = document.querySelector(`input[name="additional_clauses"][value="${e.target.value}"]`);
                if (additionalCb) {
                    additionalCb.checked = e.target.checked;
                }
            }
            
            const currentChecked = Array.from(document.querySelectorAll('input[name="clauses"]:checked')).map(cb => cb.value);
            // Check deviation: other clauses must match exactly, c12/c13 only if their state changed from profile
            const isDeviation = (() => {
                const otherCurrent = currentChecked.filter(c => !['c12', 'c13'].includes(c));
                const otherPrevious = previousProfileClauses.filter(c => !['c12', 'c13'].includes(c));
                if (otherCurrent.length !== otherPrevious.length || 
                    !otherCurrent.every(c => otherPrevious.includes(c)) || 
                    !otherPrevious.every(c => otherCurrent.includes(c))) {
                    return true;
                }
                // For c12/c13, deviation only if they were required by profile and now unchecked
                for (const clause of ['c12', 'c13']) {
                    const wasInProfile = previousProfileClauses.includes(clause);
                    const isNowChecked = currentChecked.includes(clause);
                    if (wasInProfile && !isNowChecked) {
                        return true;
                    }
                }
                return false;
            })();
            if (isDeviation) {
                const noneRadio = document.querySelector('input[name="profile"][value="none"]');
                if (noneRadio && !noneRadio.checked) {
                    noneRadio.checked = true;
                    updateClausesStatus(M.setup.clausesChangedToManual || 'Zmieniono klauzule w stosunku do profilu. Profil ustawiony na ręczny.');
                }
            }
            
            // Update status for screen readers with selected clauses
            const selectedClauses = Array.from(document.querySelectorAll('input[name="clauses"]:checked')).map(cb => {
                const titleEl = document.getElementById(`${cb.value}-title`);
                return titleEl ? titleEl.textContent : cb.value;
            });
            const statusMessage = selectedClauses.length > 0 ? (M.setup.selectedClauses || 'Wybrane klauzule: {clauses}').replace('{clauses}', selectedClauses.join(', ')) : (M.setup.noSelectedClauses || 'Brak wybranych klauzul');
            updateClausesStatus(statusMessage);
        }
    });
    const clauseCheckboxes = document.querySelectorAll('input[name="clauses"]');
    clauseCheckboxes.forEach(cb => {
        cb.addEventListener('focus', () => {
            const scopeItem = cb.closest('.scope-item');
            if (scopeItem) {
                // Use setTimeout to let the browser's default scroll-to-focused-element finish,
                // then adjust to ensure the whole card is visible with margin.
                setTimeout(() => {
                    const rect = scopeItem.getBoundingClientRect();
                    const windowHeight = window.innerHeight;
                    const margin = 80; // Margin from top/bottom

                    // Only apply bottom adjustment if element fits in viewport (to avoid hiding top)
                    if (rect.height < windowHeight) {
                        if (rect.bottom > windowHeight - margin) {
                            window.scrollBy({ top: rect.bottom - windowHeight + margin, behavior: 'smooth' });
                        } else if (rect.top < margin) {
                            window.scrollBy({ top: rect.top - margin, behavior: 'smooth' });
                        }
                    } else {
                        // If tall, just ensure top is visible (checkbox location)
                        if (rect.top < margin) {
                            window.scrollBy({ top: rect.top - margin, behavior: 'smooth' });
                        }
                    }
                }, 50);
            }
        });
    });

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

                // If the user confirmed (chose "Leave"), clear state and navigate to the home page.
                if (confirmed) {
                    window.utils.saveState({}); // Clear audit state
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

            // Set selected profile
            if (loaded.selectedProfile) {
                const profileRadio = document.querySelector(`input[name="profile"][value="${loaded.selectedProfile}"]`);
                if (profileRadio) {
                    profileRadio.checked = true;
                    // Trigger profile change to sync checkboxes
                    handleProfileChange({ target: profileRadio });
                }
            }

            // Sync additional checkboxes based on loaded clauses
            if (Array.isArray(loaded.clauses)) {
                isLoadingAudit = true;
                const c12Additional = document.querySelector('input[name="additional_clauses"][value="c12"]');
                if (c12Additional) c12Additional.checked = loaded.clauses.includes('c12');
                const c13Additional = document.querySelector('input[name="additional_clauses"][value="c13"]');
                if (c13Additional) {
                    c13Additional.checked = loaded.clauses.includes('c13');
                    // Hide if profile requires it
                    const profileRequiresC13 = loaded.selectedProfile && profilesData && 
                        (profilesData.products.some(p => p.id === loaded.selectedProfile && p.clauses.includes('c13')) ||
                         profilesData.services.some(s => s.id === loaded.selectedProfile && s.clauses.includes('c13')));
                    c13Additional.closest('label').style.display = profileRequiresC13 ? 'none' : 'block';
                }
                isLoadingAudit = false;
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
                        ensureLiveRegion(M.setup.testsInitialized || 'Zainicjalizowano testy audytu.');
                    } catch (err) {
                        console.error('Error while populating tests for loaded audit:', err);
                    }
                })();
            }

            // Move focus to the product name so user can verify/adjust
            if (nameInput) nameInput.focus();

            // Announce context to screen readers
            if (typeof window.utils.setStatusMessage === 'function') {
                if (editingFlag) {
                    window.utils.setStatusMessage(M.setup.editingConfig || "Edycja konfiguracji audytu.", 5000);
                } else if (loadedFlag) {
                    window.utils.setStatusMessage(M.setup.loadedAudit || "Wczytano audyt z pliku.", 5000);
                }
            }
        }
        // Remove the flags so a normal navigation to setup behaves as usual
        sessionStorage.removeItem('loaded-audit');
        sessionStorage.removeItem('editing-audit');
    }
    });

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
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveConfiguration();
        });
    }

    // Ensure buttons reflect current theme state (role/aria-checked and sr-only state)
    try {
        if (typeof updateThemeToggleButtons === 'function') updateThemeToggleButtons(document.documentElement.getAttribute('data-theme'));
        // Remove redundant .theme-helper spans from theme toggles
        document.querySelectorAll('button[onclick*="toggleTheme"] .theme-helper').forEach(span => span.remove());
    } catch (e) {
        console.warn('Could not update theme toggle labels with state', e);
    }

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
    // Moved to top of file

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
                const message = (window.M?.setup?.removeClausesBody || 'Usunięcie tej klauzuli spowoduje utratę odpowiedzi dla {count}. Czy kontynuować?').replace('{count}', testsPhrase);
                const confirmed = await window.utils.confirm(
                    message,
                    window.M?.setup?.removeClausesTitle || 'Usuwanie klauzul',
                    window.M?.setup?.removeClausesConfirm || 'Usuń',
                    window.M?.setup?.removeClausesCancel || 'Anuluj',
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
                    const message = (window.M?.setup?.removeClausesBody || 'Usunięcie tej klauzuli spowoduje trwałą utratę odpowiedzi dla {count}. Czy kontynuować?').replace('{count}', testsPhrase);
                    const confirmed = await window.utils.confirm(
                        message,
                        window.M?.setup?.removeClausesTitle || 'Usuwanie klauzul',
                        window.M?.setup?.removeClausesConfirm || 'Usuń',
                        window.M?.setup?.removeClausesCancel || 'Anuluj',
                        'cancel'
                    );

                    if (!confirmed) {
                        // Re-check the removed checkboxes so UI reflects aborted removal
                        removedClauses.forEach(id => {
                            const cb = document.querySelector(`input[name="clauses"][value="${id}"]`);
                            if (cb) cb.checked = true;
                        });
                        const first = document.querySelector(`input[name="clauses"][value="${removedClauses[0]}"]`);
                        if (first) {
                            first.focus();
                        }
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

        // Get selected profile
        const selectedProfileRadio = document.querySelector('input[name="profile"]:checked');
        const selectedProfile = selectedProfileRadio ? selectedProfileRadio.value : 'none';

        // Initialize State (new audit - clear previous data)
        const initialState = {
            product: name,
            productDesc: desc,
            auditor: auditor,
            selectedProfile: selectedProfile,
            clauses: clausesToLoad,
            tests: [],
            results: {},
            currentIdx: 0,
            executiveSummary: ''
        };

        // Save to localStorage
        window.utils.saveState(initialState);

        // Redirect to Audit Page
        window.location.href = 'audit.html';
    }
});

// Load product/service profiles from JSON
async function loadProfiles() {
    try {
        const response = await fetch('clauses_json/products_services_map.json');
        if (!response.ok) throw new Error('Failed to load profiles');
        const data = await response.json();
        profilesData = data; // Store for later use
        
        const container = document.querySelector('#profile-fieldset div');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Add "None" option first
        const noneLabel = document.createElement('label');
        noneLabel.innerHTML = '<input type="radio" name="profile" value="none" checked> Brak profilu / Wybór ręczny';
        container.appendChild(noneLabel);
        
        // Add profiles from JSON, grouped by category
        let profileCounter = 0;
        data.products.forEach(category => {
            // Add category header
            const categoryHeader = document.createElement('h4');
            categoryHeader.textContent = category.category;
            categoryHeader.style.marginTop = '1rem';
            categoryHeader.style.marginBottom = '0.5rem';
            categoryHeader.style.fontSize = '1rem';
            categoryHeader.style.fontWeight = 'bold';
            categoryHeader.style.color = 'var(--primary-color)';
            container.appendChild(categoryHeader);
            
            // Add items in this category
            category.items.forEach(item => {
                const label = document.createElement('label');
                label.className = 'profile-item';
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'profile';
                input.value = item.name; // Use name as value

                // Build description of associated clauses and resolve human-readable titles when possible
                const clauses = Array.isArray(item.clauses) ? item.clauses : [];
                const clauseLabels = clauses.map(cid => {
                    try {
                        // Use clausesConfig if available, otherwise fallback to DOM lookup
                        if (clausesConfig) {
                            const clause = clausesConfig.find(c => c.id === cid);
                            if (clause) {
                                let titleText = clause.title.replace(/^C\.\d+[\s:\-]*/i, '').trim();
                                titleText = titleText.replace(/\s*\(Klauzula\s*\d+\)\s*$/i, '').trim();
                                titleText = titleText.replace(/\s*Klauzula\s*\d+\s*$/i, '').trim();
                                return `${cid.toUpperCase()}: ${titleText}`;
                            }
                        }
                        // Fallback to DOM lookup
                        const titleEl = document.getElementById(`${cid}-title`);
                        if (titleEl && titleEl.textContent) {
                            let titleText = titleEl.textContent.replace(/^C\.\d+[\s:\-]*/i, '').trim();
                            titleText = titleText.replace(/\s*\(Klauzula\s*\d+\)\s*$/i, '').trim();
                            titleText = titleText.replace(/\s*Klauzula\s*\d+\s*$/i, '').trim();
                            return `${cid.toUpperCase()}: ${titleText}`;
                        }
                    } catch (e) { /* ignore */ }
                    return cid.toUpperCase();
                });
                const clausesText = clauseLabels.length > 0 ? clauseLabels.join('; ') : '';
                const desc = clausesText ? `Powiązane klauzule: ${clausesText}` : 'Brak powiązanych klauzul';

                // Use short ID for helper element
                const helperId = `profile-clauses-${++profileCounter}`;

                // Radio gets accessible name from label text, description from helper
                input.setAttribute('aria-describedby', helperId);

                const titleSpan = document.createElement('span');
                titleSpan.className = 'profile-title';
                titleSpan.textContent = item.name;
                label.appendChild(input);
                label.appendChild(titleSpan);

                // Visible helper showing clause descriptions
                const helper = document.createElement('small');
                helper.id = helperId;
                helper.className = 'text-muted text-small clause-helper';
                helper.textContent = desc;
                label.appendChild(helper);

                // Layout is handled by CSS (.profile-item uses grid); avoid inline display styles here
                container.appendChild(label);
            });
        });
        
        // Add services from JSON, grouped by category
        data.services.forEach(category => {
            // Add category header
            const categoryHeader = document.createElement('h4');
            categoryHeader.textContent = category.category;
            categoryHeader.style.marginTop = '1rem';
            categoryHeader.style.marginBottom = '0.5rem';
            categoryHeader.style.fontSize = '1rem';
            categoryHeader.style.fontWeight = 'bold';
            categoryHeader.style.color = 'var(--primary-color)';
            container.appendChild(categoryHeader);
            
            // Add items in this category
            category.items.forEach(item => {
                const label = document.createElement('label');
                label.className = 'profile-item';
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'profile';
                input.value = item.name; // Use name as value

                // Build description of associated clauses and resolve human-readable titles when possible
                const clauses = Array.isArray(item.clauses) ? item.clauses : [];
                const clauseLabels = clauses.map(cid => {
                    try {
                        // Use clausesConfig if available, otherwise fallback to DOM lookup
                        if (clausesConfig) {
                            const clause = clausesConfig.find(c => c.id === cid);
                            if (clause) {
                                let titleText = clause.title.replace(/^C\.\d+[\s:\-]*/i, '').trim();
                                titleText = titleText.replace(/\s*\(Klauzula\s*\d+\)\s*$/i, '').trim();
                                titleText = titleText.replace(/\s*Klauzula\s*\d+\s*$/i, '').trim();
                                return `${cid.toUpperCase()}: ${titleText}`;
                            }
                        }
                        // Fallback to DOM lookup
                        const titleEl = document.getElementById(`${cid}-title`);
                        if (titleEl && titleEl.textContent) {
                            let titleText = titleEl.textContent.replace(/^C\.\d+[\s:\-]*/i, '').trim();
                            titleText = titleText.replace(/\s*\(Klauzula\s*\d+\)\s*$/i, '').trim();
                            titleText = titleText.replace(/\s*Klauzula\s*\d+\s*$/i, '').trim();
                            return `${cid.toUpperCase()}: ${titleText}`;
                        }
                    } catch (e) { /* ignore */ }
                    return cid.toUpperCase();
                });
                const clausesText = clauseLabels.length > 0 ? clauseLabels.join('; ') : '';
                const desc = clausesText ? `Powiązane klauzule: ${clausesText}` : 'Brak powiązanych klauzul';

                // Use short ID for helper element
                const helperId = `profile-clauses-${++profileCounter}`;

                // Radio gets accessible name from label text, description from helper
                input.setAttribute('aria-describedby', helperId);

                const titleSpan = document.createElement('span');
                titleSpan.className = 'profile-title';
                titleSpan.textContent = item.name;
                label.appendChild(input);
                label.appendChild(titleSpan);

                // Visible helper showing clause descriptions
                const helper = document.createElement('small');
                helper.id = helperId;
                helper.className = 'text-muted text-small clause-helper';
                helper.textContent = desc;
                label.appendChild(helper);

                // Layout is handled by CSS (.profile-item uses grid); avoid inline display styles here
                container.appendChild(label);
            });
        });
        
        // Add additional clauses section
        const additionalHeader = document.createElement('h4');
        additionalHeader.textContent = 'Dodatkowe klauzule';
        additionalHeader.style.marginTop = '1rem';
        additionalHeader.style.marginBottom = '0.5rem';
        additionalHeader.style.fontSize = '1rem';
        additionalHeader.style.fontWeight = 'bold';
        additionalHeader.style.color = 'var(--primary-color)';
        container.appendChild(additionalHeader);
        
        // Load additional clauses from metadata
        if (data.metadata && data.metadata.additional_clauses) {
            data.metadata.additional_clauses.forEach(clause => {
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.name = 'additional_clauses';
                input.value = clause.id;
                if (clause.default_checked && clause.id !== 'c12') {
                    input.checked = true;
                }
                label.appendChild(input);
                label.appendChild(document.createTextNode(' ' + clause.question));
                label.style.display = 'block';
                container.appendChild(label);
            });
        }
    } catch (error) {
        console.error('Error loading profiles:', error);
        // Fallback: add basic options
        const container = document.querySelector('#profile-fieldset div');
        if (container) {
            container.innerHTML = `
                <label><input type="radio" name="profile" value="none" checked> Brak profilu / Wybór ręczny</label>
                <label><input type="radio" name="profile" value="bankomat"> Bankomat</label>
                <label><input type="radio" name="profile" value="strona-banku"> Strona internetowa banku</label>
                <label><input type="radio" name="profile" value="aplikacja-mobilna"> Aplikacja mobilna</label>
            `;
        }
    }
}

// Load clauses configuration from JSON and generate HTML
async function loadClausesConfig() {
    try {
        const response = await fetch('clauses_json/clauses_config.json');
        if (!response.ok) throw new Error('Failed to load clauses config');
        const data = await response.json();
        clausesConfig = data.clauses;

        // Generate HTML for clauses
        const container = document.querySelector('#scope-grid');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Generate clause items
        data.clauses.forEach(clause => {
            const scopeItem = document.createElement('div');
            scopeItem.className = 'scope-item';

            scopeItem.innerHTML = `
                <input type="checkbox" id="clause-${clause.id}" name="clauses" value="${clause.id}"
                    class="scope-checkbox sr-only" aria-labelledby="${clause.id}-title" aria-describedby="${clause.id}-desc">
                <label for="clause-${clause.id}" class="scope-card">
                    <i data-lucide="${clause.icon}" class="text-muted" aria-hidden="true"></i>
                    <div>
                        <strong id="${clause.id}-title" style="display: block;">${clause.title}</strong>
                        <small id="${clause.id}-desc" class="text-muted">${clause.description}</small>
                    </div>
                </label>
            `;

            container.appendChild(scopeItem);
        });

        // Re-create icons for dynamically added content
        lucide.createIcons();

    } catch (error) {
        console.error('Error loading clauses config:', error);
        // Fallback: keep existing HTML if JSON fails to load
    }
}

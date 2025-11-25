document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();

    // Load State immediately to ensure it's available for event listeners
    const state = window.utils.loadState();

    // Handle Home Link Click
    const homeLink = document.getElementById('app-logo');
    if (homeLink) {
        homeLink.addEventListener('click', async (e) => {
            e.preventDefault(); // Always prevent default navigation first

            // Check if there is any progress
            const hasProgress = state.tests && state.tests.some(test => {
                const res = state.results[test.id];
                return res && (res.status || res.note);
            });

            if (hasProgress) {
                const stay = await window.utils.confirm(
                    "Masz niezapisane wyniki. Jeśli wyjdziesz, stracisz je. Czy chcesz przejść na stronę główną?",
                    "Niezapisane zmiany",
                    "Nie", // Primary button (Confirm) -> Returns true -> Stay
                    "Tak"  // Secondary button (Cancel) -> Returns false -> Leave
                );
                
                // If user clicked "Tak" (Secondary/Cancel), stay is false.
                if (!stay) {
                    window.location.href = 'index.html';
                }
            } else {
                // No progress, safe to navigate
                window.location.href = 'index.html';
            }
        });
    }

    // --- Function Definitions ---

    // Skip nav link behavior: focus test content
    const skipNav = document.querySelector('.skip-nav-link');
    if (skipNav) {
        skipNav.addEventListener('click', (e) => {
            e.preventDefault();
            const renderer = document.getElementById('test-renderer');
            if (renderer) renderer.focus();
        });
    }

    function sanitizeForDomId(str) {
        // Convert any potentially problematic characters into safe ones for DOM ids and URL fragments
        return String(str).replace(/[^a-zA-Z0-9_-]/g, '-');
    }

    function stripNumbering(text) {
        return text.replace(/^\d+\.\s*/, '');
    }

    function ensureFragmentAnchors(tests, excludeId = null) {
        const fragmentContainerId = 'fragment-anchor-container';
        let fragContainer = document.getElementById(fragmentContainerId);
        if (!fragContainer) {
            fragContainer = document.createElement('div');
            fragContainer.id = fragmentContainerId;
            fragContainer.setAttribute('aria-hidden', 'true');
            fragContainer.style.position = 'absolute';
            fragContainer.style.left = '-9999px';
            fragContainer.style.top = '0';
            fragContainer.style.width = '1px';
            fragContainer.style.height = '1px';
            fragContainer.style.overflow = 'hidden';
            document.body.appendChild(fragContainer);
        }
        
        fragContainer.innerHTML = '';
        
        tests.forEach(t => {
            let id;
            if (t.type === 'test') {
                id = `test-${sanitizeForDomId(t.id)}`;
            } else if (t.type === 'heading') {
                id = t.id;
            }
            
            if (id && id !== excludeId) {
                const el = document.createElement('span');
                el.id = id;
                el.className = 'fragment-anchor visually-hidden';
                fragContainer.appendChild(el);
            }
        });
    }

    function renderNav() {
        const container = document.getElementById('nav-container');
        if (!container) return;

        container.innerHTML = '';
        // Create a semantic list for navigation
        const ul = document.createElement('ul');
        ul.className = 'nav-list';
        let completed = 0;
        let totalTests = 0;

        state.tests.forEach((item, idx) => {
            // Handle Headings
            if (item.type === 'heading') {
                const li = document.createElement('li');
                li.className = `nav-heading level-${item.level || 3}`;
                // Render heading text as non-interactive element (structure only)
                const hTag = document.createElement(`h${Math.min(item.level || 3, 6)}`);
                hTag.className = 'nav-heading-title';
                hTag.innerText = item.title;
                li.appendChild(hTag);
                ul.appendChild(li);
                return;
            }

            // Handle Tests
            totalTests++;
            const res = state.results[item.id] || { status: null };
            const active = idx === state.currentIdx;
            if (res.status) completed++;

            let icon = 'circle';
            let color = 'var(--muted-color)';
            let statusText = 'Do wykonania';

            if (res.status === 'Zaliczone' || res.status === 'pass') { 
                icon = 'check-circle-2'; 
                color = 'var(--pass-color)'; 
                statusText = 'Zaliczone';
            }
            if (res.status === 'Niezaliczone' || res.status === 'fail') { 
                icon = 'x-circle'; 
                color = 'var(--fail-color)'; 
                statusText = 'Niezaliczone';
            }
            if (res.status === 'Nie dotyczy' || res.status === 'na') { 
                icon = 'minus-circle'; 
                color = 'var(--na-color)'; 
                statusText = 'Nie dotyczy';
            }
            if (res.status === 'nt') { 
                icon = 'help-circle'; 
                color = 'var(--nt-color)'; 
                statusText = 'Nietestowalne';
            }

            const li = document.createElement('li');
            li.className = 'nav-list-item';
            const a = document.createElement('a');
            a.className = `nav-item ${active ? 'active' : ''}`;
            const anchorDomId = `test-${sanitizeForDomId(item.id)}`;
            a.href = `#${anchorDomId}`; // preserves semantics and allows anchors
            a.setAttribute('data-target-id', anchorDomId);
            
            // Clean up title (remove duplicated ID)
            let displayTitle = item.title;
            const baseId = item.id.split('#')[0]; // Remove #1, #2 suffix if present
            if (displayTitle.startsWith(baseId)) {
                displayTitle = displayTitle.substring(baseId.length).replace(/^[\.\:\-\s]+/, '');
            }

            // Accessibility & Keyboard Navigation
            // `a` elements are natively operable and focusable
            a.setAttribute('data-test-id', item.id);
            a.setAttribute('aria-label', `Przejdź do testu ${item.id}: ${displayTitle}. Status: ${statusText}`);
            a.setAttribute('aria-controls', anchorDomId);
            if (active) a.setAttribute('aria-current', 'true');
            
            const activate = (e) => {
                if (e) e.preventDefault();
                // Update the URL hash to represent the selected test
                try { history.replaceState(null, '', `#${anchorDomId}`); } catch (err) { location.hash = `#${anchorDomId}`; }
                renderTest(idx);
                // Ensure the clicked anchor receives focus after re-render
                setTimeout(() => {
                    const newEl = document.querySelector(`a.nav-item[data-test-id="${item.id}"]`);
                    if (newEl) newEl.focus();
                }, 0);
            };

            a.addEventListener('click', activate);
            // Keyboard: arrow navigation inside the list
            a.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = a.closest('li').nextElementSibling;
                    if (next) {
                        const nextA = next.querySelector('a.nav-item');
                        if (nextA) nextA.focus();
                    }
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prev = a.closest('li').previousElementSibling;
                    if (prev) {
                        const prevA = prev.querySelector('a.nav-item');
                        if (prevA) prevA.focus();
                    }
                } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate();
                }
            });

            // Icon on the right, Text on the left
            a.innerHTML = `
                <div class="nav-text-wrapper">
                    <span class="nav-id">${item.id}</span>
                    <div class="nav-title">${displayTitle}</div>
                </div>
                <div class="nav-icon-wrapper">
                    <i data-lucide="${icon}" style="color: ${color}; width: 18px; height: 18px;" aria-hidden="true"></i>
                </div>
            `;
            li.appendChild(a);
            ul.appendChild(li);
        });

        // Append the list to the container and update progress
        container.appendChild(ul);
        // Update Progress
        const progressText = document.getElementById('progress-text');
        const mainProgress = document.getElementById('main-progress');

        if (progressText) progressText.innerText = `${completed}/${totalTests}`;
        if (mainProgress) mainProgress.value = totalTests ? (completed / totalTests) * 100 : 0;

        lucide.createIcons();

        // Scroll active item into view
        const activeItem = container.querySelector('.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // Helper to find next/prev test index (skipping headings)
    function getNextTestIndex(currentIdx) {
        let next = currentIdx + 1;
        while (next < state.tests.length && state.tests[next].type === 'heading') {
            next++;
        }
        return next < state.tests.length ? next : -1;
    }

    function getPrevTestIndex(currentIdx) {
        let prev = currentIdx - 1;
        while (prev >= 0 && state.tests[prev].type === 'heading') {
            prev--;
        }
        return prev >= 0 ? prev : -1;
    }

    window.renderTest = function (idx) {
        if (idx < 0 || idx >= state.tests.length) return;

        // If trying to render a heading, skip to next test
        if (state.tests[idx].type === 'heading') {
            const nextIdx = getNextTestIndex(idx);
            if (nextIdx !== -1) renderTest(nextIdx);
            return;
        }

        state.currentIdx = idx;
        window.utils.saveState(state); // Save current index

        const item = state.tests[idx];
        const container = document.getElementById('test-renderer');
        if (!container) return;

        // Store which element had focus before re-rendering
        const previousFocus = document.activeElement;
        const previousFocusId = previousFocus && previousFocus.getAttribute('data-test-id');
        // Also check if focus was on a form element
        const previousFocusInputId = previousFocus && previousFocus.id;

        renderNav(); // Re-render nav to update active state

        // Restore focus if it was in the nav
        if (previousFocusId) {
             const newFocus = document.querySelector(`.nav-item[data-test-id="${previousFocusId}"]`);
             if (newFocus) newFocus.focus();
        } else if (previousFocusInputId) {
            // Try to restore focus to the same input ID (e.g. radio button or textarea)
            // We need to wait for the content to be rendered first, but renderTest continues below...
            // Actually, renderTest replaces innerHTML of container, so we can only restore focus AFTER that.
        } else {
            // ...
        }

        // Handle Test View
        const res = state.results[item.id];
        
        let preconditionsHtml = '';
        if (item.preconditions && item.preconditions.length > 0) {
            preconditionsHtml = `<div class="test-details"><strong>Warunki wstępne:</strong><ol>${item.preconditions.map(p => `<li>${stripNumbering(p)}</li>`).join('')}</ol></div>`;
        }

        let procedureHtml = '';
        if (item.procedure && item.procedure.length > 0) {
            procedureHtml = `<div class="test-details"><strong>Procedura:</strong><ol>${item.procedure.map(p => `<li>${stripNumbering(p)}</li>`).join('')}</ol></div>`;
        }

        let notesHtml = '';
        if (item.notes && item.notes.length > 0) {
            notesHtml = `<div class="informative" style="margin-top: 1rem;"><strong>UWAGA:</strong><ul>${item.notes.map(n => `<li>${n}</li>`).join('')}</ul></div>`;
        }

        let wcagBadge = '';
        if (item.wcag) {
            const levelClass = item.wcag === 'AA' ? 'poziom-aa' : 'poziom-a';
            wcagBadge = `<span class="${levelClass}">Poziom ${item.wcag}</span>`;
        }

        // Evaluation Criteria (Form)
        let evaluationHtml = '';
        if (item.form && item.form.inputs) {
            evaluationHtml = `<fieldset class="evaluation-criteria" style="border: none; padding: 0; margin: 0;">
                <legend class="visually-hidden">Ocena kryteriów</legend>`;
            item.form.inputs.forEach(input => {
                let icon = 'circle';
                let colorClass = '';
                if (input.value === 'Zaliczone' || input.value === 'pass') { icon = 'check'; colorClass = 'pass'; }
                if (input.value === 'Niezaliczone' || input.value === 'fail') { icon = 'x'; colorClass = 'fail'; }
                if (input.value === 'Nie dotyczy' || input.value === 'na') { icon = 'minus'; colorClass = 'na'; }
                
                const isSelected = res.status === input.value;
                const inputId = `eval-${item.id}-${input.value}`;
                
                evaluationHtml += `
                    <div class="criteria-option-wrapper">
                        <input type="radio" id="${inputId}" name="eval-${item.id}" value="${input.value}" 
                               class="visually-hidden criteria-radio" 
                               ${isSelected ? 'checked' : ''} 
                               onchange="setResult('${item.id}', '${input.value}')">
                        <label for="${inputId}" class="criteria-option ${colorClass} ${isSelected ? 'selected' : ''}">
                            <div class="criteria-header">
                                <i data-lucide="${icon}" aria-hidden="true"></i>
                                <strong>${input.value.toUpperCase()}</strong>
                            </div>
                            <div class="criteria-text">${input.label}</div>
                        </label>
                    </div>
                `;
            });
            evaluationHtml += `</fieldset>`;
        } else {
            // Fallback to old grid if no form data
            evaluationHtml = `
            <fieldset class="eval-grid" style="border: none; padding: 0; margin: 1rem 0 0 0;">
                <legend class="visually-hidden">Ocena wyniku testu</legend>
                
                <div class="eval-btn-wrapper">
                    <input type="radio" id="eval-${item.id}-pass" name="eval-${item.id}" value="Zaliczone" 
                           class="visually-hidden eval-radio" ${res.status === 'Zaliczone' || res.status === 'pass' ? 'checked' : ''}
                           onchange="setResult('${item.id}', 'Zaliczone')">
                    <label for="eval-${item.id}-pass" class="eval-btn pass ${res.status === 'Zaliczone' || res.status === 'pass' ? 'selected' : ''}">
                        <i data-lucide="check" size="28" aria-hidden="true"></i>
                        <strong>Zaliczone</strong>
                    </label>
                </div>

                <div class="eval-btn-wrapper">
                    <input type="radio" id="eval-${item.id}-fail" name="eval-${item.id}" value="Niezaliczone" 
                           class="visually-hidden eval-radio" ${res.status === 'Niezaliczone' || res.status === 'fail' ? 'checked' : ''}
                           onchange="setResult('${item.id}', 'Niezaliczone')">
                    <label for="eval-${item.id}-fail" class="eval-btn fail ${res.status === 'Niezaliczone' || res.status === 'fail' ? 'selected' : ''}">
                        <i data-lucide="x" size="28" aria-hidden="true"></i>
                        <strong>Niezaliczone</strong>
                    </label>
                </div>

                <div class="eval-btn-wrapper">
                    <input type="radio" id="eval-${item.id}-na" name="eval-${item.id}" value="Nie dotyczy" 
                           class="visually-hidden eval-radio" ${res.status === 'Nie dotyczy' || res.status === 'na' ? 'checked' : ''}
                           onchange="setResult('${item.id}', 'Nie dotyczy')">
                    <label for="eval-${item.id}-na" class="eval-btn na ${res.status === 'Nie dotyczy' || res.status === 'na' ? 'selected' : ''}">
                        <i data-lucide="minus" size="28" aria-hidden="true"></i>
                        <strong>Nie dotyczy</strong>
                    </label>
                </div>

                <div class="eval-btn-wrapper">
                    <input type="radio" id="eval-${item.id}-nt" name="eval-${item.id}" value="nt" 
                           class="visually-hidden eval-radio" ${res.status === 'nt' ? 'checked' : ''}
                           onchange="setResult('${item.id}', 'nt')">
                    <label for="eval-${item.id}-nt" class="eval-btn nt ${res.status === 'nt' ? 'selected' : ''}">
                        <i data-lucide="help-circle" size="28" aria-hidden="true"></i>
                        <strong>Nietestowalne</strong>
                    </label>
                </div>
            </fieldset>`;
        }

        // Build a safe DOM id for the content matching the anchor used in the nav
        const anchorDomId = `test-${sanitizeForDomId(item.id)}`;

        // Ensure all other tests have hidden anchors, but remove the anchor for THIS test so we can use the ID on the article
        ensureFragmentAnchors(state.tests, anchorDomId);

        // Clean title for H1 (remove ID if present at start)
        let cleanTitle = item.title;
        if (cleanTitle.startsWith(item.id)) {
            cleanTitle = cleanTitle.substring(item.id.length).trim();
            // Remove potential separator like " - " or ": "
            cleanTitle = cleanTitle.replace(/^[:\-\.]+\s*/, '');
        }

        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;">
                    <span style="color: var(--h1-color); font-weight: bold;">${item.id}</span>
                    ${wcagBadge}
                </div>
                <h1 id="${anchorDomId}-title" style="margin: 0; color: var(--h1-color);">${cleanTitle}</h1>
            </div>
            
            <article tabindex="-1" role="region" aria-labelledby="${anchorDomId}-title" style="border-left: 4px solid var(--primary);" ${!document.getElementById(anchorDomId) ? `id="${anchorDomId}"` : ''}>
                <div style="padding: 1.5rem;">
                    ${preconditionsHtml}
                    ${procedureHtml}
                    ${notesHtml}
                </div>

                <form onsubmit="return false;" style="padding: 0 1.5rem 1.5rem 1.5rem;">
                    <h2 style="margin-top: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #334155; color: var(--muted-color); font-size: 1.25rem;">Ocena</h2>

                    ${evaluationHtml}

                    <div style="margin-top: 2rem;">
                        <label for="note-${item.id}" style="color: var(--muted-color);">Uwagi / Obserwacje</label>
                        <textarea id="note-${item.id}" rows="4" oninput="updateNote('${item.id}', this.value)">${res.note}</textarea>
                    </div>
                </form>
            </article>

            <div style="display: flex; justify-content: space-between; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #334155; gap: 1rem;">
                <button class="outline secondary" ${getPrevTestIndex(idx) === -1 ? 'disabled' : ''} onclick="renderTest(${getPrevTestIndex(idx)})">
                    <i data-lucide="arrow-left" style="margin-right: 8px;" aria-hidden="true"></i> Poprzedni
                </button>
                ${getNextTestIndex(idx) === -1
                ? `<button onclick="finishAudit()" style="background: var(--pass-color); border:none;">Zakończ Audyt <i data-lucide="check-circle" style="margin-left: 8px;" aria-hidden="true"></i></button>`
                : `<button onclick="renderTest(${getNextTestIndex(idx)})">Następny <i data-lucide="arrow-right" style="margin-left: 8px;" aria-hidden="true"></i></button>`
            }
            </div>
        `;
        lucide.createIcons();

        // Update URL hash to reflect currently viewed test (never create extra history entries)
        try { history.replaceState(null, '', `#${anchorDomId}`); } catch (err) { location.hash = `#${anchorDomId}`; }

        // After rendering, move focus to the content region to make keyboard flow logical and satisfy validators
        // UNLESS we are restoring focus to a form element
        if (previousFocusInputId) {
            const restoredInput = document.getElementById(previousFocusInputId);
            if (restoredInput) {
                restoredInput.focus();
            }
        } else {
            // Scroll the main container to the very top
            const mainContainer = document.querySelector('main');
            if (mainContainer) {
                mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
            // Set focus to the article for accessibility (without scrolling again)
            const contentEl = document.getElementById(anchorDomId);
            if (contentEl) {
                contentEl.focus({ preventScroll: true });
            }
        }
    };

    window.setResult = function (id, status) {
        state.results[id].status = status;
        window.utils.saveState(state);
        renderNav();
        renderTest(state.currentIdx);
    };

    window.updateNote = function (id, val) {
        state.results[id].note = val;
        window.utils.saveState(state);
    };

    window.finishAudit = function () {
        window.utils.saveState(state);
        window.location.href = 'summary.html';
    };

    function processClauseContent(content, clauseId) {
        let currentHeading = null;
        let testCounter = 0;

        content.forEach(item => {
            if (item.type === 'heading') {
                currentHeading = item;
                testCounter = 0; // Reset counter for new section

                // Build a sanitized id based on heading text, so nav headings become valid fragment targets
                const headingDomId = `heading-${sanitizeForDomId(item.text)}`;

                // Add heading to state so it appears in nav
                state.tests.push({
                    type: 'heading',
                    id: headingDomId, // Internal & fragment-friendly ID
                    title: item.text,
                    level: item.level,
                    wcag: item.wcag_level
                });

            } else if (item.type === 'test') {
                testCounter++;
                let testId = `test-${clauseId}-${state.tests.length}`;
                let title = "Test";
                let wcag = "";

                if (currentHeading) {
                    const match = currentHeading.text.match(/(C\.\d+(\.\d+)+(\.[a-z])?)/);
                    if (match) {
                        testId = match[1];
                        if (testCounter > 1) {
                            testId += `#${testCounter}`;
                        }
                        title = currentHeading.text;
                    } else {
                        title = currentHeading.text;
                    }

                    if (currentHeading.wcag_level) {
                        wcag = currentHeading.wcag_level;
                    }
                }

                const testItem = {
                    type: 'test',
                    id: testId,
                    clauseId: clauseId,
                    title: title,
                    wcag: wcag,
                    preconditions: item.preconditions || [],
                    procedure: item.procedure || [],
                    form: item.form,
                    notes: item.notes || []
                };

                // Check for duplication: if the last item was a heading with the same title, remove it.
                // This prevents "Heading X" followed immediately by "Test X" in the sidebar.
                const lastItem = state.tests[state.tests.length - 1];
                if (lastItem && lastItem.type === 'heading' && lastItem.title === title) {
                    state.tests.pop();
                }

                state.tests.push(testItem);

                // Initialize result if not exists
                if (!state.results[testId]) {
                    state.results[testId] = { status: null, note: '' };
                }
            }
        });
    }

    async function loadClauses(clauses) {
        state.tests = [];

        const loadingOverlay = document.createElement('div');
        loadingOverlay.style.position = 'fixed';
        loadingOverlay.style.top = '0';
        loadingOverlay.style.left = '0';
        loadingOverlay.style.width = '100%';
        loadingOverlay.style.height = '100%';
        loadingOverlay.style.background = 'rgba(15, 23, 42, 0.9)';
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.alignItems = 'center';
        loadingOverlay.style.justifyContent = 'center';
        loadingOverlay.style.zIndex = '9999';
        loadingOverlay.innerHTML = '<h2 style="color: white;">Ładowanie danych...</h2>';
        document.body.appendChild(loadingOverlay);

        try {
            for (const clauseId of clauses) {
                const response = await fetch(`clauses_json/${clauseId}.json?v=${new Date().getTime()}`);
                if (!response.ok) throw new Error(`Failed to load ${clauseId}`);
                const data = await response.json();
                processClauseContent(data.content, clauseId);
            }

            // Save initialized tests to state
            window.utils.saveState(state);

            ensureFragmentAnchors(state.tests);

            renderNav();
            // Check for an initial hash value (deep link). If present, try to select the matching test; otherwise render first test.
            const initialHash = (window.location.hash || '').replace('#', '');
            if (initialHash) {
                // Try to find an exact test match first
                let foundIndex = state.tests.findIndex(t => t.type === 'test' && `test-${sanitizeForDomId(t.id)}` === initialHash);
                if (foundIndex === -1) {
                    // If not a test match, try to find a heading and render the first test after it
                    const headingIdx = state.tests.findIndex(t => t.type === 'heading' && t.id === initialHash);
                    if (headingIdx !== -1) {
                        // Find the next test index after heading
                        foundIndex = getNextTestIndex(headingIdx);
                    }
                }
                if (foundIndex !== -1) {
                    renderTest(foundIndex);
                } else {
                    renderTest(0);
                }
            } else {
                renderTest(0);
            }
        } catch (error) {
            console.error("Failed to load clauses:", error);
            alert("Wystąpił błąd podczas ładowania danych audytu.");
        } finally {
            if (document.body.contains(loadingOverlay)) {
                document.body.removeChild(loadingOverlay);
            }
        }
    }

    // --- Initialization Logic ---

    // State is already loaded at the top
    if (!state.product || state.clauses.length === 0) {
        alert("Brak konfiguracji audytu. Przekierowanie do strony startowej.");
        window.location.href = 'index.html';
        return;
    }

    // If tests are empty, load them
    if (state.tests.length === 0) {
        await loadClauses(state.clauses);
    } else {
        ensureFragmentAnchors(state.tests);
        renderNav();
        const initialHash = (window.location.hash || '').replace('#', '');
        if (initialHash) {
            let foundIndex = state.tests.findIndex(t => t.type === 'test' && `test-${sanitizeForDomId(t.id)}` === initialHash);
            if (foundIndex === -1) {
                const headingIdx = state.tests.findIndex(t => t.type === 'heading' && t.id === initialHash);
                if (headingIdx !== -1) {
                    foundIndex = getNextTestIndex(headingIdx);
                }
            }
            if (foundIndex !== -1) {
                renderTest(foundIndex);
            } else {
                renderTest(state.currentIdx);
            }
        } else {
            renderTest(state.currentIdx);
        }
    }

    // Support back/forward hash navigation
    window.addEventListener('hashchange', () => {
        const frag = (window.location.hash || '').replace('#', '');
        if (!frag) return;
        let foundIndex = state.tests.findIndex(t => t.type === 'test' && `test-${sanitizeForDomId(t.id)}` === frag);
        if (foundIndex === -1) {
            const headingIdx = state.tests.findIndex(t => t.type === 'heading' && t.id === frag);
            if (headingIdx !== -1) {
                foundIndex = getNextTestIndex(headingIdx);
            }
        }
        if (foundIndex !== -1) {
            renderTest(foundIndex);
        }
    });
});

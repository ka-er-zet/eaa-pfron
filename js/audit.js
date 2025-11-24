document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();

    // --- Function Definitions ---

    function renderNav() {
        const container = document.getElementById('nav-container');
        if (!container) return;

        container.innerHTML = '';
        let completed = 0;

        state.tests.forEach((item, idx) => {
            const res = state.results[item.id] || { status: null };
            const active = idx === state.currentIdx;
            if (res.status) completed++;

            let icon = 'circle';
            let color = 'var(--muted-color)';

            if (res.status === 'pass') { icon = 'check-circle-2'; color = 'var(--pass-color)'; }
            if (res.status === 'fail') { icon = 'x-circle'; color = 'var(--fail-color)'; }
            if (res.status === 'na') { icon = 'minus-circle'; color = 'var(--na-color)'; }
            if (res.status === 'nt') { icon = 'help-circle'; color = 'var(--nt-color)'; }

            const div = document.createElement('div');
            div.className = `nav-item ${active ? 'active' : ''}`;
            div.onclick = () => renderTest(idx);
            div.innerHTML = `
                <i data-lucide="${icon}" style="color: ${color}; width: 18px;"></i>
                <div style="line-height: 1.2; overflow: hidden;">
                    <span style="font-family: monospace; font-size: 0.75rem; opacity: 0.7;">${item.id}</span>
                    <div style="font-size: 0.85rem; font-weight: 500; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${item.title}</div>
                </div>
            `;
            container.appendChild(div);
        });

        // Update Progress
        const progressText = document.getElementById('progress-text');
        const mainProgress = document.getElementById('main-progress');

        if (progressText) progressText.innerText = `${completed}/${state.tests.length}`;
        if (mainProgress) mainProgress.value = state.tests.length ? (completed / state.tests.length) * 100 : 0;

        lucide.createIcons();

        // Scroll active item into view
        const activeItem = container.querySelector('.nav-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    window.renderTest = function (idx) {
        if (idx < 0 || idx >= state.tests.length) return;

        state.currentIdx = idx;
        window.utils.saveState(state); // Save current index

        const item = state.tests[idx];
        const res = state.results[item.id];
        renderNav();

        const container = document.getElementById('test-renderer');
        if (!container) return;

        let preconditionsHtml = '';
        if (item.preconditions && item.preconditions.length > 0) {
            preconditionsHtml = `<div class="test-details"><strong>Warunki wstępne:</strong><ul>${item.preconditions.map(p => `<li>${p}</li>`).join('')}</ul></div>`;
        }

        let procedureHtml = '';
        if (item.procedure && item.procedure.length > 0) {
            procedureHtml = `<div class="test-details"><strong>Procedura:</strong><ol>${item.procedure.map(p => `<li>${p}</li>`).join('')}</ol></div>`;
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

        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;">
                    <span class="badge" style="background: var(--primary);">${item.id}</span>
                    ${wcagBadge}
                </div>
                <h2 style="margin: 0; color: white;">${item.title}</h2>
            </div>

            <article style="border-left: 4px solid var(--primary);">
                <div style="padding: 1.5rem;">
                    ${preconditionsHtml}
                    ${procedureHtml}
                    ${notesHtml}
                </div>
            </article>

            <h5 style="margin-top: 2rem; padding-bottom: 0.5rem; border-bottom: 1px solid #334155; color: var(--muted-color);">Ocena</h5>

            <div class="eval-grid">
                <div class="eval-btn pass ${res.status === 'pass' ? 'selected' : ''}" onclick="setResult('${item.id}', 'pass')">
                    <i data-lucide="check" size="28"></i>
                    <strong>Zaliczone</strong>
                </div>
                <div class="eval-btn fail ${res.status === 'fail' ? 'selected' : ''}" onclick="setResult('${item.id}', 'fail')">
                    <i data-lucide="x" size="28"></i>
                    <strong>Niezaliczone</strong>
                </div>
                <div class="eval-btn na ${res.status === 'na' ? 'selected' : ''}" onclick="setResult('${item.id}', 'na')">
                    <i data-lucide="minus" size="28"></i>
                    <strong>Nie dotyczy</strong>
                </div>
                <div class="eval-btn nt ${res.status === 'nt' ? 'selected' : ''}" onclick="setResult('${item.id}', 'nt')">
                    <i data-lucide="help-circle" size="28"></i>
                    <strong>Nietestowalne</strong>
                </div>
            </div>

            <div style="margin-top: 2rem;">
                <label style="color: var(--muted-color);">Uwagi / Obserwacje</label>
                <textarea rows="4" placeholder="Wpisz swoje uwagi tutaj..." oninput="updateNote('${item.id}', this.value)">${res.note}</textarea>
            </div>

            <div style="display: flex; justify-content: space-between; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #334155;">
                <button class="outline secondary" ${idx === 0 ? 'disabled' : ''} onclick="renderTest(${idx - 1})">
                    <i data-lucide="arrow-left" style="margin-right: 8px;"></i> Poprzedni
                </button>
                ${idx === state.tests.length - 1
                ? `<button onclick="finishAudit()" style="background: var(--pass-color); border:none;">Zakończ Audyt <i data-lucide="check-circle" style="margin-left: 8px;"></i></button>`
                : `<button onclick="renderTest(${idx + 1})">Następny <i data-lucide="arrow-right" style="margin-left: 8px;"></i></button>`
            }
            </div>
        `;
        lucide.createIcons();
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
                    id: testId,
                    clauseId: clauseId,
                    title: title,
                    wcag: wcag,
                    preconditions: item.preconditions || [],
                    procedure: item.procedure || [],
                    form: item.form,
                    notes: item.notes || []
                };

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
                const response = await fetch(`clauses_json/${clauseId}.json`);
                if (!response.ok) throw new Error(`Failed to load ${clauseId}`);
                const data = await response.json();
                processClauseContent(data.content, clauseId);
            }

            // Save initialized tests to state
            window.utils.saveState(state);

            renderNav();
            renderTest(0);
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

    // Load State
    const state = window.utils.loadState();
    if (!state.product || state.clauses.length === 0) {
        alert("Brak konfiguracji audytu. Przekierowanie do strony startowej.");
        window.location.href = 'index.html';
        return;
    }

    // If tests are empty, load them
    if (state.tests.length === 0) {
        await loadClauses(state.clauses);
    } else {
        renderNav();
        renderTest(state.currentIdx);
    }
});

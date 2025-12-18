// Load localized messages dynamically; fall back to global i18n or minimal defaults
let M;
// docelowo: const M = window.i18n.getMessages();


document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();

    // Show a quick loading overlay immediately to give feedback before any async work
    let loadingOverlay = document.getElementById('eaa-loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'eaa-loading-overlay';
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
    }

    // Try dynamic import first to avoid "import statement outside a module" errors
    try {
        const msgs = await import('./messages-pl.js');
        M = msgs.MESSAGES_PL;
        // Update overlay text if we have a translated string
        if (loadingOverlay) loadingOverlay.innerHTML = '<h2 style="color: white;">' + ((M && M.app && M.app.loadingData) || 'Ładowanie danych...') + '</h2>';
    } catch (err) {
        console.warn('Could not dynamically import messages-pl.js, falling back to global i18n or defaults', err);
        M = window.i18n?.getMessages?.() || {
            navigation: {
                goToHomeQuestion: "Czy przejść do strony startowej?",
                unsavedChangesTitle: "Niezapisane zmiany",
                confirmStay: "Pozostań",
            }
        };
    }

    // Apply any data-i18n attributes on the audit page using shared helper
    try {
        if (window.utils && typeof window.utils.applyDataI18n === 'function') {
            window.utils.applyDataI18n(M, document);
            if (location.search.includes('i18n-check') && typeof window.utils.checkDataI18n === 'function') {
                window.utils.checkDataI18n(M, document);
            }
        }
    } catch (e) {
        console.warn('Failed to apply data-i18n on audit page', e);
    }


        // Przełączanie menu mobilnego
        const menuToggle = document.getElementById('menu-toggle');
        const appLayout = document.getElementById('app-layout');
        const sidebar = document.getElementById('sidebar');

        if (menuToggle && appLayout && sidebar) {
            const closeMenu = (returnFocus = true) => {
                appLayout.classList.remove('mobile-menu-open');
                menuToggle.setAttribute('aria-expanded', 'false');
                if (returnFocus) {
                    menuToggle.focus();
                }
            };

            const openMenu = () => {
                appLayout.classList.add('mobile-menu-open');
                menuToggle.setAttribute('aria-expanded', 'true');
                // Uczyń pasek boczny programowo fokowalnym i skup się na nim
                sidebar.setAttribute('tabindex', '-1');
                sidebar.focus({ preventScroll: true });
            };

            menuToggle.addEventListener('click', () => {
                const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
                if (isExpanded) {
                    closeMenu(true); // Zwróć fokus do przełącznika przy zamykaniu przez przełącznik
                } else {
                    openMenu();
                }
            });

            // Zamknij menu przy kliknięciu linku w pasku bocznym
            sidebar.addEventListener('click', (e) => {
                if (e.target.tagName === 'A' || e.target.closest('a')) {
                    // Nie zwracaj fokusu do przełącznika, ponieważ użytkownik nawiguje do treści
                    closeMenu(false);
                }
            });

            // Zamknij menu przy kliknięciu na zewnątrz
            document.addEventListener('click', (e) => {
                if (appLayout.classList.contains('mobile-menu-open') &&
                    !sidebar.contains(e.target) &&
                    !menuToggle.contains(e.target)) {
                    closeMenu(false); // Fokus zostaje tam, gdzie użytkownik kliknął (lub body)
                }
            });

            // Obsługa klawisza Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && appLayout.classList.contains('mobile-menu-open')) {
                    closeMenu(true); // Zwróć fokus do przełącznika
                }
            });
        }

    // Enhance icon-only buttons with visible labels on hover/focus for affordance
    try {
        if (typeof enhanceIconButtons === 'function') enhanceIconButtons();
    } catch (e) {
        console.warn('Could not enhance icon buttons', e);
    }

    // Ensure theme labels include current state (visible and sr-only)
    try {
        if (typeof updateThemeToggleButtons === 'function') updateThemeToggleButtons(document.documentElement.getAttribute('data-theme'));
        // Remove redundant .theme-helper spans from theme toggles
        document.querySelectorAll('button[onclick*="toggleTheme"] .theme-helper').forEach(span => span.remove());
    } catch (e) {
        console.warn('Could not update theme toggle labels with state', e);
    }

    // Załaduj stan natychmiast, aby był dostępny dla detektorów zdarzeń
    const state = window.utils.loadState();
    console.log('State loaded:', state);

    // Edit config button (header)
    const editBtn = document.getElementById('btn-edit-config');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.setItem('editing-audit', 'true');
            window.location.href = 'new-audit.html';
        });
    }

    // Funkcja pomocnicza do generowania nazwy pliku dla eksportu stanu
    const getAuditFilename = () => {
        const date = new Date().toISOString().split('T')[0];
        const product = (state.product || 'audit').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return `audit_earl_${product}_${date}.json`;
    };

    // Obsługa Ctrl+S / Cmd+S do zapisywania
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            // Nie zapisuj, jeśli fokus na input/textarea
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                return;
            }
            e.preventDefault();
            console.log('Ctrl+S pressed, saving...');

            // 1. Zapisz do localStorage
            window.utils.saveState(state);

            // 2. Wygeneruj raport EARL
            const earlReport = window.utils.generateEARL(state);

            // 3. Pobierz stan jako JSON (format EARL)
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(earlReport, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", getAuditFilename());
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();

            // 4. Dostępna informacja zwrotna (tylko dla czytników ekranu)
            const liveRegion = document.getElementById('audit-status-live');
            if (liveRegion) {
                liveRegion.innerText = M.audit.saveProgressSuccess;
            }
        }
    });

    // Obsługa kliknięcia linku do strony głównej
    const homeLink = document.getElementById('app-logo');
    if (homeLink) {
        homeLink.addEventListener('click', async (e) => {
            e.preventDefault(); // Zawsze zapobiegaj domyślnej nawigacji najpierw

            // Sprawdź, czy jest jakiś postęp w bieżącej sesji LUB czy istnieje zapisany stan, który może zostać nadpisany
            const persisted = window.utils.loadState();
            const hasPersistedProgress = Object.values(persisted.results || {}).some(r => r && (r.status || r.note));

            const hasProgress = hasPersistedProgress || (state.tests && state.tests.some(test => {
                const res = state.results[test.id];
                return res && (res.status || res.note);
            }));

                    // ALWAYS ask before leaving the Audit page to avoid accidental loss of any previously saved data
            const confirmed = await window.utils.confirm(
                `${M.navigation.returnToHomeBody}\n\n${M.navigation.goToHomeQuestion}`,
                M.navigation.returnToHomeTitle,
                M.navigation.confirmLeave,
                M.navigation.confirmStay,
                'cancel'
            );

            if (confirmed) {
                window.location.href = 'index.html';
            }
        });
    }

    // --- Definicje funkcji ---

    // Zachowanie linku pomijania nawigacji: skupienie na treści testu
    const skipNav = document.querySelector('.skip-nav-link');
    if (skipNav) {
        skipNav.addEventListener('click', (e) => {
            e.preventDefault();
            const renderer = document.getElementById('test-renderer');
            if (renderer) renderer.focus();
        });
    }

    function sanitizeForDomId(str) {
        // Konwertuje potencjalnie problematyczne znaki na bezpieczne dla identyfikatorów DOM i fragmentów URL
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
                el.className = 'fragment-anchor sr-only';
                fragContainer.appendChild(el);
            }
        });
    }

    // Lokalna mapa tytułów klauzul (wypełniana przez loadClauses)
    const clauseTitles = {};

    function formatClauseTitle(clauseId, rawTitle) {
        // Preferuj wyodrębnienie krótkiej etykiety, np. z "Audyt Klauzuli 5: Wymagania ogólne"
        // wyprodukuj "C.5 wymagania ogólne" (mała litera pierwszej litery podtytułu)
        const idNumber = String(clauseId).replace(/^c/i, '').trim();
        let subtitle = (rawTitle || '').split(':').pop().trim();
        if (!subtitle || subtitle === rawTitle) {
            // fallback: usuń wszelkie początkowe 'Audyt Klauzuli N:' itp
            subtitle = rawTitle.replace(/.*:\s*/g, '').trim();
        }
        // upewnij się, że pierwsza litera jest mała, jak zażądano
        if (subtitle && subtitle.length > 0) {
            subtitle = subtitle.charAt(0).toLowerCase() + subtitle.slice(1);
        }
        if (!subtitle) subtitle = '';
        return `C.${idNumber} ${subtitle}`.trim();
    }

    function renderNav() {
        const container = document.getElementById('nav-container');
        if (!container) return;

        container.innerHTML = '';
        // Utwórz semantyczną listę dla nawigacji
        const ul = document.createElement('ul');
        ul.className = 'nav-list';
        let completed = 0;
        let totalTests = 0;

        let currentClauseLi = null;
        let currentGroupUl = null;
        let lastClauseId = null;

        state.tests.forEach((item, idx) => {
            // Logika grupowania wg ClauseID (lub Headingów, jeśli zaczynają sekcję)

            // Określ efektywny clauseId dla tego elementu (obsługa nagłówków bez ID)
            let effectiveClauseId = item.clauseId;
            if (!effectiveClauseId && item.type === 'heading') {
                // Przeszukaj w przód, aby znaleźć ID klauzuli
                for (let i = idx + 1; i < state.tests.length; i++) {
                    if (state.tests[i].clauseId) {
                        effectiveClauseId = state.tests[i].clauseId;
                        break;
                    }
                }
            }

            // --- NOWA KLAUZULA: Jeśli mamy nowy clauseID, zamknij poprzednią i otwórz nową ---
            if (effectiveClauseId && effectiveClauseId !== lastClauseId) {
                lastClauseId = effectiveClauseId;
                const currentClauseTitle = item.clauseTitle || clauseTitles[effectiveClauseId] || effectiveClauseId;

                // 1. Stwórz element listy głównej (kontener klauzuli)
                currentClauseLi = document.createElement('li');

                // 2. Nagłówek klauzuli (jako DIV, zgodnie z ustaleniami)
                const clauseHeader = document.createElement('div');
                clauseHeader.className = 'nav-clause';
                clauseHeader.innerHTML = window.utils.fixOrphans(currentClauseTitle);
                currentClauseLi.appendChild(clauseHeader);

                // 3. Kontener dla grupy testów (zagnieżdżona lista)
                currentGroupUl = document.createElement('ul');
                currentGroupUl.className = 'nav-group';
                currentClauseLi.appendChild(currentGroupUl);

                // 4. Dodaj do głównej listy
                ul.appendChild(currentClauseLi);
            }

            // Fallback: Jeśli z jakiegoś powodu nie mamy grupy (np. test bez klauzuli na początku), stwórz "sierotkę"
            if (!currentGroupUl) {
                currentClauseLi = document.createElement('li');
                currentGroupUl = document.createElement('ul');
                currentGroupUl.className = 'nav-group';
                currentClauseLi.appendChild(currentGroupUl);
                ul.appendChild(currentClauseLi);
            }

            // --- Obsługa nagłówków (Sub-headings) ---
            if (item.type === 'heading') {
                // Filtr: Pokaż tylko jeśli są testy w sekcji
                let hasTestsInSection = false;
                const currentLevel = item.level || 3;
                for (let i = idx + 1; i < state.tests.length; i++) {
                    const nextItem = state.tests[i];
                    if (nextItem.type === 'heading' && (nextItem.level || 3) <= currentLevel) break;
                    if (nextItem.type !== 'heading') {
                        hasTestsInSection = true;
                        break;
                    }
                }
                if (!hasTestsInSection) return;

                // Sprawdź duplikat tytułu klauzuli (jeśli nagłówek == nazwa klauzuli)
                // (Opcjonalne, ale zachowujemy logikę z oryginału)
                // ... (uproszczone dla czytelności, można dodać z powrotem jeśli krytyczne)

                const li = document.createElement('li');
                // Używamy DIV lub SPAN zamiast role="heading" na LI
                const headingDiv = document.createElement('div');
                headingDiv.className = 'nav-heading';
                headingDiv.innerHTML = window.utils.fixOrphans(item.title);
                li.appendChild(headingDiv);

                currentGroupUl.appendChild(li);
                return;
            }

            // --- Obsługa testów ---
            totalTests++;
            const res = state.results[item.id] || { status: null };
            // Jeśli element ma clauseId inne niż ostatnie (dla pewności), aktualizujemy lastClauseId
            // (Chociaż mechanizm grupowania wyżej powinien to załatwić)

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
            if (res.status === 'nt' || res.status === 'Nie do sprawdzenia') {
                icon = 'help-circle';
                color = 'var(--nt-color)';
                statusText = 'Nietestowany';
            }

            const li = document.createElement('li');
            li.className = 'nav-list-item';
            const a = document.createElement('a');
            a.className = `nav-item ${active ? 'active' : ''}`;
            const anchorDomId = `test-${sanitizeForDomId(item.id)}`;
            a.href = `#${anchorDomId}`;
            a.setAttribute('data-target-id', anchorDomId);

            let displayTitle = item.title;
            const baseId = item.id.split('#')[0];
            if (displayTitle.startsWith(baseId)) {
                displayTitle = displayTitle.substring(baseId.length).replace(/^[\.\:\-\s]+/, '');
            }

            const ariaLabelTitle = displayTitle.replace(/&nbsp;/g, ' ');

            a.setAttribute('data-test-id', item.id);
            const gotoLabel = (M && M.audit && M.audit.gotoTest)
                ? M.audit.gotoTest.replace('{testId}', item.id).replace('{title}', ariaLabelTitle).replace('{status}', statusText)
                : `Przejdź do testu ${item.id}: ${ariaLabelTitle}. Status: ${statusText}`;
            a.setAttribute('aria-label', gotoLabel);
            // aria-controls i aria-current są OK na linkach
            a.setAttribute('aria-controls', anchorDomId);
            if (active) a.setAttribute('aria-current', 'true');

            displayTitle = window.utils.fixOrphans(displayTitle);

            const activate = (e) => {
                if (e) e.preventDefault();
                renderTest(idx);
            };

            a.addEventListener('click', activate);

            // Obsługa klawiszy wewnątrz listy (nawigacja góra/dół musi teraz uwzględniać zagnieżdżenie)
            a.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    // Custom logic to find next focusable element across groups? 
                    // Standard TAB works, but arrow keys usually strictly linear.
                    // For now, let's keep it simple or implement a smarter traverser.
                    // Implementation of smarter traverser:
                    const allLinks = Array.from(container.querySelectorAll('a.nav-item'));
                    const myIdx = allLinks.indexOf(a);
                    if (myIdx !== -1 && myIdx < allLinks.length - 1) {
                        allLinks[myIdx + 1].focus();
                    }
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const allLinks = Array.from(container.querySelectorAll('a.nav-item'));
                    const myIdx = allLinks.indexOf(a);
                    if (myIdx > 0) {
                        allLinks[myIdx - 1].focus();
                    }
                } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate();
                }
            });

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

            // Dodaj do aktualnej grupy
            currentGroupUl.appendChild(li);
        });

        container.appendChild(ul);

        const progressText = document.getElementById('progress-text');
        const mainProgress = document.getElementById('main-progress');

        if (progressText) progressText.innerText = `${(M && M.audit && M.audit.progressLabel) ? M.audit.progressLabel : 'Postęp'} ${completed}/${totalTests}`;
        if (mainProgress) mainProgress.value = totalTests ? (completed / totalTests) * 100 : 0;

        lucide.createIcons();

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
            preconditionsHtml = `<div class="test-details"><h2 class="text-muted" style="margin-bottom: 0.5rem;">Warunki wstępne</h2><ol>${item.preconditions.map(p => `<li>${window.utils.fixOrphans(stripNumbering(p))}</li>`).join('')}</ol></div>`;
        }

        let notesHtml = '';
        if (item.notes && item.notes.length > 0) {
            notesHtml = `<div class="informative" style="margin-top: 1.5rem;"><h2 class="text-muted" style="margin-bottom: 0.5rem;">${(M && M.audit && M.audit.notesHeading) ? M.audit.notesHeading : 'Uwagi'}</h2>${item.notes.map(n => `<p>${window.utils.fixOrphans(n)}</p>`).join('')}</div>`;
        }

        let procedureHtml = '';
        if (item.procedure && item.procedure.length > 0) {
            procedureHtml = `<div class="test-details" style="margin-top: 1.5rem;"><h2 class="text-muted" style="margin-bottom: 0.5rem;">Procedura</h2><ol>${item.procedure.map(p => `<li>${window.utils.fixOrphans(stripNumbering(p))}</li>`).join('')}</ol></div>`;
        }

        let detailedChecklistHtml = '';
        let hasContent = false;
        if (item.detailedChecklist) {
            if (Array.isArray(item.detailedChecklist)) {
                hasContent = item.detailedChecklist.length > 0;
            } else if (typeof item.detailedChecklist === 'string') {
                hasContent = item.detailedChecklist.trim().length > 0;
            }
        }

        if (hasContent) {
            let content = '';

            // Helper to sanitize HTML but allow specific tags
            const sanitizeAndRestore = (str) => {
                if (!str) return '';

                // 0. Protect allowed tags (replace with placeholders)
                let protectedStr = str
                    .replace(/<strong>/g, "###TAG_STRONG###")
                    .replace(/<\/strong>/g, "###TAG_END_STRONG###")
                    .replace(/<em>/g, "###TAG_EM###")
                    .replace(/<\/em>/g, "###TAG_END_EM###")
                    .replace(/<br>/g, "###TAG_BR###")
                    .replace(/<ol>/g, "###TAG_OL###")
                    .replace(/<\/ol>/g, "###TAG_END_OL###")
                    .replace(/<ul>/g, "###TAG_UL###")
                    .replace(/<\/ul>/g, "###TAG_END_UL###")
                    .replace(/<li>/g, "###TAG_LI###")
                    .replace(/<\/li>/g, "###TAG_END_LI###")
                    .replace(/<code>/g, "###TAG_CODE###")
                    .replace(/<\/code>/g, "###TAG_END_CODE###")
                    .replace(/<table([^>]*)>/g, "###TAG_TABLE$1###")
                    .replace(/<\/table>/g, "###TAG_END_TABLE###")
                    .replace(/<thead>/g, "###TAG_THEAD###")
                    .replace(/<\/thead>/g, "###TAG_END_THEAD###")
                    .replace(/<tbody>/g, "###TAG_TBODY###")
                    .replace(/<\/tbody>/g, "###TAG_END_TBODY###")
                    .replace(/<tr([^>]*)>/g, "###TAG_TR$1###")
                    .replace(/<\/tr>/g, "###TAG_END_TR###")
                    .replace(/<th([^>]*)>/g, "###TAG_TH$1###")
                    .replace(/<\/th>/g, "###TAG_END_TH###")
                    .replace(/<td([^>]*)>/g, "###TAG_TD$1###")
                    .replace(/<\/td>/g, "###TAG_END_TD###")
                    .replace(/<caption>/g, "###TAG_CAPTION###")
                    .replace(/<\/caption>/g, "###TAG_END_CAPTION###")
                    .replace(/<img([^>]*)>/g, "###TAG_IMG$1###")
                    .replace(/<q([^>]*)>/g, "###TAG_Q$1###")
                    .replace(/<\/q>/g, "###TAG_END_Q###");

                // 1. Escape all HTML, but preserve existing entities
                let escaped = protectedStr
                    .replace(/&(?![a-zA-Z0-9#]+;)/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");

                // 2. Restore protected tags
                let restored = escaped
                    .replace(/###TAG_STRONG###/g, "<strong>")
                    .replace(/###TAG_END_STRONG###/g, "</strong>")
                    .replace(/###TAG_EM###/g, "<em>")
                    .replace(/###TAG_END_EM###/g, "</em>")
                    .replace(/###TAG_BR###/g, "<br>")
                    .replace(/###TAG_OL###/g, "<ol>")
                    .replace(/###TAG_END_OL###/g, "</ol>")
                    .replace(/###TAG_UL###/g, "<ul>")
                    .replace(/###TAG_END_UL###/g, "</ul>")
                    .replace(/###TAG_LI###/g, "<li>")
                    .replace(/###TAG_END_LI###/g, "</li>")
                    .replace(/###TAG_CODE###/g, "<code>")
                    .replace(/###TAG_END_CODE###/g, "</code>")
                    .replace(/###TAG_TABLE([^#]*)###/g, (match, attrs) => `<table${attrs.replace(/&quot;/g, '"').replace(/&#039;/g, "'")}>`)
                    .replace(/###TAG_END_TABLE###/g, "</table>")
                    .replace(/###TAG_THEAD###/g, "<thead>")
                    .replace(/###TAG_END_THEAD###/g, "</thead>")
                    .replace(/###TAG_TBODY###/g, "<tbody>")
                    .replace(/###TAG_END_TBODY###/g, "</tbody>")
                    .replace(/###TAG_TR([^#]*)###/g, (match, attrs) => `<tr${attrs.replace(/&quot;/g, '"').replace(/&#039;/g, "'")}>`)
                    .replace(/###TAG_END_TR###/g, "</tr>")
                    .replace(/###TAG_TH([^#]*)###/g, (match, attrs) => `<th${attrs.replace(/&quot;/g, '"').replace(/&#039;/g, "'")}>`)
                    .replace(/###TAG_END_TH###/g, "</th>")
                    .replace(/###TAG_TD([^#]*)###/g, (match, attrs) => `<td${attrs.replace(/&quot;/g, '"').replace(/&#039;/g, "'")}>`)
                    .replace(/###TAG_END_TD###/g, "</td>")
                    .replace(/###TAG_CAPTION###/g, "<caption>")
                    .replace(/###TAG_END_CAPTION###/g, "</caption>")
                    .replace(/###TAG_IMG([^#]*)###/g, (match, attrs) => `<img${attrs.replace(/&quot;/g, '"').replace(/&#039;/g, "'")}>`)
                    .replace(/###TAG_Q([^#]*)###/g, (match, attrs) => `<q${attrs.replace(/&quot;/g, '"').replace(/&#039;/g, "'")}>`)
                    .replace(/###TAG_END_Q###/g, "</q>");

                // 3. Restore links (special handling for attributes)
                return restored
                    .replace(/&lt;a href=&quot;(.*?)&quot; target=&quot;_blank&quot;&gt;/g, '<a href="$1" target="_blank">')
                    .replace(/&lt;\/a&gt;/g, "</a>");
            };

            if (Array.isArray(item.detailedChecklist)) {
                content = item.detailedChecklist.map(check => `<div style="margin-bottom: 0.5rem;">${window.utils.fixOrphans(sanitizeAndRestore(check))}</div>`).join('');
            } else {
                content = window.utils.fixOrphans(sanitizeAndRestore(item.detailedChecklist)).replace(/\n/g, '<br>');
            }

            // Wrap raw table elements with .table-responsive so scrolling is applied to the wrapper
            // This prevents layout breakage when tables are wider than the viewport.
            // We wrap each <table> individually. If a wrapper exists, this will add another wrapper (acceptable).
            content = content
                .replace(/<table([^>]*)>/g, '<div class="table-responsive"><table$1>')
                .replace(/<\/table>/g, '</table></div>')
                // Downgrade H2 to H3 to maintain correct heading hierarchy
                .replace(/<h2\b([^>]*)>/g, '<h3$1>')
                .replace(/<\/h2>/g, '</h3>');

            detailedChecklistHtml = `
                <details style="margin-top: 1.5rem; padding: 0.5rem; background-color: var(--card-background-color);">
                    <summary style="cursor: pointer;">
                        <h2 style="display: inline; margin: 0; color: inherit;">Jak to sprawdzić?</h2>
                    </summary>
                    <div style="margin-top: 1rem; padding-left: 1rem; border-left: 2px solid var(--muted-color);">
                        ${content}
                    </div>
                </details>
            `;
        }

        let wcagBadge = '';
        if (item.wcag) {
            const levelClass = item.wcag === 'AA' ? 'poziom-aa' : 'poziom-a';
            wcagBadge = `<span class="${levelClass}">WCAG Poziom ${item.wcag}</span>`;
        }

        let evaluationTypeBadge = '';
        if (item.evaluationType) {
            evaluationTypeBadge = `<span style="background-color: var(--slate-600); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; margin-right: 0.5rem;">${item.evaluationType}</span>`;
        }

        // Clean title for H1 (remove ID if present at start)
        let cleanTitle = item.title;
        if (cleanTitle.startsWith(item.id)) {
            cleanTitle = cleanTitle.substring(item.id.length).trim();
            // Remove potential separator like " - " or ": "
            cleanTitle = cleanTitle.replace(/^[:\-\.]+\s*/, '');
        }
        cleanTitle = window.utils.fixOrphans(cleanTitle);

        // Evaluation Criteria (Form)
        let evaluationHtml = '';
        const activeImp = getActiveImplication(item.id);
        const isDerived = !!item.derivations || !!activeImp;

        if (isDerived) {
            // Derived Test View
            const status = res.status;
            if (status) {
                let icon = 'circle';
                let colorClass = '';
                let label = status;

                if (status === 'Zaliczone' || status === 'pass') { icon = 'check'; colorClass = 'pass'; label = 'Zaliczone'; }
                else if (status === 'Niezaliczone' || status === 'fail') { icon = 'x'; colorClass = 'fail'; label = 'Niezaliczone'; }
                else if (status === 'Nie dotyczy' || status === 'na') { icon = 'minus'; colorClass = 'na'; label = 'Nie dotyczy'; }
                else if (status === 'nt' || status === 'Nie do sprawdzenia') { icon = 'help-circle'; colorClass = 'nt'; label = 'Nie do sprawdzenia'; }

                evaluationHtml += `
                    <div class="derived-status-wrapper" style="margin-bottom: 1rem;">
                        <div class="eval-btn ${colorClass} selected" style="cursor: default; pointer-events: none; display: inline-flex; flex-direction: row; align-items: center; gap: 0.75rem; padding: 1rem 2rem;">
                            <i data-lucide="${icon}" size="24" aria-hidden="true"></i>
                            <strong>${label}</strong>
                        </div>
                        <p style="margin-top: 0.5rem; color: var(--muted-color);">${M.audit.derivedResultInfo}</p>
                    </div>
                `;
            } else {
                evaluationHtml += `
                    <div class="informative" style="border-left-color: var(--muted-color);">
                        <p>Wynik tego testu zostanie wyliczony automatycznie po uzupełnieniu powiązanych testów.</p>
                    </div>
                 `;
            }
        } else {
            // Standard Manual Entry
            const disabledAttr = '';
            const disabledStyle = '';

            if (item.form && item.form.inputs) {
                evaluationHtml += `<fieldset class="evaluation-criteria" style="border: none; padding: 0; margin: 0;">
                    <legend class="sr-only">Test ${item.id}: ${cleanTitle}</legend>`;
                const safeTestId = sanitizeForDomId(item.id);
                item.form.inputs.forEach(input => {
                    let icon = 'circle';
                    let colorClass = '';
                    if (input.value === 'Zaliczone' || input.value === 'pass') { icon = 'check'; colorClass = 'pass'; }
                    if (input.value === 'Niezaliczone' || input.value === 'fail') { icon = 'x'; colorClass = 'fail'; }
                    if (input.value === 'Nie dotyczy' || input.value === 'na') { icon = 'minus'; colorClass = 'na'; }
                    if (input.value === 'nt' || input.value === 'Nie do sprawdzenia') { icon = 'help-circle'; colorClass = 'nt'; }

                    const isSelected = res.status === input.value;
                    const inputId = `eval-${safeTestId}-${sanitizeForDomId(input.value)}`;

                    evaluationHtml += `
                        <div class="criteria-option-wrapper">
                            <input type="radio" id="${inputId}" name="eval-${safeTestId}" value="${input.value}" 
                                   class="sr-only criteria-radio" 
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
                evaluationHtml += `
                <fieldset class="eval-grid" style="border: none; padding: 0; margin: 1rem 0 0 0;">
                    <legend class="sr-only">${(M && M.audit && M.audit.evalLegend) ? M.audit.evalLegend.replace('{testId}', item.id).replace('{title}', cleanTitle) : `Ocena wyniku testu ${item.id}: ${cleanTitle}`}</legend>
                    
                      <div class="eval-btn-wrapper">
                          <input type="radio" id="eval-${sanitizeForDomId(item.id)}-pass" name="eval-${sanitizeForDomId(item.id)}" value="Zaliczone" 
                               class="sr-only eval-radio" ${res.status === 'Zaliczone' || res.status === 'pass' ? 'checked' : ''}
                              onchange="setResult('${item.id}', 'Zaliczone')">
                          <label for="eval-${sanitizeForDomId(item.id)}-pass" class="eval-btn pass ${res.status === 'Zaliczone' || res.status === 'pass' ? 'selected' : ''}">
                            <i data-lucide="check" size="28" aria-hidden="true"></i>
                            <strong>Zaliczone</strong>
                        </label>
                    </div>

                    <div class="eval-btn-wrapper">
                              <input type="radio" id="eval-${sanitizeForDomId(item.id)}-fail" name="eval-${sanitizeForDomId(item.id)}" value="Niezaliczone" 
                               class="sr-only eval-radio" ${res.status === 'Niezaliczone' || res.status === 'fail' ? 'checked' : ''}
                                  onchange="setResult('${item.id}', 'Niezaliczone')">
                              <label for="eval-${sanitizeForDomId(item.id)}-fail" class="eval-btn fail ${res.status === 'Niezaliczone' || res.status === 'fail' ? 'selected' : ''}">
                            <i data-lucide="x" size="28" aria-hidden="true"></i>
                            <strong>Niezaliczone</strong>
                        </label>
                    </div>

                    <div class="eval-btn-wrapper">
                              <input type="radio" id="eval-${sanitizeForDomId(item.id)}-na" name="eval-${sanitizeForDomId(item.id)}" value="Nie dotyczy" 
                               class="sr-only eval-radio" ${res.status === 'Nie dotyczy' || res.status === 'na' ? 'checked' : ''}
                                  onchange="setResult('${item.id}', 'Nie dotyczy')">
                              <label for="eval-${sanitizeForDomId(item.id)}-na" class="eval-btn na ${res.status === 'Nie dotyczy' || res.status === 'na' ? 'selected' : ''}">
                            <i data-lucide="minus" size="28" aria-hidden="true"></i>
                            <strong>Nie dotyczy</strong>
                        </label>
                    </div>

                    <div class="eval-btn-wrapper">
                              <input type="radio" id="eval-${sanitizeForDomId(item.id)}-nt" name="eval-${sanitizeForDomId(item.id)}" value="Nie do sprawdzenia" 
                               class="sr-only eval-radio" ${res.status === 'nt' || res.status === 'Nie do sprawdzenia' ? 'checked' : ''}
                                  onchange="setResult('${item.id}', 'Nie do sprawdzenia')">
                              <label for="eval-${sanitizeForDomId(item.id)}-nt" class="eval-btn nt ${res.status === 'nt' || res.status === 'Nie do sprawdzenia' ? 'selected' : ''}">
                            <i data-lucide="help-circle" size="28" aria-hidden="true"></i>
                            <strong>Nie do sprawdzenia</strong>
                        </label>
                    </div>
                </fieldset>`;
            }
        }

        // Build a safe DOM id for the content matching the anchor used in the nav
        const anchorDomId = `test-${sanitizeForDomId(item.id)}`;

        // Ensure all other tests have hidden anchors, but remove the anchor for THIS test so we can use the ID on the article
        // We do this BEFORE updating innerHTML to ensure no duplicate IDs exist even for a microsecond
        ensureFragmentAnchors(state.tests, anchorDomId);

        const prevIdx = getPrevTestIndex(idx);
        const nextIdx = getNextTestIndex(idx);

        let prevLabel = (M && M.audit && M.audit.prevTestBase) ? M.audit.prevTestBase : 'Poprzedni test';
        if (prevIdx !== -1) {
            const t = state.tests[prevIdx];
            const safeTitle = t.title.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
            prevLabel = `${prevLabel}: ${safeTitle.startsWith(t.id) ? safeTitle : `${t.id} ${safeTitle}`}`;
        }

        let nextLabel = (M && M.audit && M.audit.nextTestBase) ? M.audit.nextTestBase : 'Następny test';
        if (nextIdx !== -1) {
            const t = state.tests[nextIdx];
            const safeTitle = t.title.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
            nextLabel = `${nextLabel}: ${safeTitle.startsWith(t.id) ? safeTitle : `${t.id} ${safeTitle}`}`;
        }
        container.innerHTML = `
            <article class="mb-2" tabindex="-1" aria-labelledby="${anchorDomId}-title" id="${anchorDomId}">
                <header class="section-header">
                    <span class="audit-card-id">${item.id}</span> 
                    <h1 style="margin: 0;" id="${anchorDomId}-title" tabindex="-1">${cleanTitle}</h1>
                    ${evaluationTypeBadge}
                    ${wcagBadge}
                </header>
                
                <div class="section-content" style="padding: 1rem;">
                    ${preconditionsHtml}
                    ${procedureHtml}
                    ${notesHtml}
                    ${detailedChecklistHtml}

                    <form onsubmit="return false;" style="margin-top: 2rem;">
                        <h2 class="text-muted" style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--muted-color);">${(M && M.audit && M.audit.evaluationLabel) ? M.audit.evaluationLabel : 'Ocena'}</h2>

                        ${evaluationHtml}

                        ${!isDerived ? `
                        <div style="margin-top: 2rem;">
                            <label for="note-${sanitizeForDomId(item.id)}" style="color: var(--muted-color);">${(M && M.audit && M.audit.notesLabel) ? M.audit.notesLabel : 'Uwagi / Obserwacje'}</label>
                            <textarea id="note-${sanitizeForDomId(item.id)}" rows="4" oninput="updateNote('${item.id}', this.value)">${res.note}</textarea>
                        </div>
                        ` : (res.status ? `
                        <div style="margin-top: 2rem;">
                             <div style="color: var(--muted-color); margin-bottom: 0.125rem; font-weight: bold;">${(M && M.audit && M.audit.autoCommentTitle) ? M.audit.autoCommentTitle : 'Automatyczny komentarz'}</div>
                             <div class="informative" style="background-color: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-color); margin-top: 0;">
                                ${res.note
                    ? res.note.trim().replace(/\n/g, '<br>')
                    : M.audit.noNotes}
                             </div>
                        </div>
                        ` : '')}
                    </form>
                </div>
            </article>

            <div style="display: flex; justify-content: space-between; margin-top: 2rem; gap: 1rem;">
                <button class="outline secondary" ${prevIdx === -1 ? 'disabled' : ''} onclick="renderTest(${prevIdx})" aria-label="${prevLabel}">
                    <i data-lucide="arrow-left" style="margin-right: 8px;" aria-hidden="true"></i> ${(M && M.audit && M.audit.prevButton) ? M.audit.prevButton : 'Poprzedni'}
                </button>
                ${nextIdx === -1
                ? `<button onclick="finishAudit()" style="background: var(--pass-color); border:none;">${(M && M.audit && M.audit.finishAuditButton) ? M.audit.finishAuditButton : 'Zakończ Audyt'} <i data-lucide="check-circle" style="margin-left: 8px;" aria-hidden="true"></i></button>`
                : `<button onclick="renderTest(${nextIdx})" aria-label="${nextLabel}">${(M && M.audit && M.audit.nextButton) ? M.audit.nextButton : 'Następny'} <i data-lucide="arrow-right" style="margin-left: 8px;" aria-hidden="true"></i></button>`
            }
            </div>
        `;
        lucide.createIcons();

        // Announce current test to assistive tech (title + short summary if available)
        (function() {
            const liveRegion = document.getElementById('audit-status-live');
            if (!liveRegion) return;

            const rawSummary = (item.procedure && item.procedure.length) ? item.procedure[0]
                : (item.preconditions && item.preconditions.length) ? item.preconditions[0] : '';
            const safeSummary = (rawSummary || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
            const shortSummary = safeSummary.length > 200 ? safeSummary.slice(0, 197) + '...' : safeSummary;

            const baseAnnouncement = M?.audit?.testLoaded
                ? M.audit.testLoaded.replace('{testId}', item.id).replace('{title}', cleanTitle)
                : `Test ${item.id}: ${cleanTitle}`;

            liveRegion.innerText = shortSummary ? baseAnnouncement + ' ' + shortSummary : baseAnnouncement;
        })();

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
            // Use setTimeout to ensure layout is recalculated before scrolling
            setTimeout(() => {
                const mainContainer = document.querySelector('main');
                if (mainContainer) {
                    mainContainer.scrollTop = 0;
                }

                // Set focus to the heading for accessibility (better for screen readers)
                const titleEl = document.getElementById(`${anchorDomId}-title`);
                if (titleEl) {
                    titleEl.focus({ preventScroll: true });
                } else {
                    // Fallback to article
                    const contentEl = document.getElementById(anchorDomId);
                    if (contentEl) contentEl.focus({ preventScroll: true });
                }
            }, 150);
        }
    };

    window.setResult = function (id, status) {
        state.results[id].status = status;

        // Handle Implications (Global Re-evaluation)
        evaluateImplications();

        // Handle Derivations (Reverse/Computed)
        evaluateDerivations();

        window.utils.saveState(state);
        // Announce the change for screen readers via an aria-live region
        const liveRegion = document.getElementById('audit-status-live');
        if (liveRegion) {
            liveRegion.innerText = M.audit.testResultSet
                .replace('{testId}', id)
                .replace('{status}', status);
        }
        // renderNav(); // Removed redundant call - renderTest calls it anyway
        renderTest(state.currentIdx);

        // Announce progress update
        const completed = Object.values(state.results).filter(r => r && r.status).length;
        const totalTests = state.tests.filter(t => t.type === 'test').length;
        const progressMessage = `${(M && M.audit && M.audit.progressLabel) ? M.audit.progressLabel : 'Postęp'} ${completed}/${totalTests}`;
        if (liveRegion) {
            setTimeout(() => {
                if (liveRegion) liveRegion.innerText = progressMessage;
            }, 100); // Small delay to ensure previous announcement is read
        }
    };

    function getActiveImplication(testId) {
        for (const sourceTest of state.tests) {
            if (sourceTest.implications) {
                const sourceStatus = state.results[sourceTest.id]?.status;
                for (const imp of sourceTest.implications) {
                    if (imp.whenStatus === sourceStatus) {
                        let regex;
                        try { regex = new RegExp(imp.targetScope); } catch (e) { continue; }
                        if (regex.test(testId)) {
                            return imp;
                        }
                    }
                }
            }
        }
        return null;
    }

    function evaluateImplications() {
        // 1. Identify all active implications
        const activeImplications = new Map(); // targetId -> implication

        state.tests.forEach(sourceTest => {
            if (sourceTest.implications) {
                const sourceStatus = state.results[sourceTest.id]?.status;
                sourceTest.implications.forEach(imp => {
                    if (imp.whenStatus === sourceStatus) {
                        // This implication is active. Find targets.
                        let regex;
                        try { regex = new RegExp(imp.targetScope); } catch (e) { return; }

                        state.tests.forEach(targetTest => {
                            if (targetTest.id !== sourceTest.id && regex.test(targetTest.id)) {
                                activeImplications.set(targetTest.id, imp);
                            }
                        });
                    }
                });
            }
        });

        // 2. Apply to targets
        state.tests.forEach(test => {
            // Ensure result object exists
            if (!state.results[test.id]) {
                state.results[test.id] = { status: null, note: '' };
            }

            const imp = activeImplications.get(test.id);
            if (imp) {
                // Apply implication
                if (state.results[test.id].status !== imp.setStatus) {
                    state.results[test.id].status = imp.setStatus;
                }
                // Append note if missing
                const autoNote = imp.setNote;
                if (autoNote) {
                    if (!state.results[test.id].note || !state.results[test.id].note.includes(autoNote)) {
                        state.results[test.id].note = (state.results[test.id].note || '') + '\n' + autoNote;
                    }
                }
            } else {
                // No active implication.
                // Check if we should reset.
                // We reset if the note contains the specific implication text from C.11.5.1.
                // This is a heuristic to "unlock" tests when the condition is no longer met.
                const specificNote = "Nie dotyczy, ponieważ funkcjonalność zamknięta jest zgodna z klauzulą 5.1 (zgodnie z wynikiem C.11.5.1).";
                if (state.results[test.id].note && state.results[test.id].note.includes(specificNote)) {
                    // It was set by implication. Clear it.
                    state.results[test.id].status = null;
                    state.results[test.id].note = state.results[test.id].note.replace(specificNote, '').trim();
                }
            }
        });
    }

    function evaluateDerivations() {
        state.tests.forEach(test => {
            if (test.derivations) {
                let regex;
                try {
                    regex = new RegExp(test.derivations.sources);
                } catch (e) {
                    console.error("Invalid regex in derivations:", test.derivations.sources);
                    return;
                }

                const sourceTests = state.tests.filter(t => t.id !== test.id && regex.test(t.id));
                if (sourceTests.length === 0) return;

                const statuses = sourceTests.map(t => state.results[t.id]?.status);
                let newStatus = null;

                if (test.derivations.mode === 'worst-case') {
                    // If any Fail -> Fail
                    if (statuses.some(s => s === 'Niezaliczone' || s === 'fail')) {
                        newStatus = 'Niezaliczone';
                    }
                    // If ALL are Pass/NA/NT (and at least one is set) -> Pass
                    else {
                        const allFinished = sourceTests.every(t => {
                            const s = state.results[t.id]?.status;
                            return s === 'Zaliczone' || s === 'pass' || s === 'Nie dotyczy' || s === 'na' || s === 'nt' || s === 'Nie do sprawdzenia';
                        });

                        if (allFinished && sourceTests.length > 0) {
                            // If all are NA -> NA
                            const allNA = sourceTests.every(t => {
                                const s = state.results[t.id]?.status;
                                return s === 'Nie dotyczy' || s === 'na' || s === 'nt' || s === 'Nie do sprawdzenia';
                            });

                            if (allNA) {
                                newStatus = 'Nie dotyczy';
                            } else {
                                newStatus = 'Zaliczone';
                            }
                        }
                    }
                } else if (test.derivations.mode === 'strict-pass') {
                    // Priority: Fail > NA > NT > Pending > Pass

                    // 1. Any Fail?
                    if (statuses.some(s => s === 'Niezaliczone' || s === 'fail')) {
                        newStatus = 'Niezaliczone';
                    }
                    // 2. Any NA?
                    else if (statuses.some(s => s === 'Nie dotyczy' || s === 'na')) {
                        newStatus = 'Nie dotyczy';
                    }
                    // 3. Any NT?
                    else if (statuses.some(s => s === 'nt' || s === 'Nie do sprawdzenia')) {
                        newStatus = 'Nie do sprawdzenia';
                    }
                    // 4. Any Pending?
                    else if (statuses.some(s => !s)) {
                        newStatus = null; // Keep pending
                    }
                    // 5. All Pass?
                    else if (statuses.every(s => s === 'Zaliczone' || s === 'pass')) {
                        newStatus = 'Zaliczone';
                    }
                } else if (test.derivations.mode === 'any-subgroup-pass') {
                    // Group sources by parent ID (up to last dot)
                    const groups = {};
                    sourceTests.forEach(t => {
                        const parentId = t.id.substring(0, t.id.lastIndexOf('.'));
                        if (!groups[parentId]) groups[parentId] = [];
                        groups[parentId].push(t);
                    });

                    const groupStatuses = Object.values(groups).map(group => {
                        const gStatuses = group.map(t => state.results[t.id]?.status);
                        // Strict Pass Logic for Group
                        if (gStatuses.some(s => s === 'Niezaliczone' || s === 'fail')) return 'Niezaliczone';
                        if (gStatuses.some(s => s === 'Nie dotyczy' || s === 'na')) return 'Nie dotyczy';
                        if (gStatuses.some(s => s === 'nt' || s === 'Nie do sprawdzenia')) return 'Nie do sprawdzenia';
                        if (gStatuses.some(s => !s)) return null; // Pending
                        if (gStatuses.every(s => s === 'Zaliczone' || s === 'pass')) return 'Zaliczone';
                        return null;
                    });

                    // Any Pass Logic for Final Result
                    if (groupStatuses.some(s => s === 'Zaliczone')) {
                        newStatus = 'Zaliczone';
                    } else if (groupStatuses.some(s => s === null)) {
                        newStatus = null;
                    } else if (groupStatuses.some(s => s === 'Nie do sprawdzenia')) {
                        newStatus = 'Nie do sprawdzenia';
                    } else if (groupStatuses.every(s => s === 'Nie dotyczy')) {
                        newStatus = 'Nie dotyczy';
                    } else {
                        newStatus = 'Niezaliczone';
                    }
                }

                // Apply if changed (allowing change to null)
                if (state.results[test.id].status !== newStatus) {
                    state.results[test.id].status = newStatus;

                    // Add note only if we set a status and note isn't there
                    if (newStatus) {
                        const autoNote = M.audit.autoNote;
                        if (!state.results[test.id].note || !state.results[test.id].note.includes(autoNote)) {
                            state.results[test.id].note = (state.results[test.id].note || '') + '\n' + autoNote;
                        }
                    }
                }
            }
        });
    }

    window.updateNote = function (id, val) {
        state.results[id].note = val;
        window.utils.saveState(state);
    };

    window.finishAudit = function () {
        window.utils.saveState(state);
        window.location.href = 'summary.html';
    };

    function processClauseContent(content, clauseId, clauseTitle = null) {
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

                // Attach clause metadata so we can group items in the nav
                state.tests[state.tests.length - 1].clauseId = clauseId;
                state.tests[state.tests.length - 1].clauseTitle = clauseTitle;

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
                    evaluationType: item.evaluationType || null,
                    preconditions: item.preconditions || [],
                    procedure: item.procedure || [],
                    form: item.form,
                    notes: item.notes || [],
                    detailedChecklist: item.detailedChecklist || [],
                    implications: item.implications || [],
                    derivations: item.derivations || null
                };

                // Check for duplication: if the last item was a heading with the same title, remove it.
                // This prevents "Heading X" followed immediately by "Test X" in the sidebar.
                const lastItem = state.tests[state.tests.length - 1];
                if (lastItem && lastItem.type === 'heading' && lastItem.title === title) {
                    // Only remove the heading if it is not a main section (Level > 5)
                    // Level 3, 4 and 5 headings should remain to preserve document structure in the menu
                    if ((lastItem.level || 3) > 5) {
                        state.tests.pop();
                    } else {
                        // If we keep the heading, we should ensure the test title is slightly different or handled
                        // But for now, keeping both is better than losing the section header.
                    }
                }

                // Attach clauseTitle directly to tests, so the nav can render them
                testItem.clauseTitle = clauseTitle;
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

        // Reuse the overlay created earlier (if present) so feedback appears immediately
        let loadingOverlay = document.getElementById('eaa-loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'eaa-loading-overlay';
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
            document.body.appendChild(loadingOverlay);
        }
        // Ensure text is localized when possible
        loadingOverlay.innerHTML = `<h2 style="color: white;">${M?.app?.loadingData || 'Ładowanie danych...'}</h2>`;

        try {
            for (const clauseId of clauses) {
                const response = await fetch(`clauses_json/${clauseId}.json?v=${new Date().getTime()}`);
                if (!response.ok) throw new Error(`Failed to load ${clauseId}`);
                const data = await response.json();
                // Build a brief clause title like 'C.5 Wymagania ogolne'
                const rawTitle = data.title || clauseId;
                let titleSuffix = rawTitle;
                if (rawTitle.indexOf(':') !== -1) {
                    titleSuffix = rawTitle.split(':').slice(1).join(':').trim();
                } else {
                    // Try to extract suffix after first dash or last space
                    const parts = rawTitle.split('-');
                    if (parts.length > 1) titleSuffix = parts.slice(1).join('-').trim();
                }
                const clauseLabel = clauseId.toUpperCase().replace(/^C?([0-9]+)/, 'C.$1');
                clauseTitles[clauseId] = `${clauseLabel} ${titleSuffix}`;
                processClauseContent(data.content, clauseId, clauseTitles[clauseId]);
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
            // Show alert modal for loading error
            window.utils.alert(
                "Wystąpił błąd podczas ładowania danych audytu. Spróbuj odświeżyć stronę lub wróć do konfiguracji.",
                "Błąd ładowania danych"
            ).then(() => {
                window.location.href = 'index.html';
            });
        } finally {
            if (document.body.contains(loadingOverlay)) {
                document.body.removeChild(loadingOverlay);
            }
        }
    }

    async function loadClauseTitles(clauses) {
        for (const clauseId of clauses) {
            if (!clauseTitles[clauseId]) {
                try {
                    const response = await fetch(`clauses_json/${clauseId}.json?v=${new Date().getTime()}`);
                    if (response.ok) {
                        const data = await response.json();
                        clauseTitles[clauseId] = formatClauseTitle(clauseId, data.title || clauseId);
                    } else {
                        clauseTitles[clauseId] = clauseId;
                    }
                } catch (e) {
                    clauseTitles[clauseId] = clauseId;
                }
            }
        }
    }

    // --- Initialization Logic ---

    // State is already loaded at the top
    if (!state.product || state.clauses.length === 0) {
        if (typeof window.utils.setStatusMessage === 'function') {
            window.utils.setStatusMessage(M.setup.missingConfiguration, 5000);
        }
        // Show alert modal with navigation option
        window.utils.alert(
            M.setup.missingConfiguration,
            'Błąd konfiguracji'
        ).then(() => {
            window.location.href = 'index.html';
        });
        return;
    }

    // Always reload clauses to ensure we have the latest structure/content (e.g. detailedChecklist)
    // This preserves state.results but refreshes state.tests from the JSON files.
    await loadClauses(state.clauses);

    // Ensure fragment anchors are set up
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

    // Handle Ctrl+S / Cmd+S to save
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            window.utils.downloadAudit(state, true); // Draft save
        }
    });

    // Handle Save Button
    const saveBtn = document.getElementById('btn-save-audit');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            window.utils.downloadAudit(state, true); // Draft save
        });
    }
});
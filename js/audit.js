document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();

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

    // Załaduj stan natychmiast, aby był dostępny dla detektorów zdarzeń
    const state = window.utils.loadState();
    console.log('State loaded:', state);

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
                liveRegion.innerText = 'Zapisano postęp audytu i pobrano plik EARL.';
            }
        }
    });

    // Obsługa kliknięcia linku do strony głównej
    const homeLink = document.getElementById('app-logo');
    if (homeLink) {
        homeLink.addEventListener('click', async (e) => {
            e.preventDefault(); // Zawsze zapobiegaj domyślnej nawigacji najpierw

            // Sprawdź, czy jest jakiś postęp
            const hasProgress = state.tests && state.tests.some(test => {
                const res = state.results[test.id];
                return res && (res.status || res.note);
            });

            if (hasProgress) {
                const stay = await window.utils.confirm(
                    "Masz niezapisane wyniki. Jeśli wyjdziesz, stracisz je. Czy chcesz przejść na stronę główną?",
                    "Niezapisane zmiany",
                    "Nie", // Główny przycisk (Potwierdź) -> Zwraca true -> Zostań
                    "Tak"  // Drugi przycisk (Anuluj) -> Zwraca false -> Wyjdź
                );

                // Jeśli użytkownik kliknął "Tak" (Drugi/Anuluj), stay jest false.
                if (!stay) {
                    window.location.href = 'index.html';
                }
            } else {
                // Brak postępu, bezpieczna nawigacja
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
                el.className = 'fragment-anchor visually-hidden';
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

        let lastClauseId = null;
        state.tests.forEach((item, idx) => {
            // Określ efektywny clauseId dla tego elementu (obsługa nagłówków bez ID)
            let effectiveClauseId = item.clauseId;
            if (!effectiveClauseId && item.type === 'heading') {
                // Poszukaj następnego elementu z clauseId
                for (let i = idx + 1; i < state.tests.length; i++) {
                    if (state.tests[i].clauseId) {
                        effectiveClauseId = state.tests[i].clauseId;
                        break;
                    }
                }
            }

            // Wstaw nagłówek klauzuli, gdy napotkasz pierwszy element nowej klauzuli
            let clauseHeaderInserted = false;
            let currentClauseTitle = '';
            if (effectiveClauseId && effectiveClauseId !== lastClauseId) {
                lastClauseId = effectiveClauseId;
                currentClauseTitle = item.clauseTitle || clauseTitles[effectiveClauseId] || effectiveClauseId;
                const clauseLi = document.createElement('li');
                clauseLi.className = 'nav-clause';
                clauseLi.setAttribute('role', 'heading');
                clauseLi.setAttribute('aria-level', '3');
                clauseLi.innerHTML = window.utils.fixOrphans(currentClauseTitle);
                ul.appendChild(clauseLi);
                clauseHeaderInserted = true;
            }

            // Obsługa nagłówków
            if (item.type === 'heading') {
                // Inteligentny filtr: pokaż nagłówki tylko wtedy, gdy mają testy w swojej sekcji (w tym pod-nagłówki)
                let hasTestsInSection = false;
                const currentLevel = item.level || 3;
                // Znajdź koniec tej sekcji: następny nagłówek z poziomem <= currentLevel
                let sectionEndIdx = idx + 1;
                for (; sectionEndIdx < state.tests.length; sectionEndIdx++) {
                    const nextItem = state.tests[sectionEndIdx];
                    if (nextItem.type === 'heading' && (nextItem.level || 3) <= currentLevel) {
                        break;
                    }
                    if (nextItem.type !== 'heading') {
                        hasTestsInSection = true;
                        break; // Nie ma potrzeby sprawdzać dalej
                    }
                }
                if (!hasTestsInSection) {
                    return; // Pomiń ten nagłówek
                }

                // Sprawdź duplikat tytułu klauzuli
                if (clauseHeaderInserted) {
                    const normClause = String(currentClauseTitle).toLowerCase().replace(/[^a-zpl]/g, '');
                    const normItem = String(item.title).toLowerCase().replace(/[^a-zpl]/g, '');
                    // Jeśli tekst nagłówka jest zasadniczo zawarty w tytule klauzuli (lub odwrotnie), pomiń go
                    if (normClause.includes(normItem) || normItem.includes(normClause)) {
                        return;
                    }
                }

                const li = document.createElement('li');
                li.className = 'nav-heading';
                li.setAttribute('role', 'heading');
                li.setAttribute('aria-level', item.level || 3);
                li.innerHTML = window.utils.fixOrphans(item.title);
                ul.appendChild(li);
                return;
            }

            // Obsługa testów
            totalTests++;
            const res = state.results[item.id] || { status: null };
                        // Jeśli ten element należy do nowej klauzuli, zaktualizuj śledzenie, aby nie dodać duplikatu
                        if (item.clauseId && item.clauseId !== lastClauseId) {
                            lastClauseId = item.clauseId;
                        }
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
                statusText = 'Nie testowany';
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

            // Prepare clean title for aria-label (remove HTML entities like &nbsp;)
            const ariaLabelTitle = displayTitle.replace(/&nbsp;/g, ' ');

            // Accessibility & Keyboard Navigation
            // `a` elements are natively operable and focusable
            a.setAttribute('data-test-id', item.id);
            a.setAttribute('aria-label', `Przejdź do testu ${item.id}: ${ariaLabelTitle}. Status: ${statusText}`);
            a.setAttribute('aria-controls', anchorDomId);
            if (active) a.setAttribute('aria-current', 'true');

            // Zastosuj poprawkę sierot do renderowania wizualnego
            displayTitle = window.utils.fixOrphans(displayTitle);

            const activate = (e) => {
                if (e) e.preventDefault();
                // Update the URL hash to represent the selected test
                try { history.replaceState(null, '', `#${anchorDomId}`); } catch (err) { location.hash = `#${anchorDomId}`; }
                renderTest(idx);
                // Przewiń na górę strony i przenieś fokus do głównego obszaru treści dla czytników ekranu
                setTimeout(() => {
                    const testRenderer = document.getElementById('test-renderer');
                    if (testRenderer) testRenderer.focus({ preventScroll: true });
                    
                    const mainEl = document.querySelector('main');
                    if (mainEl) {
                        mainEl.scrollTop = 0;
                    }
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
            preconditionsHtml = `<div class="test-details"><h2 class="text-muted" style="margin-bottom: 0.5rem;">Warunki wstępne</h2><ol>${item.preconditions.map(p => `<li>${window.utils.fixOrphans(stripNumbering(p))}</li>`).join('')}</ol></div>`;
        }

        let procedureHtml = '';
        if (item.procedure && item.procedure.length > 0) {
            procedureHtml = `<div class="test-details" style="margin-top: 1.5rem;"><h2 class="text-muted" style="margin-bottom: 0.5rem;">Procedura</h2><ol>${item.procedure.map(p => `<li>${window.utils.fixOrphans(stripNumbering(p))}</li>`).join('')}</ol></div>`;
        }

        let notesHtml = '';
        if (item.notes && item.notes.length > 0) {
            notesHtml = `<div class="informative" style="margin-top: 1.5rem;"><h2 class="text-muted" style="margin-bottom: 0.5rem;">UWAGA</h2>${item.notes.map(n => `<p>${window.utils.fixOrphans(n)}</p>`).join('')}</div>`;
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
                    .replace(/<img([^>]*)>/g, "###TAG_IMG$1###");

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
                    .replace(/###TAG_IMG([^#]*)###/g, (match, attrs) => `<img${attrs.replace(/&quot;/g, '"').replace(/&#039;/g, "'")}>`);

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
                 .replace(/<\/table>/g, '</table></div>');

             detailedChecklistHtml = `
                <details style="margin-top: 1.5rem; border: 1px solid var(--border-color); border-radius: 4px; padding: 0.5rem; background-color: var(--card-bg);">
                    <summary style="cursor: pointer; font-weight: bold; color: var(--primary-color);">Jak to sprawdzić?</summary>
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
                        <p style="margin-top: 0.5rem; color: var(--muted-color);">Wynik wyliczony automatycznie.</p>
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
                    <legend class="visually-hidden">Ocena kryteriów</legend>`;
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
                evaluationHtml += `
                <fieldset class="eval-grid" style="border: none; padding: 0; margin: 1rem 0 0 0;">
                    <legend class="visually-hidden">Ocena wyniku testu</legend>
                    
                      <div class="eval-btn-wrapper">
                          <input type="radio" id="eval-${sanitizeForDomId(item.id)}-pass" name="eval-${sanitizeForDomId(item.id)}" value="Zaliczone" 
                               class="visually-hidden eval-radio" ${res.status === 'Zaliczone' || res.status === 'pass' ? 'checked' : ''}
                              onchange="setResult('${item.id}', 'Zaliczone')">
                          <label for="eval-${sanitizeForDomId(item.id)}-pass" class="eval-btn pass ${res.status === 'Zaliczone' || res.status === 'pass' ? 'selected' : ''}">
                            <i data-lucide="check" size="28" aria-hidden="true"></i>
                            <strong>Zaliczone</strong>
                        </label>
                    </div>

                    <div class="eval-btn-wrapper">
                              <input type="radio" id="eval-${sanitizeForDomId(item.id)}-fail" name="eval-${sanitizeForDomId(item.id)}" value="Niezaliczone" 
                               class="visually-hidden eval-radio" ${res.status === 'Niezaliczone' || res.status === 'fail' ? 'checked' : ''}
                                  onchange="setResult('${item.id}', 'Niezaliczone')">
                              <label for="eval-${sanitizeForDomId(item.id)}-fail" class="eval-btn fail ${res.status === 'Niezaliczone' || res.status === 'fail' ? 'selected' : ''}">
                            <i data-lucide="x" size="28" aria-hidden="true"></i>
                            <strong>Niezaliczone</strong>
                        </label>
                    </div>

                    <div class="eval-btn-wrapper">
                              <input type="radio" id="eval-${sanitizeForDomId(item.id)}-na" name="eval-${sanitizeForDomId(item.id)}" value="Nie dotyczy" 
                               class="visually-hidden eval-radio" ${res.status === 'Nie dotyczy' || res.status === 'na' ? 'checked' : ''}
                                  onchange="setResult('${item.id}', 'Nie dotyczy')">
                              <label for="eval-${sanitizeForDomId(item.id)}-na" class="eval-btn na ${res.status === 'Nie dotyczy' || res.status === 'na' ? 'selected' : ''}">
                            <i data-lucide="minus" size="28" aria-hidden="true"></i>
                            <strong>Nie dotyczy</strong>
                        </label>
                    </div>

                    <div class="eval-btn-wrapper">
                              <input type="radio" id="eval-${sanitizeForDomId(item.id)}-nt" name="eval-${sanitizeForDomId(item.id)}" value="Nie do sprawdzenia" 
                               class="visually-hidden eval-radio" ${res.status === 'nt' || res.status === 'Nie do sprawdzenia' ? 'checked' : ''}
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

        // Clean title for H1 (remove ID if present at start)
        let cleanTitle = item.title;
        if (cleanTitle.startsWith(item.id)) {
            cleanTitle = cleanTitle.substring(item.id.length).trim();
            // Remove potential separator like " - " or ": "
            cleanTitle = cleanTitle.replace(/^[:\-\.]+\s*/, '');
        }
        cleanTitle = window.utils.fixOrphans(cleanTitle);

        container.innerHTML = `
            <article class="mb-2" tabindex="-1" role="region" aria-labelledby="${anchorDomId}-title" id="${anchorDomId}">
                <header class="section-header">
                    <span class="audit-card-id">${item.id}</span> 
                    <h1 style="margin: 0;" id="${anchorDomId}-title">${cleanTitle}</h1>
                    ${evaluationTypeBadge}
                    ${wcagBadge}
                </header>
                
                <div class="section-content" style="padding: 1rem;">
                    ${preconditionsHtml}
                    ${procedureHtml}
                    ${notesHtml}
                    ${detailedChecklistHtml}

                    <form onsubmit="return false;" style="margin-top: 2rem;">
                        <h2 class="text-muted" style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--muted-color);">Ocena</h2>

                        ${evaluationHtml}

                        ${!isDerived ? `
                        <div style="margin-top: 2rem;">
                            <label for="note-${sanitizeForDomId(item.id)}" style="color: var(--muted-color);">Uwagi / Obserwacje</label>
                            <textarea id="note-${sanitizeForDomId(item.id)}" rows="4" oninput="updateNote('${item.id}', this.value)">${res.note}</textarea>
                        </div>
                        ` : (res.status ? `
                        <div style="margin-top: 2rem;">
                             <div style="color: var(--muted-color); margin-bottom: 0.125rem; font-weight: bold;">Automatyczny komentarz</div>
                             <div class="informative" style="background-color: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-color); margin-top: 0;">
                                ${res.note ? res.note.trim().replace(/\n/g, '<br>') : 'Brak uwag.'}
                             </div>
                        </div>
                        ` : '')}
                    </form>
                    <div id="audit-status-live" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>
                </div>
            </article>

            <div style="display: flex; justify-content: space-between; margin-top: 2rem; gap: 1rem;">
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
        
        // Handle Implications (Global Re-evaluation)
        evaluateImplications();

        // Handle Derivations (Reverse/Computed)
        evaluateDerivations();

        window.utils.saveState(state);
        // Announce the change for screen readers via an aria-live region
        const liveRegion = document.getElementById('audit-status-live');
        if (liveRegion) {
            liveRegion.innerText = `Wynik testu ${id} ustawiony: ${status}`;
        }
        // renderNav(); // Removed redundant call - renderTest calls it anyway
        renderTest(state.currentIdx);
    };

    function getActiveImplication(testId) {
        for (const sourceTest of state.tests) {
            if (sourceTest.implications) {
                const sourceStatus = state.results[sourceTest.id]?.status;
                for (const imp of sourceTest.implications) {
                    if (imp.whenStatus === sourceStatus) {
                        let regex;
                        try { regex = new RegExp(imp.targetScope); } catch(e) { continue; }
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
                        try { regex = new RegExp(imp.targetScope); } catch(e) { return; }
                        
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
                        const autoNote = '[Auto] Wynik wyliczony na podstawie testów składowych.';
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
            alert("Wystąpił błąd podczas ładowania danych audytu.");
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
        alert("Brak konfiguracji audytu. Przekierowanie do strony startowej.");
        window.location.href = 'index.html';
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
});

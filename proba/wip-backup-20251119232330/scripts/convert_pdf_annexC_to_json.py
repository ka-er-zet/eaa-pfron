#!/usr/bin/env python3
"""
Convert Annex C clauses from EN 301 549 PDF to structured JSON files.

Usage:
    python .\scripts\convert_pdf_annexC_to_json.py

Output:
    Creates files in the `clauses/` directory like `c5.json` with a basic structured format:
    {
      "id": "c5",
      "title": "...",
      "nodes": [{"type":"heading","level":2,"text":"..."}, {"type":"test","id":"res-c5-1-2-2","title":"...","text":"..."}]
    }

This script requires PyMuPDF (fitz) and will try a best-effort text parse of Annex C headings.
The generated JSON may need manual review to refine preconditions/procedures.
"""

import argparse
import os
import re
import sys
import json
try:
    import fitz
except Exception as e:
    print("Missing dependency 'PyMuPDF'. Install with: pip install pymupdf")
    raise

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PDF_PATH = os.path.join(BASE_DIR, 'en_301549v030201p.pdf')
CLAUSES_DIR = os.path.join(BASE_DIR, 'clauses')
CLAUSES_POLISH_DIR = CLAUSES_DIR

# Note: PDF existence is checked inside main() after parsing CLI args to allow
# running against alternate translations or file names.

if not os.path.exists(CLAUSES_DIR):
    os.makedirs(CLAUSES_DIR)

# Collect nodes converted from "test" to "heading" during parsing (for reporting)
converted_nodes = []

FOOTER_RE = re.compile(r"\b(ETSI CEN CENELEC|ETSI CEN|ETSI|Licencj|Licen|Licencja Polskiego Komitetu|Załącznik|Historia|V\d+\.\d+\.\d+|Publikacja|luty|kwiecień|sierpień|listopad|grudzień|marzec|maj|czerwiec|lipiec|wrzesień|październik|styczeń|Historia zmian|Dodano nowy|INSTYTUT BADAWCZY|IPC SPÓŁKA|OGRANI|Polski Komitet Normalizacyjny|ISBN|http:|https:|www\.|ul\.|ulica|Warszaw|\d{2}-\d{3}|tel\b|email|e\-?mail|adres|contact)\b", re.IGNORECASE)

def is_footer_line(s: str) -> bool:
    """Heuristic to identify lines that are likely part of page footer/copyright block.
    This uses FOOTER_RE and also common footer markers like URLs, ISBN, postal codes, addresses or 'ul.' prefixes."""
    if not s or not s.strip():
        return False
    if FOOTER_RE.search(s):
        return True
    # urls, ISBN, small postal codes, 'ul.' address markers
    if re.search(r'(http://|https://|www\.|\bISBN\b|ISBN:|\bISBN-)', s, re.IGNORECASE):
        return True
    if re.search(r'\b\d{2}-\d{3}\b', s):
        return True
    if re.search(r'\bul\.|\bulica\b', s, re.IGNORECASE):
        return True
    if re.search(r'Polski\s+Komitet|INSTYTUT\s+BADAWCZY|IPC\s+SPÓŁKA|ISBN|Warszaw', s, re.IGNORECASE):
        return True
    return False


def strip_trailing_footer(s: str) -> str:
    """Remove trailing footer-like sections from a line by splitting at known markers.
    This keeps the left-hand side (main content) and strips off license/ISBN/URL/address metadata."""
    if not s or not s.strip():
        return s
    # Split by common markers and keep the left-most chunk as the main content
    markers = [r'\bLicencja\b', r'\blicen', r'\bISBN\b', r'http://', r'https://', r'www\.', r'\bPolski\s+Komitet\b', r'\bul\.', r'\bulica\b', r'\bINSTYTUT\b']
    pattern = re.compile('(' + '|'.join(markers) + ')', re.IGNORECASE)
    m = pattern.search(s)
    if m:
        return s[:m.start()].strip()
    return s


def cleanup_content(s: str) -> str:
    """Apply a collection of cleaning heuristics to remove trailing footer text,
    page numbers and license fragments from a content string.
    Returns the cleaned string or an empty string if the result is only footer."""
    if not s or not s.strip():
        return s
    s = s.strip()
    # Remove common trailing page numbers like '143' on its own
    s = re.sub(r"\s+[\-–]?\s*\d+$", '', s).strip()
    # Remove trailing footer fragments starting with known markers
    markers = [r'\bLicencja\b', r'\blicen', r'\bPolski\s+Komitet', r'\bINSTYTUT\b', r'\bIPC\b', r'\bEN\s*301\s*549\b', r'\bETSI\b', r'\bETSI CEN CENELEC\b', r'\bISBN\b', r'http://', r'https://', r'www\.']
    pattern = re.compile('(' + '|'.join(markers) + ')', re.IGNORECASE)
    m = pattern.search(s)
    if m:
        s = s[:m.start()].strip()
    # Finally strip any remaining trivial trailing punctuation or separators
    s = re.sub(r"[\s\-–:;,.]+$", '', s).strip()
    # If after cleaning only small tokens remain, return empty string
    if len(s) <= 2 or not re.search(r'[A-Za-ząćęłńóśżźĄĆĘŁŃÓŚŻŹ0-9]', s):
        return ''
    # If the string ends with a short license-like fragment (e.g. 'Lice' or 'Lic') remove it
    if re.search(r'\b(Lice|Lic|Licen|Licenc)\b\.?$', s, re.IGNORECASE):
        s = re.sub(r'\b(Lice|Lic|Licen|Licenc)\b\.?$', '', s, flags=re.IGNORECASE).strip()
        if len(s) <= 2:
            return ''
    return s


def strip_leading_bullet(s: str) -> str:
    """Remove leading bullet-like characters from a line (e.g. '.' '•' '-' etc.)."""
    if not s:
        return s
    return re.sub(r'^\s*[\u2022\u00B7\*\-\–\—\.\·\>]+\s*', '', s)


def remove_header_labels(s: str) -> str:
    """Remove header label words and entire header lines found in content.
    This eliminates lines like 'Rodzaj oceny', 'Warunki wstępne', 'Procedure', 'Wynik', etc.
    """
    if not s or not s.strip():
        return s
    # Remove header label words and lines
    s = re.sub(r'(?im)^\s*(Type of assessment|Typ oceny|Rodzaj oceny|Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Result|Wynik|Test|Kontrola)\s*$','', s)
    s = re.sub(HEADER_LABEL_RE, '', s)
    # Remove extra left-over newline separators and extra spaces
    s = re.sub(r"\n{2,}", '\n', s).strip()
    return s


def clean_free_text(s: str) -> str:
    """Apply cleaning steps specifically for free_text blocks to strip headers, footers, and numbering."""
    if not s:
        return s
    s = s.strip()
    # split lines and remove header/footer-like lines
    lines = [l for l in s.splitlines() if l.strip()]
    new_lines = []
    for l in lines:
        if is_footer_line(l):
            continue
        # strip leading numbering like '1.' or '1. ' or '1.1 ' and any bullets like '.'
        l = re.sub(r'^\s*\d+(?:\.\d+)*\s*(?:\.|\))?\s*', '', l)
        l = strip_leading_bullet(l)
        l = strip_trailing_footer(l)
        l = remove_header_labels(l)
        if l:
            new_lines.append(l)
    res = ' '.join(new_lines).strip()
    return cleanup_content(res)

def extract_annex_c_text(pdf_path):
    # Read full document text and try to find the Annex C section of content
    doc = fitz.open(pdf_path)
    combined = []
    for i in range(len(doc)):
        combined.append(doc[i].get_text('text'))
    full_text = '\n'.join(combined)

    # find start of Annex C content by locating the start of clause C.1
    m_start = re.search(r'\bC\.1\b', full_text)
    if not m_start:
        # try to find 'Annex C' occurrence then locate first C.* after it
        m_annex = re.search(r'\bAnnex\s+C\b', full_text, re.IGNORECASE)
        if not m_annex:
            print('Annex C not found in PDF')
            return ''
        else:
            # find first C.1 after annex
            m_start = re.search(r'\bC\.1\b', full_text[m_annex.end():])
            if not m_start:
                print('C.1 not found after Annex C in PDF')
                return ''
            # adjust index relative to full_text
            start_idx = m_annex.end() + m_start.start()
    else:
        start_idx = m_start.start()

    # find the end: annex D marker or end of file
    m_end = re.search(r'\bAnnex\s+D\b', full_text, re.IGNORECASE)
    end_idx = m_end.start() if m_end else len(full_text)

    return full_text[start_idx:end_idx]


def safe_append(prev, cont):
    """Join prev and cont avoiding repeated last/first words and trimming."""
    if not cont:
        return prev
    prev_stripped = prev.strip()
    cont_stripped = cont.strip()
    def first_word(s):
        return re.sub(r'[\W_]+$', '', s.split()[0]) if s.split() else ''
    def last_word(s):
        return re.sub(r'[\W_]+$', '', s.split()[-1]) if s.split() else ''
    if first_word(cont_stripped).lower() == last_word(prev_stripped).lower():
        return prev_stripped
    return prev_stripped + ' ' + cont_stripped

# Header labels used in English and Polish that indicate section headers rather than free text
HEADER_LABEL_RE = re.compile(r'\b(Type of assessment|Typ oceny|Rodzaj oceny|Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Result|Wynik|Test|Kontrola|Testing|Inspection|Inspection and measurement|Kontrola i pomiary)\b', re.IGNORECASE)
FOOTER_RE = re.compile(r"\b(ETSI CEN CENELEC|ETSI CEN|ETSI|Licencj|EN 301 549|Licencja Polskiego Komitetu|Załącznik|Historia|V\d+\.\d+\.\d+|Publikacja|luty|kwiecień|sierpień|listopad|grudzień|marzec|maj|czerwiec|lipiec|wrzesień|październik|styczeń|Historia zmian|Dodano nowy|INSTYTUT BADAWCZY|IPC SPÓŁKA|OGRANI|Polski Komitet Normalizacyjny|ISBN|http:|https:|www\.|ul\.|ulica|Warszaw|\d{2}-\d{3}|tel\b|email|e\-?mail|adres|contact)\b", re.IGNORECASE)


def parse_annex_c_text(text):
    # We'll locate clause identifiers 'C.N' in the full text and extract the text block for each clause
    full_text = text
    # Use regex to find clause headings and their positions
    clause_matches = list(re.finditer(r'(C\.[0-9]+(?:\.[0-9]+)*)\b', full_text))
    extracted = []
    for idx, match in enumerate(clause_matches):
        clause_id = match.group(1)
        start_pos = match.end()
        end_pos = clause_matches[idx+1].start() if idx+1 < len(clause_matches) else len(full_text)
        content_block = full_text[start_pos:end_pos].strip()
        content_block = re.sub(r'\s+', ' ', content_block).strip()
        extracted.append((clause_id, content_block))

    # Group extracted by top-level clause like C.5, C.6 etc
    clauses = {}
    current_top = None
    def clean_title(s: str) -> str:
        if not s: return s
        # remove trailing page number with dot leaders e.g. '... 115' or '..... 115'
        s = re.sub(r"\s*\.{2,}\s*\d+$", '', s).strip()
        # remove trailing page number without dots e.g. ' - 115' or ' 115'
        s = re.sub(r"\s+[\-–]?\s*\d+$", '', s).strip()
        return s

    for cid, content in extracted:
        # top-level 'C.5' is match 'C.5' with no trailing part
        top = re.match(r'^(C\.[0-9]+)', cid).group(1)
        if top not in clauses:
            # Use ID format 'c5', not 'c.5'
            cid_normalized = top.lower().replace('.', '')
            clauses[top] = { 'id': cid_normalized, 'title': '', 'nodes': [] }
        # If top-level clause title is empty and cid==top, update the title
        if cid == top:
            title_clean = clean_title(content)
            clauses[top]['title'] = title_clean
            # also add heading node
            clauses[top]['nodes'].append({ 'type': 'heading', 'level': 2, 'text': title_clean })
        else:
            # if includes more levels, add heading or test nodes
            parts = cid.split('.')
            level = len(parts) + 1
            # For our renderer, treat any 3+ part as test; 2 part as heading
            if len(parts) >= 3:
                # preserve content with newlines to parse labeled sections and numbered lists
                raw_block = content
                lines = [l.strip() for l in raw_block.splitlines() if l.strip()]
                # Title is often the first non-label line
                title_candidate = ''
                if lines:
                    if not re.search(r'^(Type of assessment|Typ oceny|Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Result|Wynik)\b', lines[0], re.IGNORECASE):
                        title_candidate = lines[0]
                        lines = lines[1:]
                title_clean = clean_title(title_candidate)

                assessmentType = 'Inspection'
                preconditions = []
                procedure = []
                results = []
                free_text_parts = []
                # Track last appended numeric item context for continuation lines
                last_section = None  # 'preconditions' | 'procedure' | 'results' | None
                last_index = -1

                i = 0
                # Use module-level safe_append helper to join continuation lines
                while i < len(lines):
                    ln = lines[i]
                    # Skip page footers or other footer-like lines
                    if is_footer_line(ln):
                        i += 1
                        continue
                    # If this line looks like a footer, skip it entirely
                    if is_footer_line(ln):
                        i += 1
                        continue
                    # Type of assessment
                    if re.search(r'^(Type of assessment|Typ oceny|Rodzaj oceny)\b', ln, re.IGNORECASE):
                        # value on same line after ':' or next line
                        parts_line = re.split(r'[:\-]\s*', ln, maxsplit=1)
                        if len(parts_line) > 1 and parts_line[1].strip():
                            assessmentType = parts_line[1].strip()
                        elif i+1 < len(lines):
                            assessmentType = lines[i+1]
                            i += 1
                        i += 1
                        continue
                    # Pre-conditions
                    if re.search(r'^(Pre-conditions|Warunki wst[aą]pne)\b', ln, re.IGNORECASE):
                        j = i + 1
                        while j < len(lines) and re.match(r'^\d+(?:\.\d+)*\b', lines[j]):
                            mnum = re.match(r'^(\d+(?:\.\d+)*)\s*(.*)', lines[j])
                            if mnum:
                                # Preserve the numeric prefix for references (e.g. '1. ...')
                                num = mnum.group(1).strip()
                                # Collect continuation lines that don't start with a new number
                                item_text = strip_leading_bullet(mnum.group(2).strip())
                                item = f"{num}. {item_text}" if item_text else f"{num}."
                                # Skip footer-like items
                                if is_footer_line(item):
                                    j += 1
                                    continue
                                # Skip footer-like items that accidentally became numbered lines
                                if is_footer_line(item):
                                    j += 1
                                    continue
                                k = j + 1
                                while k < len(lines) and not re.match(r'^\d+(?:\.\d+)*\b', lines[k]) and not re.search(r'^(Type of assessment|Typ oceny|Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Result|Wynik)\b', lines[k], re.IGNORECASE) and not is_footer_line(lines[k]):
                                    cont = strip_leading_bullet(lines[k].strip())
                                    # Handle hyphenated line breaks: '... is' on next line or hyphen
                                    if item.endswith('-'):
                                        item = item[:-1] + cont
                                    else:
                                        item = safe_append(item, strip_trailing_footer(cont))
                                    k += 1
                                preconditions.append(cleanup_content(strip_trailing_footer(item.strip())))
                                last_section = 'preconditions'
                                last_index = len(preconditions) - 1
                                j = k
                                continue
                            j += 1
                        i = j
                        continue
                    # Procedure
                    if re.search(r'^(Procedure|Procedura)\b', ln, re.IGNORECASE):
                        j = i + 1
                        while j < len(lines) and re.match(r'^\d+(?:\.\d+)*\b', lines[j]):
                            mnum = re.match(r'^(\d+(?:\.\d+)*)\s*(.*)', lines[j])
                            if mnum:
                                num = mnum.group(1).strip()
                                item_text = strip_leading_bullet(mnum.group(2).strip())
                                item = f"{num}. {item_text}" if item_text else f"{num}."
                                # Skip footer-like items
                                if is_footer_line(item):
                                    j += 1
                                    continue
                                # Skip footer-like items that accidentally became numbered lines
                                if is_footer_line(item):
                                    j += 1
                                    continue
                                k = j + 1
                                while k < len(lines) and not re.match(r'^\d+(?:\.\d+)*\b', lines[k]) and not re.search(r'^(Type of assessment|Typ oceny|Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Result|Wynik)\b', lines[k], re.IGNORECASE) and not is_footer_line(lines[k]):
                                    cont = strip_leading_bullet(lines[k].strip())
                                    if item.endswith('-'):
                                        item = item[:-1] + cont
                                    else:
                                        item = safe_append(item, strip_trailing_footer(cont))
                                    k += 1
                                procedure.append(cleanup_content(strip_trailing_footer(item.strip())))
                                last_section = 'procedure'
                                last_index = len(procedure) - 1
                                j = k
                                continue
                            j += 1
                        i = j
                        continue
                    # Results
                    if re.search(r'^(Result|Wynik)\b', ln, re.IGNORECASE):
                        j = i + 1
                        while j < len(lines) and not re.search(r'^(Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Type of assessment|Typ oceny)\b', lines[j], re.IGNORECASE) and not is_footer_line(lines[j]):
                            # parse lines like 'Pass: description'
                            # Also support multi-line result lines; join continuation lines until next result or keyword
                            # Include common Polish labels 'Pozytywny', 'Negatywny' and 'Prawda/Fałsz'
                            mresline = re.match(r'^(Pass|Fail|Not applicable|Nie dotyczy|Zaliczone|Niezaliczone|Pozytywny|Negatywny|Prawda|Fałsz)\s*[:\-]\s*(.*)', lines[j], re.IGNORECASE)
                            if mresline:
                                item = strip_leading_bullet(mresline.group(2).strip())
                                k = j + 1
                                while k < len(lines) and not re.match(r'^(Pass|Fail|Not applicable|Nie dotyczy|Zaliczone|Niezaliczone|Pozytywny|Negatywny|Prawda|Fałsz)\s*[:\-]\s*', lines[k], re.IGNORECASE) and not re.search(r'^(Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Type of assessment|Typ oceny|Result|Wynik)\b', lines[k], re.IGNORECASE) and not is_footer_line(lines[k]):
                                    cont = strip_leading_bullet(lines[k].strip())
                                    if item.endswith('-'):
                                        item = item[:-1] + cont
                                    else:
                                        item = safe_append(item, strip_trailing_footer(cont))
                                    k += 1
                                results.append({ 'label': cleanup_content(strip_trailing_footer(item.strip())), 'type': mresline.group(1) })
                                last_section = 'results'
                                last_index = len(results) - 1
                                j = k
                                continue
                            j += 1
                        i = j
                        continue
                    # If the line looks like a numbered item but no label seen earlier, collect into preconditions as fallback
                    if re.match(r'^\d+(?:\.\d+)*\b', ln):
                        mnum = re.match(r'^(\d+(?:\.\d+)*)\s*(.*)', ln)
                        if mnum:
                            num = mnum.group(1).strip()
                            val_text = strip_leading_bullet(mnum.group(2).strip())
                            val = f"{num}. {val_text}" if val_text else f"{num}."
                            if is_footer_line(val):
                                i += 1
                                continue
                            preconditions.append(cleanup_content(strip_trailing_footer(val)))
                        i += 1
                        continue
                    # Otherwise treat as free text or description
                    # If it's a likely continuation line (lower-case start or starts with punctuation)
                    if last_section and re.match(r'^[a-ząęółśżźć].*|^[.,;:\-]\s*.*', ln, re.IGNORECASE):
                        # Append to the last numeric item in that section (if any)
                        if last_section == 'preconditions' and last_index >= 0:
                            preconditions[last_index] = safe_append(preconditions[last_index], strip_trailing_footer(ln))
                        elif last_section == 'procedure' and last_index >= 0:
                            procedure[last_index] = safe_append(procedure[last_index], strip_trailing_footer(ln))
                        elif last_section == 'results' and last_index >= 0:
                            results[last_index]['label'] = safe_append(results[last_index]['label'], strip_trailing_footer(ln))
                        else:
                            free_text_parts.append(cleanup_content(strip_trailing_footer(strip_leading_bullet(ln))))
                    else:
                        free_text_parts.append(cleanup_content(strip_trailing_footer(strip_leading_bullet(ln))))
                    i += 1

                free_text = ' '.join(free_text_parts).strip()
                free_text = clean_free_text(free_text)
                # Determine whether free_text is just header labels (e.g., 'Rodzaj oceny Test Warunki wstępne')
                # Use module-level HEADER_LABEL_RE
                # Fallback: if no title was found, try to use the cleaned content snippet
                if not title_clean:
                    title_clean = clean_title(content.split('\n')[0].strip())

                # Decide whether this content is actually a test or a heading/info
                def decide_node_type(title, free_text, assessmentType, preconditions, procedure, results, cid):
                    # If there are explicit preconditions/procedure/results, treat as a test
                    if preconditions or procedure or results:
                        return 'test'
                    # If the text clearly states 'is informative' => heading
                    if re.search(r'\binformative\b|\bis informative\b|\binformacyjny\b', (free_text or title or ''), re.IGNORECASE):
                        return 'heading'
                    # Short/one-word titles (General, Introduction, Closed functionality) are usually headings
                    if title and re.match(r'^(Introduction|General|Closed functionality|Generic requirements|Non-visual access|Relay service requirements|Closed functionality)$', title, re.IGNORECASE):
                        return 'heading'
                    # If the content contains "See clauses C." references, it's a heading/textual note
                    if re.search(r'See clauses C\.[0-9]+', (free_text or ''), re.IGNORECASE):
                        return 'heading'
                    # If the free_text is very short (a single word or small phrase), treat as heading
                    if free_text and len(free_text) < 50 and len(free_text.split()) <= 4:
                        return 'heading'
                    # Default to test
                    return 'test'

                node_type = decide_node_type(title_clean, free_text, assessmentType, preconditions, procedure, results, cid)
                # Prefer richer text: free_text if reasonably long, otherwise first procedure or precondition
                preferred_text = ''
                if free_text and len(free_text.split()) > 3 and not HEADER_LABEL_RE.search(free_text):
                    preferred_text = free_text
                elif procedure:
                    preferred_text = procedure[0]
                elif preconditions:
                    preferred_text = preconditions[0]
                else:
                    preferred_text = title_clean or (content.split('\n')[0].strip() if content else '')
                preferred_text = cleanup_content(remove_header_labels(preferred_text))

                node = {
                    'type': node_type,
                    'id': 'res-' + cid.replace('.', '-').lower(),
                    'title': title_clean or cid,
                    'text': preferred_text,
                    'assessmentType': assessmentType,
                    'preconditions': preconditions,
                    'procedure': procedure,
                    'results': results,
                    'html': content
                }
                # sanitize the text value to remove footer/license fragments and header labels
                node['text'] = cleanup_content(remove_header_labels(node.get('text', '') or ''))
                # Add a cleaned html variant that strips footer-like lines
                html_lines = [l for l in content.splitlines() if not is_footer_line(l)]
                node['html_clean'] = cleanup_content(remove_header_labels('\n'.join(html_lines).strip()))
                # If we concluded this is a heading, use heading node instead of 'test'
                if node_type == 'heading':
                    clauses[top]['nodes'].append({ 'type': 'heading', 'level': level, 'text': node['title'] })
                else:
                    clauses[top]['nodes'].append(node)
            else:
                node = { 'type': 'heading', 'level': level, 'text': content }
                clauses[top]['nodes'].append(node)

    return clauses


def parse_annex_c_from_pdf(pdf_path):
    # Parse Annex C directly by scanning PDF pages so nested clause numbers are captured accurately
    doc = fitz.open(pdf_path)
    # Find start page: locate the first page where a clause C.1 header is present (content page, not TOC)
    start_page = None
    end_page = None
    def is_toc_like(page_text):
        lines = [l.strip() for l in page_text.splitlines() if l.strip()]
        if not lines:
            return False
        hits = 0
        for line in lines:
            if re.search(r'\.{2,}\s*\d+$', line) or re.search(r'\s\d+$', line):
                hits += 1
        return (hits / len(lines)) > 0.3

    for i in range(len(doc)):
        page_text = doc[i].get_text('text')
        # skip TOC-like pages
        if is_toc_like(page_text):
            continue
        lines = [l.strip() for l in page_text.splitlines() if l.strip()]
        # detect actual clause C.1 (not TOC) by finding a line that starts with 'C.1' and is followed by a clause title
        for ln in lines:
            if re.match(r'^C\.1\b', ln):
                start_page = i
                break
        if start_page is not None:
            break
    # Find end page by searching for Annex D (first page) after start_page
    for i in range(start_page or 0, len(doc)):
        txt = doc[i].get_text('text')
        if re.search(r'\bAnnex\s+D\b', txt, re.IGNORECASE):
            end_page = i
            break
    if start_page is None:
        print('Annex C not found in PDF')
        return {}
    if end_page is None:
        end_page = len(doc)

    # Walk pages between start and end and collect clause blocks
    clauses_raw = []  # list of (cid, content)
    current_id = None
    current_lines = []
    for p in range(start_page, end_page):
        txt = doc[p].get_text('text')
        lines = [l.rstrip() for l in txt.splitlines()]
        for ln in lines:
            stripped = ln.strip()
            if not stripped:
                # preserve blank lines as separator
                if current_id and current_lines and current_lines[-1] != '':
                    current_lines.append('')
                continue
            m = re.match(r'^(C\.[0-9]+(?:\.[0-9]+)*)\b\s*(.*)$', stripped)
            if m:
                # new clause id encountered
                cid = m.group(1)
                rest = m.group(2).strip()
                if current_id:
                    clauses_raw.append((current_id, '\n'.join(current_lines).strip()))
                current_id = cid
                current_lines = []
                if rest:
                    current_lines.append(rest)
            else:
                # append to current clause lines
                if current_id:
                    current_lines.append(stripped)
    # flush last
    if current_id:
        clauses_raw.append((current_id, '\n'.join(current_lines).strip()))

    # Now group by top-level C.x and create similar output structure as parse_annex_c_text
    clauses = {}
    def clean_title(s):
        if not s: return s
        s = re.sub(r"\s*\.{2,}\s*\d+$", '', s).strip()
        s = re.sub(r"\s+[\-–]?\s*\d+$", '', s).strip()
        return s

    for cid, content in clauses_raw:
        top = re.match(r'^(C\.[0-9]+)', cid).group(1)
        if top not in clauses:
            cid_normalized = top.lower().replace('.', '')
            clauses[top] = { 'id': cid_normalized, 'title': '', 'nodes': [] }
        if cid == top:
            title_clean = clean_title(content.split('\n')[0] if content else '')
            clauses[top]['title'] = title_clean
            clauses[top]['nodes'].append({ 'type': 'heading', 'level': 2, 'text': title_clean })
        else:
            parts = cid.split('.')
            level = len(parts)
            if len(parts) >= 3:
                # parse the content block similar to previous logic
                raw_block = content
                lines = [l.strip() for l in raw_block.splitlines() if l.strip()]
                title_candidate = ''
                if lines and not re.search(r'^(Type of assessment|Typ oceny|Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Result|Wynik)\b', lines[0], re.IGNORECASE):
                    title_candidate = lines[0]
                    lines = lines[1:]
                title_clean = clean_title(title_candidate)
                assessmentType = 'Inspection'
                preconditions = []
                procedure = []
                results = []
                free_text_parts = []
                last_section = None
                last_index = -1
                i = 0
                while i < len(lines):
                    ln = lines[i]
                    if re.search(r'^(Type of assessment|Typ oceny|Rodzaj oceny)\b', ln, re.IGNORECASE):
                        parts_line = re.split(r'[:\-]\s*', ln, maxsplit=1)
                        if len(parts_line) > 1 and parts_line[1].strip():
                            assessmentType = parts_line[1].strip()
                        elif i+1 < len(lines):
                            assessmentType = lines[i+1]
                            i += 1
                        i += 1
                        continue
                    if re.search(r'^(Pre-conditions|Warunki wst[aą]pne)\b', ln, re.IGNORECASE):
                        j = i + 1
                        while j < len(lines) and re.match(r'^\d+(?:\.\d+)*\b', lines[j]):
                            mnum = re.match(r'^(\d+(?:\.\d+)*)\s*(.*)', lines[j])
                            if mnum:
                                num = mnum.group(1).strip()
                                item_text = strip_leading_bullet(mnum.group(2).strip())
                                item = f"{num}. {item_text}" if item_text else f"{num}."
                                k = j + 1
                                while k < len(lines) and not re.match(r'^\d+(?:\.\d+)*\b', lines[k]) and not re.search(r'^(Type of assessment|Typ oceny|Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Result|Wynik)\b', lines[k], re.IGNORECASE) and not is_footer_line(lines[k]):
                                    cont = lines[k].strip()
                                    if item.endswith('-'):
                                        item = item[:-1] + cont
                                    else:
                                        item = safe_append(item, strip_trailing_footer(cont))
                                    k += 1
                                preconditions.append(cleanup_content(strip_trailing_footer(item.strip())))
                                last_section = 'preconditions'
                                last_index = len(preconditions) - 1
                                j = k
                                continue
                            j += 1
                        i = j
                        continue
                    if re.search(r'^(Procedure|Procedura)\b', ln, re.IGNORECASE):
                        j = i + 1
                        while j < len(lines) and re.match(r'^\d+(?:\.\d+)*\b', lines[j]):
                            mnum = re.match(r'^(\d+(?:\.\d+)*)\s*(.*)', lines[j])
                            if mnum:
                                num = mnum.group(1).strip()
                                item_text = strip_leading_bullet(mnum.group(2).strip())
                                item = f"{num}. {item_text}" if item_text else f"{num}."
                                k = j + 1
                                while k < len(lines) and not re.match(r'^\d+(?:\.\d+)*\b', lines[k]) and not re.search(r'^(Type of assessment|Typ oceny|Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Result|Wynik)\b', lines[k], re.IGNORECASE) and not is_footer_line(lines[k]):
                                    cont = lines[k].strip()
                                    if item.endswith('-'):
                                        item = item[:-1] + cont
                                    else:
                                        item = safe_append(item, strip_trailing_footer(cont))
                                    k += 1
                                procedure.append(cleanup_content(strip_trailing_footer(item.strip())))
                                last_section = 'procedure'
                                last_index = len(procedure) - 1
                                j = k
                                continue
                            j += 1
                        i = j
                        continue
                    if re.search(r'^(Result|Wynik)\b', ln, re.IGNORECASE):
                        j = i + 1
                        while j < len(lines) and not re.search(r'^(Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Type of assessment|Typ oceny)\b', lines[j], re.IGNORECASE) and not is_footer_line(lines[j]):
                            mresline = re.match(r'^(Pass|Fail|Not applicable|Nie dotyczy|Zaliczone|Niezaliczone)\s*[:\-]\s*(.*)', lines[j], re.IGNORECASE)
                            if mresline:
                                item = strip_leading_bullet(mresline.group(2).strip())
                                k = j + 1
                                while k < len(lines) and not re.match(r'^(Pass|Fail|Not applicable|Nie dotyczy|Zaliczone|Niezaliczone|Pozytywny|Negatywny|Prawda|Fałsz)\s*[:\-]\s*', lines[k], re.IGNORECASE) and not re.search(r'^(Pre-conditions|Warunki wst[aą]pne|Procedure|Procedura|Type of assessment|Typ oceny|Result|Wynik)\b', lines[k], re.IGNORECASE) and not is_footer_line(lines[k]):
                                    cont = lines[k].strip()
                                    if item.endswith('-'):
                                        item = item[:-1] + cont
                                    else:
                                        item = safe_append(item, strip_trailing_footer(cont))
                                    k += 1
                                results.append({ 'label': cleanup_content(strip_trailing_footer(item.strip())), 'type': mresline.group(1) })
                                last_section = 'results'
                                last_index = len(results) - 1
                                j = k
                                continue
                            j += 1
                        i = j
                        continue
                    if re.match(r'^\d+(?:\.\d+)*\b', ln):
                        mnum = re.match(r'^(\d+(?:\.\d+)*)\s*(.*)', ln)
                        if mnum:
                            val = strip_leading_bullet(mnum.group(2).strip())
                            if is_footer_line(val):
                                i += 1
                                continue
                            preconditions.append(cleanup_content(strip_trailing_footer(val)))
                            last_section = 'preconditions'
                            last_index = len(preconditions) - 1
                        i += 1
                        continue
                    if last_section and re.match(r'^[a-ząęółśżźć].*|^[.,;:\-]\s*.*', ln, re.IGNORECASE) and not is_footer_line(ln):
                        if last_section == 'preconditions' and last_index >= 0:
                            preconditions[last_index] = safe_append(preconditions[last_index], ln)
                        elif last_section == 'procedure' and last_index >= 0:
                            procedure[last_index] = safe_append(procedure[last_index], ln)
                        elif last_section == 'results' and last_index >= 0:
                            results[last_index]['label'] = safe_append(results[last_index]['label'], ln)
                        else:
                            if not is_footer_line(ln):
                                free_text_parts.append(cleanup_content(strip_trailing_footer(strip_leading_bullet(ln))))
                    else:
                        if not is_footer_line(ln):
                            free_text_parts.append(cleanup_content(strip_trailing_footer(strip_leading_bullet(ln))))
                    i += 1
                free_text = ' '.join(free_text_parts).strip()
                if not title_clean:
                    title_clean = clean_title(content.split('\n')[0].strip())
                # Decide whether content is a test or heading (for page-by-page parser)
                def decide_node_type2(title, free_text, assessmentType, preconditions, procedure, results, cid):
                    # reuse same heuristic
                    if preconditions or procedure or results:
                        return 'test'
                    if re.search(r'\binformative\b|\bis informative\b|\binformacyjny\b', (free_text or title or ''), re.IGNORECASE):
                        return 'heading'
                    if title and re.match(r'^(Introduction|General|Closed functionality|Generic requirements|Non-visual access|Relay service requirements|Closed functionality)$', title, re.IGNORECASE):
                        return 'heading'
                    if re.search(r'See clauses C\.[0-9]+', (free_text or ''), re.IGNORECASE):
                        return 'heading'
                    if free_text and len(free_text) < 50 and len(free_text.split()) <= 4:
                        return 'heading'
                    return 'test'

                node_type = decide_node_type2(title_clean, free_text, assessmentType, preconditions, procedure, results, cid)
                preferred_text = ''
                if free_text and len(free_text.split()) > 3 and not HEADER_LABEL_RE.search(free_text):
                    preferred_text = free_text
                elif procedure:
                    preferred_text = procedure[0]
                elif preconditions:
                    preferred_text = preconditions[0]
                else:
                    preferred_text = title_clean or (content.split('\n')[0].strip() if content else '')
                preferred_text = cleanup_content(remove_header_labels(preferred_text))

                node = {
                    'type': node_type,
                    'level': level,
                    'id': 'res-' + cid.replace('.', '-').lower(),
                    'title': title_clean or cid,
                    'text': preferred_text,
                    'assessmentType': assessmentType,
                    'preconditions': preconditions,
                    'procedure': procedure,
                    'results': results,
                    'html': content
                }
                # sanitize the text value to remove footer/license fragments and header labels
                node['text'] = cleanup_content(remove_header_labels(node.get('text', '') or ''))
                # Add a cleaned html variant that strips footer-like lines
                html_lines = [l for l in content.splitlines() if not is_footer_line(l)]
                node['html_clean'] = cleanup_content(remove_header_labels('\n'.join(html_lines).strip()))
                if node_type == 'heading':
                    if len(parts) >= 3:
                        converted_nodes.append({ 'cid': cid, 'title': node['title'], 'reason': 'heuristic->heading' })
                    clauses[top]['nodes'].append({ 'type': 'heading', 'level': level, 'text': node['title'] })
                else:
                    clauses[top]['nodes'].append(node)
            else:
                node = { 'type': 'heading', 'level': level, 'text': content }
                clauses[top]['nodes'].append(node)
    return clauses


def write_clauses(clauses, out_dir=CLAUSES_DIR, keep_raw_html=False, strip_html=False):
    for top, data in clauses.items():
        cid = data['id']
        # Cleanup nodes: remove empty strings from preconditions/procedure and
        # ensure results labels are cleaned and empty entries removed.
        for n in data.get('nodes', []):
            if n.get('type') == 'test':
                # Clean arrays and drop empties
                pre = n.get('preconditions') or []
                proc = n.get('procedure') or []
                res = n.get('results') or []
                cleaned_pre = [cleanup_content(remove_header_labels(strip_trailing_footer(x))) for x in pre if x and x.strip()]
                cleaned_proc = [cleanup_content(remove_header_labels(strip_trailing_footer(x))) for x in proc if x and x.strip()]
                cleaned_res = []
                for r in res:
                    if not r: 
                        continue
                    lbl = r.get('label', '') if isinstance(r, dict) else r
                    lbl = cleanup_content(remove_header_labels(strip_trailing_footer(lbl)))
                    if lbl:
                        cleaned_res.append({'type': r.get('type') if isinstance(r, dict) else None, 'label': lbl})
                n['preconditions'] = cleaned_pre
                n['procedure'] = cleaned_proc
                n['results'] = cleaned_res
                # Manage html/raw/clean fields to avoid duplication and optionally strip html entirely
                raw_html = n.get('html', '')
                if not keep_raw_html:
                    # Replace html with cleaned html (if available)
                    if n.get('html_clean'):
                        n['html'] = n['html_clean']
                    # remove html_clean to avoid duplication in outputs
                    if 'html_clean' in n:
                        del n['html_clean']
                else:
                    # keep raw HTML under 'html_raw' and set 'html' to cleaned variant
                    if n.get('html_clean'):
                        n['html_raw'] = raw_html
                        n['html'] = n['html_clean']
                        del n['html_clean']
                if strip_html:
                    # Remove any html-related fields entirely
                    for k in ('html', 'html_raw', 'html_clean'):
                        if k in n:
                            del n[k]
                # If node looks like it's informative only (contains 'informacyjny' or 'nie zawiera wymagań')
                # and doesn't have any preconditions/procedure/results, convert it to heading to avoid false test nodes
                info_markers = re.compile(r'\binformacyjny\b|\bnie zawiera wymagań\b|\bma charakter wyłącznie informacyjn', re.IGNORECASE)
                if n.get('type') == 'test' and not (n.get('preconditions') or n.get('procedure') or n.get('results')):
                    check_text = ' '.join([str(n.get(k, '')) for k in ('html', 'html_clean', 'text', 'title') if n.get(k)])
                    # Convert short title-only nodes (no imperatives) to heading
                    words = re.findall(r"\w+", (n.get('text') or n.get('title') or ''))
                    # Polish/English imperative/check verbs to detect actions (leave as test)
                    action_verbs = re.compile(r'\b(Sprawdz|Sprawdzić|Sprawdź|Określ|Określić|Zmier|Zmierzyć|Check|Measure|Determine|Test)\b', re.IGNORECASE)
                    is_short_label = len(words) > 0 and len(words) <= 5
                    has_imp_verb = action_verbs.search(check_text)
                    # Also consider title == text or short label with no verbs => heading
                    text_val = (n.get('text') or n.get('title') or '')
                    title_val = (n.get('title') or '')
                    starts_with_see = re.search(r'\bpatrz\b|\bsee\b|\brozdzia(.*)\b', text_val, re.IGNORECASE)
                    if (is_short_label and not has_imp_verb) or (text_val.strip() == title_val.strip()) or starts_with_see:
                        # convert to heading
                        n['type'] = 'heading'
                        if 'level' not in n:
                            parts = n.get('id','').split('-')
                            n['level'] = max(2, len(parts))
                        n_text = n.get('title') or n.get('text')
                        n['text'] = cleanup_content(remove_header_labels(str(n_text)))
                        for k in ('assessmentType', 'preconditions', 'procedure', 'results', 'html_clean'):
                            if k in n:
                                del n[k]
                        continue
                    if info_markers.search(check_text):
                        # convert this node to a heading
                        n['type'] = 'heading'
                        # set a level if not present
                        if 'level' not in n:
                            # derive level from id by counting hyphens
                            parts = n.get('id','').split('-')
                            # typical format: res-c-5-3 -> parts len 4 => set heading level 3
                            n['level'] = max(2, len(parts))
                        # move title into text and remove fields that don't make sense for heading
                        n_text = n.get('title') or n.get('text')
                        n['text'] = cleanup_content(remove_header_labels(str(n_text)))
                        for k in ('assessmentType', 'preconditions', 'procedure', 'results', 'html_clean'):
                            if k in n:
                                del n[k]
        filename = os.path.join(out_dir, f"{cid}.json")
        # If nodes exist but first node is heading level 2, keep as is; else push title as heading
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print('Written', filename)


def main():
    parser = argparse.ArgumentParser(description='Convert Annex C clauses from EN 301 549 PDF to structured JSON files')
    parser.add_argument('--pdf', '-p', dest='pdf', default=PDF_PATH, help='PDF file path to parse')
    parser.add_argument('--out', '-o', dest='out', default=CLAUSES_DIR, help='Output directory for clause JSON files')
    parser.add_argument('--site-dir', dest='site_dir', default=None, help='Also copy final JSON files to this directory (e.g., the site directory such as clauses_polish.json)')
    parser.add_argument('--strip-html', dest='strip_html', action='store_true', help='Strip `html` and `html_raw` fields from the generated JSON (default: keep)')
    parser.add_argument('--overwrite-site', dest='overwrite_site', action='store_true', help='Overwrite existing files in site dir when copying (default: skip)')
    parser.add_argument('--backup-site', dest='backup_site', action='store_true', help='Backup existing site-dir files before copying into it')
    parser.add_argument('--report', '-r', dest='report', default=os.path.join(os.path.dirname(__file__), 'parse_report.json'), help='Path to write parse report')
    parser.add_argument('--keep-raw-html', dest='keep_raw_html', action='store_true', help='Keep raw uncleaned html fields in the output (default: html will be sanitized)')
    args = parser.parse_args()

    if not os.path.exists(args.pdf):
        print('PDF not found:', args.pdf)
        sys.exit(1)
    if not os.path.exists(args.out):
        os.makedirs(args.out)

    # Default site directory to the same `clauses` folder unless user specifies otherwise
    if not args.site_dir:
        args.site_dir = CLAUSES_DIR
        print('Defaulting site copy to', args.site_dir)

    # Use the PDF-aware parsing which is more resilient to nested clause IDs
    clauses = parse_annex_c_from_pdf(args.pdf)
    # write clause JSON files to the requested output directory
    write_clauses(clauses, args.out, keep_raw_html=args.keep_raw_html, strip_html=args.strip_html)
    # Write a parse report (nodes converted from 'test' to 'heading') for auditing
    report_path = args.report
    try:
        with open(report_path, 'w', encoding='utf-8') as rf:
            json.dump({ 'converted_nodes': converted_nodes }, rf, ensure_ascii=False, indent=2)
        print('Wrote parse report to', report_path)
    except Exception as e:
        print('Failed to write parse report:', e)
    # Optionally copy the outputs to the site directory the web frontend uses
    if args.site_dir:
        site_dir = os.path.abspath(args.site_dir)
        if not os.path.exists(site_dir):
            print('Creating site directory', site_dir)
            os.makedirs(site_dir, exist_ok=True)
        # backup existing files if requested
        if args.backup_site:
            import shutil, time
            backup_dir = site_dir + '.backup.' + time.strftime('%Y%m%d%H%M%S')
            print('Backing up existing site files to', backup_dir)
            os.makedirs(backup_dir, exist_ok=True)
            for fn in os.listdir(site_dir):
                if fn.endswith('.json'):
                    shutil.copy2(os.path.join(site_dir, fn), os.path.join(backup_dir, fn))
        # Now copy files from out->site_dir, with overwrite behavior as requested
        import shutil
        copied = 0
        for top, data in clauses.items():
            cid = data['id']
            fname = f"{cid}.json"
            src = os.path.join(args.out, fname)
            dst = os.path.join(site_dir, fname)
            if os.path.abspath(src) == os.path.abspath(dst):
                # same file; nothing to copy
                print('Source and destination are identical; skipping copy for', dst)
                continue
            if os.path.exists(dst) and not args.overwrite_site:
                print('Skipping existing site file (use --overwrite-site to overwrite):', dst)
                continue
            shutil.copy2(src, dst)
            copied += 1
        print('Copied', copied, 'files into site directory', site_dir)


if __name__ == '__main__':
    main()

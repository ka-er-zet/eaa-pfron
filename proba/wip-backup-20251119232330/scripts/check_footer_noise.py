#!/usr/bin/env python3
"""Check generated clause JSON files for footer/publisher lines and report offending nodes.

Usage: python scripts/check_footer_noise.py <directory>

This scans every .json file under the directory and reports nodes where any of the
fields 'html', 'text', 'preconditions', 'procedure', or 'results' contain footer markers.
"""
import json
import os
import re
import sys

FOOTER_PATTERNS = [
    re.compile(r'Licenc', re.IGNORECASE),
    re.compile(r'Polski\s+Komitet', re.IGNORECASE),
    re.compile(r'INSTYTUT\s+BADAWCZY', re.IGNORECASE),
    re.compile(r'EN\s*301\s*549', re.IGNORECASE),
    re.compile(r'ETSI\b', re.IGNORECASE),
    re.compile(r'ISBN', re.IGNORECASE),
    re.compile(r'http[s]?://|www\.', re.IGNORECASE),
    re.compile(r'\bul\.|\bulica\b', re.IGNORECASE),
]


def contains_footer(text):
    if not text:
        return False
    for p in FOOTER_PATTERNS:
        if p.search(text):
            return True
    return False


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python scripts/check_footer_noise.py <dir>')
        sys.exit(1)
    root = sys.argv[1]
    report = []
    for dirpath, dirs, files in os.walk(root):
        for fn in files:
            if not fn.endswith('.json'):
                continue
            path = os.path.join(dirpath, fn)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    js = json.load(f)
            except Exception as e:
                print('Failed to parse', path, e)
                continue
            topid = js.get('id') or fn
            for i,node in enumerate(js.get('nodes', []) if isinstance(js.get('nodes', []), list) else []):
                nid = node.get('id') or f'{topid}-node-{i}'
                fields_to_check = []
                for k in ('html','html_clean','text'):
                    if k in node and node[k]:
                        fields_to_check.append((k,node[k]))
                for k in ('preconditions','procedure','results'):
                    if k in node and node[k]:
                        if isinstance(node[k], list):
                            # results might be list of dicts
                            for j, v in enumerate(node[k]):
                                if isinstance(v, dict):
                                    # check label
                                    lbl = v.get('label')
                                    if contains_footer(lbl):
                                        report.append({'file': path, 'node_id': nid, 'field': f'{k}[{j}].label', 'sample': lbl[:150]})
                                elif isinstance(v, str) and contains_footer(v):
                                    report.append({'file': path, 'node_id': nid, 'field': f'{k}[{j}]', 'sample': v[:150]})
                        else:
                            if isinstance(node[k], str) and contains_footer(node[k]):
                                report.append({'file': path, 'node_id': nid, 'field': k, 'sample': node[k][:150]})
                # check simple fields
                for k,v in fields_to_check:
                    if contains_footer(v):
                        report.append({'file': path, 'node_id': nid, 'field': k, 'sample': v[:150]})
    # Print report
    if not report:
        print('No footer markers found in', root)
        sys.exit(0)
    print('Footer markers detected:')
    for r in report:
        print(f"{r['file']} -> {r['node_id']} -> {r['field']}: {r['sample']}")
    print('\nTotal issues found:', len(report))

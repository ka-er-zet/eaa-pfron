#!/usr/bin/env python3
"""Find nodes that are still 'test' type but look informative (e.g., 'informacyjny').

Usage: python scripts/find_informational_nodes.py <dir>

This is a small utility to run on Windows PowerShell or other shells without using heredocs.
"""
import json
import os
import sys
import re

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python scripts/find_informational_nodes.py <dir>')
        sys.exit(1)
    root = sys.argv[1]
    markers = re.compile(r'\binformacyjny\b|\bnie zawiera wymagań\b|\bma charakter wyłącznie informacyjn', re.IGNORECASE)
    matches = []
    for dirpath, dirs, files in os.walk(root):
        for fn in files:
            if not fn.endswith('.json'):
                continue
            path = os.path.join(dirpath, fn)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    js = json.load(f)
            except Exception as e:
                print('Failed to read', path, e)
                continue
            for i, node in enumerate(js.get('nodes', []) if isinstance(js.get('nodes', []), list) else []):
                if node.get('type') != 'test':
                    continue
                text = ' '.join([str(node.get('title', '')), str(node.get('text', '')), str(node.get('html_clean', '')), str(node.get('html', ''))])
                if markers.search(text):
                    matches.append({'file': path, 'node': node.get('id') or f'n{i}', 'title': node.get('title'), 'sample': text[:200]})
    if not matches:
        print('No candidate informational test nodes found in', root)
        sys.exit(0)
    print('Found', len(matches), 'informational test nodes:')
    for m in matches:
        print(m['file'], '->', m['node'], '->', (m['title'] or '')[:80])
    sys.exit(0)

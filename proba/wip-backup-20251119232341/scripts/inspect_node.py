#!/usr/bin/env python3
"""Inspect a specific node in a clause JSON output.

Usage: python scripts/inspect_node.py <output-dir> <clause-id> <node-id>
Example: python scripts/inspect_node.py clauses_polish.json c5 res-c-5-1
"""
import json
import os
import sys

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print('Usage: python scripts/inspect_node.py <output-dir> <clause-id> <node-id>')
        sys.exit(1)
    out = sys.argv[1]
    clause = sys.argv[2]
    node_id = sys.argv[3]
    path = os.path.join(out, f'{clause}.json')
    if not os.path.exists(path):
        print('File not found:', path)
        sys.exit(1)
    with open(path, 'r', encoding='utf-8') as f:
        js = json.load(f)
    node = next((n for n in js.get('nodes', []) if n.get('id') == node_id), None)
    if not node:
        print('Node', node_id, 'not found in', path)
        sys.exit(1)
    print('Node', node_id)
    print('  type:', node.get('type'))
    print('  title:', node.get('title',''))
    print('  text:', (node.get('text','') or '')[:200])
    if 'preconditions' in node:
        print('  preconditions:', node.get('preconditions'))
    if 'procedure' in node:
        print('  procedure:', node.get('procedure'))
    if 'results' in node:
        print('  results:', node.get('results'))
    if 'html' in node:
        print('  html sample:', (node.get('html') or '')[:200])
    if 'html_raw' in node:
        print('  html_raw sample:', (node.get('html_raw') or '')[:200])

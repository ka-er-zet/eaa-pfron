#!/usr/bin/env python3
"""
Validate structured clause JSON files generated from Annex C PDF.

Checks performed:
- Each file is valid JSON
- Each has keys: id (string), title (string), nodes (array)
- For each node, ensure 'type' exists and is one of heading/test/info
- For tests, ensure 'id' and 'title' exist, 'preconditions' and 'procedure' are arrays (if present)

Usage:
  python .\scripts\validate_clauses_json.py
"""
import json
import os
import sys

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CLAUSES_DIR = os.path.join(BASE, 'clauses')

def validate_clause_file(path):
    errors = []
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            data = json.load(fh)
    except Exception as e:
        errors.append(f'could not parse JSON: {e}')
        return errors

    if not isinstance(data, dict):
        errors.append('root is not a JSON object')
        return errors
    if 'id' not in data or not isinstance(data['id'], str):
        errors.append('missing or non-string id')
    if 'title' not in data or not isinstance(data['title'], str):
        errors.append('missing or non-string title')
    if 'nodes' not in data or not isinstance(data['nodes'], list):
        errors.append('missing or non-array nodes')
        return errors

    allowed_node_types = {'heading','test','info'}
    for idx, node in enumerate(data['nodes']):
        if not isinstance(node, dict):
            errors.append(f'nodes[{idx}] is not an object')
            continue
        ntype = node.get('type')
        if not ntype or ntype not in allowed_node_types:
            errors.append(f'nodes[{idx}].type invalid/missing: {ntype}')
            continue
        if ntype == 'test':
            if 'id' not in node or not isinstance(node['id'], str):
                errors.append(f'nodes[{idx}].id missing or non-string')
            if 'title' not in node or not isinstance(node['title'], str):
                errors.append(f'nodes[{idx}].title missing or non-string')
            if 'preconditions' in node and not isinstance(node['preconditions'], list):
                errors.append(f'nodes[{idx}].preconditions is not an array')
            if 'procedure' in node and not isinstance(node['procedure'], list):
                errors.append(f'nodes[{idx}].procedure is not an array')
            if 'results' in node and not isinstance(node['results'], list):
                errors.append(f'nodes[{idx}].results is not an array')

    return errors

def main():
    files = sorted([f for f in os.listdir(CLAUSES_DIR) if f.endswith('.json')])
    total_errors = 0
    for fn in files:
        path = os.path.join(CLAUSES_DIR, fn)
        errs = validate_clause_file(path)
        if errs:
            total_errors += 1
            print(f'FAIL {fn}:')
            for e in errs:
                print('  -', e)
        else:
            print(f'OK   {fn}')

    if total_errors:
        print('\nValidation failed for', total_errors, 'files')
        sys.exit(2)
    else:
        print('\nAll clause JSON files valid')
        sys.exit(0)

if __name__ == '__main__':
    main()

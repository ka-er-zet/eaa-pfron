import json
import sys
fn = 'clauses_json/c11.json'
with open(fn, 'r', encoding='utf-8') as f:
    data = f.read()
try:
    json.loads(data)
    print('OK')
except json.JSONDecodeError as e:
    print('JSONDecodeError: ', e)
    line = e.lineno
    col = e.colno
    lines = data.splitlines()
    start = max(0, line-6)
    end = min(len(lines), line+6)
    print('\nContext:')
    for i in range(start, end):
        print(f"{i+1:5}: {lines[i]}")
    print('\nCharacter index approximate: ', e.pos)
    sys.exit(1)

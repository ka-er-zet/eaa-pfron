import json

# Load parsed PDF data from a debug run
# We'll manually inspect what the parser extracted for C.5.3#2

# For now, let's just print what we have in the generated JSON
with open('clauses_json_pdf/c5.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find C.5.3 tests
in_c53 = False
test_count = 0
for item in data['content']:
    if item.get('type') == 'heading' and 'C.5.3' in item.get('text', ''):
        in_c53 = True
        print(f"Found heading: {item['text']}")
    elif in_c53 and item.get('type') == 'test':
        test_count += 1
        print(f"\n=== TEST {test_count} ===")
        print(f"Preconditions: {item.get('preconditions', [])}")
        print(f"Procedure: {item.get('procedure', [])}")
        print(f"Form legend: {item.get('form', {}).get('legend', 'N/A')}")
    elif item.get('type') == 'heading' and in_c53:
        break  # Next heading, stop

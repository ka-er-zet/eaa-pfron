
import json

with open('clauses_json/c9.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

criteria = []
current_heading = ""

for item in data['content']:
    if item.get('type') == 'heading':
        current_heading = item.get('text', '')
    elif item.get('type') == 'test':
        # Try to extract ID from the previous heading or context
        # The structure seems to be Heading -> Test
        criteria.append(current_heading)

print(f"Found {len(criteria)} criteria.")
for c in criteria:
    print(c)

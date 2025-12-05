import json
import re

fn = 'clauses_json/c11.json'
with open(fn, 'r', encoding='utf-8') as f:
    data = json.load(f)

# iterate through data['content']; keep track of last heading
mismatches = []
last_heading = None
last_heading_level = None

content = data.get('content', [])

# Helper to extract table numbers or wcag id
re_table = re.compile(r"Tabela\s*11\.(\d+)")
re_wcag = re.compile(r"WCAG\s*[^–]*–\s*([0-9.]+)")
re_table_alt = re.compile(r"Tabela\s*11\.(\d+)\.*")

for i, block in enumerate(content):
    if block.get('type') == 'heading':
        last_heading = block.get('text')
        last_heading_level = block.get('level')

    if block.get('type') == 'test':
        test_heading = last_heading or '(no heading)'
        proc = ' '.join(block.get('procedure', []))
        # extract table or wcag from procedure
        proc_tables = re_table.findall(proc)
        proc_wcag = re_wcag.findall(proc)

        dlist = block.get('detailedChecklist', [])
        checklist_text = ' '.join(dlist)
        cl_tables = re_table.findall(checklist_text)
        cl_wcag = re_wcag.findall(checklist_text)

        # normalize
        proc_identifier = proc_tables or proc_wcag
        cl_identifier = cl_tables or cl_wcag

        if proc_identifier and cl_identifier:
            # compare first
            if proc_identifier[0] != cl_identifier[0]:
                mismatches.append((i, test_heading, proc_identifier, cl_identifier, proc, checklist_text))

        # cases where procedure has table but checklist does not, or vice versa
        if proc_tables and not cl_tables:
            mismatches.append((i, test_heading, proc_tables, [], proc, checklist_text))
        if not proc_tables and cl_tables:
            mismatches.append((i, test_heading, [], cl_tables, proc, checklist_text))

# Output mismatches
if mismatches:
    print(f"Found {len(mismatches)} mismatches:\n")
    for idx, heading, proc_id, cl_id, proc, chk in mismatches:
        print('---')
        print(f"Index: {idx}")
        print(f"Heading: {heading}")
        print(f"Procedure IDs: {proc_id}")
        print(f"Checklist IDs: {cl_id}")
        print(f"Procedure: {proc[:200]}...")
        print(f"Checklist: {chk[:200]}...")
else:
    print('No mismatches found')

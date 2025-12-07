import requests
import re
from bs4 import BeautifulSoup
print('Fetching annex page...')
url = 'https://accessible.canada.ca/creating-accessibility-standards/canasc-en-301-5492024-accessibility-requirements-ict-products-and-services/annex-c-normative-determination-conformance#toc-id-53'
resp = requests.get(url, timeout=15)
soup = BeautifulSoup(resp.text, 'html.parser')
headings = []
for h in soup.find_all(re.compile(r'^h[1-7]$')):
    text = ' '.join(h.get_text(' ', strip=True).split())
    if text.startswith('C.'):
        num = text.split()[0]
        if re.match(r'^C\.(5|6|7|8|9|1[0-3])', num):
            headings.append(num)
site_set = set(headings)
print('Total headings matching C.5-C.13:', len(site_set))
import json
json_set = set()
for num in range(5,14):
    path = f'clauses_json/c{num}.json'
    try:
        data = json.load(open(path, 'r', encoding='utf-8'))
    except FileNotFoundError:
        continue
    for item in data.get('content', []):
        if item.get('type') in {'test', 'heading'}:
            txt = item.get('text', '')
            if txt.startswith('C.'):
                clause = txt.split()[0]
                json_set.add(clause)
print('Total clause numbers in JSONs (C.5-C.13):', len(json_set))
missing = sorted(site_set - json_set, key=lambda x: [int(p) for p in re.findall(r'\d+', x)])
extra = sorted(json_set - site_set, key=lambda x: [int(p) for p in re.findall(r'\d+', x)])
print('Missing in JSONs:', missing)
print('Extra in JSONs (not in site headings):', extra)

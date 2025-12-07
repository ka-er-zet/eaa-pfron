import requests, re
text = requests.get('https://accessible.canada.ca/creating-accessibility-standards/canasc-en-301-5492024-accessibility-requirements-ict-products-and-services/annex-c-normative-determination-conformance#toc-id-53').text
for pattern in ['C.6.2.4', 'C.6.5.1', 'C.8.1.1', 'C.8.3.0', 'C.9.0', 'C.9.1.4.6', 'C.10.1.4.6', 'C.10.2.4.1', 'C.11.1.2.1.2']:
    match = re.search(pattern + r'.{0,200}', text)
    print(pattern, bool(match))
    if match:
        start = text.rfind('<', 0, match.start())
        end = text.find('<', match.end())
        print(text[match.start():match.start()+200])

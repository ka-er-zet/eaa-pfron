import os
import json
import re
from html.parser import HTMLParser

class ClauseParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.data = {
            "id": "",
            "title": "",
            "content": []
        }
        self.current_tag = None
        self.current_attrs = {}
        self.in_audit_item = False
        self.in_test_details = False
        self.in_fieldset = False
        self.current_item = None
        self.capture_text = False
        self.text_buffer = ""
        self.list_buffer = []
        self.in_list_item = False
        self.temp_data = {}

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.current_tag = tag
        self.current_attrs = attrs_dict
        
        classes = attrs_dict.get('class', '').split()
        id_attr = attrs_dict.get('id', '')

        if tag == 'h2' and not self.data['title']:
            self.capture_text = True
            self.text_buffer = ""
        
        elif tag in ['h3', 'h4', 'h5', 'h6']:
            # If we are inside an audit item (informative), we might want to capture it as part of the item text?
            # But based on c5.html, headings are usually siblings of audit items or inside informative ones.
            # If we are NOT in an audit item, it's a section heading.
            if not self.in_audit_item:
                self.capture_text = True
                self.text_buffer = ""
                self.temp_data = {'type': 'heading', 'level': int(tag[1])}

        elif tag == 'div' and 'audit-item' in classes:
            self.in_audit_item = True
            self.current_item = {'type': 'test'}
            if 'informative' in classes:
                self.current_item['type'] = 'informative'
                self.current_item['text'] = ""
            else:
                self.current_item['preconditions'] = []
                self.current_item['procedure'] = []
                self.current_item['form'] = {'inputs': []}

        elif self.in_audit_item:
            if self.current_item['type'] == 'informative':
                # Capture all text inside informative
                if tag == 'p' or tag in ['h3', 'h4', 'h5', 'h6']:
                     self.capture_text = True
                     self.text_buffer = ""
            else:
                # Test item
                if 'test-details' in classes:
                    self.in_test_details = True
                elif tag == 'fieldset':
                    self.in_fieldset = True
                
                if self.in_test_details:
                    if tag == 'p':
                        self.capture_text = True
                        self.text_buffer = ""
                    elif tag == 'li':
                        self.in_list_item = True
                        self.capture_text = True
                        self.text_buffer = ""
                
                if self.in_fieldset:
                    if tag == 'legend':
                        self.capture_text = True
                        self.text_buffer = ""
                    elif tag == 'input' and attrs_dict.get('type') == 'radio':
                        val = attrs_dict.get('value')
                        self.temp_data['input_val'] = val
                    elif tag == 'label':
                        self.capture_text = True
                        self.text_buffer = ""
                    elif tag == 'textarea':
                        self.current_item['form']['noteId'] = id_attr

    def handle_endtag(self, tag):
        if tag == 'h2' and not self.data['title']:
            self.data['title'] = self.text_buffer.strip()
            self.capture_text = False
        
        elif tag in ['h3', 'h4', 'h5', 'h6']:
            if not self.in_audit_item:
                self.temp_data['text'] = self.text_buffer.strip()
                self.data['content'].append(self.temp_data)
                self.temp_data = {}
                self.capture_text = False
            elif self.current_item and self.current_item['type'] == 'informative':
                 self.current_item['text'] += self.text_buffer.strip() + "\n"
                 self.capture_text = False

        elif tag == 'div' and self.in_audit_item and 'audit-item' in self.current_attrs.get('class', '').split(): # This is tricky, need to track nesting or assume audit-item is not nested
             # Since we don't track nesting depth of divs, this might close prematurely if there are inner divs.
             # But looking at HTML, audit-item usually contains test-details and fieldset.
             # We need a better way to detect end of audit-item.
             # Let's assume audit-item div is the one closing.
             # Actually, HTMLParser doesn't give us the matching start tag for end tag easily without a stack.
             pass

        # Simple stack tracking for audit-item would be better.
        # But for now, let's just handle the content extraction.
        
        if self.in_audit_item:
            if self.current_item['type'] == 'informative':
                if tag == 'p':
                    self.current_item['text'] += self.text_buffer.strip() + "\n"
                    self.capture_text = False
            else:
                if self.in_test_details:
                    if tag == 'p':
                        text = self.text_buffer.strip()
                        if text.startswith('Typ oceny:'):
                            self.current_item['evaluationType'] = text.replace('Typ oceny:', '').strip()
                        elif text.startswith('Warunki wstępne:'):
                            self.temp_data['list_type'] = 'preconditions'
                        elif text.startswith('Procedura:'):
                            self.temp_data['list_type'] = 'procedure'
                        self.capture_text = False
                    elif tag == 'li':
                        if 'list_type' in self.temp_data:
                            self.current_item[self.temp_data['list_type']].append(self.text_buffer.strip())
                        self.in_list_item = False
                        self.capture_text = False
                    elif tag == 'div' and 'test-details' in self.current_attrs.get('class', '').split(): # Again, risky
                        pass # We don't explicitly close test-details flag here, we rely on structure
                
                if self.in_fieldset:
                    if tag == 'legend':
                        self.current_item['form']['legend'] = self.text_buffer.strip()
                        self.capture_text = False
                    elif tag == 'label':
                        if 'input_val' in self.temp_data:
                            self.current_item['form']['inputs'].append({
                                'value': self.temp_data['input_val'],
                                'label': self.text_buffer.strip()
                            })
                            del self.temp_data['input_val']
                        self.capture_text = False
                    elif tag == 'fieldset':
                        self.in_fieldset = False

    def handle_data(self, data):
        if self.capture_text:
            self.text_buffer += data

# Re-implementing with a more robust stack-based approach because the above is too fragile
class RobustClauseParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.data = {"id": "", "title": "", "content": []}
        self.stack = [] # Stack of (tag, attrs)
        
        self.current_audit_item = None
        self.capture_text = False
        self.text_buffer = ""
        
        self.list_context = None # 'preconditions' or 'procedure'
        self.temp_input_val = None
        self.list_counter = 0
        
        # New fields for WCAG level parsing
        self.in_wcag_level_span = False
        self.wcag_level_buffer = ""
        self.current_wcag_level = None
        
        # Inline tags to preserve
        self.inline_tags = ['a', 'strong', 'em', 'code', 'i', 'b', 'u', 'br']

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.stack.append((tag, attrs_dict))
        classes = attrs_dict.get('class', '').split()
        
        if tag == 'h2' and not self.data['title']:
            self.capture_text = True
            self.text_buffer = ""
            self.current_wcag_level = None # Reset for new heading
            
        elif tag in ['h3', 'h4', 'h5', 'h6']:
            if self.current_audit_item is None:
                self.capture_text = True
                self.text_buffer = ""
                self.current_wcag_level = None # Reset for new heading

        elif tag == 'span' and 'poziom' in classes:
            self.in_wcag_level_span = True
            self.wcag_level_buffer = ""

        elif tag == 'div' and 'audit-item' in classes:
            self.current_audit_item = {
                'type': 'informative' if 'informative' in classes else 'test'
            }
            if self.current_audit_item['type'] == 'test':
                self.current_audit_item.update({
                    'preconditions': [],
                    'procedure': [],
                    'form': {'inputs': []}
                })
            else:
                self.current_audit_item['text'] = ""

        elif self.current_audit_item:
            if self.current_audit_item['type'] == 'test':
                if tag == 'p':
                    self.capture_text = True
                    self.text_buffer = ""
                elif tag == 'ol':
                    self.list_counter = 0
                elif tag == 'li':
                    self.list_counter += 1
                    self.capture_text = True
                    self.text_buffer = ""
                elif tag == 'legend':
                    self.capture_text = True
                    self.text_buffer = ""
                elif tag == 'input' and attrs_dict.get('type') == 'radio':
                    self.temp_input_val = attrs_dict.get('value')
                elif tag == 'label':
                    self.capture_text = True
                    self.text_buffer = ""
                elif tag == 'textarea':
                    self.current_audit_item['form']['noteId'] = attrs_dict.get('id')
            else:
                # Informative
                if tag in ['p', 'h3', 'h4', 'h5', 'h6']:
                    self.capture_text = True
                    self.text_buffer = ""
        
        # Handle inline tags preservation
        if self.capture_text and tag in self.inline_tags:
            self.text_buffer += self.get_starttag_text()

    def handle_endtag(self, tag):
        # Pop from stack
        while self.stack and self.stack[-1][0] != tag:
            self.stack.pop()
        if self.stack:
            _, attrs_dict = self.stack.pop()
            classes = attrs_dict.get('class', '').split()
        else:
            classes = []

        if tag == 'span' and self.in_wcag_level_span:
            self.in_wcag_level_span = False
            self.current_wcag_level = self.wcag_level_buffer.strip()

        elif tag == 'h2' and not self.data['title']:
            self.data['title'] = self.text_buffer.strip()
            self.capture_text = False
            
        elif tag in ['h3', 'h4', 'h5', 'h6']:
            if self.current_audit_item is None:
                heading_data = {
                    'type': 'heading',
                    'level': int(tag[1]),
                    'text': self.text_buffer.strip()
                }
                if self.current_wcag_level:
                    heading_data['wcag_level'] = self.current_wcag_level
                
                self.data['content'].append(heading_data)
                self.capture_text = False
            elif self.current_audit_item['type'] == 'informative':
                 self.current_audit_item['text'] += self.text_buffer.strip() + "\n"
                 self.capture_text = False

        elif tag == 'div' and 'audit-item' in classes:
            if self.current_audit_item:
                self.data['content'].append(self.current_audit_item)
                self.current_audit_item = None

        elif self.current_audit_item:
            text = self.text_buffer.strip()
            # Helper to strip tags for logic checks
            clean_text = re.sub(r'<[^>]+>', '', text).strip()
            
            if self.current_audit_item['type'] == 'test':
                if tag == 'p':
                    if clean_text.startswith('Typ oceny:'):
                        self.current_audit_item['evaluationType'] = clean_text.replace('Typ oceny:', '').strip()
                    elif clean_text.startswith('Warunki wstępne:'):
                        self.list_context = 'preconditions'
                    elif clean_text.startswith('Procedura:'):
                        self.list_context = 'procedure'
                    self.capture_text = False
                elif tag == 'li':
                    if self.list_context:
                        # Add number to text (preserve tags in text)
                        numbered_text = f"{self.list_counter}. {text}"
                        self.current_audit_item[self.list_context].append(numbered_text)
                    self.capture_text = False
                elif tag == 'legend':
                    self.current_audit_item['form']['legend'] = text
                    self.capture_text = False
                elif tag == 'label':
                    if self.temp_input_val:
                        self.current_audit_item['form']['inputs'].append({
                            'value': self.temp_input_val,
                            'label': text
                        })
                        self.temp_input_val = None
                    self.capture_text = False
            else:
                if tag == 'p':
                    self.current_audit_item['text'] += text + "\n"
                    self.capture_text = False
        
        # Handle inline tags preservation
        if self.capture_text and tag in self.inline_tags:
            self.text_buffer += f"</{tag}>"

    def handle_data(self, data):
        if self.in_wcag_level_span:
            self.wcag_level_buffer += data
        elif self.capture_text:
            self.text_buffer += data

def convert_file(filepath, output_path):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    parser = RobustClauseParser()
    parser.feed(content)
    parser.data['id'] = os.path.splitext(os.path.basename(filepath))[0]
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(parser.data, f, indent=2, ensure_ascii=False)
    print(f"Converted {filepath}")

def main():
    clauses_dir = 'clauses'
    output_dir = 'clauses_json'
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    for filename in os.listdir(clauses_dir):
        if filename.endswith('.html'):
            convert_file(os.path.join(clauses_dir, filename), 
                         os.path.join(output_dir, filename.replace('.html', '.json')))

if __name__ == '__main__':
    main()

import json
import re

file_path = r"c:\Users\marci\OneDrive\Documents\EAA\Accessibility_Report-Konfiguracja aduty EN 301 549.html"

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the JSON object
    match = re.search(r'ACEREPORT\s*=\s*({.*?});', content, re.DOTALL)
    if not match:
        # Try without the semicolon or just look for the start
        match = re.search(r'ACEREPORT\s*=\s*({.*)', content, re.DOTALL)
    
    if match:
        json_str = match.group(1)
        # It might be followed by other code, so we need to be careful. 
        # Since it's likely valid JSON, we can try to parse it. 
        # If it's minified, it might be hard to find the end.
        # But usually in these reports, it's a variable assignment.
        
        # Let's try to find the end of the JSON object.
        # A simple stack approach to find the matching closing brace.
        stack = []
        json_end_index = 0
        for i, char in enumerate(json_str):
            if char == '{':
                stack.append('{')
            elif char == '}':
                if stack:
                    stack.pop()
                    if not stack:
                        json_end_index = i + 1
                        break
        
        if json_end_index > 0:
            clean_json_str = json_str[:json_end_index]
            data = json.loads(clean_json_str)
            
            print(f"Report URL: {data.get('tabURL')}")
            print("-" * 20)
            
            results = data.get('report', {}).get('results', [])
            
            violations = [r for r in results if r['value'][0] == 'VIOLATION' and r['value'][1] == 'FAIL']
            potential = [r for r in results if r['value'][0] == 'VIOLATION' and (r['value'][1] == 'POTENTIAL' or r['value'][1] == 'MANUAL')]
            recommendations = [r for r in results if r['value'][0] == 'RECOMMENDATION']
            
            print(f"Violations: {len(violations)}")
            for v in violations:
                print(f"Rule: {v['ruleId']}")
                print(f"Message: {v['message']}")
                print(f"Path: {v['path']['dom']}")
                print(f"Snippet: {v.get('snippet', 'N/A')}")
                print("-" * 10)

            print(f"Needs Review: {len(potential)}")
            for v in potential:
                print(f"Rule: {v['ruleId']}")
                print(f"Message: {v['message']}")
                print(f"Path: {v['path']['dom']}")
                print("-" * 10)
                
        else:
            print("Could not find end of JSON object.")
    else:
        print("Could not find ACEREPORT variable.")

except Exception as e:
    print(f"Error: {e}")

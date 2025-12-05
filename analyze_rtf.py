
import re

def strip_rtf(text):
    pattern = r"\\([a-z]{1,32})(-?\d{1,10})?[ ]?|\\'([0-9a-f]{2})|\\([^a-z])|([{}])"
    def replace(match):
        if match.group(1): return ""
        if match.group(3): return chr(int(match.group(3), 16))
        if match.group(4): return match.group(4)
        return ""
    return re.sub(pattern, replace, text, flags=re.IGNORECASE)

try:
    with open("Lista_kontrolna_do_badania_dostępności_cyfrowej_stron_www_-_wersja_22.rtf", "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        # Basic cleanup to find text
        # RTF is ASCII usually, but let's try to just find the string first
        pass
except Exception as e:
    print(f"Error reading file: {e}")
    exit()

# Since proper RTF parsing is hard without a lib, let's try a simpler approach:
# Read lines, look for the pattern, print surrounding lines.
# But RTF is often one huge line or broken arbitrarily.

# Let's try to just read it as binary and decode what we can
with open("Lista_kontrolna_do_badania_dostępności_cyfrowej_stron_www_-_wersja_22.rtf", "rb") as f:
    content_bytes = f.read()

# RTF usually encodes non-ascii chars. Polish chars might be encoded.
# e.g. \'b9 for ą (in cp1250)
# Let's try to decode as cp1250 or similar if possible, but RTF escapes them.

# Let's try to find the section for 1.1.1
# "Treść nietekstowa" might be "Tre\'9c\'e6 nietekstowa" or similar.

# Let's search for "1.1.1" which is likely stable.
import re

text_content = content_bytes.decode('cp1252', errors='ignore') # Standard RTF encoding usually

# Simple regex to find "1.1.1" and some context
matches = re.finditer(r"1\.1\.1", text_content)

print("Found matches for 1.1.1:")
for i, match in enumerate(matches):
    if i > 5: break
    start = max(0, match.start() - 500)
    end = min(len(text_content), match.end() + 2000)
    snippet = text_content[start:end]
    print(f"--- Match {i} ---")
    print(snippet)
    print("----------------")

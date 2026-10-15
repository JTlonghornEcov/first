"""Prints the live homepage's sections (text and media) from a saved HTML file. Usage: python3 -I dump-sections.py home.html"""
import html
import re
import sys
h = open(sys.argv[1], encoding='utf8').read()
m = re.search(r'<main.*?</main>', h, re.S).group(0)
secs = re.findall(r'<section\b.*?</section>', m, re.S)
print(len(secs), 'sections')
for i, s in enumerate(secs):
    cls = re.search(r'class="([^"]*)"', s)
    t = re.sub(r'<(script|style|svg)\b.*?</\1>', ' ', s, flags=re.S)
    txt = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' | ', t)))
    txt = re.sub(r'(\|\s*)+', '| ', txt)
    print('\n=== %d len=%d class=%s' % (i, len(s), cls.group(1)[:70] if cls else ''))
    print(txt[:900])
    for v in re.findall(r'<(?:video|source)[^>]*>', s)[:3]:
        print('  VIDEO', v[:300])
    print('  data-attrs:', sorted(set(re.findall(r'\b(data-[a-z-]+)', s)))[:12])

"""Compares the live PPWR design page with its draft: H1s, title, description, hidden-header rule, header image,
and whether every live word is still present (in order) in the draft. Usage: python3 -I tools/compare_ppwr.py live.html draft.html"""
import html
import re
import sys


def first(h, pattern):
    m = re.search(pattern, h.split('</head>')[0], re.S)
    return re.sub(r'\s+', ' ', m.group(1)).strip()[:110] if m else ''


def summary(name, h):
    hero = re.search(r'<section class="hero.*?</section>', h, re.S)
    hero = hero.group(0) if hero else ''
    title = first(h, r'<title>(.*?)</title>')
    desc = first(h, r'name="description" content="([^"]*)"')
    buttons = re.findall(r'href="(#ev-[a-z]+)"', hero)
    print(f'{name}: h1={len(re.findall(r"<h1", h))} | title={title!r} | description={desc!r}'
          f' | header hidden by CSS={"section.hero{display:none}" in h}'
          f' | header image={"01-ppwr-hero-declaration" in hero} | header buttons={buttons}')


def words(h):
    m = re.search(r'<main.*</main>', h, re.S).group(0)
    m = re.sub(r'<(script|style|svg)\b.*?</\1>', ' ', m, flags=re.S)
    return html.unescape(re.sub(r'<[^>]+>', ' ', m)).split()


live, draft = (open(p, encoding='utf8').read() for p in sys.argv[1:3])
summary('LIVE ', live)
summary('DRAFT', draft)
# Compare what a visitor sees: drop the live page's CSS-hidden template header (a duplicate of the design's hero).
visible_live = re.sub(r'<section class="hero.*?</section>', '', live, count=1, flags=re.S)
a, b = words(visible_live), words(draft)
import difflib
ops = [op for op in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes() if op[0] != 'equal']
print(f'visible words: live {len(a)} | draft {len(b)} | differences: {len(ops)}')
for tag, i1, i2, j1, j2 in ops:
    print(f'  {tag}: live "{" ".join(a[i1:i2])[:140]}"  ->  draft "{" ".join(b[j1:j2])[:140]}"')

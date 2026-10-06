"""Turns a blog post's single text block into a sectioned page-builder layout, keeping the wording.
Reads payloads/blog/<id>.json, writes payloads/blog/<id>.plan.json. Only formatting changes are made."""
import json, re, sys, html

BOILER_RAPID = re.compile(r'The rapid rate at which (DRS and )?EPR regulations are evolving', re.I)
BOILER_CONTACT = re.compile(r'^(<strong>)?Get in touch with us today', re.I)
TOP = re.compile(r'<(p|h[1-6]|ul|ol|blockquote|figure|table|div)\b[^>]*>.*?</\1>', re.S)

def text(h): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()
def words(h): return len(text(h).split())
def inner(el): return re.sub(r'^<[^>]+>|</[a-z0-9]+>$', '', el.strip(), flags=re.S).strip()
def tag(el): return re.match(r'<([a-z0-9]+)', el).group(1)

def elements(h):
    els = [m.group(0) for m in TOP.finditer(h)]
    rest = TOP.sub('', h)
    assert not text(rest), 'unparsed content: ' + text(rest)[:200]
    out = []
    for e in els:
        t = tag(e)
        if t == 'p' and not text(e): continue
        if re.fullmatch(r'h[1-6]', t) and not text(e): continue
        # "• a• b• c" packed in one paragraph -> list
        if t == 'p' and inner(e).lstrip().startswith('•'):
            items = [i.strip() for i in re.split(r'•', inner(e)) if text(i)]
            out.append('<ul>' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>'); continue
        out.append(e)
    return out

def is_bold_line(e):
    return tag(e) == 'p' and re.fullmatch(r'\s*<(strong|b)>(.*?)</\1>\s*(<br\s*/?>)?\s*', inner(e), re.S) and words(e) <= 14

def heading_text(e):
    t = re.sub(r'<br\s*/?>', ' ', inner(e)); t = re.sub(r'</?(strong|b|em|span)[^>]*>', '', t)
    t = html.unescape(t).replace('\xa0', ' ').strip()          # plain text: no entities (media-card titles are plain text)
    t = re.sub(r'\s*:\s*$', '', t)
    return html.escape(t, quote=False)

def normalise(els):
    """Heading levels: top-level section heads -> h2, subordinate heads -> h3. Bold-only lines count as heads."""
    heads = [e for e in els if re.fullmatch(r'h[1-6]', tag(e)) or is_bold_line(e)]
    levels = sorted({tag(e) if tag(e) != 'p' else 'p*' for e in heads}, key=lambda t: {'h1':1,'h2':2,'h3':3,'p*':3.5,'h4':4,'h5':5,'h6':6}[t])
    top = levels[0] if levels else None
    out = []
    for e in els:
        t = tag(e) if not is_bold_line(e) else 'p*'
        if t in levels:
            lvl = 'h2' if t == top else 'h3'
            out.append(f'<{lvl}>{heading_text(e)}</{lvl}>')
        else:
            out.append(e)
    return out

def listify(els):
    """A paragraph ending in ':' followed by short paragraphs -> those become a list (numbered if 'I.'/'1.' prefixed)."""
    out, i = [], 0
    num = lambda e: tag(e) == 'p' and re.match(r'(?:[IVX]+|\d+)\.\s', text(e)) and words(e) <= 30
    while i < len(els):
        e = els[i]
        if num(e) and i + 1 < len(els) and num(els[i + 1]):
            run = []
            while i < len(els) and num(els[i]): run.append(els[i]); i += 1
            out.append('<ol>' + ''.join('<li>' + re.sub(r'^\s*(?:[IVX]+|\d+)\.\s*', '', inner(r)) + '</li>' for r in run) + '</ol>')
            continue
        out.append(e); i += 1
        if tag(e) == 'p' and text(e).endswith(':'):
            run = []
            while i < len(els) and tag(els[i]) == 'p' and words(els[i]) <= 25 and not text(els[i]).endswith(':') and not is_bold_line(els[i]):
                run.append(els[i]); i += 1
            if len(run) >= 2:
                numbered = all(re.match(r'(?:[IVX]+|\d+)\.\s', text(r)) for r in run)
                items = []
                for r in run:
                    c = inner(r)
                    if numbered: c = re.sub(r'^\s*(?:[IVX]+|\d+)\.\s*', '', c)
                    c = re.sub(r'^(<strong>[^<]+</strong>)(?=\S)', r'\1 ', c)      # "Titletext" -> "Title text"
                    items.append(f'<li>{c}</li>')
                t = 'ol' if numbered else 'ul'
                out.append(f'<{t}>' + ''.join(items) + f'</{t}>')
            else:
                out.extend(run)
    return out

PROMOTE = {3777: ['The United Kingdom; a deposit return scheme still in the making']}

def plan(post):
    gcs = [b for b in post['blocks'] if b['type'] == 'general_content']
    has_cta = any(b['type'] == 'callToAction' for b in post['blocks'])
    src = gcs[0].get('rawGeneralContent') or gcs[0]['fields']['generalContent']
    raw = elements(src)
    raw = [f'<h2>{text(e)}</h2>' if tag(e) == 'p' and text(e) in PROMOTE.get(post['id'], []) else e for e in raw]
    els = listify(normalise(raw))
    # single-section posts: split at the sub-headings instead
    if sum(tag(e) == 'h2' for e in els) < 2 and sum(tag(e) == 'h3' for e in els) >= 3:
        els = [re.sub(r'^<h2>', '<p><strong>', e).replace('</h2>', '</strong></p>') if tag(e) == 'h2' else e for e in els]
        els = [f'<h2>{inner(e)}</h2>' if tag(e) == 'h3' else e for e in els]
    # pull boilerplate close into the CTA
    cta = []
    while els and (BOILER_CONTACT.search(inner(els[-1])) or (cta and BOILER_RAPID.search(text(els[-1])))):
        cta.insert(0, els.pop())
    if cta and BOILER_RAPID.search(text(cta[0])): els.append(cta.pop(0))       # keep the 'rapid rate' line as the closing paragraph
    # split into sections at h2
    sections, cur = [], {'heading': None, 'els': []}
    for e in els:
        if tag(e) == 'h2':
            if cur['els'] or cur['heading']: sections.append(cur)
            cur = {'heading': heading_text(e), 'els': []}
        else: cur['els'].append(e)
    sections.append(cur)
    blocks, media_side, media_count = [], 'left', 0
    for idx, s in enumerate(sections):
        body = ''.join(s['els']); w = words(body)
        has_sub = any(tag(e) == 'h3' for e in s['els'])
        prev_media = blocks and blocks[-1]['type'] == 'mediaCards'
        if s['heading'] and idx > 0 and 50 <= w <= 280 and not has_sub and not prev_media and media_count < 3 and idx < len(sections) - 1:
            blocks.append({'type': 'mediaCards', 'heading': html.unescape(s['heading']), 'content': body, 'alignment': media_side, 'image': 'PLACEHOLDER'})
            media_side = 'right' if media_side == 'left' else 'left'; media_count += 1
        else:
            blocks.append({'type': 'general_content', 'content': (f"<h2>{s['heading']}</h2>" if s['heading'] else '') + body})
    if cta and not has_cta:
        head, rest = cta[0], cta[1:]
        m = re.match(r'(?:<strong>)?(Get in touch with us today[^.]*\.)(?:</strong>)?\s*(.*)', inner(head), re.S)
        cta_html = (f'<h2>{m.group(1)}</h2>' + (f'<p>{m.group(2).strip()}</p>' if text(m.group(2)) else '')) if m else head
        cta_html += ''.join(rest)
        blocks.append({'type': 'callToAction', 'content': cta_html})
    elif cta and has_cta:
        blocks[-1]['content'] += ''.join(cta)          # existing CTA block kept; nothing dropped
    return {'id': post['id'], 'replaceUid': gcs[0]['uid'], 'blocks': blocks, 'media': media_count, 'sections': len(sections)}

def check_words(src, blocks):
    """Every original word must survive, in order (ignoring trailing colons and list numbering)."""
    norm = lambda s: [w for w in re.sub(r'[:•]', ' ', re.sub(r'\b(?:[IVX]+)\.(?=\s)', ' ', s)).split() if w]
    a = norm(text(src)); b = norm(text(''.join((x.get('heading') or '') + ' ' + x['content'] for x in blocks)))
    j = 0
    for w in a:
        while j < len(b) and b[j] != w: j += 1
        if j == len(b): return f'missing word near: {w}'
        j += 1
    extra = len(b) - len(a)
    return f'ok (+{extra} words added)' if extra else 'ok'

if __name__ == '__main__':
    for pid in sys.argv[1:]:
        post = json.load(open(f'payloads/blog/{pid}.json'))
        p = plan(post)
        g = [b for b in post['blocks'] if b['type'] == 'general_content'][0]; src = g.get('rawGeneralContent') or g['fields']['generalContent']
        p['wordCheck'] = check_words(src, p['blocks'])
        json.dump(p, open(f'payloads/blog/{pid}.plan.json', 'w'), indent=1, ensure_ascii=False)
        print(pid, p['wordCheck'], '|', ' '.join(b['type'].replace('general_content', 'GC').replace('mediaCards', 'MEDIA').replace('callToAction', 'CTA') for b in p['blocks']))

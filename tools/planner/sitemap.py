# Reads the live sitemap (every sub-sitemap) and each page's heading, for the planner's Site map tab.
# Writes {"updated": "<date>", "pages": [{url, title}]} to the file given; Claude sends it to the planner's
# database as collection "sitemap", document "live" (ArtifactData set).
# Usage: python3 tools/planner/sitemap.py <out.json>
import sys, json, re, html, urllib.request, ssl, os, datetime
ctx = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt') if os.path.exists('/root/.ccr/ca-bundle.crt') else None
get = lambda u: urllib.request.urlopen(u, timeout=20, context=ctx).read().decode('utf8', 'ignore')
locs = lambda x: re.findall(r'<loc>([^<]+)</loc>', x)
urls = sorted({u for sm in locs(get('https://www.ecoveritas.com/sitemap.xml')) for u in locs(get(sm))})
pages = []
for u in urls:
    t = ''
    try:
        s = get(u)
        m = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S) or re.search(r'<title>(.*?)</title>', s, re.S)
        t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', m.group(1)))).strip() if m else ''
    except Exception:
        pass
    pages.append({'url': u, 'title': t})
json.dump({'updated': datetime.date.today().isoformat(), 'pages': pages}, open(sys.argv[1], 'w'))
print(len(pages), 'pages')

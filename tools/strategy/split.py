# Splits full-page screenshots into readable parts: python3 tools/strategy/split.py <slug> <outdir>
import sys
from PIL import Image
slug, out = sys.argv[1], sys.argv[2]
for w in (1440, 375):
    im = Image.open(f'screenshots/strategy-{slug}-{w}.png'); h = im.size[1]
    if w == 375:
        parts = [im.crop((0, i * 4000, 375, min(h, (i + 1) * 4000))) for i in range((h + 3999) // 4000)]
        c = Image.new('RGB', (395 * len(parts), 4000), 'white')
        for i, p in enumerate(parts): c.paste(p, (i * 395, 0))
        c.save(f'{out}/{slug}-m.png'); print(f'{out}/{slug}-m.png', h)
    else:
        for i in range((h + 3999) // 4000):
            im.crop((0, i * 4000, w, min(h, (i + 1) * 4000))).save(f'{out}/{slug}-d{i}.png'); print(f'{out}/{slug}-d{i}.png', h)

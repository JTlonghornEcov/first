// Captures a page from its CMS preview for a review copy: hero (eyebrow, title, intro, buttons, image), the General
// Content body and the closing call to action. Writes payloads/review/<slug>/page.json and page.html, which
// tools/review/build.mjs then turns into artifacts/review/<slug>.html. Works for any entry or draft, however it was built.
// Usage: node tools/review/from-preview.mjs '<json: [["slug", entryId, draftId|null], ...]>'
// Per-page extras (e.g. a hero image still to be sourced) go in payloads/review/overrides.json: { "<slug>": { "heroPlaceholder": "…" } }.
import fs from 'node:fs';
import { launch } from '../../scripts/lib.mjs';
const items = JSON.parse(process.argv[2]);
const overrides = fs.existsSync('payloads/review/overrides.json') ? JSON.parse(fs.readFileSync('payloads/review/overrides.json', 'utf8')) : {};
const { browser, page } = await launch({ write: /actions\/preview\/create-token/, log: false });
await page.setViewportSize({ width: 1440, height: 900 });
for (const [slug, id, draft] of items) {
  await page.goto(`https://www.ecoveritas.com/admin/entries/x/${id}${draft ? `?draftId=${draft}` : ''}`, { waitUntil: 'networkidle' });
  const { url, live } = await page.evaluate(async () => {
    const ed = Craft.cp.$primaryForm.data('elementEditor'); const t = ed.settings.previewTargets[0];
    return { url: await ed.getTokenizedPreviewUrl(t.url, 'x-craft-preview', true), live: t.url };
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  const d = await page.evaluate(() => {
    const hero = document.querySelector('main section.hero');
    const h1 = hero.querySelector('h1');
    const col = h1.parentElement;
    const eyebrowEl = h1.previousElementSibling;
    const intro = col.querySelector('.wysiwyg')?.innerHTML.trim() || '';
    const buttons = [...hero.querySelectorAll('.flex a')].map(a => [a.getAttribute('href'), a.textContent.trim()]);
    const img = hero.querySelector('img');
    const imgUrl = img ? (img.getAttribute('data-src') || img.currentSrc || img.getAttribute('src') || (img.getAttribute('srcset') || '').split(' ')[0]) : '';
    const blocks = [...document.querySelectorAll('#page-builder > section')];
    const body = blocks.map(b => b.querySelector('.wysiwyg')).filter(Boolean)[0];
    const cta = blocks.find(b => b.querySelector('form'));
    return { eyebrow: eyebrowEl ? eyebrowEl.textContent.trim() : '', heroTitle: h1.textContent.trim(), heroIntro: intro, buttons,
      heroImageUrl: imgUrl ? new URL(imgUrl, location.href).href : '', body: body ? body.innerHTML : '',
      ctaTitle: cta?.querySelector('h2')?.textContent.trim() || 'Get in touch', ctaText: cta?.querySelector('h2 ~ p, p')?.textContent.trim() || '' };
  });
  // Craft adds the private preview token to every site link in preview mode: strip it so it is never published.
  const clean = v => typeof v === 'string' ? v.replace(/\?(?:token|x-craft-preview)=[^"'\s#<]*/g, '').replace(/(?:&amp;|&)(?:token|x-craft-preview)=[^&"'\s#<]*/g, '') : Array.isArray(v) ? v.map(clean) : v;
  for (const k of Object.keys(d)) d[k] = clean(d[k]);
  if (/x-craft-preview|[?&;]token=/.test(JSON.stringify(d))) throw new Error(`preview token left in ${slug}`);
  const P = { name: overrides[slug]?.name || d.heroTitle, live: live.replace(/\?.*$/, ''), ...d, heroButtons: d.buttons.length ? undefined : false, ...overrides[slug] };
  delete P.body;
  fs.mkdirSync(`payloads/review/${slug}`, { recursive: true });
  fs.writeFileSync(`payloads/review/${slug}/page.json`, JSON.stringify(P, null, 2) + '\n');
  fs.writeFileSync(`payloads/review/${slug}/page.html`, d.body);
  console.log(slug, `body ${Math.round(d.body.length / 1024)} KB`, d.heroImageUrl ? 'hero image' : 'NO hero image', `${d.buttons.length} buttons`);
}
await browser.close();

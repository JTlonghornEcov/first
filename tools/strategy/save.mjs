// Builds and saves one strategic-review concept page as a disabled, noindexed test entry.
// Reads payloads/strategy/<slug>/page.json (hero, CTA, canonical) and body.html, inlines payloads/strategy/shared.css
// and saves via entries/save-entry. No JavaScript: the build refuses script tags, inline event handlers and
// javascript: links (EXP flagged injected JS as a security risk), so interactive parts must be HTML and CSS only. The entry id is written back to page.json so
// later runs update the same entry.
// Usage: node tools/strategy/save.mjs <slug>
import fs from 'node:fs';
import { launch } from '../../scripts/lib.mjs';
const slug = process.argv[2];
const dir = `payloads/strategy/${slug}`;
const P = JSON.parse(fs.readFileSync(`${dir}/page.json`, 'utf8'));
let body = fs.readFileSync(`${dir}/body.html`, 'utf8');
for (const [k, f] of Object.entries(P.includes || {})) body = body.replace(`{{${k}}}`, fs.readFileSync(f, 'utf8'));
if (/\{\{[A-Z_]+\}\}/.test(body)) throw new Error('unfilled placeholder in body.html');
const html = `<style>\n${fs.readFileSync('payloads/strategy/shared.css', 'utf8')}\n${P.css || ''}</style>\n${body}`;
if (/<script|\son[a-z]+\s*=|javascript:/i.test(html)) throw new Error('no JavaScript allowed: found a script tag, event handler or javascript: link');
fs.writeFileSync(`${dir}/page.html`, html);
if ((html.match(/<h1[\s>]/g) || []).length) throw new Error('body must not contain an H1 (the CMS hero carries it)');

const link = (value, label) => ({ type: 'url', url: { value }, label, target: '' });
const buttons = P.buttons || [];
const ids = buttons.map((_, i) => 'new' + (i + 1));
const payload = {
  sectionId: 1, typeId: 1,
  title: `${P.name} concept (test page, do not publish)`, slug: `concept-${slug}`,
  enabled: false, enabledForSite: false,
  fields: {
    heroTitle: P.heroTitle,
    heroIntroduction: P.heroIntro,
    heroImage: P.heroImage ? [P.heroImage] : [],
    heroButtons: { sortOrder: ids, entries: Object.fromEntries(buttons.map(([href, label], i) => [ids[i], { type: 'heroButtonItem', enabled: true, fields: { heroButtonUrl: link(href, label), heroButtonStyle: i ? 'transparent' : 'default' } }])) },
    pageBuilder: { sortOrder: ['new1', 'new2'], entries: {
      new1: { type: 'general_content', enabled: true, fields: { generalContent: html, spacing: 'medium', theme: 'default' } },
      new2: { type: 'callToAction', enabled: true, fields: { richTitle: `<h2 id="evx-contact">${P.ctaTitle}</h2><p>${P.ctaText}</p>`, theme: 'default' } } } },
    ctaPicker: [],
    seo: { titleRaw: { 1: `${P.name} concept (test)` }, description: '', advanced: { robots: ['noindex', 'nofollow'], canonical: P.canonical } },
  },
};
if (P.entryId) payload.entryId = String(P.entryId);
if (payload.enabled !== false || payload.enabledForSite !== false) throw new Error('concept pages must be disabled');
const { browser, page } = await launch({ write: /actions\/entries\/save-entry/ });
await page.goto('https://www.ecoveritas.com/admin/entries', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Craft && Craft.sendActionRequest);
const res = await page.evaluate(async (data) => {
  try { const r = await Craft.sendActionRequest('POST', 'entries/save-entry', { data }); const d = r.data;
    return { id: d.id ?? d.entry?.id, status: (JSON.stringify(d).match(/data-status=\\"(\w+)/) || [])[1], msg: d.message }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 800) }; }
}, payload);
await browser.close();
console.log(JSON.stringify(res));
if (res.id && !P.entryId) { P.entryId = res.id; fs.writeFileSync(`${dir}/page.json`, JSON.stringify(P, null, 2) + '\n'); }

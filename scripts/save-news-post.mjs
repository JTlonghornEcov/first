// Creates (or, with ENTRY_ID set, updates) a DISABLED news entry from payloads/<dir>/post.json. Blocks are page builder
// blocks; a general_content block may take its HTML from a file (the custom HTML method).
// Usage: node scripts/save-news-post.mjs payloads/us-epr-ecomodulation/post.json
import { launch } from './lib.mjs';
import fs from 'node:fs';
const ALLOW_LIVE = false;   // new posts are created disabled; publishing is done by a person in the CMS
const P = JSON.parse(fs.readFileSync(process.argv[2]));
const NEWS = { sectionId: P.sectionId || 18, typeId: P.typeId || 1 };   // default: "All news"; P can target another section (e.g. 14/31 = All compliance, Product)   // "All news" (newsList), entry type "Template - General"
const link = (value, label) => ({ type: 'url', url: { value }, label, target: '' });
let n = 0; const uid = () => `new${++n}`;
const list = (type, items, fn) => { const l = { sortOrder: [], entries: {} }; for (const it of items) { const u = uid(); l.sortOrder.push(u); l.entries[u] = { type, enabled: true, ...fn(it) }; } return l; };
const block = b => {
  if (b.type === 'general_content') return { fields: { generalContent: b.file ? fs.readFileSync(b.file, 'utf8') : b.content, spacing: b.spacing || 'small', theme: 'default' } };
  if (b.type === 'cards') return { title: b.title, fields: { introduction: '', spacing: b.spacing || 'small', theme: 'default',
    cardList: list('card', b.cards, c => ({ title: c.title, fields: { image: [c.image], textContent: c.text, buttonUrl: link('', '') } })) } };
  if (b.type === 'mediaCards') return { fields: { spacing: 'medium', theme: 'default',
    mediaCardList: list('mediaCardItem', b.items, c => ({ title: c.title, fields: { mediaAsset: [c.image], generalContent: c.content, alignment: c.alignment } })) } };
  if (b.type === 'alert') return { fields: { alertType: 'yellow', alertText: b.text, alertClose: '', spacing: 'small', theme: 'default' } };
  if (b.type === 'callToAction') return { fields: { richTitle: b.content, theme: 'default' } };
  throw new Error('unknown block ' + b.type);
};
const pb = list('', P.blocks, b => ({ type: b.type, ...block(b) }));
const payload = { ...NEWS, title: P.title, slug: P.slug, enabled: false, enabledForSite: false,
  fields: { ...(P.heroTitle ? { heroTitle: P.heroTitle } : {}), ...(P.productMotif ? { productMotif: P.productMotif } : {}), heroIntroduction: P.heroIntroduction, heroImage: [P.heroImage], featuredImage: [P.featuredImage], excerpt: P.excerpt,
    pageBuilder: pb, ctaPicker: [], seo: { titleRaw: { 1: P.seoTitle }, description: P.seoDescription, ...(P.robots ? { advanced: { robots: P.robots } } : {}) } } };   // HTML-method bodies stay noindex until approved
if (process.env.ENTRY_ID) payload.entryId = process.env.ENTRY_ID;
if (!ALLOW_LIVE && (payload.enabled !== false || payload.enabledForSite !== false)) throw new Error('must be disabled');
const { browser, page } = await launch({ write: /actions\/entries\/save-entry/ });
await page.goto('https://www.ecoveritas.com/admin/entries', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Craft && Craft.sendActionRequest);
const res = await page.evaluate(async (data) => {
  try { const r = await Craft.sendActionRequest('POST', 'entries/save-entry', { data }); const d = r.data;
    return { id: d.id ?? d.entry?.id, cpEditUrl: d.cpEditUrl ?? d.entry?.cpEditUrl, status: (JSON.stringify(d).match(/data-status=\\"(\w+)/) || [])[1], msg: d.message }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 1500) }; }
}, payload);
console.log(JSON.stringify(res));
await browser.close();

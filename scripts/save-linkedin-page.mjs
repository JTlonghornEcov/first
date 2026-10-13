// Creates (or, with ENTRY_ID set, updates) the disabled LinkedIn Challenge preview page from payloads/linkedin-challenge/page.html.
import { launch } from './lib.mjs';
import fs from 'node:fs';
const ALLOW_LIVE = false;   // preview page: never enabled by this script
const html = fs.readFileSync('payloads/linkedin-challenge/page.html', 'utf8');
const link = (value, label) => ({ type: 'url', url: { value }, label, target: '' });
const payload = {
  sectionId: 1, typeId: 1,
  title: 'LinkedIn Challenge (preview, do not publish)', slug: 'linkedin-challenge-preview',
  enabled: false, enabledForSite: false,
  fields: {
    heroTitle: 'The LinkedIn Challenge.',
    heroIntroduction: "<p>Score points for backing our content on LinkedIn. Every point is a ticket into a £100 draw each month and the £225 grand draw at the end. Score once and you're in.</p>",
    heroImage: [],
    heroButtons: { sortOrder: ['new1', 'new2'], entries: {
      new1: { type: 'heroButtonItem', enabled: true, fields: { heroButtonUrl: link('#lc-how', 'How it works'), heroButtonStyle: 'default' } },
      new2: { type: 'heroButtonItem', enabled: true, fields: { heroButtonUrl: link('#lc-calc', 'Try the odds calculator'), heroButtonStyle: 'transparent' } } } },
    pageBuilder: { sortOrder: ['new1'], entries: { new1: { type: 'general_content', enabled: true, fields: { generalContent: html, spacing: 'medium', theme: 'default' } } } },
    ctaPicker: [],
    seo: { titleRaw: { 1: 'LinkedIn Challenge (preview)' }, description: '', advanced: { robots: ['noindex', 'nofollow'], canonical: '' } },   // test pages: never indexed, even if enabled by mistake
  },
};
if (process.env.ENTRY_ID) payload.entryId = process.env.ENTRY_ID;
if (!ALLOW_LIVE && (payload.enabled !== false || payload.enabledForSite !== false)) throw new Error('must be disabled');
const { browser, page } = await launch({ write: /actions\/entries\/save-entry/ });
await page.goto('https://www.ecoveritas.com/admin/entries', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Craft && Craft.sendActionRequest);
const res = await page.evaluate(async (data) => {
  try { const r = await Craft.sendActionRequest('POST', 'entries/save-entry', { data }); const d = r.data;
    return { id: d.id ?? d.entry?.id, status: (JSON.stringify(d).match(/data-status=\\"(\w+)/) || [])[1], msg: d.message }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 800) }; }
}, payload);
console.log(JSON.stringify(res));
await browser.close();

// Creates (or, with ENTRY_ID set, updates) the disabled interactive EU map test page from payloads/europe-map/page.html.
import { launch } from './lib.mjs';
import fs from 'node:fs';
const ALLOW_LIVE = false;   // test page: never enabled by this script
const html = fs.readFileSync('payloads/europe-map/page.html', 'utf8');
const payload = {
  sectionId: 1, typeId: 1,
  title: 'EU interactive map (test page, do not publish)', slug: 'eu-map-test',
  enabled: false, enabledForSite: false,
  fields: {
    heroTitle: 'EPR across Europe',
    heroIntroduction: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Explore our interactive map to see how extended producer responsibility works in each EU member state.</p>',
    heroImage: [9389],
    heroButtons: { sortOrder: ['new1'], entries: { new1: { type: 'heroButtonItem', enabled: true,
      fields: { heroButtonUrl: { type: 'url', url: { value: '#evx-map' }, label: 'Explore the map', target: '' }, heroButtonStyle: 'default' } } } },
    pageBuilder: { sortOrder: ['new1'], entries: { new1: { type: 'general_content', enabled: true, fields: { generalContent: html, spacing: 'medium', theme: 'default' } } } },
    ctaPicker: [356],
    seo: { titleRaw: { 1: 'EU interactive map (test)' }, description: '' },
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

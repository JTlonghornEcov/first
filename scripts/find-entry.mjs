import { launch } from './lib.mjs';
const q = process.argv[2];
const { browser, page } = await launch();
await page.goto('https://www.ecoveritas.com/admin/entries', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Craft && Craft.sendActionRequest);
const html = await page.evaluate(async (q) => {
  const r = await Craft.sendActionRequest('POST', 'element-indexes/get-elements', { data: {
    elementType: 'craft\\elements\\Entry', source: '*', context: 'index',
    viewState: { mode: 'table', static: true }, criteria: { search: q, limit: 30, status: null } } });
  return r.data.html;
}, q);
const rows = [...html.matchAll(/data-id="(\d+)"[^>]*?data-status="(\w+)"[\s\S]*?data-url="([^"]*)"[\s\S]*?data-title="([^"]*)"/g)];
for (const m of rows) console.log(m[1], m[2], m[3], '|', m[4]);
if (!rows.length) console.log(html.replace(/\s+/g, ' ').slice(0, 2000));
await browser.close();

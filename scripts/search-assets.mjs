import { launch } from './lib.mjs';
const terms = process.argv.slice(2);
const { browser, page } = await launch();
await page.goto('https://www.ecoveritas.com/admin/assets', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Craft && Craft.sendActionRequest);
const sources = await page.evaluate(() => [...document.querySelectorAll('#sidebar [data-key]')].map(a => a.dataset.key + ' ' + a.textContent.trim()));
console.log('sources:', sources.join(' | '));
for (const t of terms) {
  const html = await page.evaluate(async (t) => {
    const r = await Craft.sendActionRequest('POST', 'element-indexes/get-elements', { data: {
      elementType: 'craft\\elements\\Asset', source: 'volume:4d08c1ef-770d-4bd0-9f6e-27bec8b160e4', context: 'index',
      viewState: { mode: 'table', static: true }, criteria: { search: t, limit: 40 }, includeSubfolders: true } });
    const d = new DOMParser().parseFromString(r.data.html, 'text/html');
    return [...d.querySelectorAll('.element[data-id]')].map(e => e.dataset.id + ' ' + (e.dataset.filename || e.dataset.url?.split('/').pop() || e.title));
  }, t);
  const ids = html;
  console.log(`\n[${t}] ${ids.length}`); console.log([...new Set(ids)].join('\n'));
}
await browser.close();

// Lists entries in a section (read only). Usage: node scripts/list-section.mjs <sectionSourceKey> [limit]
import { launch } from './lib.mjs';
const [source, limit = '200'] = process.argv.slice(2);
const { browser, page } = await launch();
await page.goto('https://www.ecoveritas.com/admin/entries', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Craft && Craft.sendActionRequest);
const rows = await page.evaluate(async ([source, limit]) => {
  const r = await Craft.sendActionRequest('POST', 'element-indexes/get-elements', { data: {
    elementType: 'craft\\elements\\Entry', source, context: 'index', viewState: { mode: 'table', static: true, order: 'postDate', sort: 'desc' },
    criteria: { limit: +limit, status: null }, paginated: true } });
  const d = new DOMParser().parseFromString(r.data.html, 'text/html');
  return { total: r.data.total ?? r.data.count, rows: [...d.querySelectorAll('tr[data-id]')].map(tr => {
    const el = tr.querySelector('.element'); return [tr.dataset.id, el?.dataset.status, el?.dataset.url || '', (el?.dataset.title || tr.querySelector('th')?.textContent || '').trim().replace(/\s+/g, ' ')].join(' | '); }) };
}, [source, limit]);
console.log('total:', rows.total, 'listed:', rows.rows.length); console.log(rows.rows.join('\n'));
await browser.close();

import { launch } from './lib.mjs';
const { browser, page } = await launch();
await page.goto('https://www.ecoveritas.com/admin/entries/x/9486?draftId=3831', { waitUntil: 'networkidle' });
console.log(await page.evaluate(() => {
  const fd = new FormData(Craft.cp.$primaryForm[0]); const out = [];
  for (const [k, v] of fd.entries()) if (/^fields\[(hero|pageBuilder|ctaPicker)/.test(k)) out.push(k.replace(/uid:([0-9a-f]{8})[0-9a-f-]*/g, 'uid:$1') + ' = ' + String(v).replace(/\s+/g, ' ').slice(0, 300));
  return out.join('\n') + '\nsortOrder full: ' + fd.getAll('fields[pageBuilder][sortOrder][]').join(',');
}));
console.log('heroButtons rows:', await page.locator('.field[data-attribute=heroButtons] [data-id]').evaluateAll(e => [...new Set(e.map(x => x.dataset.id + ' ' + x.dataset.label))]));
await browser.close();

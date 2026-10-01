import { launch } from './lib.mjs';
import fs from 'node:fs';
const id = process.argv[2];
const { browser, page } = await launch();
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${id}`, { waitUntil: 'networkidle' });
console.log('edit URL:', page.url());
const info = await page.evaluate(() => {
  const f = document.querySelector('#main-form, form#main-form, form');
  const out = {};
  out.hidden = [...document.querySelectorAll('input[type=hidden]')].filter(i=>/sectionId|typeId|elementId|draftId|siteId/.test(i.name)).map(i=>i.name+'='+i.value);
  out.fields = [...document.querySelectorAll('.field[data-attribute]')].map(el => {
    const t = el.dataset.type || ''; const lbl = el.querySelector('label, legend')?.textContent.trim();
    return `${el.dataset.attribute} [${t.split('\\').pop()}] ${lbl||''}`;
  });
  out.blocks = [...document.querySelectorAll('[data-type-handle], .matrixblock, .element.card[data-type-handle]')].map(b => (b.dataset.typeHandle||'?') + ' #' + (b.dataset.id||'')).slice(0,80);
  out.typeSelect = document.querySelector('select[name=typeId], #entryType option[selected]')?.outerHTML?.slice(0,300);
  return out;
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: `screenshots/edit-${id}.png`, fullPage: true });
await browser.close();

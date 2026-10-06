// Read-only export of entries' editable fields (header, page builder, excerpt, images, CTA picker) to payloads/blog/<id>.json.
// Usage: node scripts/export-entry.mjs <id> [<id> ...]
import { launch } from './lib.mjs';
import fs from 'node:fs';
const { browser, page } = await launch();
for (const id of process.argv.slice(2)) {
  await page.goto(`https://www.ecoveritas.com/admin/entries/x/${id}`, { waitUntil: 'networkidle' });
  const out = await page.evaluate(() => {
    const ed = Craft.cp.$primaryForm.data('elementEditor');
    const fd = new FormData(Craft.cp.$primaryForm[0]);
    const one = k => fd.get(k), all = k => fd.getAll(k);
    const order = all('fields[pageBuilder][sortOrder][]');
    const blocks = order.map(u => { const b = { uid: u, fields: {} }; const p = `fields[pageBuilder][entries][uid:${u}]`;
      for (const [k, v] of fd.entries()) if (k.startsWith(p)) { const r = k.slice(p.length); if (r === '[type]') b.type = v; else if (r === '[enabled]') b.enabled = v; else if (r === '[title]') b.title = v; else { const m = r.match(/^\[fields\]\[(\w+)\]$/); if (m) b.fields[m[1]] = v; } }
      const el = document.querySelector(`[data-uid="${u}"]`); b.id = el?.dataset.id;
      b.nested = el ? [...new Map([...el.querySelectorAll('[data-id][data-owner-id]')].map(n => [n.dataset.id, { id: n.dataset.id, label: n.dataset.label, hasImage: !!n.querySelector('img') }])).values()] : [];
      return b; });
    return { id: ed.settings.canonicalId, title: one('title'), slug: one('slug'), postDate: one('postDate[date]'), heroTitle: one('fields[heroTitle]'), heroIntroduction: one('fields[heroIntroduction]'),
      heroImage: all('fields[heroImage][]'), featuredImage: all('fields[featuredImage][]'), excerpt: one('fields[excerpt]'), ctaPicker: all('fields[ctaPicker][]'),
      category: all('fields[newsCategory][]'), heroButtons: document.querySelectorAll('.field[data-attribute=heroButtons] [data-id]').length, blocks };
  });
  fs.writeFileSync(`payloads/blog/${id}.json`, JSON.stringify(out, null, 1));
  console.log(id, '|', out.title.slice(0, 60), '| hero:', out.heroImage.join(',') || '-', '| featured:', out.featuredImage.join(',') || '-', '| cta:', out.ctaPicker.join(',') || '-', '| excerpt:', out.excerpt ? 'yes' : 'no', '| blocks:', out.blocks.map(b => b.type + (b.nested.length ? `(${b.nested.length})` : '')).join(' '));
}
await browser.close();

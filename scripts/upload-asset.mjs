// Uploads one local image to the General folder (id 1). Usage: node scripts/upload-asset.mjs <path> <filename>
import { launch } from './lib.mjs';
import fs from 'node:fs';
const [path, name] = process.argv.slice(2);
const b64 = fs.readFileSync(path).toString('base64');
const { browser, page } = await launch({ write: /actions\/assets\/upload/ });
await page.goto('https://www.ecoveritas.com/admin/assets', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Craft && Craft.sendActionRequest);
const res = await page.evaluate(async ([name, b64]) => {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const fd = new FormData(); fd.append('folderId', '1'); fd.append('assets-upload', new Blob([bin], { type: 'image/png' }), name);
  try { const r = await Craft.sendActionRequest('POST', 'assets/upload', { data: fd }); return r.data; } catch (e) { return { error: e.message, data: e.response?.data }; }
}, [name, b64]);
console.log(JSON.stringify(res));
await browser.close();

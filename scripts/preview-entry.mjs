// Prints a private preview link for an entry (no draft). Usage: node scripts/preview-entry.mjs <entryId> <publicUrl>
import { launch } from './lib.mjs';
const [id, url] = process.argv.slice(2);
const { browser, page } = await launch({ write: /actions\/preview\/create-token/, log: false });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${id}`, { waitUntil: 'networkidle' });
console.log(await page.evaluate(async (u) => Craft.cp.$primaryForm.data('elementEditor').getTokenizedPreviewUrl(u, 'x-craft-preview', true), url));
await browser.close();

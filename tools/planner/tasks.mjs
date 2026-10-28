// Lists the planner tasks for concept pages. Every inner page gets the same two tasks (agreed 28 Oct):
//   "Build the first draft of <page>" (layout + copy) and "Find the images for <page>" (imagery).
// Review and sign-off is the planner's own sign-off step, which appears once both are done.
// Anything else (lead tools, policy checks, drafts to apply) goes in the page's notes, not the task list.
// Output is JSON: [{ std: 'draft'|'images', title, parts, page, note }].
// Usage: node tools/planner/tasks.mjs <slug> [<slug> ...]   (all built concept pages if none given)
import fs from 'node:fs';
const dir = 'payloads/strategy';
const slugs = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(dir).filter(s => fs.existsSync(`${dir}/${s}/page.json`) && fs.existsSync(`${dir}/${s}/body.html`));
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const out = [];
for (const slug of slugs) {
  const P = JSON.parse(fs.readFileSync(`${dir}/${slug}/page.json`, 'utf8'));
  const body = fs.readFileSync(`${dir}/${slug}/body.html`, 'utf8');
  const page = P.planner || P.name;
  // Image placeholders: <b>Photo to be sourced</b><span>what it shows</span>, plus imagery notes in page.json
  const slots = [...body.matchAll(/(?:Image|Photo) to be sourced<\/[^>]+>\s*(?:<[^>]+>)*\s*([^<]{3,140})/gi)].map(m => text(m[1]));
  for (const s of P.imagery || []) slots.push(s);
  out.push({ std: 'draft', page, title: `Build the first draft of ${page}`, parts: ['layout', 'copy'], note: `Built by Claude${P.entryId ? ` (entry ${P.entryId})` : ''}.` });
  out.push({ std: 'images', page, title: `Find the images for ${page}`, parts: ['imagery'],
    note: (slots.length ? slots.map((s, i) => `${slots.length > 1 ? `${i + 1}) ` : ''}${s}`).join(' ') : 'Check the page’s images and decide which need sourcing or replacing.') + ' Send the images to Claude to place.' });
}
console.log(JSON.stringify(out, null, 1));

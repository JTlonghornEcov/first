// Lists the planner tasks a concept page still needs, from the markers in its HTML and the notes in page.json.
// Rules are in docs/workflow.md. Output is JSON: [{ title, parts: ['layout'|'imagery'|'copy'], page }].
// Usage: node tools/planner/tasks.mjs <slug> [<slug> ...]   (all built concept pages if none given)
import fs from 'node:fs';
const dir = 'payloads/strategy';
const slugs = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(dir).filter(s => fs.existsSync(`${dir}/${s}/page.json`) && fs.existsSync(`${dir}/${s}/body.html`));
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#8594;/g, '→').replace(/\s+/g, ' ').trim();
const out = [];
for (const slug of slugs) {
  const P = JSON.parse(fs.readFileSync(`${dir}/${slug}/page.json`, 'utf8'));
  const body = fs.readFileSync(`${dir}/${slug}/body.html`, 'utf8');
  const page = P.planner || P.name;
  const t = (title, parts) => out.push({ page, title, parts });
  t(`Review and approve the layout of ${page}`, ['layout']);
  t(`Review the copy of ${page} (facts, dates, tone)`, ['copy']);
  // Placeholder blocks: <div class="tool" ...><span class="badge">… to be built</span><h3>Title</h3>
  for (const m of body.matchAll(/<span class="badge">([^<]*to be built)<\/span>\s*(?:<h3>([\s\S]*?)<\/h3>)?/g)) {
    const kind = text(m[1]).replace(/\s*·\s*to be built/i, '').toLowerCase();
    t(`Build the ${kind}${m[2] ? `: "${text(m[2])}"` : ''} on ${page}`, ['layout']);
  }
  // Image placeholders, plus any imagery notes recorded in page.json
  const slots = [...body.matchAll(/(?:Image|Photo) to be sourced<\/[^>]+>\s*(?:<[^>]+>)*\s*([^<]{3,140})/gi)].map(m => text(m[1]));
  for (const s of P.imagery || []) slots.push(s);
  if (slots.length) t(`Find imagery for ${page}: ${slots.join('; ')}`, ['imagery']);
  else t(`Approve the imagery of ${page}`, ['imagery']);
  for (const c of P.checks || []) t(`Policy team: confirm ${c} on ${page}`, ['copy']);
}
console.log(JSON.stringify(out, null, 1));

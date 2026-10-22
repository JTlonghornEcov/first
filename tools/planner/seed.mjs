// Writes the planner's pages and the tasks from work done so far as JSON documents, ready for ArtifactData batch writes.
// Pages: payloads/planner/pages.json. Tasks: the scanner (tools/planner/tasks.mjs) for concept pages, plus the
// follow-ups in payloads/planner/extra-tasks.json. Each task's doc id is stable ("c-" + slug of page and title), so
// re-running never duplicates a task the team has already seen.
// Usage: node tools/planner/seed.mjs <out-dir>   → <out-dir>/pages/<id>.json, <out-dir>/tasks/<id>.json, <out-dir>/writes-N.json
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const out = process.argv[2];
const pages = JSON.parse(fs.readFileSync('payloads/planner/pages.json', 'utf8'));
const extra = JSON.parse(fs.readFileSync('payloads/planner/extra-tasks.json', 'utf8'));
const scanned = JSON.parse(execFileSync('node', ['tools/planner/tasks.mjs'], { encoding: 'utf8' }));
const byName = Object.fromEntries(pages.map(p => [p.name, p.id]));
const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const now = Date.now();
const tasks = [];
for (const t of [...scanned, ...extra]) {
  const pageNames = t.pages || [t.page];
  const ids = pageNames.map(n => { if (!byName[n]) throw new Error('unknown page ' + n); return byName[n]; });
  const id = 'c-' + slug(pageNames[0] + '-' + t.title).slice(0, 120);
  if (tasks.some(x => x.id === id)) throw new Error('duplicate task id ' + id);
  tasks.push({ id, title: t.title, parts: t.parts, pages: ids, assignee: '', due: '', done: false, created: now + tasks.length, source: 'claude', ...(t.note ? { note: t.note } : {}) });
}
fs.rmSync(out, { recursive: true, force: true });
for (const c of ['pages', 'tasks']) fs.mkdirSync(`${out}/${c}`, { recursive: true });
const writes = [];
pages.forEach((p, i) => { const { id, ...d } = p; fs.writeFileSync(`${out}/pages/${id}.json`, JSON.stringify({ notes: '', goLive: '', layout: false, imagery: false, copy: false, order: i, ...d })); writes.push({ op: 'set', collection: 'pages', doc_id: id, file_path: `${out}/pages/${id}.json` }); });
tasks.forEach(t => { const { id, ...d } = t; fs.writeFileSync(`${out}/tasks/${id}.json`, JSON.stringify(d)); writes.push({ op: 'set', collection: 'tasks', doc_id: id, file_path: `${out}/tasks/${id}.json` }); });
for (let i = 0; i < writes.length; i += 50) fs.writeFileSync(`${out}/writes-${i / 50 + 1}.json`, JSON.stringify(writes.slice(i, i + 50)));
console.log(pages.length, 'pages,', tasks.length, 'tasks,', Math.ceil(writes.length / 50), 'batches');

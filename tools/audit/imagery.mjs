// Imagery audit of the live site: for every URL in the sitemap, reports a hero whose image slot is empty (text-only heroes
// without an image slot are by design and not reported), images that fail to
// load (non-200), and placeholder images ("image to be sourced", asset 11211) showing on a live page.
// Read-only: plain GET requests, no login. Usage: node tools/audit/imagery.mjs > report.json
const base = 'https://www.ecoveritas.com';
const get = async u => { const r = await fetch(u, { redirect: 'follow' }); return { status: r.status, text: r.ok ? await r.text() : '' }; };
const index = (await get(base + '/sitemap.xml')).text;
const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const urls = [];
for (const m of maps) for (const x of (await get(m)).text.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(x[1]);
const imgStatus = new Map();
async function check(src) {
  if (!imgStatus.has(src)) imgStatus.set(src, fetch(src, { method: 'HEAD' }).then(r => r.status).catch(() => 0));
  return imgStatus.get(src);
}
const out = [];
for (const url of [...new Set(urls)]) {
  const { status, text } = await get(url);
  if (status !== 200) { out.push({ url, pageStatus: status }); continue; }
  const main = (text.match(/<main[\s\S]*?<\/main>/) || [text])[0];
  const hero = (main.match(/<section class="hero[\s\S]*?<\/section>/) || [''])[0];
  const heroImg = /<img[^>]+src=/.test(hero);
  const emptySlot = /class="lazyimage">\s*<\/div>/.test(hero);   // template expects an image, none set: shows a blank panel
  const srcs = [...new Set([...main.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&')).filter(s => !s.startsWith('data:')))];
  const broken = [];
  for (const s of srcs) { const abs = s.startsWith('http') ? s : base + s; const st = await check(abs); if (st !== 200) broken.push(`${st} ${abs}`); }
  const placeholder = srcs.filter(s => /\/11211\/|image-to-be-sourced|to-be-sourced/i.test(s)).length + (main.match(/(image|photo) to be sourced/gi) || []).length;
  const issues = [];
  if (emptySlot) issues.push('hero image missing (blank panel)');
  
  if (broken.length) issues.push(`${broken.length} broken image(s)`);
  if (placeholder) issues.push('placeholder image showing');
  out.push({ url, issues, broken, images: srcs.length });
}
console.log(JSON.stringify(out, null, 1));

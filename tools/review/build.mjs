// Builds a review copy of a page as a single self-contained HTML file for a Claude artifact:
// a "review copy" bar, a recreation of the CMS hero, the page body exactly as built (payloads/strategy/<slug>/live.html,
// else page.html), and the contact block with its form shown but switched off. Images from ecoveritas.com are
// embedded as data URIs because artifacts can't load files from other sites.
// Pages captured from the CMS preview (tools/review/from-preview.mjs) are read from payloads/review/<slug>/ instead.
// Scripts are stripped: review copies carry no JavaScript. A heroPlaceholder in page.json shows the hero slot as
// "to be sourced" (with the borrowed image faded behind it, if there is one).
// Usage: node tools/review/build.mjs <slug>   → artifacts/review/<slug>.html
import fs from 'node:fs';
const slug = process.argv[2];
const dir = fs.existsSync(`payloads/review/${slug}/page.json`) ? `payloads/review/${slug}` : `payloads/strategy/${slug}`;
const P = JSON.parse(fs.readFileSync(`${dir}/page.json`, 'utf8'));
const bodyFile = fs.existsSync(`${dir}/live.html`) ? `${dir}/live.html` : `${dir}/page.html`;
let body = fs.readFileSync(bodyFile, 'utf8').replace(/<script\b[\s\S]*?<\/script>/gi, '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function dataUri(url) {
  const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`);
  const type = r.headers.get('content-type') || 'image/webp';
  return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
}
// Embed every ecoveritas.com image the body uses.
for (const url of new Set([...body.matchAll(/https:\/\/www\.ecoveritas\.com\/[^"' )]+\.(?:webp|jpe?g|png|svg)/gi)].map(m => m[0]))) body = body.split(url).join(await dataUri(url));
const hero = P.heroImageUrl ? await dataUri(P.heroImageUrl) : '';
const built = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const buttons = (P.buttons || []).map(([href, label], i) => `<a class="rv-btn${i ? ' rv-ghost' : ''}" href="${esc(href)}">${esc(label)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`).join('');
// Pages whose CMS entry type has no hero-button field (heroButtons: false) already carry the actions at the top of live.html.

const html = `<title>${esc(P.name)} page review</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
/* Review copy of an Ecoveritas page. Single light theme: it reproduces the live site, which has no dark mode. */
:root { --rv-slate:#2f444e; --rv-ink:#212121; --rv-yellow:#ffcd03; --rv-white:#ffffff; --rv-mist:#c9dbe2; --rv-line:#dfe5e7; color-scheme:light; }
body { margin:0; background:var(--rv-white); color:var(--rv-ink); font-family:"Space Grotesk",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif; font-size:16px; line-height:1.6; }
body::before { content:""; position:fixed; inset:0 0 auto; height:env(safe-area-inset-top,0px); z-index:10; background:var(--rv-ink); }
.rv-bar { position:sticky; top:env(safe-area-inset-top,0px); z-index:9; background:var(--rv-ink); color:var(--rv-white); font-size:13.5px; }
.rv-bar .rv-in { display:flex; flex-wrap:wrap; gap:6px 18px; align-items:center; justify-content:space-between; padding-block:10px; }
.rv-bar b { color:var(--rv-yellow); letter-spacing:.06em; text-transform:uppercase; font-size:12.5px; }
.rv-bar span { color:#d7dee1; }
.rv-in { max-width:1280px; margin:0 auto; padding-left:max(16px,env(safe-area-inset-left,0px)); padding-right:max(16px,env(safe-area-inset-right,0px)); box-sizing:border-box; }
@media (min-width:1024px) { .rv-in { padding-left:max(80px,env(safe-area-inset-left,0px)); padding-right:max(80px,env(safe-area-inset-right,0px)); } }
.rv-hero { background:var(--rv-slate); color:var(--rv-white); }
.rv-hero .rv-in { display:grid; gap:32px; padding-block:48px 56px; }
@media (min-width:1024px) { .rv-hero .rv-in { grid-template-columns:minmax(0,5fr) minmax(0,6fr); gap:clamp(32px,6vw,96px); align-items:center; padding-block:72px; } }
.rv-eyebrow { display:block; color:var(--rv-yellow); font-weight:700; font-size:15px; margin:0 0 10px; }
.rv-hero h1 { margin:0 0 14px; font-size:clamp(32px,4.2vw,48px); line-height:1.1; font-weight:700; text-wrap:balance; }
.rv-intro { color:#e8eff2; font-size:15.5px; } .rv-intro p { margin:0 0 10px; } .rv-intro h2 { font-size:26px; line-height:1.2; margin:0 0 10px; color:var(--rv-white); }
.rv-btns { display:flex; flex-wrap:wrap; gap:16px 28px; align-items:center; margin-top:28px; }
.rv-btn { display:inline-flex; align-items:center; gap:12px; padding:13px 18px; background:var(--rv-yellow); color:var(--rv-ink); font-weight:700; font-size:15px; text-decoration:none; }
.rv-btn svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2.2; }
.rv-btn.rv-ghost { background:none; color:var(--rv-white); padding:13px 0; }
.rv-img { position:relative; aspect-ratio:632/520; max-width:100%; background:#3d5662; }
.rv-img img { width:100%; height:100%; object-fit:cover; display:block; }
.rv-ph { position:absolute; inset:0; display:grid; place-content:center; gap:8px; padding:24px; text-align:center; border:2px dashed var(--rv-mist); background:rgba(47,68,78,.86); color:var(--rv-white); }
.rv-ph b { font-size:17px; } .rv-ph span { font-size:14px; color:#d7dee1; max-width:40ch; margin:0 auto; }
.rv-main .rv-in { padding-block:clamp(48px,7vw,96px); }
.rv-contact { background:var(--rv-slate); color:var(--rv-white); }
.rv-contact .rv-in { display:grid; gap:32px; padding-block:64px; }
@media (min-width:1024px) { .rv-contact .rv-in { grid-template-columns:minmax(0,5fr) minmax(0,6fr); gap:clamp(32px,6vw,96px); align-items:start; padding-block:96px; } }
.rv-contact h2 { margin:0 0 14px; font-size:clamp(30px,3.6vw,44px); line-height:1.12; color:var(--rv-white); text-wrap:balance; scroll-margin-top:72px; }
.rv-contact p { margin:0; color:#e8eff2; }
.rv-form { display:grid; gap:12px; padding:26px; background:#f6f7f7; color:var(--rv-ink); }
.rv-form .rv-row { display:grid; gap:12px; } @media (min-width:640px) { .rv-form .rv-row { grid-template-columns:1fr 1fr; } }
.rv-form input, .rv-form textarea, .rv-form select { font:inherit; width:100%; box-sizing:border-box; padding:14px 16px; border:2px solid #cfd6d9; background:var(--rv-white); color:var(--rv-ink); }
.rv-form textarea { min-height:140px; resize:vertical; }
.rv-form button { font:inherit; font-weight:700; padding:14px; border:0; background:var(--rv-yellow); color:var(--rv-ink); opacity:.6; cursor:not-allowed; }
.rv-form small { color:#55656d; }
.rv-foot { background:var(--rv-white); border-top:1px solid var(--rv-line); color:#55656d; font-size:14px; }
.rv-foot .rv-in { padding-block:28px; }
a:focus-visible, button:focus-visible { outline:3px solid var(--rv-yellow); outline-offset:3px; }
</style>
<div class="rv-bar" role="note"><div class="rv-in"><b>Review copy</b><span>${esc(P.name)} · built ${built} · not the live site; the form is switched off</span><span>Live page: ${esc(P.live || '')}</span></div></div>
<header class="rv-hero"><div class="rv-in">
  <div><span class="rv-eyebrow">${esc(P.eyebrow || '')}</span><h1>${esc(P.heroTitle)}</h1><div class="rv-intro">${P.heroIntro || ''}</div>${P.heroButtons === false || !buttons ? '' : `<div class="rv-btns">${buttons}</div>`}</div>
  <div class="rv-img">${hero ? `<img src="${hero}" alt="">` : ''}${P.heroPlaceholder ? `<div class="rv-ph"><b>Hero image to be sourced</b><span>${esc(P.heroPlaceholder)}</span></div>` : ''}</div>
</div></header>
<main class="rv-main"><div class="rv-in">
${body}
</div></main>
<section class="rv-contact" aria-labelledby="evx-contact"><div class="rv-in">
  <div><h2 id="evx-contact">${esc(P.ctaTitle)}</h2><p>${esc(P.ctaText)}</p></div>
  <form class="rv-form" aria-label="Enquiry form (switched off in the review copy)">
    <div class="rv-row"><input id="rv-email" placeholder="Email Address *" aria-label="Email address"><input id="rv-company" placeholder="Company" aria-label="Company"></div>
    <div class="rv-row"><input id="rv-first" placeholder="First name" aria-label="First name"><input id="rv-last" placeholder="Last name" aria-label="Last name"></div>
    <textarea id="rv-enquiry" placeholder="Give us a description of what we can help with!" aria-label="Enquiry"></textarea>
    <select id="rv-heard" aria-label="How did you first hear about us?"><option>How did you first hear about us?</option></select>
    <button type="submit" disabled>Submit your enquiry</button>
    <small>Review copy: this form doesn't send anything.</small>
  </form>
</div></section>
<footer class="rv-foot"><div class="rv-in">Review copy of the ${esc(P.name)} page, built from the CMS version. Leave comments on anything that needs changing.</div></footer>
`;
if (/x-craft-preview|[?&;]token=/.test(html)) throw new Error('a CMS preview token is in the review copy: refusing to write it');
fs.mkdirSync('artifacts/review', { recursive: true });
fs.writeFileSync(`artifacts/review/${slug}.html`, html);
console.log(`artifacts/review/${slug}.html`, Math.round(html.length / 1024) + ' KB');

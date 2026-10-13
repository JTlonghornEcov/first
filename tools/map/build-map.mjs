// Builds the interactive EU map page (payloads/europe-map/page.html) from Natural Earth data (public domain, via world-atlas).
// No JavaScript ships to the browser: hover/focus highlight in CSS, selection with :target, panel switching with :has().
// Run from this folder: node build-map.mjs
import fs from 'node:fs';
import { geoAzimuthalEqualArea, geoPath, geoArea, geoCentroid, geoBounds } from 'd3-geo';
import { feature } from 'topojson-client';

const OUT = '../../payloads/europe-map/page.html';
const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const countries = feature(topo, topo.objects.countries).features;

// EU member states: ISO numeric id -> [code, name, placeholder status]
const EU = {
  '040': ['at', 'Austria', 'b'], '056': ['be', 'Belgium', 'a'], '100': ['bg', 'Bulgaria', 'c'], '191': ['hr', 'Croatia', 'c'],
  '196': ['cy', 'Cyprus', 'c'], '203': ['cz', 'Czechia', 'b'], '208': ['dk', 'Denmark', 'a'], '233': ['ee', 'Estonia', 'b'],
  '246': ['fi', 'Finland', 'b'], '250': ['fr', 'France', 'a'], '276': ['de', 'Germany', 'a'], '300': ['gr', 'Greece', 'c'],
  '348': ['hu', 'Hungary', 'b'], '372': ['ie', 'Ireland', 'a'], '380': ['it', 'Italy', 'a'], '428': ['lv', 'Latvia', 'b'],
  '440': ['lt', 'Lithuania', 'b'], '442': ['lu', 'Luxembourg', 'a'], '470': ['mt', 'Malta', 'c'], '528': ['nl', 'Netherlands', 'a'],
  '616': ['pl', 'Poland', 'b'], '620': ['pt', 'Portugal', 'b'], '642': ['ro', 'Romania', 'c'], '703': ['sk', 'Slovakia', 'b'],
  '705': ['si', 'Slovenia', 'c'], '724': ['es', 'Spain', 'a'], '752': ['se', 'Sweden', 'a'],
};
const STATUS = { a: 'Placeholder status A', b: 'Placeholder status B', c: 'Placeholder status C' };
// Pin positions where the largest-polygon centroid would land badly (lon, lat)
const PIN_FIX = { hr: [15.9, 45.5], gr: [22.0, 39.6], dk: [9.2, 56.1], it: [12.6, 42.8], se: [15.2, 60.6], fi: [26.0, 62.6] };
// Label offsets so names sit clear of pins
const LABEL_DX = { lu: 10, be: -10, nl: -10, mt: 0, cy: 0, si: -10 };

const W = 1000;
const frame = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-11, 33], [-11, 71.5], [36, 71.5], [36, 33], [-11, 33]]] } };
const projection = geoAzimuthalEqualArea().rotate([-12, -52]).fitWidth(W, frame);
const [[, y0], [, y1]] = geoPath(projection).bounds(frame);
const H = Math.round(y1 - y0);
projection.translate([projection.translate()[0], projection.translate()[1] - y0]).clipExtent([[0, 0], [W, H]]);
const rawPath = geoPath(projection).digits(0);
// dedupe: whole-pixel rounding leaves repeated consecutive points; drop them to keep the markup small
const path = f => { const d = rawPath(f); return d && d.replace(/L(-?\d+),(-?\d+)(?=(?:L\1,\2)+(?:[LZM]|$))/g, ''); };

// Largest polygon of a (multi)polygon feature, for pin placement
const largest = f => f.geometry.type === 'Polygon' ? f : {
  type: 'Feature', geometry: { type: 'Polygon', coordinates: f.geometry.coordinates.reduce((a, c) => geoArea({ type: 'Polygon', coordinates: c }) > geoArea({ type: 'Polygon', coordinates: a }) ? c : a) } };
const inFrame = f => { const [[x0, y0b], [x1, y1b]] = geoBounds(f); return x1 > -12 && x0 < 37 && y1b > 33 && y0b < 72; };

const bg = [], eu = [];
for (const f of countries) {
  if (!inFrame(f) && !EU[f.id]) continue;
  const d = path(f) || '';
  if (EU[f.id]) {                                   // EU states always render: tiny ones (Malta) are just their pin
    const [code, name, status] = EU[f.id];
    const [px, py] = projection(PIN_FIX[code] || geoCentroid(largest(f))).map(n => Math.round(n * 10) / 10);
    eu.push({ code, name, status, d, px, py });
  } else if (d) bg.push(d);
}
eu.sort((a, b) => a.name.localeCompare(b.name));

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const lorem = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet.',
  'Donec ullamcorper nulla non metus auctor fringilla. Vestibulum id ligula porta felis euismod semper.',
];

const svgCountries = eu.map(c => {
  const lx = c.px + (LABEL_DX[c.code] || 0), anchor = (LABEL_DX[c.code] || 0) < 0 ? 'end' : (LABEL_DX[c.code] > 0 ? 'start' : 'middle');
  return `<a class="evx-country" data-c="${c.code}" data-s="${c.status}" href="#evx-c-${c.code}" aria-label="${esc(c.name)}">` +
    (c.d ? `<path d="${c.d}"/>` : '') +
    `<circle class="evx-pin" cx="${c.px}" cy="${c.py}" r="5.5"/>` +
    `<text class="evx-label" x="${lx}" y="${(c.py - 12).toFixed(1)}" text-anchor="${anchor}">${esc(c.name)}</text></a>`;
}).join('\n');

const selectedRules = eu.map(c => `.evx .evx-map-grid:has(#evx-c-${c.code}:target) .evx-country[data-c="${c.code}"]`).join(',\n');
const selectedLabelRules = eu.map(c => `.evx .evx-map-grid:has(#evx-c-${c.code}:target) .evx-country[data-c="${c.code}"] .evx-label`).join(',\n');
const selectedListRules = eu.map(c => `.evx .evx-map-sec:has(#evx-c-${c.code}:target) .evx-country-list a[href="#evx-c-${c.code}"]`).join(',\n');

const cards = eu.map(c => `
      <article class="evx-card" id="evx-c-${c.code}" tabindex="-1" aria-labelledby="evx-c-${c.code}-h">
        <div class="evx-card-top">
          <span class="evx-status" data-s="${c.status}">${STATUS[c.status]}</span>
          <a class="evx-close" href="#evx-map">Close<span class="evx-sr"> ${esc(c.name)}</span></a>
        </div>
        <h3 class="evx-h3" id="evx-c-${c.code}-h">${esc(c.name)}</h3>
        <p class="evx-p">${lorem[0]}</p>
        <dl class="evx-dl">
          <div class="evx-row"><dt class="evx-dt">Scheme</dt><dd class="evx-dd">Lorem ipsum</dd></div>
          <div class="evx-row"><dt class="evx-dt">Authority</dt><dd class="evx-dd">Dolor sit amet</dd></div>
          <div class="evx-row"><dt class="evx-dt">Next deadline</dt><dd class="evx-dd">00 Month 0000</dd></div>
        </dl>
        <p class="evx-p evx-muted">${lorem[1]}</p>
        <a class="evx-link" href="https://www.ecoveritas.com/contact-us">Talk to us about ${esc(c.name)}</a>
      </article>`).join('');

const list = eu.map(c => `<li class="evx-item"><a href="#evx-c-${c.code}" data-s="${c.status}">${esc(c.name)}</a></li>`).join('');

const html = `<style>
/* Interactive EU map. Scoped to .evx; no JavaScript. Generated by tools/map/build-map.mjs from Natural Earth data (public domain). */
.evx { --evx-ink:#212121; --evx-muted:#55656d; --evx-slate:#2f444e; --evx-teal:#0f6378; --evx-yellow:#ffcd03; --evx-grey:#f6f7f7; --evx-line:#e2e7e9;
  --evx-land:#dde3e6; --evx-sea:#eef3f5; --evx-a:#0f6378; --evx-b:#4d8a9a; --evx-c:#93b8c2; --evx-radius:16px; color:var(--evx-ink); }
.evx *, .evx *::before, .evx *::after { box-sizing:border-box; }
.evx .evx-h2, .evx .evx-h3, .evx .evx-p, .evx .evx-list, .evx .evx-item, .evx .evx-dl, .evx .evx-dt, .evx .evx-dd, .evx .evx-figure { margin:0; padding:0; list-style:none; font-family:inherit; }
.evx .evx-sr { position:absolute; width:1px; height:1px; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }
.evx .evx-eyebrow { display:inline-flex; align-items:center; gap:10px; margin:0 0 12px; font-size:14px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--evx-muted); }
.evx .evx-eyebrow::before { content:""; width:28px; height:4px; border-radius:2px; background:var(--evx-yellow); }
.evx .evx-h2 { font-size:clamp(30px,4vw,44px); line-height:1.15; font-weight:700; letter-spacing:-.01em; color:inherit; }
.evx .evx-h3 { font-size:clamp(24px,2.4vw,30px); line-height:1.2; font-weight:700; color:inherit; }
.evx .evx-p { font-size:16px; line-height:1.6; color:inherit; }
.evx .evx-lead { font-size:clamp(17px,1.6vw,19px); line-height:1.55; color:var(--evx-muted); max-width:62ch; margin-top:12px; }
.evx .evx-muted { color:var(--evx-muted); }
.evx .evx-note { display:inline-block; margin-top:16px; padding:6px 12px; border-radius:999px; background:#fff4c2; font-size:13px; font-weight:700; }
.evx a:focus-visible { outline:3px solid var(--evx-yellow); outline-offset:3px; }
.evx .evx-map-sec { scroll-margin-top:120px; }
.evx .evx-head { margin-bottom:clamp(24px,4vw,40px); }

/* Layout: map + panel */
.evx .evx-map-grid { display:grid; gap:clamp(16px,2.5vw,32px); align-items:start; }
@media (min-width:1024px) { .evx .evx-map-grid { grid-template-columns:minmax(0,1fr) 360px; } }
.evx .evx-figure { position:relative; background:var(--evx-sea); border-radius:var(--evx-radius); overflow:hidden; }
.evx .evx-svg { display:block; width:100%; height:auto; }
.evx .evx-bg path { fill:var(--evx-land); stroke:#fff; stroke-width:.6; }

/* Countries */
.evx .evx-country { cursor:pointer; outline:none; }
.evx .evx-country path { fill:var(--evx-a); stroke:#fff; stroke-width:.8; stroke-linejoin:round; transition:fill .2s ease; }
.evx .evx-country[data-s="b"] path { fill:var(--evx-b); }
.evx .evx-country[data-s="c"] path { fill:var(--evx-c); }
.evx .evx-pin { fill:var(--evx-yellow); stroke:var(--evx-ink); stroke-width:1.5; transition:r .2s ease; }
.evx .evx-label { font-size:15px; font-weight:700; fill:var(--evx-ink); paint-order:stroke; stroke:#fff; stroke-width:4px; stroke-linejoin:round; opacity:0; pointer-events:none; transition:opacity .15s ease; }
.evx .evx-country:hover path, .evx .evx-country:focus-visible path { fill:var(--evx-slate); }
.evx .evx-country:hover .evx-pin, .evx .evx-country:focus-visible .evx-pin { r:8; }
.evx .evx-country:hover .evx-label, .evx .evx-country:focus-visible .evx-label { opacity:1; }
.evx .evx-country:focus-visible path { stroke:var(--evx-yellow); stroke-width:3; }
/* Selected country (its card is the :target) */
${selectedRules.split(',\n').map(r => r + ' path').join(',\n')} { fill:var(--evx-yellow); }
${selectedLabelRules} { opacity:1; }

/* Legend */
.evx .evx-legend { display:flex; flex-wrap:wrap; gap:8px 20px; padding:14px 18px; font-size:14px; color:var(--evx-muted); background:#fff; border-top:1px solid var(--evx-line); }
.evx .evx-legend span::before { content:""; display:inline-block; width:12px; height:12px; margin-right:8px; vertical-align:-1px; border-radius:3px; background:var(--k); }

/* Panel and cards */
.evx .evx-panel { position:relative; }
@media (min-width:1024px) { .evx .evx-panel { position:sticky; top:120px; } }
.evx .evx-intro, .evx .evx-card { border-radius:var(--evx-radius); padding:clamp(24px,3vw,32px); }
.evx .evx-intro { background:var(--evx-grey); display:grid; gap:12px; }
.evx .evx-intro-icon { width:48px; height:48px; }
.evx .evx-card { display:none; background:var(--evx-slate); color:#fff; scroll-margin-top:120px; }
.evx .evx-card:target { display:grid; gap:16px; animation:evx-in .25s ease; }
.evx .evx-card:focus { outline:none; }   /* focus moves here when a country is chosen; the open card is the visible cue */
.evx .evx-panel:has(.evx-card:target) .evx-intro { display:none; }
.evx .evx-card .evx-muted { color:#c7d3d8; }
.evx .evx-card-top { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.evx .evx-status { padding:6px 12px; border-radius:999px; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; background:var(--evx-yellow); color:var(--evx-ink); }
.evx .evx-close { color:#fff; font-size:14px; font-weight:700; text-decoration:none; }
.evx .evx-close::after { content:" \\2715"; }
.evx .evx-dl { display:grid; gap:10px; }
.evx .evx-row { display:grid; grid-template-columns:1fr auto; gap:16px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,.2); }
.evx .evx-dt { color:#c7d3d8; } .evx .evx-dd { font-weight:700; text-align:right; }
.evx .evx-link { justify-self:start; display:inline-flex; gap:8px; font-weight:700; color:#fff; text-decoration:none; border-bottom:2px solid var(--evx-yellow); padding-bottom:2px; }
.evx .evx-link::after { content:"\\2192"; }
@keyframes evx-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }

/* Country list (main control on phones, shortcut on desktop) */
.evx .evx-country-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; margin-top:clamp(16px,2.5vw,24px); }
.evx .evx-country-list a { display:flex; align-items:center; gap:10px; padding:10px 14px; border:1px solid var(--evx-line); border-radius:10px; background:#fff; color:var(--evx-ink); font-weight:500; text-decoration:none; transition:border-color .2s ease, background .2s ease; }
.evx .evx-country-list a::before { content:""; flex:none; width:10px; height:10px; border-radius:50%; background:var(--evx-a); }
.evx .evx-country-list a[data-s="b"]::before { background:var(--evx-b); } .evx .evx-country-list a[data-s="c"]::before { background:var(--evx-c); }
.evx .evx-country-list a:hover { border-color:var(--evx-slate); }
${selectedListRules} { background:var(--evx-yellow); border-color:var(--evx-yellow); }
@media (max-width:640px) { .evx .evx-label { display:none; } .evx .evx-pin { r:7; } }
@media (prefers-reduced-motion:reduce) { .evx * { transition:none !important; animation:none !important; } }
</style>

<div class="evx">
  <section class="evx-map-sec" id="evx-map" aria-labelledby="evx-map-h">
    <div class="evx-head">
      <p class="evx-eyebrow">Europe at a glance</p>
      <h2 class="evx-h2" id="evx-map-h">EPR across the European Union</h2>
      <p class="evx-p evx-lead">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Select a country on the map or from the list to see its key requirements.</p>
      <p class="evx-note">Design preview: all country details are placeholder text</p>
    </div>
    <div class="evx-map-grid">
      <figure class="evx-figure">
        <svg class="evx-svg" viewBox="0 0 ${W} ${H}" role="group" aria-labelledby="evx-map-title">
          <title id="evx-map-title">Map of the 27 EU member states. Select a country to see its details.</title>
          <g class="evx-bg" aria-hidden="true">${bg.map(d => `<path d="${d}"/>`).join('')}</g>
          <g class="evx-eu">
${svgCountries}
          </g>
        </svg>
        <figcaption class="evx-legend"><span style="--k:var(--evx-a)">${STATUS.a}</span><span style="--k:var(--evx-b)">${STATUS.b}</span><span style="--k:var(--evx-c)">${STATUS.c}</span><span style="--k:var(--evx-land)">Outside the EU</span></figcaption>
      </figure>
      <div class="evx-panel">
        <div class="evx-intro">
          <svg class="evx-intro-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="24" fill="#ffcd03"/><path d="M24 12c-5 0-9 4-9 9 0 7 9 15 9 15s9-8 9-15c0-5-4-9-9-9zm0 12.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="#212121"/></svg>
          <h3 class="evx-h3">Choose a country</h3>
          <p class="evx-p evx-muted">Lorem ipsum dolor sit amet. Hover over the map to explore, then select a country to see its scheme, authority and next deadline.</p>
        </div>${cards}
      </div>
    </div>
    <nav aria-label="EU countries">
      <ul class="evx-list evx-country-list">${list}</ul>
    </nav>
  </section>
</div>
`;
fs.mkdirSync('../../payloads/europe-map', { recursive: true });
fs.writeFileSync(OUT, html);
console.log('countries:', eu.length, '| background shapes:', bg.length, '| viewBox:', W, 'x', H, '| html KB:', (Buffer.byteLength(html) / 1024).toFixed(1));

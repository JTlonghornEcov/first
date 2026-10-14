// Renders the infographics for the "US Packaging EPR Eco-modulation" news post to tools/us-epr/out/*.png.
// Brand colours and the site's own Space Grotesk font; every number comes from the article text.
// Usage: node tools/us-epr/build-graphics.mjs [name ...]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launch } from '../../scripts/lib.mjs';
const require = createRequire(import.meta.url);
const mapDir = path.resolve('tools/map/node_modules');
const { geoPath } = await import(path.join(mapDir, 'd3-geo/src/index.js'));
const topojson = await import(path.join(mapDir, 'topojson-client/src/index.js'));
const us = JSON.parse(fs.readFileSync(path.join(mapDir, 'us-atlas/states-albers-10m.json')));
const OUT = 'tools/us-epr/out'; fs.mkdirSync(OUT, { recursive: true });

const C = { slate: '#2f444e', slate2: '#3b5562', slate3: '#4d6875', ink: '#212121', teal: '#0f6378', tealLight: '#d7e7eb', yellow: '#ffcd03', paper: '#f4f6f6', line: '#dfe5e7', muted: '#58676f', mist: '#aac5d1', white: '#fff' };
const font = w => fs.readFileSync(`tools/us-epr/fonts/sg-${w}.woff2`).toString('base64');
const FONTS = [['300', 300], ['regular', 400], ['500', 500], ['600', 600], ['700', 700]].map(([f, w]) => `@font-face{font-family:SG;font-weight:${w};src:url(data:font/woff2;base64,${font(f)}) format('woff2')}`).join('');

// ---- US map -------------------------------------------------------------------------------------------------
const states = topojson.feature(us, us.objects.states).features;
const pathGen = geoPath();
const FOCUS = { '06': 'California', '08': 'Colorado', '41': 'Oregon' };
const stateD = id => pathGen(states.find(s => s.id === id));
const bbox = id => pathGen.bounds(states.find(s => s.id === id));
function usMap({ base = C.slate2, stroke = C.slate, focus = C.yellow, only } = {}) {
  return states.filter(s => !only || only.includes(s.id)).map(s => `<path d="${pathGen(s)}" fill="${FOCUS[s.id] ? focus : base}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/>`).join('');
}
function silhouette(id, w, h, fill) {   // one state, scaled to fit w x h
  const [[x0, y0], [x1, y1]] = bbox(id);
  return `<svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"><path d="${stateD(id)}" fill="${fill}"/></svg>`;
}

// ---- icons (24px grid, stroke) -------------------------------------------------------------------------------
const I = {
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="m7 15 4-4 3 3 5-6"/>',
  scale: '<path d="M12 4v16M5 20h14M7 8h10"/><path d="m7 8-3 6h6zM17 8l-3 6h6z"/>',
  minus: '<path d="M12 3v7M8 7l4 4 4-4"/><rect x="5" y="14" width="14" height="6" rx="1"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  recycle: '<path d="M7 19H4l3-5M17 19h3l-3-5M9 5l3-2 3 2"/><path d="M7 14 10 8M17 14l-3-6M7 19h10"/>',
  refill: '<path d="M8 3h8M9 3v3l-2 3v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9l-2-3V3"/><path d="M7 13h10"/><path d="M12 15.5v3M10.5 17h3"/>',
  bottle: '<path d="M10 3h4v3l2 3v11a1 1 0 0 0-1 1H9a1 1 0 0 0-1-1V9l2-3z"/><path d="M5 5 19 19"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  people: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 2 6 5.5"/>',
  cycle: '<path d="M20 12a8 8 0 0 1-14.6 4.5M4 12a8 8 0 0 1 14.6-4.5"/><path d="M19 3v5h-5M5 21v-5h5"/>',
  box: '<path d="m3 7 9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/>',
  weight: '<path d="M6 9h12l2 11H4z"/><circle cx="12" cy="6" r="2.5"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19 13 11"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
};
const icon = (k, size = 28, color = C.teal, sw = 1.8) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;

const page = (w, h, body, css = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box;margin:0;padding:0}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:SG,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;font-feature-settings:"tnum" 1}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.dots{position:absolute;inset:0;background-image:radial-gradient(${C.slate3} 1.2px,transparent 1.3px);background-size:14px 14px;opacity:.55}
${css}</style></head><body>${body}</body></html>`;

// ---- graphics -------------------------------------------------------------------------------------------------
const G = {};

// Hero (632x520 slot) and featured image (16:9): the map with the three states
const labelPos = { '41': [-8, -6, 'end'], '06': [-6, 40, 'end'], '08': [0, 0, 'middle'] };
function mapWithLabels(sub) {
  const lab = Object.entries(FOCUS).map(([id, name]) => {
    const [cx, cy] = pathGen.centroid(states.find(s => s.id === id));
    return { id, name, cx, cy, sub: sub[id] };
  });
  return `<svg viewBox="-10 -10 995 630" width="100%" height="100%">${usMap()}
    ${lab.map(l => `<circle cx="${l.cx}" cy="${l.cy}" r="6" fill="${C.ink}" stroke="${C.white}" stroke-width="2.5"/>`).join('')}</svg>`;
}
G.hero = () => page(632, 520, `
  <div style="position:absolute;inset:0;background:${C.slate}"><div class="dots" style="left:auto;width:45%;opacity:.35"></div></div>
  <div style="position:absolute;left:40px;top:40px;color:${C.mist}" class="eyebrow">US packaging EPR · eco-modulation</div>
  <div style="position:absolute;left:40px;top:64px;color:#fff;font-size:34px;font-weight:700;line-height:1.08;letter-spacing:-.015em">Three states,<br>three approaches</div>
  <div style="position:absolute;left:40px;top:152px;display:flex;gap:8px">${['California', 'Colorado', 'Oregon'].map(n => `<span style="background:${C.yellow};color:${C.ink};font-weight:700;font-size:13px;padding:5px 11px;border-radius:99px">${n}</span>`).join('')}</div>
  <div style="position:absolute;left:16px;right:16px;top:196px;bottom:24px">${mapWithLabels({})}</div>
`);
G.featured = () => page(960, 540, `
  <div style="position:absolute;inset:0;background:${C.slate}"><div class="dots" style="right:auto;width:42%;opacity:.35"></div></div>
  <div style="position:absolute;left:56px;top:150px;width:330px">
    <div class="eyebrow" style="color:${C.mist};margin-bottom:14px">US packaging EPR · eco-modulation</div>
    <div style="color:#fff;font-size:42px;font-weight:700;line-height:1.08;letter-spacing:-.015em">Three states, three very different approaches</div>
    <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">${['California', 'Colorado', 'Oregon'].map(n => `<span style="background:${C.yellow};color:${C.ink};font-weight:700;font-size:14px;padding:6px 12px;border-radius:99px">${n}</span>`).join('')}</div>
  </div>
  <div style="position:absolute;left:400px;right:28px;top:70px;bottom:70px">${mapWithLabels({})}</div>
`);

// Headline cards (736x414 slot)
function headline(id, big, caption) {
  return page(736, 414, `
    <div style="position:absolute;inset:0;background:${C.slate}"></div>
    <div style="position:absolute;right:28px;top:40px;bottom:40px;width:300px;display:flex;align-items:center;justify-content:center;opacity:.9">${silhouette(id, 300, 334, C.slate2)}</div>
    <div style="position:absolute;left:48px;top:44px;display:flex;align-items:center;gap:10px"><span style="width:12px;height:12px;border-radius:50%;background:${C.yellow}"></span><span class="eyebrow" style="color:${C.mist};font-size:15px">${FOCUS[id]}</span></div>
    <div style="position:absolute;left:44px;top:96px;font-size:150px;font-weight:600;line-height:1;color:${C.yellow};letter-spacing:-.04em">${big}</div>
    <div style="position:absolute;left:48px;bottom:48px;width:420px;font-size:24px;font-weight:500;line-height:1.25;color:#fff">${caption}</div>
  `);
}
G['card-california'] = () => headline('06', '25%', 'minimum plastic source reduction from 2023 levels by 2032');
G['card-colorado'] = () => headline('08', '±5%', 'passive malus and incentive on base fees in the first year');
G['card-oregon'] = () => headline('41', '$500k', 'maximum Bonus B credit across ten SKUs or batches');

// California: the four-part framework
G['ca-framework'] = () => page(736, 414, `
  <div style="position:absolute;inset:0;background:${C.paper}"></div>
  <div style="position:absolute;left:36px;top:30px" class="eyebrow"><span style="color:${C.teal}">California SB 54</span> · four-part framework</div>
  <div style="position:absolute;left:36px;right:36px;top:66px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
    ${[['doc', '2023 baseline report', 'The starting point for all future reductions'], ['map', 'Source Reduction Plan', 'Roadmap of methods and timelines (not binding)'], ['chart', 'Annual source reduction reports', 'Progress measured against 2023'], ['scale', 'SRIM', 'Implemented reduction becomes lower fees']].map(([ic, t, s], i) => `
      <div style="position:relative;background:#fff;border:1px solid ${C.line};border-radius:12px;padding:18px 14px 16px;height:212px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <span style="display:grid;place-items:center;width:46px;height:46px;border-radius:10px;background:${C.tealLight}">${icon(ic, 26)}</span>
          <span style="font-size:34px;font-weight:700;color:${C.line}">0${i + 1}</span></div>
        <div style="font-size:17px;font-weight:700;line-height:1.2;margin-bottom:8px">${t}</div>
        <div style="font-size:13.5px;line-height:1.35;color:${C.muted}">${s}</div>
        ${i < 3 ? `<svg style="position:absolute;right:-13px;top:90px;z-index:2" width="14" height="22" viewBox="0 0 14 22"><path d="M2 2l9 9-9 9" fill="none" stroke="${C.teal}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
      </div>`).join('')}
  </div>
  <div style="position:absolute;left:36px;right:36px;bottom:30px;height:72px;border-radius:12px;background:${C.slate};display:flex;align-items:center;gap:18px;padding:0 22px">
    <div style="font-size:40px;font-weight:700;color:${C.yellow};letter-spacing:-.02em">≥25%</div>
    <div style="color:#fff;font-size:15px;line-height:1.35"><b>Plastic source reduction from 2023 levels by 2032.</b><br><span style="color:${C.mist}">Binding on the PRO (CAA), not on individual producers.</span></div>
  </div>
`);

// California: SRIM maths. Same $10m bonus pool, fewer producers paying the malus.
G['ca-srim'] = () => {
  const rows = [['10,000', 1000, '$1,000'], ['1,000', 10000, '$10,000'], ['100', 100000, '$100,000']];
  const x0 = 96, x1 = 690, y0 = 136, y1 = 330, max = 100000, bw = 120;
  const y = v => y1 - (v / max) * (y1 - y0);
  const ticks = [0, 25000, 50000, 75000, 100000];
  const slot = (x1 - x0) / rows.length;
  return page(736, 414, `
    <div style="position:absolute;inset:0;background:#fff"></div>
    <div style="position:absolute;left:36px;top:28px" class="eyebrow"><span style="color:${C.teal}">SRIM</span> · illustrative example</div>
    <div style="position:absolute;left:36px;top:50px;font-size:22px;font-weight:700;letter-spacing:-.01em">A $10m bonus pool, split across fewer paying producers</div>
    <svg style="position:absolute;inset:0" width="736" height="414">
      ${ticks.map(t => `<line x1="${x0}" x2="${x1}" y1="${y(t)}" y2="${y(t)}" stroke="${C.line}" stroke-width="1"/><text x="${x0 - 10}" y="${y(t) + 4}" text-anchor="end" font-size="12" fill="${C.muted}" font-family="SG">${t ? '$' + t / 1000 + 'k' : '$0'}</text>`).join('')}
      ${rows.map(([n, v, lab], i) => { const cx = x0 + slot * (i + .5), top = Math.min(y(v), y1 - 4);
        return `<path d="M${cx - bw / 2} ${y1} V${top + 4} q0 -4 4 -4 H${cx + bw / 2 - 4} q4 0 4 4 V${y1} Z" fill="${i === 2 ? C.yellow : C.teal}"/>
        <text x="${cx}" y="${top - 10}" text-anchor="middle" font-size="22" font-weight="700" fill="${C.ink}" font-family="SG">${lab}</text>
        <text x="${cx}" y="${y1 + 24}" text-anchor="middle" font-size="15" font-weight="700" fill="${C.ink}" font-family="SG">${n} producers</text>
        <text x="${cx}" y="${y1 + 42}" text-anchor="middle" font-size="12.5" fill="${C.muted}" font-family="SG">still paying</text>`; }).join('')}
      <line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" stroke="${C.ink}" stroke-width="1.5"/>
    </svg>
    <div style="position:absolute;left:36px;top:86px;font-size:12.5px;color:${C.muted}">Malus per paying producer</div>
  `);
};

// Colorado: passive factors as % change against their reference fee (diverging bars from zero)
G['co-passive'] = () => {
  const rows = [['Incentive', 'on the category base fee', -5, '−5%'], ['Malus', 'on the category base fee', 5, '+5%'], ['Additional Materials List', 'vs average of similar MRL materials', 20, 'at least +20%'], ['Not collected', 'vs similar AML (+10%), so ≥ +32% vs MRL', 32, 'at least +32%']];
  const zx = 330, scale = 7.5, top = 112, rh = 62;
  return page(736, 414, `
    <div style="position:absolute;inset:0;background:${C.paper}"></div>
    <div style="position:absolute;left:36px;top:28px" class="eyebrow"><span style="color:${C.teal}">Colorado</span> · passive factors</div>
    <div style="position:absolute;left:36px;top:50px;font-size:22px;font-weight:700;letter-spacing:-.01em">How passive factors move the fee</div>
    <svg style="position:absolute;inset:0" width="736" height="414">
      <line x1="${zx}" x2="${zx}" y1="${top - 10}" y2="${top + rh * 4 - 10}" stroke="${C.ink}" stroke-width="1.5"/>
      <text x="${zx}" y="${top - 14}" text-anchor="middle" font-size="12" fill="${C.muted}" font-family="SG">reference fee</text>
      ${rows.map(([t, s, v, lab], i) => { const yy = top + i * rh, w = Math.abs(v) * scale, x = v < 0 ? zx - w : zx;
        return `<text x="36" y="${yy + 20}" font-size="16" font-weight="700" fill="${C.ink}" font-family="SG">${t}</text>
        <text x="36" y="${yy + 38}" font-size="12" fill="${C.muted}" font-family="SG">${s}</text>
        <rect x="${x}" y="${yy + 8}" width="${w}" height="28" rx="4" fill="${v < 0 ? C.teal : C.yellow}"/>
        
        <text x="${v < 0 ? x - 10 : x + w + 10}" y="${yy + 28}" text-anchor="${v < 0 ? 'end' : 'start'}" font-size="16" font-weight="700" fill="${C.ink}" font-family="SG">${lab}</text>`; }).join('')}
    </svg>
    <div style="position:absolute;left:36px;right:36px;bottom:22px;font-size:12px;color:${C.muted}">First programme year; reserves excluded. MRL = Minimum Recycling List, AML = Additional Materials List.</div>
  `);
};

// Colorado: active factors and how they are claimed
G['co-active'] = () => page(736, 414, `
  <div style="position:absolute;inset:0;background:#fff"></div>
  <div style="position:absolute;left:36px;top:28px" class="eyebrow"><span style="color:${C.teal}">Colorado</span> · active factors</div>
  <div style="position:absolute;left:36px;top:50px;font-size:22px;font-weight:700;letter-spacing:-.01em">Four producer practices that can earn a reduction</div>
  <div style="position:absolute;left:36px;right:36px;top:92px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
    ${[['minus', 'Source reduction'], ['bulb', 'Recyclability innovation'], ['recycle', 'High PCR content'], ['refill', 'Reuse and refill']].map(([ic, t]) => `
      <div style="background:${C.paper};border-radius:12px;padding:16px 14px;height:122px">
        <span style="display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:#fff;margin-bottom:12px">${icon(ic, 26)}</span>
        <div style="font-size:16px;font-weight:700;line-height:1.2">${t}</div></div>`).join('')}
  </div>
  <div style="position:absolute;left:36px;right:36px;bottom:26px;height:140px;border-radius:12px;background:${C.slate};display:grid;grid-template-columns:repeat(4,1fr);align-items:start;padding:20px 10px 0">
    ${[['upload', 'Submit extra data', 'through the portal'], ['shield', 'Data verified', 'once it is submitted'], ['people', 'Thresholds informed', 'by an independent technical committee'], ['cycle', 'Refined annually', 'so benchmarks will move']].map(([ic, t, s], i) => `
      <div style="padding:0 12px;${i ? `border-left:1px solid ${C.slate3}` : ''}">
        ${icon(ic, 24, C.yellow)}<div style="color:#fff;font-weight:700;font-size:14px;margin-top:8px">${t}</div><div style="color:${C.mist};font-size:12px;line-height:1.3">${s}</div></div>`).join('')}
  </div>
`);

// Oregon bonus cards
const oregonCard = (letter, body) => page(736, 414, `
  <div style="position:absolute;inset:0;background:${C.slate}"><div class="dots" style="left:auto;width:38%;opacity:.3"></div></div>
  <div style="position:absolute;left:44px;top:40px;display:flex;align-items:center;gap:14px">
    <span style="display:grid;place-items:center;width:58px;height:58px;border-radius:14px;background:${C.yellow};font-size:32px;font-weight:700;color:${C.ink}">${letter}</span>
    <span class="eyebrow" style="color:${C.mist};font-size:15px">Oregon · Bonus ${letter}</span></div>
  ${body}`);
G['or-bonus-a'] = () => oregonCard('A', `
  <div style="position:absolute;left:44px;top:128px;font-size:120px;font-weight:600;line-height:1;color:${C.yellow};letter-spacing:-.04em">10%</div>
  <div style="position:absolute;left:46px;top:258px;width:300px;color:#fff;font-size:20px;font-weight:500;line-height:1.3">of base fees for disclosing an LCA</div>
  <div style="position:absolute;right:44px;top:132px;width:250px;display:grid;gap:12px">
    <div style="background:${C.slate2};border-radius:12px;padding:16px 18px"><div style="color:${C.mist};font-size:13px">Cap per SKU or batch</div><div style="color:#fff;font-size:34px;font-weight:700">$20,000</div></div>
    <div style="background:${C.slate2};border-radius:12px;padding:16px 18px"><div style="color:${C.mist};font-size:13px">Up to 10 SKUs or batches</div><div style="color:#fff;font-size:34px;font-weight:700">$200,000</div></div>
  </div>`);
G['or-bonus-b'] = () => {
  const tiers = [['10–40%', 40], ['40–70%', 45], ['70%+', 50]];
  const x0 = 420, y1 = 340, h = 180, bw = 78, gap = 22;
  return oregonCard('B', `
    <div style="position:absolute;left:46px;top:130px;width:280px;color:#fff;font-size:20px;font-weight:500;line-height:1.3">Comparative LCAs showing a lower environmental impact, tiered by reduction</div>
    <div style="position:absolute;left:46px;top:262px;color:${C.mist};font-size:14px">Total across ten SKUs or batches</div>
    <div style="position:absolute;left:44px;top:284px;color:${C.yellow};font-size:38px;font-weight:700">up to $500,000</div>
    <svg style="position:absolute;inset:0" width="736" height="414">
      ${tiers.map(([t, v], i) => { const x = x0 + i * (bw + gap), hh = (v / 50) * h;
        return `<path d="M${x} ${y1} V${y1 - hh + 4} q0 -4 4 -4 H${x + bw - 4} q4 0 4 4 V${y1} Z" fill="${C.yellow}"/>
        <text x="${x + bw / 2}" y="${y1 - hh - 10}" text-anchor="middle" font-size="22" font-weight="700" fill="#fff" font-family="SG">$${v}k</text>
        <text x="${x + bw / 2}" y="${y1 + 24}" text-anchor="middle" font-size="15" font-weight="700" fill="#fff" font-family="SG">${t}</text>`; }).join('')}
      <line x1="${x0 - 8}" x2="${x0 + 3 * bw + 2 * gap + 8}" y1="${y1}" y2="${y1}" stroke="${C.mist}" stroke-width="1.5"/>
      <text x="${x0 + (3 * bw + 2 * gap) / 2}" y="${y1 + 46}" text-anchor="middle" font-size="12.5" fill="${C.mist}" font-family="SG">impact reduction · max per SKU or batch</text>
    </svg>`);
};
G['or-bonus-c'] = () => oregonCard('C', `
  <div style="position:absolute;left:44px;right:44px;top:138px;display:flex;align-items:center;justify-content:center;gap:28px">
    <div style="text-align:center"><span style="display:grid;place-items:center;width:110px;height:110px;border-radius:50%;background:${C.slate2};margin:0 auto 12px">${icon('bottle', 56, C.mist, 1.6)}</span><div style="color:#fff;font-weight:700;font-size:17px">Single-use plastic</div></div>
    <svg width="120" height="30" viewBox="0 0 120 30"><path d="M4 15h104M96 4l12 11-12 11" fill="none" stroke="${C.yellow}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div style="text-align:center"><span style="display:grid;place-items:center;width:110px;height:110px;border-radius:50%;background:${C.yellow};margin:0 auto 12px">${icon('refill', 56, C.ink, 1.6)}</span><div style="color:#fff;font-weight:700;font-size:17px">Reusable or refillable</div></div>
  </div>
  <div style="position:absolute;left:44px;right:44px;bottom:36px;text-align:center;color:${C.mist};font-size:16px">Comparative LCA · same reduction tiers as Bonus B</div>`);

// Where to start: one data foundation feeds all three programmes
G['data-foundation'] = () => page(736, 414, `
  <div style="position:absolute;inset:0;background:${C.paper}"></div>
  <div style="position:absolute;left:36px;top:28px" class="eyebrow"><span style="color:${C.teal}">Where to start</span> · build once, use three times</div>
  <svg style="position:absolute;inset:0" width="736" height="414"><g fill="none" stroke="${C.teal}" stroke-width="2.5" stroke-linecap="round">
    ${[110, 172, 234, 296].map(y => `<path d="M214 ${y} C 250 ${y}, 250 203, 284 203"/>`).join('')}
    ${[120, 203, 286].map(y => `<path d="M452 203 C 490 203, 490 ${y}, 522 ${y}"/>`).join('')}</g></svg>
  <div style="position:absolute;left:36px;top:84px;display:grid;gap:10px;width:178px">
    ${[['box', 'Materials'], ['weight', 'Weights'], ['recycle', 'Recycled content'], ['leaf', 'Recyclability evidence']].map(([ic, t]) => `
      <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid ${C.line};border-radius:10px;height:52px;padding:0 12px">${icon(ic, 22)}<span style="font-size:14px;font-weight:700">${t}</span></div>`).join('')}
  </div>
  <div style="position:absolute;left:284px;top:128px;width:168px;height:150px;border-radius:16px;background:${C.slate};display:flex;flex-direction:column;justify-content:center;padding:0 18px">
    <div style="width:28px;height:4px;background:${C.yellow};border-radius:2px;margin-bottom:12px"></div>
    <div style="color:#fff;font-size:20px;font-weight:700;line-height:1.15">Packaging data foundation</div></div>
  <div style="position:absolute;left:522px;top:84px;display:grid;gap:12px;width:178px">
    ${[['08', 'Colorado', 'Verification process'], ['06', 'California', 'Source reduction reports'], ['41', 'Oregon', 'LCA submissions']].map(([id, n, t]) => `
      <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid ${C.line};border-left:4px solid ${C.yellow};border-radius:10px;height:72px;padding:0 12px">
        ${silhouette(id, 34, 34, C.teal)}<div><div style="font-size:15px;font-weight:700">${n}</div><div style="font-size:12.5px;color:${C.muted}">${t}</div></div></div>`).join('')}
  </div>
  <div style="position:absolute;left:36px;right:36px;bottom:22px;font-size:13px;color:${C.muted};text-align:center">The sooner it is in place, the more of these bonuses you can claim.</div>
`);

// ---- Wide banners for full-width gallery blocks (640x320, rendered at 4x). Few words, large type. -------------
const W = (body, bg = '#fff') => page(640, 320, `<div style="position:absolute;inset:0;background:${bg}"></div>${body}`, '.eyebrow{font-size:11px}');
const head = (eyebrow, title, dark) => `<div style="position:absolute;left:28px;top:22px" class="eyebrow"><span style="color:${dark ? C.yellow : C.teal}">${eyebrow[0]}</span> <span style="color:${dark ? C.mist : C.ink}">· ${eyebrow[1]}</span></div>
  <div style="position:absolute;left:28px;top:40px;font-size:22px;font-weight:700;letter-spacing:-.01em;color:${dark ? '#fff' : C.ink}">${title}</div>`;

G['ca-framework-wide'] = () => W(`${head(['California SB 54', 'four-part framework'], 'From a 2023 baseline to lower fees')}
  <div style="position:absolute;left:28px;right:28px;top:86px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
    ${[['doc', '2023 baseline report'], ['map', 'Source Reduction Plan'], ['chart', 'Annual source reduction reports'], ['scale', 'SRIM: lower fees']].map(([ic, t], i) => `
      <div style="position:relative;background:#fff;border:1px solid ${C.line};border-radius:10px;padding:12px;height:124px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="display:grid;place-items:center;width:36px;height:36px;border-radius:8px;background:${C.tealLight}">${icon(ic, 22)}</span>
          <span style="font-size:24px;font-weight:700;color:${C.mist}">0${i + 1}</span></div>
        <div style="font-size:15px;font-weight:700;line-height:1.2">${t}</div>
        ${i < 3 ? `<svg style="position:absolute;right:-12px;top:52px;z-index:2" width="10" height="18" viewBox="0 0 10 18"><path d="M2 2l6 7-6 7" fill="none" stroke="${C.teal}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
      </div>`).join('')}
  </div>
  <div style="position:absolute;left:28px;right:28px;bottom:22px;height:62px;border-radius:10px;background:${C.slate};display:flex;align-items:center;gap:16px;padding:0 18px">
    <div style="font-size:34px;font-weight:700;color:${C.yellow};letter-spacing:-.02em">≥25%</div>
    <div style="color:#fff;font-size:15px;line-height:1.3;font-weight:600">plastic source reduction from 2023 levels by 2032<br><span style="color:${C.mist};font-weight:400;font-size:13px">Binding on the PRO (CAA), not on individual producers</span></div>
  </div>`, C.paper);

G['ca-srim-wide'] = () => {
  const rows = [['10,000', 1000, '$1,000'], ['1,000', 10000, '$10,000'], ['100', 100000, '$100,000']];
  const x0 = 250, x1 = 612, y0 = 112, y1 = 262, bw = 80, slot = (x1 - x0) / 3;
  const y = v => y1 - (v / 100000) * (y1 - y0);
  return W(`${head(['SRIM', 'illustrative example'], '')}
    <div style="position:absolute;left:28px;top:44px;width:200px;font-size:22px;font-weight:700;line-height:1.15;letter-spacing:-.01em">The same $10m pool, fewer producers paying</div>
    <div style="position:absolute;left:28px;top:160px;width:196px;font-size:14px;line-height:1.35;color:${C.muted}">Bonuses are funded by maluses, so every producer that earns a bonus raises the bill for those that don't.</div>
    <svg style="position:absolute;inset:0" width="640" height="320">
      ${rows.map(([n, v, lab], i) => { const cx = x0 + slot * (i + .5), top = Math.min(y(v), y1 - 3);
        return `<path d="M${cx - bw / 2} ${y1} V${top + 3} q0 -3 3 -3 H${cx + bw / 2 - 3} q3 0 3 3 V${y1} Z" fill="${i === 2 ? C.yellow : C.teal}"/>
        <text x="${cx}" y="${top - 8}" text-anchor="middle" font-size="18" font-weight="700" fill="${C.ink}" font-family="SG">${lab}</text>
        <text x="${cx}" y="${y1 + 20}" text-anchor="middle" font-size="14" font-weight="700" fill="${C.ink}" font-family="SG">${n} paying</text>`; }).join('')}
      <line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" stroke="${C.ink}" stroke-width="1.2"/>
      <text x="${x0}" y="${y1 + 42}" font-size="12" fill="${C.muted}" font-family="SG">Malus per paying producer</text>
    </svg>`);
};

G['co-passive-wide'] = () => {
  const rows = [['Incentive', 'vs category base fee', -5, '−5%'], ['Malus', 'vs category base fee', 5, '+5%'], ['Additional Materials List', 'vs similar MRL materials', 20, '≥ +20%'], ['Not collected', '+10% on AML, so ≥ +32% vs MRL', 32, '≥ +32%']];
  const zx = 330, sc = 6.6, top = 88, rh = 52;
  return W(`${head(['Colorado', 'passive factors'], 'How passive factors move the fee')}
    <svg style="position:absolute;inset:0" width="640" height="320">
      <line x1="${zx}" x2="${zx}" y1="${top - 4}" y2="${top + rh * 4 - 8}" stroke="${C.ink}" stroke-width="1.2"/>
      ${rows.map(([t, s, v, lab], i) => { const yy = top + i * rh, w = Math.abs(v) * sc, x = v < 0 ? zx - w : zx;
        return `<text x="28" y="${yy + 17}" font-size="15" font-weight="700" fill="${C.ink}" font-family="SG">${t}</text>
        <text x="28" y="${yy + 34}" font-size="12.5" fill="${C.muted}" font-family="SG">${s}</text>
        <rect x="${x}" y="${yy + 6}" width="${w}" height="26" rx="3" fill="${v < 0 ? C.teal : C.yellow}"/>
        <text x="${v < 0 ? x - 8 : x + w + 8}" y="${yy + 25}" text-anchor="${v < 0 ? 'end' : 'start'}" font-size="16" font-weight="700" fill="${C.ink}" font-family="SG">${lab}</text>`; }).join('')}
    </svg>`, C.paper);
};

G['co-active-wide'] = () => W(`${head(['Colorado', 'active factors'], 'Four practices that can earn a reduction')}
  <div style="position:absolute;left:28px;right:28px;top:84px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
    ${[['minus', 'Source reduction'], ['bulb', 'Recyclability innovation'], ['recycle', 'High PCR content'], ['refill', 'Reuse and refill']].map(([ic, t]) => `
      <div style="background:${C.paper};border-radius:10px;padding:12px;height:102px">
        <span style="display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#fff;margin-bottom:10px">${icon(ic, 22)}</span>
        <div style="font-size:15px;font-weight:700;line-height:1.2">${t}</div></div>`).join('')}
  </div>
  <div style="position:absolute;left:28px;right:28px;bottom:22px;height:96px;border-radius:10px;background:${C.slate};display:grid;grid-template-columns:repeat(4,1fr);align-items:center;padding:0 6px">
    ${[['upload', 'Submit data', 'via the portal'], ['shield', 'Verified', 'once submitted'], ['people', 'Thresholds', 'independent committee'], ['cycle', 'Refined', 'every year']].map(([ic, t, s], i) => `
      <div style="padding:0 10px;${i ? `border-left:1px solid ${C.slate3}` : ''}">
        ${icon(ic, 20, C.yellow)}<div style="color:#fff;font-weight:700;font-size:15px;margin-top:6px">${t}</div><div style="color:${C.mist};font-size:12.5px">${s}</div></div>`).join('')}
  </div>`);

G['data-foundation-wide'] = () => W(`${head(['Where to start', 'build once, use three times'], '')}
  <svg style="position:absolute;inset:0" width="640" height="320"><g fill="none" stroke="${C.teal}" stroke-width="2" stroke-linecap="round">
    ${[82, 136, 190, 244].map(y => `<path d="M196 ${y} C 222 ${y}, 222 163, 246 163"/>`).join('')}
    ${[96, 163, 230].map(y => `<path d="M394 163 C 420 163, 420 ${y}, 446 ${y}"/>`).join('')}</g></svg>
  <div style="position:absolute;left:28px;top:60px;display:grid;gap:10px;width:168px">
    ${[['box', 'Materials'], ['weight', 'Weights'], ['recycle', 'Recycled content'], ['leaf', 'Recyclability evidence']].map(([ic, t]) => `
      <div style="display:flex;align-items:center;gap:8px;background:#fff;border:1px solid ${C.line};border-radius:8px;height:44px;padding:0 10px">${icon(ic, 20)}<span style="font-size:14px;font-weight:700;line-height:1.1">${t}</span></div>`).join('')}
  </div>
  <div style="position:absolute;left:246px;top:103px;width:148px;height:120px;border-radius:12px;background:${C.slate};display:flex;flex-direction:column;justify-content:center;padding:0 16px">
    <div style="width:24px;height:4px;background:${C.yellow};border-radius:2px;margin-bottom:10px"></div>
    <div style="color:#fff;font-size:19px;font-weight:700;line-height:1.15">Packaging data foundation</div></div>
  <div style="position:absolute;left:446px;top:66px;display:grid;gap:10px;width:166px">
    ${[['08', 'Colorado', 'Verification'], ['06', 'California', 'Reports'], ['41', 'Oregon', 'LCA submissions']].map(([id, n, t]) => `
      <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid ${C.line};border-left:4px solid ${C.yellow};border-radius:8px;height:57px;padding:0 10px">
        ${silhouette(id, 28, 28, C.teal)}<div><div style="font-size:15px;font-weight:700">${n}</div><div style="font-size:12.5px;color:${C.muted}">${t}</div></div></div>`).join('')}
  </div>`, C.paper);

// ---- render -------------------------------------------------------------------------------------------------
const only = process.argv.slice(2);
const SIZES = { hero: [632, 520], featured: [960, 540] };   // '-wide' banners are 640x320
for (const scale of [2, 4]) {
const { browser, page: tab } = await launch({ state: false, log: false, scale });
for (const [name, fn] of Object.entries(G)) {
  if (only.length && !only.includes(name)) continue;
  if ((scale === 4) !== name.endsWith('-wide')) continue;
  const [w, h] = SIZES[name] || (name.endsWith('-wide') ? [640, 320] : [736, 414]);
  await tab.setViewportSize({ width: w, height: h });
  await tab.setContent(fn(), { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  const over = await tab.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5 || b.left < -0.5); }).filter(e => !e.closest('svg') && !e.classList.contains('dots')).map(e => (e.textContent || e.tagName).trim().slice(0, 30)));
  await tab.screenshot({ path: `${OUT}/${name}.png`, scale: 'device' });
  console.log(name, w + 'x' + h, over.length ? 'OVERFLOW: ' + over.join(' | ') : 'ok');
}
await browser.close();
}

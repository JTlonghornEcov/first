// Builds payloads/us-epr-ecomodulation/page.html from page.src.html: inlines the three state outlines (us-atlas,
// Albers USA, rounded to 1 decimal) and appends the shared enquiry prefill script.
import fs from 'node:fs';
import path from 'node:path';
const mapDir = path.resolve('tools/map/node_modules');
const { geoPath } = await import(path.join(mapDir, 'd3-geo/src/index.js'));
const topojson = await import(path.join(mapDir, 'topojson-client/src/index.js'));
const us = JSON.parse(fs.readFileSync(path.join(mapDir, 'us-atlas/states-albers-10m.json')));
const states = topojson.feature(us, us.objects.states).features;
const pg = geoPath().digits(1);
let html = fs.readFileSync('payloads/us-epr-ecomodulation/page.src.html', 'utf8');
for (const [key, id] of [['CA', '06'], ['CO', '08'], ['OR', '41']]) {
  const f = states.find(s => s.id === id), [[x0, y0], [x1, y1]] = pg.bounds(f);
  html = html.replaceAll(`{{${key}}}`, pg(f)).replaceAll(`{{${key}_VB}}`, [x0, y0, x1 - x0, y1 - y0].map(v => +v.toFixed(1)).join(' '));
}
if (/\{\{/.test(html)) throw new Error('unfilled placeholder');
html += fs.readFileSync('payloads/shared/enquiry-prefill.html', 'utf8');
fs.writeFileSync('payloads/us-epr-ecomodulation/page.html', html);
console.log('page.html', html.length, 'bytes');

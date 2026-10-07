// Renders a bulletin payload to email-safe HTML and (with --push) saves it as a Mailchimp draft campaign.
//   node scripts/mailchimp-bulletin.mjs payloads/mailchimp/bulletin-2026-10.json           render only
//   MAILCHIMP_MODE=build npm run mc -- scripts/mailchimp-bulletin.mjs <payload> --push    create/update the draft
// The draft has no audience; it is never sent or scheduled from here. The campaign id is stored next to the
// payload (<payload>.campaign.json) so re-running updates the same draft.
import fs from 'node:fs';
import path from 'node:path';

const [payloadPath, flag] = process.argv.slice(2);
if (!payloadPath) throw new Error('Usage: mailchimp-bulletin.mjs <payload.json> [--push]');
const p = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

const C = { teal: '#29454F', tealText: '#C9D6DA', yellow: '#FFCE00', tint: '#FFF6D1', ink: '#1F2D33', body: '#3D4A50', muted: '#6B777C', line: '#E3E7E8', grey: '#F4F6F7', bg: '#EEF1F2' };
const FONT = "Montserrat, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const outstanding = [];
// Placeholders render as bright highlighted text so they can't be missed in a test send.
const tbc = what => { outstanding.push(what); return `<span style="background:#FF4FA3;color:#fff;padding:1px 4px;font-family:${FONT};font-size:13px;font-weight:700;">[${esc(what)} TBC]</span>`; };
const pTag = (t, extra = '') => `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.body};${extra}">${esc(t)}</p>`;
const button = (text, href, bg, fg) => href === 'TBC' ? tbc(`${text} link`) : `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${bg}" style="border-radius:4px;">
    <a href="${esc(href)}" style="display:inline-block;padding:13px 22px;font-family:${FONT};font-size:14px;font-weight:700;color:${fg};text-decoration:none;border-radius:4px;">${esc(text)}&nbsp;&rarr;</a>
  </td></tr></table>`;
const row = (inner, pad = '0 40px') => `<tr><td class="px" style="padding:${pad};">${inner}</td></tr>`;

function todo(t) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;"><tr>
    <td width="4" bgcolor="${C.yellow}" style="width:4px;font-size:0;line-height:0;">&nbsp;</td>
    <td bgcolor="${C.tint}" style="padding:14px 18px;font-family:${FONT};font-size:14px;line-height:22px;color:${C.ink};"><strong>What to do:</strong> ${esc(t)}</td>
  </tr></table>`;
}

function phases(list) {
  const cell = (ph, i) => `<td class="stack" width="50%" valign="top" style="padding:6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.line};border-radius:6px;"><tr><td class="card" style="padding:16px;" valign="top" height="118">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" height="28" bgcolor="${C.yellow}" align="center" style="border-radius:14px;font-family:${FONT};font-size:13px;font-weight:700;color:${C.ink};">${i + 1}</td></tr></table>
      <p style="margin:10px 0 4px;font-family:${FONT};font-size:14px;font-weight:700;line-height:20px;color:${C.ink};">${esc(ph.title)}</p>
      <p style="margin:0;font-family:${FONT};font-size:13px;line-height:19px;color:${C.muted};">${esc(ph.text)}</p>
    </td></tr></table></td>`;
  let out = '';
  for (let i = 0; i < list.length; i += 2) out += `<tr>${cell(list[i], i)}${list[i + 1] ? cell(list[i + 1], i + 1) : '<td class="stack" width="50%"></td>'}</tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 12px;">${out}</table>`;
}

function tiers(list) {
  return `<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.muted};">Levels of support</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr>${list.map((t, i) => `
    <td class="stack" width="33%" align="center" style="padding:${i ? '0 0 0 8px' : '0'};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" style="border:1px solid ${C.teal};border-radius:4px;padding:10px 6px;font-family:${FONT};font-size:13px;font-weight:600;color:${C.teal};">${esc(t)}</td></tr></table></td>`).join('')}
  </tr></table>`;
}

function article(a, first) {
  let h = `<h3 style="margin:${first ? '0' : '30px'} 0 10px;font-family:${FONT};font-size:19px;line-height:26px;font-weight:700;color:${C.ink};">${esc(a.title)}</h3>`;
  if (a.review_note) h += `<p style="margin:0 0 10px;">${tbc(a.review_note)}</p>`;
  h += a.body.map(t => pTag(t)).join('');
  if (a.phases) h += phases(a.phases);
  if (a.after) h += pTag(a.after);
  if (a.tiers) h += tiers(a.tiers);
  if (a.cta) h += `<div style="margin:0 0 6px;">${button(a.cta.text, a.cta.href, C.teal, '#ffffff')}</div>`;
  if (a.todo) h += todo(a.todo);
  return h;
}

function section(s) {
  return row(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr>
      <td style="font-family:${FONT};font-size:22px;font-weight:800;color:${C.ink};white-space:nowrap;padding-right:14px;">${esc(s.label)}</td>
      <td width="100%" valign="middle"><div style="height:3px;background:${C.yellow};line-height:3px;font-size:0;">&nbsp;</div></td>
    </tr></table>
    ${s.articles.map((a, i) => article(a, i === 0)).join('')}`, '36px 40px 8px');
}

const contents = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${p.contents.map(c => `
  <td class="stack2" width="25%" valign="top" style="padding:0 8px 0 0;">
    <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;font-weight:700;color:${C.teal};">${esc(c.label)}</p>
    ${c.items.map(i => `<p style="margin:0 0 3px;font-family:${FONT};font-size:12px;line-height:17px;color:${C.muted};">${esc(i)}</p>`).join('')}
  </td>`).join('')}</tr></table>`;

const o = p.offer, k = p.contact;
const contactLine = (label, val, href) => `<p style="margin:0 0 4px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.tealText};">${label}&nbsp; ${val === 'TBC' ? tbc(label.toLowerCase()) : `<a href="${esc(href)}" style="color:#ffffff;text-decoration:none;font-weight:600;">${esc(val)}</a>`}</p>`;

const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${esc(p.campaign.subject_line)}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  body{margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;}
  table{border-collapse:collapse;} a{color:${C.teal};}
  @media (max-width:620px){
    .wrap{width:100% !important;} .px{padding-left:22px !important;padding-right:22px !important;}
    .stack{display:block !important;width:100% !important;padding:6px 0 !important;}
    .card{height:auto !important;}
    .stack2{display:inline-block !important;width:46% !important;padding-bottom:14px !important;vertical-align:top;}
    .h1{font-size:30px !important;line-height:36px !important;} .hide-m{display:none !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">*|MC_PREVIEW_TEXT|*&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:640px;">
  <tr><td align="right" style="padding:0 4px 10px;font-family:${FONT};font-size:11px;color:${C.muted};"><a href="*|ARCHIVE|*" style="color:${C.muted};">View in your browser</a></td></tr>
</table>
<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:640px;max-width:640px;background:#ffffff;">
  <tr><td bgcolor="${C.teal}" class="px" style="padding:30px 40px 38px;background:${C.teal};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle"><a href="${esc(k.web)}" style="text-decoration:none;"><img src="${esc(p.logo.src)}" width="${p.logo.width}" height="${p.logo.height}" alt="${esc(p.logo.alt)}" style="display:block;border:0;width:${p.logo.width}px;height:auto;color:#ffffff;font-family:${FONT};font-size:22px;font-weight:800;"></a></td>
      <td align="right" valign="bottom" style="font-family:${FONT};font-size:12px;color:${C.tealText};">${esc(p.masthead)}</td>
    </tr></table>
    <h1 class="h1" style="margin:36px 0 16px;font-family:${FONT};font-size:38px;line-height:44px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${esc(p.headline)}</h1>
    <p style="margin:0;font-family:${FONT};font-size:16px;line-height:26px;color:${C.tealText};">${esc(p.intro)}</p>
  </td></tr>
  <tr><td height="6" bgcolor="${C.yellow}" style="height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td bgcolor="${C.grey}" class="px" style="padding:22px 40px 18px;background:${C.grey};">
    <p style="margin:0 0 12px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};">In this issue</p>
    ${contents}
  </td></tr>
  ${p.sections.map(section).join('')}
  <tr><td class="px" style="padding:28px 40px 36px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C.yellow}" style="padding:30px 30px 32px;background:${C.yellow};border-radius:6px;">
      <p style="margin:0 0 6px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.teal};">For you</p>
      <h2 style="margin:0 0 14px;font-family:${FONT};font-size:24px;line-height:30px;font-weight:800;color:${C.ink};">${esc(o.title)}</h2>
      ${o.body.map(t => pTag(t, `color:${C.ink};`)).join('')}
      <div style="margin-top:8px;">${button(o.cta.text, o.cta.href, C.teal, '#ffffff')}</div>
    </td></tr></table>
  </td></tr>
  <tr><td bgcolor="${C.teal}" class="px" style="padding:30px 40px;background:${C.teal};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="stack" valign="top" style="padding-right:20px;">
        <h2 style="margin:0 0 8px;font-family:${FONT};font-size:20px;font-weight:800;color:#ffffff;">${esc(k.title)}</h2>
        <p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${C.tealText};">${esc(k.text)}</p>
      </td>
      <td class="stack" valign="top" width="230" style="padding-top:4px;">
        ${contactLine('Email', k.email, 'mailto:' + k.email)}
        ${contactLine('Phone', k.phone, 'tel:' + String(k.phone).replace(/\s/g, ''))}
        ${contactLine('Web', k.web.replace(/^https?:\/\//, ''), k.web)}
      </td>
    </tr></table>
  </td></tr>
</table>
<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:640px;">
  <tr><td class="px" align="center" style="padding:22px 40px 10px;font-family:${FONT};font-size:11px;line-height:18px;color:${C.muted};">
    ${esc(p.footer_reason)}<br>
    Our address: *|LIST:ADDRESSLINE|*<br><br>
    <a href="*|UPDATE_PROFILE|*" style="color:${C.muted};">Update your preferences</a> &nbsp;·&nbsp; <a href="*|UNSUB|*" style="color:${C.muted};">Unsubscribe</a>
    <br><br>*|IF:REWARDS|* *|HTML:REWARDS|* *|END:IF|*
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;

const base = payloadPath.replace(/\.json$/, '');
const outHtml = path.join('marketing/campaigns', path.basename(base) + '.html');
fs.mkdirSync(path.dirname(outHtml), { recursive: true });
fs.writeFileSync(outHtml, html);
console.log('Rendered', outHtml, `(${(html.length / 1024).toFixed(1)} KB)`);
if (outstanding.length) console.log('Still to fill in:', [...new Set(outstanding)].join('; '));

if (flag === '--push') {
  const { mc, MODE } = await import('./mailchimp-lib.mjs');
  if (MODE !== 'build') throw new Error('Pushing a draft needs MAILCHIMP_MODE=build');
  const metaPath = base + '.campaign.json';
  const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
  const settings = { ...p.campaign };
  let id = meta.id;
  if (id) {
    const cur = await mc(`/campaigns/${id}`, { query: { fields: 'status' } });
    if (cur.status !== 'save') throw new Error(`Campaign ${id} is ${cur.status}, not a draft; refusing to edit`);
    await mc(`/campaigns/${id}`, { method: 'PATCH', body: { settings } });
  } else {
    const c = await mc('/campaigns', { method: 'POST', body: { type: 'regular', settings } });
    id = c.id;
    fs.writeFileSync(metaPath, JSON.stringify({ id, web_id: c.web_id, created: c.create_time }, null, 1) + '\n');
  }
  await mc(`/campaigns/${id}/content`, { method: 'PUT', body: { html } });
  const c = await mc(`/campaigns/${id}`, { query: { fields: 'id,web_id,status,settings.title,recipients.list_id' } });
  console.log('Draft saved:', c.settings.title, '| status', c.status, '| audience', c.recipients?.list_id || 'none');
}

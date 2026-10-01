// Every Mailchimp Marketing API (v3) call goes through mc(). Mirrors the route guard in lib.mjs:
// anything not explicitly allowed is blocked before it leaves the machine.
//
// Modes (MAILCHIMP_MODE env var, default 'audit'):
//   audit  GET only. Everything else is blocked.
//   build  GET, plus creating/editing drafts and test sends to MAILCHIMP_TEST_EMAILS only.
// In every mode, NEVER actions are blocked unless the call passes confirm: '<METHOD> <path>' exactly,
// which scripts only do after James has confirmed that specific action in chat.

// Node's fetch only honours HTTPS_PROXY when NODE_USE_ENV_PROXY=1; without it, cloud sessions are refused.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== '1')
  throw new Error('Run with NODE_USE_ENV_PROXY=1 (e.g. npm run mc:audit) so fetch goes through the proxy');

const KEY = process.env.MAILCHIMP_API_KEY;
if (!KEY || !KEY.includes('-')) throw new Error('MAILCHIMP_API_KEY missing or malformed (expected <key>-<dc>)');
const DC = KEY.split('-').pop();
const BASE = `https://${DC}.api.mailchimp.com/3.0`;
const AUTH = 'Basic ' + Buffer.from('anystring:' + KEY).toString('base64');

export const MODE = process.env.MAILCHIMP_MODE || 'audit';
const TEST_EMAILS = (process.env.MAILCHIMP_TEST_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// Sending/scheduling, starting/pausing automations and journeys, permanent deletes.
export const NEVER_PATH = /\/actions\/(send|schedule|unschedule|resend|replicate-and-send|start|pause|start-all-emails|pause-all-emails|delete-permanent|trigger)\b|\/journeys\/\d+\/steps\/\d+\/actions\/trigger/;
// Batches and batch webhooks can carry any operation inside them, so they never go through.
const BATCH = /^\/(batches|batch-webhooks)(\/|$)/;
// Member writes that unsubscribe, clean or archive someone.
const BAD_MEMBER_STATUS = new Set(['unsubscribed', 'cleaned', 'archived']);

function guard(method, path, body, confirm) {
  const sig = `${method} ${path}`;
  const confirmed = confirm === sig;
  if (method === 'GET') return;
  if (NEVER_PATH.test(path) || method === 'DELETE' || BATCH.test(path)) {
    if (confirmed) return console.log('CONFIRMED', sig);
    throw new Error(`BLOCKED (never without confirmation): ${sig}`);
  }
  if (/\/members(\/|$)/.test(path) && body && (BAD_MEMBER_STATUS.has(body.status) || BAD_MEMBER_STATUS.has(body.status_if_new) ||
      (Array.isArray(body.members) && body.members.some(m => BAD_MEMBER_STATUS.has(m.status))))) {
    if (confirmed) return console.log('CONFIRMED', sig);
    throw new Error(`BLOCKED (never without confirmation): ${sig} sets status ${body.status || body.status_if_new || 'in bulk'}`);
  }
  if (MODE !== 'build') throw new Error(`BLOCKED (${MODE} mode is GET only): ${sig}`);
  if (/\/actions\/test$/.test(path)) {
    const to = (body?.test_emails || []).map(e => e.toLowerCase());
    if (!to.length || !TEST_EMAILS.length || to.some(e => !TEST_EMAILS.includes(e)))
      throw new Error(`BLOCKED: test send only to MAILCHIMP_TEST_EMAILS: ${sig}`);
    return console.log('TEST SEND', sig);
  }
  console.log('WRITE', sig);
}

export async function mc(path, { method = 'GET', query, body, confirm } = {}) {
  method = method.toUpperCase();
  if (!path.startsWith('/')) path = '/' + path;
  guard(method, path.split('?')[0], body, confirm);
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined) url.searchParams.set(k, v);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method,
      headers: { Authorization: AUTH, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt < 4) { await new Promise(r => setTimeout(r, 2000 * 2 ** attempt)); continue; }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { title: 'Non-JSON response', detail: text.slice(0, 200) }; }
    if (!res.ok) {
      const err = new Error(`${method} ${path} -> ${res.status} ${data?.title || ''}: ${data?.detail || ''}`.replaceAll(KEY, '[key]'));
      err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  }
}

// Fetches every page of a collection. `key` is the array field (e.g. 'campaigns', 'lists').
export async function mcAll(path, key, query = {}, pageSize = 500) {
  const out = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await mc(path, { query: { ...query, count: pageSize, offset } });
    out.push(...(page[key] || []));
    if (!page[key]?.length || out.length >= (page.total_items ?? 0)) return out;
  }
}

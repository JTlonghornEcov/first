// Read-only Mailchimp account audit. Run: node scripts/mailchimp-audit.mjs [months=24]
// Writes marketing/audit/raw-<date>.json (gitignored: list settings, from addresses, member-level stats are
// aggregated in memory but the raw API objects can still carry contact details) and
// marketing/audit/summary-<date>.json (aggregate numbers only, safe to commit).
import fs from 'node:fs';
import { mc, mcAll, MODE } from './mailchimp-lib.mjs';

if (MODE !== 'audit') throw new Error('Run the audit in audit mode (GET only)');
const months = Number(process.argv[2] || 24);
const today = new Date().toISOString().slice(0, 10);
const since = new Date(Date.now() - months * 30.44 * 864e5).toISOString();
const dir = new URL('../marketing/audit/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });

const soft = async (fn, fallback = null) => { try { return await fn(); } catch (e) { return { error: e.message, ...(fallback || {}) }; } };
const pct = (a, b) => (b ? +(100 * a / b).toFixed(2) : null);
const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (k === '_links' ? undefined : v)));

const raw = { generated: new Date().toISOString(), months };
raw.ping = await mc('/ping');
raw.account = strip(await mc('/'));
console.log('Account OK:', raw.account.account_name);

// Audiences
raw.lists = strip(await mcAll('/lists', 'lists'));
const hashesByList = {};
for (const l of raw.lists) {
  const p = `/lists/${l.id}`;
  console.log('List', l.name);
  l.merge_fields = strip(await mcAll(`${p}/merge-fields`, 'merge_fields'));
  l.interest_categories = strip(await mcAll(`${p}/interest-categories`, 'categories'));
  for (const c of l.interest_categories) c.interests = strip(await mcAll(`${p}/interest-categories/${c.id}/interests`, 'interests'));
  l.segments = strip(await mcAll(`${p}/segments`, 'segments', { include_cleaned: true, include_transactional: true, include_unsubscribed: true }));
  l.signup_forms = strip(await soft(() => mc(`${p}/signup-forms`)));
  l.growth_history = strip(await mcAll(`${p}/growth-history`, 'history', {}, 100));
  l.activity = strip(await soft(() => mc(`${p}/activity`, { query: { count: 180 } })));
  l.webhooks = (await soft(() => mc(`${p}/webhooks`)))?.webhooks?.length ?? null;

  // Member-level engagement, aggregated here; individual records are never written to disk.
  const members = await mcAll(`${p}/members`, 'members', {
    fields: 'members.id,members.status,members.member_rating,members.timestamp_opt,members.last_changed,members.source,members.stats,members.tags_count,members.vip,members.location.country_code,total_items',
  }, 1000);
  hashesByList[l.id] = new Set(members.filter(m => m.status === 'subscribed').map(m => m.id));
  const subs = members.filter(m => m.status === 'subscribed');
  const by = (arr, f) => arr.reduce((o, m) => { const k = f(m) ?? 'unknown'; o[k] = (o[k] || 0) + 1; return o; }, {});
  l.member_summary = {
    total_records: members.length,
    by_status: by(members, m => m.status),
    subscribed_by_rating: by(subs, m => m.member_rating),
    subscribed_by_source: by(subs, m => m.source),
    subscribed_by_country: Object.fromEntries(Object.entries(by(subs, m => m.location?.country_code || null)).sort((a, b) => b[1] - a[1]).slice(0, 10)),
    subscribed_zero_open_rate: subs.filter(m => (m.stats?.avg_open_rate ?? 0) === 0).length,
    subscribed_zero_click_rate: subs.filter(m => (m.stats?.avg_click_rate ?? 0) === 0).length,
    subscribed_rating_1_or_2: subs.filter(m => m.member_rating <= 2).length,
    subscribed_opted_in_by_year: by(subs, m => (m.timestamp_opt || '').slice(0, 4) || null),
  };
}
const ids = Object.keys(hashesByList);
raw.list_overlap = [];
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
  const [a, b] = [hashesByList[ids[i]], hashesByList[ids[j]]];
  raw.list_overlap.push({ a: ids[i], b: ids[j], shared_subscribed: [...a].filter(h => b.has(h)).length });
}
raw.unique_subscribed_across_lists = new Set(Object.values(hashesByList).flatMap(s => [...s])).size;

// Campaigns + reports
raw.campaigns = strip(await mcAll('/campaigns', 'campaigns', { since_create_time: since, sort_field: 'create_time', sort_dir: 'DESC' }, 200));
raw.reports = strip(await mcAll('/reports', 'reports', { since_send_time: since }, 200));
for (const r of raw.reports) {
  r.top_links = strip((await soft(() => mc(`/reports/${r.id}/click-details`, { query: { count: 20, sort_field: 'total_clicks', sort_dir: 'DESC' } })))?.urls_clicked || []);
  r.domain_performance = strip((await soft(() => mc(`/reports/${r.id}/domain-performance`)))?.domains || []);
}
console.log('Campaigns', raw.campaigns.length, 'reports', raw.reports.length);

// Automations (classic). Customer Journeys have no list endpoint in API v3; noted in the report.
raw.automations = strip(await mcAll('/automations', 'automations'));
for (const a of raw.automations) a.emails = strip((await soft(() => mc(`/automations/${a.id}/emails`)))?.emails || []);

// Templates, domains, misc
raw.templates = strip(await mcAll('/templates', 'templates', { type: 'user' }));
raw.template_folders = strip(await mcAll('/template-folders', 'folders'));
raw.verified_domains = strip(await soft(() => mc('/verified-domains')));
raw.landing_pages = strip(await soft(() => mcAll('/landing-pages', 'landing_pages')));
raw.connected_sites = strip(await soft(() => mcAll('/connected-sites', 'sites')));
raw.ecommerce_stores = strip(await soft(() => mcAll('/ecommerce/stores', 'stores')));
raw.facebook_ads = null; // not relevant for this account
fs.writeFileSync(new URL(`raw-${today}.json`, dir), JSON.stringify(raw, null, 1));

// ---------- Aggregate summary (committable) ----------
const sent = raw.reports.filter(r => r.type !== 'automation' && r.emails_sent > 0);
const camp = sent.map(r => {
  const d = new Date(r.send_time);
  const delivered = r.emails_sent - (r.bounces.hard_bounces + r.bounces.soft_bounces + r.bounces.syntax_errors);
  return {
    id: r.id, title: r.campaign_title, subject: r.subject_line, list: r.list_name, send_time: r.send_time,
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Europe/London' }),
    hour_uk: +d.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/London' }),
    sent: r.emails_sent, delivered,
    open_rate: +(100 * r.opens.open_rate).toFixed(2), unique_opens: r.opens.unique_opens,
    click_rate: +(100 * r.clicks.click_rate).toFixed(2), unique_clicks: r.clicks.unique_subscriber_clicks,
    ctor: pct(r.clicks.unique_subscriber_clicks, r.opens.unique_opens),
    unsub_rate: pct(r.unsubscribed, r.emails_sent), unsubs: r.unsubscribed,
    bounce_rate: pct(r.bounces.hard_bounces + r.bounces.soft_bounces, r.emails_sent), hard_bounces: r.bounces.hard_bounces,
    abuse: r.abuse_reports,
    top_links: r.top_links.slice(0, 5).map(u => ({ url: u.url, clicks: u.total_clicks, unique: u.unique_clicks })),
  };
});
const sum = (a, k) => a.reduce((s, x) => s + (x[k] || 0), 0);
const agg = a => ({
  campaigns: a.length, sent: sum(a, 'sent'),
  open_rate: pct(sum(a, 'unique_opens'), sum(a, 'delivered')),
  click_rate: pct(sum(a, 'unique_clicks'), sum(a, 'delivered')),
  ctor: pct(sum(a, 'unique_clicks'), sum(a, 'unique_opens')),
  unsub_rate: pct(sum(a, 'unsubs'), sum(a, 'sent')),
  hard_bounce_rate: pct(sum(a, 'hard_bounces'), sum(a, 'sent')),
});
const group = (a, f) => Object.fromEntries(Object.entries(a.reduce((o, x) => ((o[f(x)] ||= []).push(x), o), {})).map(([k, v]) => [k, agg(v)]));
const linkTotals = {};
for (const c of camp) for (const l of c.top_links) {
  const u = l.url.split('?')[0];
  linkTotals[u] = (linkTotals[u] || 0) + l.unique;
}
const summary = {
  generated: raw.generated, window_months: months,
  account: { name: raw.account.account_name, plan: raw.account.pricing_plan_type, total_subscribers: raw.account.total_subscribers,
    industry: raw.account.account_industry, industry_stats: raw.account.industry_stats, timezone: raw.account.account_timezone,
    member_since: raw.account.member_since, last_login: raw.account.last_login },
  lists: raw.lists.map(l => ({
    id: l.id, name: l.name, created: l.date_created, double_optin: l.double_optin, has_welcome: l.has_welcome,
    gdpr: l.marketing_permissions, visibility: l.visibility, email_type_option: l.email_type_option,
    use_archive_bar: l.use_archive_bar, stats: l.stats,
    merge_fields: l.merge_fields.map(f => ({ tag: f.tag, name: f.name, type: f.type, required: f.required, public: f.public })),
    interest_groups: l.interest_categories.map(c => ({ title: c.title, type: c.type, interests: c.interests.map(i => ({ name: i.name, subscribers: i.subscriber_count })) })),
    segments: l.segments.map(s => ({ name: s.name, type: s.type, members: s.member_count, updated: s.updated_at })),
    signup_forms: l.signup_forms?.signup_forms?.length ?? 0,
    growth_history: l.growth_history.map(g => ({ month: g.month, existing: g.existing, imports: g.imports, optins: g.optins, subscribed: g.subscribed, unsubscribed: g.unsubscribed, cleaned: g.cleaned })),
    webhooks: l.webhooks, member_summary: l.member_summary,
  })),
  list_overlap: raw.list_overlap, unique_subscribed_across_lists: raw.unique_subscribed_across_lists,
  campaigns_total: agg(camp),
  campaigns_by_quarter: group(camp, c => c.send_time.slice(0, 4) + 'Q' + (Math.floor(+c.send_time.slice(5, 7) / 3.01) + 1)),
  campaigns_by_month: group(camp, c => c.send_time.slice(0, 7)),
  campaigns_by_weekday: group(camp, c => c.weekday),
  campaigns_by_hour_uk: group(camp, c => String(c.hour_uk).padStart(2, '0')),
  campaigns_by_list: group(camp, c => c.list),
  campaigns: camp,
  drafts_or_unsent: raw.campaigns.filter(c => c.status !== 'sent').map(c => ({ title: c.settings?.title, status: c.status, created: c.create_time, type: c.type })),
  top_links: Object.entries(linkTotals).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([url, unique]) => ({ url, unique })),
  automations: raw.automations.map(a => ({
    title: a.settings?.title, status: a.status, created: a.create_time, started: a.start_time, list: a.recipients?.list_name,
    trigger: a.trigger_settings?.workflow_type, emails_sent: a.emails_sent,
    emails: a.emails.map(e => ({ subject: e.settings?.subject_line, status: e.status, position: e.position, delay: e.delay, sent: e.emails_sent,
      open_rate: e.report_summary?.open_rate, click_rate: e.report_summary?.click_rate, send_time: e.send_time })),
  })),
  templates: raw.templates.map(t => ({ name: t.name, created: t.date_created, edited: t.date_edited, active: t.active, drag_and_drop: t.drag_and_drop, folder: t.folder_id, responsive: t.responsive })),
  verified_domains: raw.verified_domains?.domains?.map(d => ({ domain: d.domain, verified: d.verified, authenticated: d.authenticated })) ?? raw.verified_domains,
  from_identities: [...new Set(raw.campaigns.map(c => `${c.settings?.from_name} <${c.settings?.reply_to}>`))],
  landing_pages: Array.isArray(raw.landing_pages) ? raw.landing_pages.length : raw.landing_pages,
  connected_sites: Array.isArray(raw.connected_sites) ? raw.connected_sites.length : raw.connected_sites,
};
fs.writeFileSync(new URL(`summary-${today}.json`, dir), JSON.stringify(summary, null, 1));
console.log('Wrote', `marketing/audit/raw-${today}.json`, 'and', `summary-${today}.json`);

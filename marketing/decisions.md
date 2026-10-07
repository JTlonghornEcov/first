# Decisions log

## 2026-10-01
- Mailchimp work runs through `scripts/mailchimp-lib.mjs`. Audit phase is GET only. Sends, schedules, deletes,
  member unsubscribes/archives, batches and automation start/pause need James's explicit confirmation of the specific action.
- Test sends will only go to addresses in `MAILCHIMP_TEST_EMAILS` (to be set to James's address).
- Raw audit data is gitignored; only aggregate stats are committed.
- Network policy updated to allow `us12.api.mailchimp.com`. Node fetch needs `NODE_USE_ENV_PROXY=1` in cloud sessions;
  the wrapper enforces it and `npm run mc:audit` sets it.
- First audit run: see `audit-2026-10-01.md`. Nothing changed in the account.
- Measure email by clicks and booked calls, not opens (MPP and link scanners inflate opens).

## 2026-10-07
- Monthly bulletin agreed as the regular send. Built October 2026 bulletin from James's PDF as a Mailchimp draft
  (campaign 5610becb24, no audience). Content in `payloads/mailchimp/bulletin-2026-10.json`, rendered by
  `scripts/mailchimp-bulletin.mjs`; James adds the audience and sends manually.
- Nation of sale / self-managed waste line toned down: grace period extended, data still to be reported and kept on record.
- Custom footer reason line replaces the audience permission reminder ("opted in via our website"), which isn't true for imports.
- Bulletin finalised: Kosovo piece cleared by policy team, PRN audit CTA → /request-free-prn-audit, phone 01865 502176.
- Email header uses the website logo (dist/images/logo.svg) reversed to white for the teal header; uploaded to Mailchimp
  file manager, source in `payloads/mailchimp/assets/`.

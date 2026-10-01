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

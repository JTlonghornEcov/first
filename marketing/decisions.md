# Decisions log

## 2026-10-01
- Mailchimp work runs through `scripts/mailchimp-lib.mjs`. Audit phase is GET only. Sends, schedules, deletes,
  member unsubscribes/archives, batches and automation start/pause need James's explicit confirmation of the specific action.
- Test sends will only go to addresses in `MAILCHIMP_TEST_EMAILS` (to be set to James's address).
- Raw audit data is gitignored; only aggregate stats are committed.
- Audit blocked: the cloud environment's network policy denies `us12.api.mailchimp.com`. Waiting for the host to be allowed.

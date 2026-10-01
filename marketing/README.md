# Marketing workspace (Mailchimp)

Read this folder at the start of every session: it is how context carries over.

- `brief.md`: goals, audiences and voice as agreed with James. Anything marked *proposed* is not yet agreed.
- `decisions.md`: dated log of decisions. Newest at the bottom.
- `audit-YYYY-MM-DD.md`: account audit reports.
- `audit/summary-*.json`: aggregate audit numbers (committed). `audit/raw-*.json` is gitignored because it can hold contact details.

## Scripts
- `scripts/mailchimp-lib.mjs`: the only way scripts talk to Mailchimp. `MAILCHIMP_MODE=audit` (default) is GET only;
  `build` allows drafts and test sends to `MAILCHIMP_TEST_EMAILS`. Sending, scheduling, deleting, unsubscribing/archiving
  members, batches and starting/pausing automations stay blocked unless James confirms that exact action in chat.
- `npm run mc:audit -- [months]` (scripts/mailchimp-audit.mjs): read-only audit; writes `marketing/audit/raw-<date>.json` and `summary-<date>.json`.

The API key lives in `MAILCHIMP_API_KEY` only. Never print, log or commit it.

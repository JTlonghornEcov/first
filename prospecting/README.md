# EPR prospecting pipeline

Finds large UK packaging producers on Defra's EPR public register, rolls subsidiaries up to
their parent company, then reads each parent's latest Companies House accounts. It flags
parents whose accounts mention EPR, extended producer responsibility or packaging costs.

```
Defra public register CSV
   └─ step1_register.py ──► data/parents.csv            one row per large parent company
                        └─► data/large_producers.csv    every large row, tagged with its parent
                                │
   Companies House API ◄────────┘
   └─ step2_companies_house.py ──► data/accounts_flags.csv   latest accounts + keyword flags
                                │
   └─ step3_linkedin.py ──► data/linkedin/                   LinkedIn company lists by tier
```

For who to target inside these companies and how to set up the campaign, see
[LINKEDIN_TARGETING.md](LINKEDIN_TARGETING.md).

## Status

| Piece | State |
| --- | --- |
| Step 1 | **Run on the real 2026 register (8 Oct 2026):** 12,065 rows; 13 cancelled dropped; 11,225 large rows grouped into **7,167 parent companies**, 79 of them without a Companies House number |
| Step 2 code + tests | Built and tested against a simulated Companies House |
| Step 2 real run | **First 10 parents (8 Oct 2026):** all 10 matched and their latest accounts downloaded. 5 iXBRL filings scanned, none flagged. 5 are image-only scanned PDFs (no text layer), marked for manual checking |

## Setup

```bash
cd prospecting
pip install -r requirements.txt
sudo apt install poppler-utils tesseract-ocr   # OCR for scanned PDF accounts (optional)
cp .env.example .env        # then paste your Companies House API key into .env
```

Get a free key at https://developer.company-information.service.gov.uk/ (create an
application, then add a **REST** API key). `.env` is git-ignored, so the key never gets
committed. You can also set `COMPANIES_HOUSE_API_KEY` as an environment variable instead.

Network access needed: `report-packaging-data.defra.gov.uk`,
`api.company-information.service.gov.uk`, `document-api.company-information.service.gov.uk`.
Documents are downloaded through a redirect to an Amazon S3 address
(`*.s3.eu-west-2.amazonaws.com`). In a Claude Code cloud session, add these to the
environment's allowed domains.

## The real register file (2026)

Saved from the "2026 register of producers" link on the public-register page. Notes:

- The first 3 lines are a title, "All agencies" and a "Report created at…" timestamp. The
  script finds the real header row automatically.
- Columns: `Organisation name, Companies House number, Producer Registration Number,
  Organisation ID, Subsidiary ID, Name of compliance scheme, Large/Small, Address line 1,
  Address line 2, Town, County, Country, Postcode, Subject to recycling and certification
  obligations, Required to pay disposal fee, Cancellation date`.
- `Large/Small` is `L` or `S`. Small producers are on the register too (829 rows in 2026).
- Groups: each subsidiary shares its parent's `Organisation ID` and has its own
  `Subsidiary ID`. The parent's row has a blank `Subsidiary ID`.
- A row with a `Cancellation date` has left the register and is dropped.
- There are no parent-name columns or nation column, so the "explicit parent columns" rule
  below isn't used for this file.
- Specsavers is the biggest group by far (1,274 subsidiaries: its separately registered
  stores), so subsidiary count isn't a straight measure of company size.

## Step 1: register → large parent companies

```bash
python step1_register.py                             # download the latest CSV from Defra
python step1_register.py --input ~/Downloads/x.csv   # or use a file you downloaded yourself
python step1_register.py --url <direct CSV link>     # or point at a specific file
python step1_register.py --input x.csv --show-columns   # check column detection only
```

What it does:

1. **Download.** Opens the public-register page, lists every CSV link it finds and downloads
   the newest-looking one (the highest year in the link) into `data/raw/register_<date>.csv`.
2. **Detect columns.** Matches the CSV's headers against `COLUMN_CANDIDATES` in `config.py`.
   Name and size columns are required. If they aren't found, it stops and prints the real
   headers, and you add them to `config.py`.
3. **Group.** It picks the first rule that the file supports:
   - *Explicit parent columns* (for example "Parent company name/number"): rows sharing a
     parent go together. Rows with no parent are their own parent.
   - *Organisation ID + Subsidiary ID*: this is how EPR group registrations work. Every
     row with the same organisation ID is one group, and the row with no subsidiary ID is
     the parent.
   - *Neither*: each row stands alone. A warning is printed.
4. **Filter.** A group is kept if **any** of its rows has a size containing "large".
   Under EPR, size is assessed for the whole group, so subsidiaries can have a blank size.
5. **De-duplicate.** A parent appearing more than once (for example once directly and once
   through a compliance scheme) is kept once per Companies House number.
6. **Normalise.** Companies House numbers are padded to 8 characters (`123456` → `00123456`,
   `SC1234` → `SC001234`).

Output columns in `parents.csv`: `parent_name, companies_house_number, parent_inferred,
nation, town, postcode, compliance_scheme, organisation_id, register_rows, subsidiary_count,
subsidiary_names, subsidiary_companies_house_numbers, pays_disposal_fee, recycling_obligation,
group_key`.

`parent_inferred = yes` means the register had no row for the parent itself. Either every
row in the group was a subsidiary, or the parent was only named in a parent column. Check
these by hand.

## Step 2: Companies House accounts screen

```bash
python step2_companies_house.py --limit 10      # test on the first 10
python step2_companies_house.py --sample 150    # fixed test sample spread across group sizes
python step2_companies_house.py                 # everything (resumes if interrupted)
python step2_companies_house.py --only 01234567 09876543
python step2_companies_house.py --refresh       # redo companies already processed
```

For each parent:

1. **Find the company.** It uses the register's Companies House number. If there isn't
   one, it searches by name and accepts only an exact match after tidying ("Limited" =
   "Ltd", "&" = "and"). It never guesses; anything else becomes an error row to check by
   hand.
2. **Profile.** Gets the company name, status and last accounts date.
3. **Latest accounts.** Takes the newest filing in the `accounts` category that has a
   document.
4. **Download.** Prefers the iXBRL/XHTML version, which is clean text, and falls back to
   the PDF. Files are cached in `data/cache/`, so reruns don't download again.
5. **Scan.** Counts matches for each keyword in `KEYWORDS` (`config.py`) and keeps up to 3
   snippets of the surrounding text:
   - `epr`: "EPR" as a whole word, capitals only, so "representative" doesn't count
   - `extended_producer_responsibility`
   - `packaging_costs`: "packaging cost" or "packaging costs"
6. **OCR scanned PDFs.** About half of filings are scanned images with no text. These are
   read with OCR (`pdftoppm` + `tesseract`, 4 pages in parallel, up to 80 pages), shown as
   `document_format = pdf (ocr)`. The OCR text is cached beside the PDF. Without those tools
   installed, or if OCR still finds almost no text, the company is marked as an error, *not*
   as "no mention", so nothing gets wrongly ruled out.

`--sample N` picks a fixed (seeded) random sample. Each band of group size (0, 1–4, 5–19,
20+ subsidiaries) gets places in proportion to the square root of its size, so the few big
groups are represented. Results go into the same `accounts_flags.csv`, so a later full run
skips them.

Output columns in `accounts_flags.csv`: `flagged` (yes/no), `hits_<keyword>` counts,
`snippets`, `accounts_made_up_to`, `filing_date`, `accounts_type`, `document_format`,
`filing_history_url` (opens the company's filings in a browser) and `error`. A non-empty
`error` means the company needs checking by hand.

Timing: about 15 seconds a company on average (OCR'd filings take longer), so the full list
of ~7,200 parents takes about 30 hours and roughly 6 GB of cached documents.

Requests are spaced 0.6s apart to stay under Companies House's limit of 600 requests per
5 minutes. Each company takes about 4 requests, so roughly 400 companies take 15 minutes.
Results are saved after every company. Rerunning skips companies already done and retries
those that errored.

## Step 3: LinkedIn targeting files

```bash
python step3_linkedin.py              # company lists by tier
python step3_linkedin.py --officers   # plus current directors of the companies step 2 screened
```

Tiers each group: **A** if its accounts mention EPR or packaging costs (step 2), **B** if any
company in the group pays the EPR disposal fee (register), otherwise **C**. Every company in
a group (parent, subsidiaries up to 25, trading names) becomes a row in LinkedIn's
company-list upload format. Details in [LINKEDIN_TARGETING.md](LINKEDIN_TARGETING.md).

Step 1 now keeps the register's `Required to pay disposal fee` and `Subject to recycling and
certification obligations` columns as `pays_disposal_fee` / `recycling_obligation` in
`parents.csv` (yes if any company in the group says yes).

## First real run: checklist

1. `python step1_register.py --show-columns` and check that each field maps to the right
   header. Add any new header names to `COLUMN_CANDIDATES`.
2. Check that the "Grouping strategy" line says what you'd expect. Spot-check a few
   well-known groups in `parents.csv`.
3. `python step2_companies_house.py --limit 10`, then open a few flagged and unflagged
   filings via `filing_history_url` to sanity-check the keywords.

## Tests

```bash
python -m unittest discover -s tests -t .
```

`tests/fixtures/` has small made-up registers covering both grouping styles. The Step 2
tests use a fake Companies House, so they run offline without a key.

## Extending it

- **More keywords:** add entries to `KEYWORDS` in `config.py`, for example
  `"plastic_packaging_tax": (r"plastic\s+packaging\s+tax", False)`. Hit-count columns are
  added automatically. Run with `--refresh` to rescan; cached documents mean no
  re-downloading.
- **Score prospects:** join `accounts_flags.csv` to `parents.csv` on `group_key` and
  rank by hits, subsidiary count or nation.
- **Officers / contacts:** Companies House `/company/{number}/officers` lists directors.
  Add a call in `process_parent`.
- **Screen subsidiaries too:** their numbers are in `subsidiary_companies_house_numbers`.
- **CRM export:** the output CSVs are plain files, ready to import into monday.com or
  similar.

## Files

| File | Purpose |
| --- | --- |
| `config.py` | Paths, column names, size markers, keywords, rate limit |
| `step1_register.py` | Download, filter and group the Defra register |
| `step2_companies_house.py` | Companies House lookup and accounts keyword scan |
| `step3_linkedin.py` | LinkedIn company lists, tiers, compliance-scheme exclusions, directors |
| `LINKEDIN_TARGETING.md` | Who to target and how to set up the campaign |
| `tests/` | Offline tests and sample registers |
| `data/parents.csv`, `data/large_producers.csv` | Step 1 output (committed) |
| `data/raw/`, `data/cache/` | Downloaded register and accounts. Git-ignored |

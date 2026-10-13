# SEO and technical review: custom HTML pages

Pages reviewed (all **disabled**, public URL returns 404):

| Page | Entry | URL when published |
| --- | --- | --- |
| UK EPR concept | 10879 | `/uk-epr-concept-test` |
| EU interactive map | 10894 | `/eu-map-test` |
| LinkedIn Challenge preview | 10955 | `/linkedin-challenge-preview` |
| Services hub | 11013 | `/services-hub-test` |

Also checked: `/services/ppwr-compliance-design` (live, built the same way earlier).

Method: real-browser tests through the CMS preview at 1440, 1024, 768, 375 and 320px; every link and image fetched;
layout shift and largest-paint measured; WCAG AA contrast measured on every text element; page `<head>`, sitemap and
robots.txt inspected.

## Summary

| # | Risk | Severity | Status |
| --- | --- | --- | --- |
| 1 | Design wiped if anyone opens the page in the CMS editor and clicks Save | **High** | Mitigated (health check + source in Git); proper fix needs EXP |
| 2 | Test pages indexable if enabled by mistake | High | **Fixed**: `noindex, nofollow` on all three |
| 3 | UK EPR concept duplicates the live UK EPR page's copy | High (if both live) | **Fixed**: canonical points to the live page |
| 4 | LinkedIn page is internal content on a public website | High (if published) | Needs a decision; noindex applied |
| 5 | Placeholder (lorem ipsum) content on the map page | Medium | Contained: page disabled and noindex |
| 6 | Text contrast below WCAG AA on the LinkedIn page | Medium | **Fixed**: 9 failures → 0 |
| 7 | Live page `/services/ppwr-compliance-design`: two H1s, indexable, in sitemap | **High (live now)** | **Needs your decision** |
| 8 | Inline `<style>`/`<script>` in page body | Low | Accepted; disappears with an EXP code block |
| 9 | Map country details sit in hidden panels | Low–medium | Recommendation for when real content lands |
| 10 | `:has()` CSS used for map selection states | Low | Graceful fallback; documented |
| 11 | Future Content-Security-Policy would block inline code | Low | Documented for EXP |
| 12 | Page weight (map) | Low | Acceptable: 51 KB compressed |
| 13 | Meta descriptions empty | Low (test pages) | To write before publishing |

## Details

### 1. CMS editor can wipe the design (High)
The CMS editor for General Content cannot represent this HTML: on load it strips `<style>`, `<script>`, SVG, classes,
ids and even bullet lists. If anyone opens one of these entries and clicks **Save**, the page reverts to unstyled text
and the map, calculator, notes and jump links stop working, with no warning.

Mitigation in place:
- The full source of every page lives in Git (`payloads/…`, `tools/map/build-map.mjs`) with save scripts that rebuild
  the page in one step.
- `scripts/check-custom-pages.mjs` verifies every page's design markers, scripts, jump targets, single H1, noindex and
  public status. Run it after any CMS change; it can run on a schedule and alert on failure.

Proper fix (EXP): a **Custom HTML block** with a plain code field (no CKEditor). This removes the risk entirely and
lets the shared CSS move into the site stylesheet.

### 2. Indexing of test pages (fixed)
All three pages now output `<meta name="robots" content="noindex, nofollow">` via the SEO field, so even if one is
enabled by mistake it stays out of search results. None of the three is in the XML sitemap (checked).
Remove the noindex only when a page is approved to go live.

### 3. Duplicate content (fixed)
The UK EPR concept reuses most of the live UK EPR page's wording. Its canonical URL now points to
`/compliance/uk-extended-producer-responsibility-epr`, so search engines treat the live page as the original.
If the concept replaces the live page, publish it **on the live entry** (same URL) rather than as a second page.

### 4. Internal content on a public site (decision needed)
The LinkedIn Challenge page is marked "Internal" and contains staff-only rules. A disabled page is not public, but if
it were enabled it would be reachable by anyone with the link; noindex keeps it out of search but not private.
Options: keep it as a preview only, host it on an intranet, or ask EXP for a password-protected section.

### 5. Placeholder content (contained)
The map page contains lorem ipsum and placeholder statuses, clearly labelled on the page. It is disabled and noindex.
Replace all placeholders before publishing.

### 6. Contrast (fixed)
Measured against WCAG AA on every text element. UK EPR concept and map: 0 failures. LinkedIn page: 9 failures from the
original one-pager colours (pale blue labels on slate 4.08:1, grey on light grey 4.47:1, faded label on yellow
4.03:1). Fixed with minimal colour adjustments (`#86A9B9` → `#AAC5D1`, `#5d6d76` → `#58676f`, label at full
strength). Now 0 failures on all three pages.

### 7. Live PPWR design page (decision needed)
`/services/ppwr-compliance-design` is **live, indexable and in the sitemap**, built with the earlier version of this
method. It has **two identical H1s** (the template's hidden header plus the design's own), its search title reads
"PPWR compliance · design", and it has no meta description. The builder version (`/services/ppwr-compliance`) is
disabled. Options, in order of preference:
1. Disable it until it is reviewed (removes it from search; quickest).
2. Keep it live but set noindex, then fix the H1 (use the template header as the single H1) and the title/description.

### 8. Inline CSS and JavaScript in the page body (low)
Each page carries its own `<style>` and a small `<script>` inside the content. Browsers handle this fine and it is
scoped (`.evx` prefix, unique ids, no global variables, no external requests). Downsides: styles are not cached
across pages, and `<style>` in `<body>` is not strictly valid HTML. Both go away once the CSS moves into the site
stylesheet via an EXP code block.

### 9. Hidden map content (for when real content lands)
Each country's details are in a panel that is hidden until selected. Search engines do index hidden content but may
give it less weight. If country details matter for search, also give each country a visible summary (or its own page)
and link to it from the map.

### 10. `:has()` support (low)
The map uses CSS `:has()` to highlight the selected country and swap the panel's intro for the card. Supported in all
current browsers (Chrome/Edge 105+, Safari 15.4+, Firefox 121+). In older browsers the card still opens; only the
highlight and the intro swap are missing.

### 11. Content-Security-Policy (low, future)
The site currently sends no CSP header, which is why the inline scripts run. If a strict CSP is added later, inline
scripts and styles on these pages would be blocked. EXP should either allow them with nonces/hashes or move the code
into site assets at that point.

### 12. Performance
| Page | HTML (compressed) | Layout shift (desktop / phone) | Largest paint |
| --- | --- | --- | --- |
| UK EPR concept | 15 KB | 0.001 / 0.02 | 1.2 s (warm) |
| EU map | 51 KB | 0.058 / 0.065 | 1.2–1.5 s |
| LinkedIn preview | 13 KB | 0.003 / 0.000–0.09 | 1.1–1.8 s |
| Live UK EPR page (for comparison) | 10 KB | 0.019 | 2.5 s |

All layout shift recorded came from the site template's own header and hero elements (the live page shows the same);
the custom code adds none. Images below the fold load lazily with fixed dimensions. A 6.5 s first load on the UK EPR
concept was the CMS generating the hero image size for the first time, not the page itself.

### 13. Before any of these go live
- Write a meta title and description (SEO field), and add a social share image.
- Remove `noindex` only on the page being published; keep the canonical correct.
- Replace placeholders; run `scripts/check-custom-pages.mjs` and the responsive/contrast QA scripts.
- Agree that the page is edited only through the source files (until the EXP code block exists).

## Checks that passed
- Every link and image on the three pages returns 200.
- One H1 per page; logical heading order; all images have alt text (decorative ones empty by design).
- No horizontal scrolling from 1440px down to 320px.
- All jump links have targets; enquiry pre-fill, calculator and notes work with no JavaScript errors.
- Keyboard: map countries, slider and links are reachable and usable; focus is visible.

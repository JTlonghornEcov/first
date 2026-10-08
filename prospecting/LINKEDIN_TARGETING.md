# LinkedIn targeting: EPR producers

How to point a paid LinkedIn campaign at the people inside large UK packaging producers who
actually handle EPR, using the files `step3_linkedin.py` writes to `data/linkedin/`.

LinkedIn ads can't be aimed at named people unless you upload their email addresses. So the
targeting is **company list × job title**: upload the producer companies as a matched
audience, then narrow to the roles below inside those companies.

## 1. The companies (upload these)

Every list contains only **qualified** producers. Each one is:
- a large producer on the Defra register, which by definition means over £2m turnover and
  over 50 tonnes of packaging;
- **over £5m turnover**: read from its latest accounts, or "likely" because it files full,
  group or medium accounts, which only companies above the small-company thresholds do;
- **active** at Companies House, and not a compliance scheme or consultancy.

**Every large producer pays for PRNs**, not just the disposal-fee payers. Scheme members pay
through their scheme's charges, and direct registrants buy their own. So for the PRN audit,
all qualified producers are prospects. The segments decide the message, not who's in or out.

| File | What's in it | Use |
| --- | --- | --- |
| `prn_1_direct_registrants.csv` | Registered **without a compliance scheme**. The register marks them "subject to recycling and certification obligations": they buy their own PRNs and certify compliance themselves | Best fit for a free PRN audit: no scheme checking their numbers, and every tonne over-reported is PRNs they buy directly |
| `prn_2_hot.csv` | Evidence of active EPR work: accounts mention EPR, or they're advertising an EPR job (`data/job_signals.csv`) | Know their EPR bill and feel the cost |
| `prn_3_core.csv` | Every other qualified producer | The main volume |
| `prn_all_qualified.csv` | 1 + 2 + 3 together | One audience for brand awareness |
| `unverified_turnover.csv` | Small-company accounts that don't show turnover (somewhere between £2m and £15m) | **Not proven over £5m**, so kept out of the lists above. Use only if you loosen the rule |
| `exclude_compliance_schemes.csv` | Compliance schemes and EPR consultancies (Valpak, Ecosurety, Kite, Clarity, Comply Direct…) | **Exclude** on every campaign: their staff hold the same job titles but are competitors |
| `targeting_master.csv` | Every company with segment, turnover, tier, reasons and register details | Your reference, and for scoring leads (section 3); not for upload |

Each company appears in only one of files 1–3, so the campaigns don't compete for the same
people. A list needs at least 300 rows. If a segment is smaller, merge it into the next one
and keep the separate message for its ads.

Each group contributes its parent, its subsidiaries (up to 25) and any trading names as
separate rows. The packaging team normally sits in an operating company (for example
*The Plastic Box Company*), not in the holding company that heads the group
(*0404 Investments*), and the holding company often has no LinkedIn page at all.

Names have "Limited", "Ltd" and "PLC" removed, because LinkedIn pages rarely carry them.

**Before uploading:** download LinkedIn's company-list template (Campaign Manager → Plan →
Audiences → Create audience → Company list) and check its headers match the files. The files
use `companyname, companywebsite, companyemaildomain, linkedincompanypageurl, stocksymbol,
industry, city, state, companycountry, zipcode`, with the country as `GB`. Only `companyname`
is required. If the template differs, delete the columns it doesn't have.

**Match rate:** expect roughly half to two-thirds of companies to match on name and postcode
alone. Adding each company's website (`companywebsite`) is the biggest single improvement,
and is worth doing for segments 1 and 2.

## 2. The people (job-title targeting)

Target by **Job title** rather than Job function, because function is too broad here.
Seniority: Manager, Senior, Director, VP, CXO, Owner. Exclude Entry, Training, Unpaid.

### Persona 1: the people who do the EPR submission (lead audience)

They compile the packaging data, file the submissions and field the fee invoices. This is
who applies for a free data audit.

Real producer job adverts from 2025–26 (in `data/job_signals.csv`) show what these people
are actually called. Most of the work sits in **packaging** or **sustainability** teams, and
it's increasingly treated as a **data** job:

| Company | Advertised title |
| --- | --- |
| C&C Group (Tennent's, Magners, Matthew Clark) | Packaging Data Senior Specialist (EPR) |
| Kingfisher (B&Q, Screwfix) | Packaging Compliance Manager |
| OKA | Packaging Technologist (EPR and packaging waste reporting) |
| MandM Direct | Sustainability Manager (packaging EPR and Scope 3, with an external delivery partner) |
| Johnson & Johnson | Environmental Materials and EPR Program Compliance Manager |
| Hertfordshire pharma/FMCG manufacturer | Packaging Development and Compliance Manager |
| Mars, Unilever, Compleat Food | Packaging Technologist / Group Packaging Technologist |

Several of these are 9–12 month fixed-term or interim roles created after the first
reporting round. Those companies are short of capacity and unsure of their data, which is
exactly the free-audit pitch.

Titles to target:

- Packaging Technologist, Senior Packaging Technologist, Group Packaging Technologist
- Packaging Manager, Head of Packaging, Packaging Development Manager, Packaging Engineer, Packaging Lead
- Packaging Compliance Manager / Specialist / Coordinator, Packaging Development and Compliance Manager
- Packaging Data Specialist, Packaging Data Analyst, EPR Manager, EPR Specialist,
  Producer Responsibility Manager
- Sustainability Manager, Sustainability Lead, Head of Sustainability, ESG Manager,
  ESG Reporting Analyst
- Environmental Manager, Environmental Compliance Manager
- Product Compliance Manager, Regulatory Compliance Manager
- Technical Manager, Technical Director: in food and drink manufacturers the technical team
  owns packaging specifications
- SHEQ / QHSE Manager: in smaller manufacturers EPR often lands with them

Optional layer: member **Skills** such as Packaging, Sustainable Packaging, Packaging
Engineering, Environmental Compliance or Regulatory Compliance. Use it to widen reach, not to
narrow it (choose "or", not "and"). Don't use generic data skills (Excel, Power BI, Alteryx)
even though the adverts ask for them: inside a producer list they mostly reach finance and
BI teams.

### Persona 2: the people who pay for it (budget holders)

PRN costs are a P&L line, and PRN prices are up 3–4x. A gain-share audit is an easy yes for
finance: no upfront cost, and you're only paid from savings you find. That makes them a
stronger audience for this offer than for general EPR content.

- Finance Director, CFO, Financial Controller, Head of Finance
- Procurement Director, Head of Procurement, Purchasing Manager
- Supply Chain Director, Operations Director, Commercial Director

### Persona 3: single-company producers (no subsidiaries)

Single-company producers rarely employ a packaging specialist, so the work falls to senior
generalists. For the direct registrants, and qualified producers with no subsidiaries, add
Managing Director, Operations Manager and Office Manager.

### Who to leave out

- Staff of compliance schemes (exclusion list above) and EPR consultancies
- Job function **Sales**: packaging manufacturers employ many "packaging" salespeople
- Turn **Audience Expansion off**, or it drifts outside the producer list

## 3. Campaign layout for the free PRN audit

The aim is enough applications from qualified producers that you can choose the ones where
you're confident of savings. Run several campaigns, each with its own segment, so you can
see which converts and set bids separately:

| Campaign | Companies | People | Message |
| --- | --- | --- | --- |
| 1. Direct registrants | `prn_1` | Personas 1 + 2 + 3 | "You buy your own PRNs, and prices are up 3–4x. Are you buying more than you owe? Free, independent audit." |
| 2. Hot accounts | `prn_2` | Personas 1 + 2 | "Your EPR bill rests on your packaging data. Get it checked free." |
| 3a. Core: data owners | `prn_3` | Persona 1 | "Miscategorised packaging and wrong weights mean buying PRNs you don't owe. Free audit." |
| 3b. Core: budget holders | `prn_3` | Persona 2 | "No upfront cost: a free audit of your PRN obligation, paid only from savings." |
| 4. Brand awareness | `prn_all_qualified` | All personas | Blog posts, guides and the PRN price story. Retarget people who engage into campaigns 1–3 |

**Lead Gen Form questions for choosing who to audit:**
1. Roughly how many tonnes of packaging do you place on the market a year? (bands: 50–250, 250–1,000, 1,000–5,000, 5,000+)
2. Do you buy PRNs through a compliance scheme or directly?
3. How many products (SKUs) do you sell? (bands)
4. When was your packaging data last independently checked?
5. Are you mainly selling own-brand products, importing, or packing for others?

Bigger tonnage, many SKUs, imports and no recent check are where errors and savings
concentrate. When the leads come in, look each company up in `targeting_master.csv` for its
turnover, group size and segment before you reply.

**Offline conversions:** later, upload signed audits (and the savings) through LinkedIn's
offline-conversions template. That's the email / firstName / lastName / employeecompany /
title / timestamp / eventtype / amount file. LinkedIn can then optimise for companies that
actually sign, not just for form fills.

## 4. Keeping the hot list fresh

**Job adverts.** When you see a producer advertising an EPR, packaging-compliance or
packaging-data role, add a row to `data/job_signals.csv` (company, Companies House number,
title, `strong` if EPR is named, the link) and rerun `python step3_linkedin.py`. The whole
group moves to `prn_2_hot` (if it qualifies on turnover). Useful searches: "EPR" or "extended producer responsibility" or
"packaging compliance" or "packaging data" on LinkedIn Jobs, Indeed, Reed and
findajob.dwp.gov.uk. Ignore adverts from compliance schemes and consultancies. A free
Adzuna or Reed API key would let this run automatically every week.

**Accounts.** Step 2 picks up companies that book EPR as a cost. For example, Crosta &
Mollica's 2025 accounts show a £465,399 "Extended Producer Responsibility provision" for
first-year disposal fees, calculated from the tonnage data it submitted. That's a company that
knows its EPR bill and would care whether the data behind it is right.

## 5. What the test sample showed (150 random parents + 15)

- **About 4% of producers' accounts mention EPR** (6 of 162). Scaled up, a full run should
  find very roughly 150–350 groups (several hundred companies including subsidiaries). That's
  enough for the hot segment to clear LinkedIn's 300-row minimum on its own.
- **Every hit was a disposal-fee payer.** None of the 39 non-payers mentioned EPR, so a full
  accounts run can skip the non-payers.
- **Turnover:** 77% of the sample are over £5m (46% shown in their accounts, 31% likely from
  full or group accounts), 2% are under, and 20% file small-company accounts that don't show
  turnover.
- **Bigger groups mention it more often:** 2 of the 4 groups with 20+ subsidiaries (Halma,
  Specsavers), against about 4% of single companies.
- **How producers describe EPR, in their own words** (useful for ad copy):
  - Paperwork (Paper Convertors): PRN, plastic packaging tax and EPR "have placed a
    significant and increasing burden on the business, both financially and
    administratively", with the 2026 move to fees modulated by recyclability as a further
    pressure.
  - Rajapack: gross margin fell, partly from "the newly introduced Extended Producer
    Responsibility (EPR) legislation".
  - Crosta & Mollica: a £465,399 provision for first-year disposal fees, "calculated from …
    tonnage data submitted by the entity". The fee rests directly on the submitted data.
  - LOTAN: "EPR reforms are also imminent which could affect trading."

  Common themes: **cost and margin pressure, admin burden, and fees resting on submitted
  tonnage data.** These map directly to "only pay the fees you owe" and "independent check of
  your data".

## 6. Named contacts (sales outreach, not ads)

`python step3_linkedin.py --officers` lists the current directors of every company step 2 has
screened, with their stated occupation, in `data/linkedin/directors.csv`. Companies House
only knows about directors and secretaries, never the packaging technologist, so use this
for Sales Navigator look-ups and direct outreach to finance and managing directors.
Directors' names are public record. Outreach still has to follow UK GDPR and PECR
(legitimate interest, an opt-out in every message).

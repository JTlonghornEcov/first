# LinkedIn targeting: EPR producers

How to point a paid LinkedIn campaign at the people inside large UK packaging producers who
actually handle EPR, using the files `step3_linkedin.py` writes to `data/linkedin/`.

LinkedIn ads can't be aimed at named people unless you upload their email addresses. So the
targeting is **company list × job title**: upload the producer companies as a matched
audience, then narrow to the roles below inside those companies.

## 1. The companies (upload these)

| File | What's in it | Use |
| --- | --- | --- |
| `company_list_tier_A.csv` | Groups with evidence of active EPR work: their latest accounts mention EPR or packaging costs, or they're advertising an EPR job (`data/job_signals.csv`) | Hottest. Small until step 2 runs on everyone |
| `company_list_tier_B.csv` | Groups paying the EPR **disposal fee** (from the Defra register) | Main audience: they pay fees now, so an audit that checks the fee is relevant |
| `company_list_tier_C.csv` | Other large producers | Cheaper awareness / content |
| `company_list_all.csv` | A + B + C | If you'd rather run one audience |
| `exclude_compliance_schemes.csv` | Compliance schemes and EPR consultancies (Valpak, Ecosurety, Kite, Clarity, Comply Direct…) | **Exclude**: they employ lots of "EPR Data Analysts" and "Packaging Compliance" staff who match the same job titles but are competitors. They're also removed from the target lists |
| `targeting_master.csv` | Every company with tier, reasons, register details, keyword hits | Your reference; not for upload |

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
and is worth doing for tiers A and B. Lists need at least 300 rows, so fold tier A into
tier B until the full step 2 run makes it bigger.

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

The disposal fee and PRN costs are a P&L line. Their message is cost: PRN prices up 3–4x,
and they may be paying for tonnage they don't owe.

- Finance Director, CFO, Financial Controller, Head of Finance
- Procurement Director, Head of Procurement, Purchasing Manager
- Supply Chain Director, Operations Director, Commercial Director

### Persona 3: single-company producers (no subsidiaries)

Single-company producers rarely employ a packaging specialist, so the work falls to senior
generalists. For tier B groups with no subsidiaries, add Managing Director, Operations
Manager and Office Manager.

### Who to leave out

- Staff of compliance schemes (exclusion list above) and EPR consultancies
- Job function **Sales**: packaging manufacturers employ many "packaging" salespeople
- Turn **Audience Expansion off**, or it drifts outside the producer list

## 3. Suggested campaign layout

| Campaign | Companies | People | Message |
| --- | --- | --- | --- |
| 1. Data owners, hot | Tier A + B | Persona 1 | Free independent audit of your packaging data. Lead Gen Form |
| 2. Budget holders | Tier A + B | Persona 2 | You may be overpaying PRNs and EPR fees. Lead Gen Form |
| 3. Awareness | Tier C | Persona 1 | Content: blog posts and guides. Retarget engagers into campaign 1 |

Keep each audience above LinkedIn's minimum of 300 matched members. If campaign 2 comes in
under that, merge personas 1 and 2 into one campaign.

## 4. Keeping the hot list fresh

**Job adverts.** When you see a producer advertising an EPR, packaging-compliance or
packaging-data role, add a row to `data/job_signals.csv` (company, Companies House number,
title, `strong` if EPR is named, the link) and rerun `python step3_linkedin.py`. The whole
group moves to tier A. Useful searches: "EPR" or "extended producer responsibility" or
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
  enough for tier A to clear LinkedIn's 300-row minimum on its own.
- **Every hit was a disposal-fee payer.** None of the 39 non-payers mentioned EPR. That backs
  using tier B (fee payers) as the main audience, and it means a full accounts run can skip
  the non-payers.
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

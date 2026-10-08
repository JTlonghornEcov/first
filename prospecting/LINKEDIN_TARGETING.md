# LinkedIn targeting: EPR producers

How to point a paid LinkedIn campaign at the people inside large UK packaging producers who
actually handle EPR, using the files `step3_linkedin.py` writes to `data/linkedin/`.

LinkedIn ads can't be aimed at named people unless you upload their email addresses. So the
targeting is **company list × job title**: upload the producer companies as a matched
audience, then narrow to the roles below inside those companies.

## 1. The companies (upload these)

| File | What's in it | Use |
| --- | --- | --- |
| `company_list_tier_A.csv` | Groups whose latest accounts mention EPR, extended producer responsibility or packaging costs | Hottest: they already see EPR as a cost. Small until step 2 runs on everyone |
| `company_list_tier_B.csv` | Groups paying the EPR **disposal fee** (from the Defra register) | Main audience: they pay fees now, so an audit that checks the fee is relevant |
| `company_list_tier_C.csv` | Other large producers | Cheaper awareness / content |
| `company_list_all.csv` | A + B + C | If you'd rather run one audience |
| `exclude_compliance_schemes.csv` | Compliance scheme operators (Valpak, Ecosurety, Wastepack…) | **Exclude**: competitors and partners, not buyers |
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

- Packaging Technologist, Senior Packaging Technologist
- Packaging Manager, Head of Packaging, Packaging Development Manager, Packaging Engineer
- Packaging Compliance Manager / Specialist / Coordinator
- EPR Manager, EPR Lead, EPR Specialist, Packaging Data Analyst
- Sustainability Manager, Sustainability Lead, Head of Sustainability, ESG Manager
- Environmental Manager, Environmental Compliance Manager
- Product Compliance Manager, Regulatory Compliance Manager
- Technical Manager, Technical Director: in food and drink manufacturers the technical team
  owns packaging specifications
- SHEQ / QHSE Manager: in smaller manufacturers EPR often lands with them

Optional layer: member **Skills** such as Packaging, Sustainable Packaging, Packaging
Engineering, Environmental Compliance or Regulatory Compliance. Use it to widen reach, not to
narrow it (choose "or", not "and").

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

## 4. Named contacts (sales outreach, not ads)

`python step3_linkedin.py --officers` lists the current directors of every company step 2 has
screened, with their stated occupation, in `data/linkedin/directors.csv`. Companies House
only knows about directors and secretaries, never the packaging technologist, so use this
for Sales Navigator look-ups and direct outreach to finance and managing directors.
Directors' names are public record. Outreach still has to follow UK GDPR and PECR
(legitimate interest, an opt-out in every message).

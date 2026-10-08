"""Step 3: LinkedIn targeting files from the register (step 1) and accounts screen (step 2).

    python step3_linkedin.py                  # company lists for every large producer group
    python step3_linkedin.py --officers       # also list current directors of screened companies

Writes to data/linkedin/:
    company_list_tier_A.csv   accounts mention EPR or packaging costs (screened companies only)
    company_list_tier_B.csv   pays the EPR disposal fee
    company_list_tier_C.csv   other large producers
    company_list_all.csv      A + B + C in one upload
    exclude_compliance_schemes.csv   scheme operators, to exclude (competitors, not buyers)
    targeting_master.csv      every company with its tier, reasons and register details
    directors.csv             (--officers) current directors of each screened parent

Each upload file has LinkedIn's company-list headers. Every company in a group gets its own
row (parent, subsidiaries and trading names, up to 25 subsidiaries a group), because the packaging team usually sits in an
operating company, not the holding company that heads the group.
"""

import argparse
import re
import sys

import pandas as pd

import config

LINKEDIN_DIR = config.DATA_DIR / "linkedin"
UPLOAD_COLUMNS = ["companyname", "companywebsite", "companyemaildomain", "linkedincompanypageurl",
                  "stocksymbol", "industry", "city", "state", "companycountry", "zipcode"]
COUNTRY = "GB"
LEGAL_SUFFIX = re.compile(r"[\s,.]+(limited|ltd\.?|plc|p\.l\.c\.|llp|lp|uk ltd|\(uk\) ltd)$", re.IGNORECASE)
SCHEME_REGION = re.compile(r"\s*\((EA|SEPA|NRW|NIEA|NI|Wales|Scotland|England)\)\s*$", re.IGNORECASE)
MAX_SUBSIDIARIES_PER_GROUP = 25  # Specsavers alone registers ~1,270 stores; its page is "Specsavers"
TIERS = {"A": "accounts mention EPR or packaging costs", "B": "pays the EPR disposal fee",
         "C": "other large producer"}


def linkedin_name(name):
    """LinkedIn pages rarely carry "Limited", so strip legal suffixes before matching."""
    name = " ".join(str(name).split())
    stripped = LEGAL_SUFFIX.sub("", name).strip(" ,.")
    return stripped or name


def load_optional(path):
    return pd.read_csv(path, dtype=str, keep_default_na=False) if path.exists() else pd.DataFrame()


def assign_tiers(parents, flags):
    flagged = set(flags.loc[flags.get("flagged", pd.Series(dtype=str)) == "yes", "group_key"]) if not flags.empty else set()
    screened = set(flags.loc[flags.get("error", pd.Series(dtype=str)) == "", "group_key"]) if not flags.empty else set()

    def tier(row):
        if row["group_key"] in flagged:
            return "A"
        return "B" if row.get("pays_disposal_fee") == "yes" else "C"

    parents = parents.copy()
    parents["tier"] = parents.apply(tier, axis=1)
    parents["tier_reason"] = parents["tier"].map(TIERS)
    parents["accounts_screened"] = parents["group_key"].map(lambda k: "yes" if k in screened else "")
    return parents


def build_master(parents, members, flags):
    parents = assign_tiers(parents, flags)
    keep = ["group_key", "parent_name", "tier", "tier_reason", "pays_disposal_fee", "recycling_obligation",
            "accounts_screened", "subsidiary_count", "compliance_scheme"]
    if not flags.empty:
        hit_cols = [c for c in flags.columns if c.startswith("hits_")]
        parents = parents.merge(flags[["group_key", *hit_cols, "filing_history_url"]], on="group_key", how="left")
        keep += [*hit_cols, "filing_history_url"]
    group_info = parents[keep]

    # large_producers.csv has every company in each group, keyed by the parent's name/number.
    members = members.copy()
    members["group_key"] = members["organisation_id"].map(lambda o: f"ORG:{o}" if o else "")
    by_number = dict(zip(parents["companies_house_number"], parents["group_key"]))
    no_org = members["group_key"] == ""
    members.loc[no_org, "group_key"] = members.loc[no_org, "parent_companies_house_number"].map(by_number).fillna("")

    members["_subsidiary_rank"] = members.groupby("group_key").cumcount()
    members = members[(members["is_parent"] == "yes") | (members["_subsidiary_rank"] <= MAX_SUBSIDIARIES_PER_GROUP)]

    rows = []
    for m in members.to_dict("records"):
        role = "parent" if m.get("is_parent") == "yes" else "subsidiary"
        base = {"group_key": m["group_key"], "registered_name": m["name"],
                "companies_house_number": m["companies_house_number"], "town": " ".join(m["town"].split()),
                "postcode": m["postcode"], "nation": m.get("nation", "")}
        rows.append({**base, "companyname": linkedin_name(m["name"]), "role": role})
        if m.get("trading_name") and m["trading_name"].strip().lower() != m["name"].strip().lower():
            rows.append({**base, "companyname": linkedin_name(m["trading_name"]), "role": f"{role} trading name"})

    master = pd.DataFrame(rows).merge(group_info, on="group_key", how="inner")
    # A company can sit in more than one group (or repeat as its own trading name):
    # keep it once, in its best tier.
    master["_key"] = master["companyname"].str.upper().str.replace(r"[^A-Z0-9]", "", regex=True)
    master = (master.sort_values(["tier", "role"]).drop_duplicates("_key")
              .drop(columns="_key").sort_values(["tier", "parent_name", "role", "companyname"]))
    return master.reset_index(drop=True), parents


def to_upload(frame):
    out = pd.DataFrame({"companyname": frame["companyname"], "city": frame["town"],
                        "companycountry": COUNTRY, "zipcode": frame["postcode"]})
    return out.reindex(columns=UPLOAD_COLUMNS).fillna("")


def scheme_exclusions(parents):
    names = {SCHEME_REGION.sub("", s).strip() for s in parents["compliance_scheme"] if s.strip()}
    return pd.DataFrame({"companyname": sorted(names)}).reindex(columns=UPLOAD_COLUMNS).fillna("")


def fetch_directors(parents, flags):
    """Current directors of each screened parent, from Companies House (public record)."""
    import step2_companies_house as s2

    client = s2.CompaniesHouseClient(s2.load_api_key())
    screened = flags[flags["companies_house_number"] != ""]
    tiers = dict(zip(parents["group_key"], parents["tier"]))
    rows = []
    for i, company in enumerate(screened.to_dict("records"), 1):
        number = company["companies_house_number"]
        data = client.get_json(f"/company/{number}/officers",
                               params={"items_per_page": 100, "register_view": "false"}) or {}
        current = [o for o in data.get("items", []) if not o.get("resigned_on")]
        for officer in current:
            rows.append({
                "parent_name": company["parent_name"], "companies_house_number": number,
                "tier": tiers.get(company["group_key"], ""), "officer_name": officer.get("name", ""),
                "officer_role": officer.get("officer_role", ""), "occupation": officer.get("occupation", ""),
                "appointed_on": officer.get("appointed_on", ""),
            })
        print(f"[{i}/{len(screened)}] {company['parent_name']}: {len(current)} current officers")
    return pd.DataFrame(rows)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--officers", action="store_true",
                        help="Also fetch current directors of companies screened in step 2")
    args = parser.parse_args(argv)

    if not config.PARENTS_CSV.exists():
        sys.exit("Run step1_register.py first.")
    parents = pd.read_csv(config.PARENTS_CSV, dtype=str, keep_default_na=False)
    if "pays_disposal_fee" not in parents.columns:
        sys.exit("parents.csv has no pays_disposal_fee column: rerun step1_register.py.")
    members = pd.read_csv(config.LARGE_PRODUCERS_CSV, dtype=str, keep_default_na=False)
    flags = load_optional(config.ACCOUNTS_FLAGS_CSV)

    master, parents = build_master(parents, members, flags)
    LINKEDIN_DIR.mkdir(parents=True, exist_ok=True)
    master.to_csv(LINKEDIN_DIR / "targeting_master.csv", index=False)
    for tier in TIERS:
        to_upload(master[master["tier"] == tier]).to_csv(LINKEDIN_DIR / f"company_list_tier_{tier}.csv", index=False)
    to_upload(master).to_csv(LINKEDIN_DIR / "company_list_all.csv", index=False)
    scheme_exclusions(parents).to_csv(LINKEDIN_DIR / "exclude_compliance_schemes.csv", index=False)

    print(f"{len(master)} companies across {master['group_key'].nunique()} groups:")
    for tier, reason in TIERS.items():
        part = master[master["tier"] == tier]
        note = "  (under LinkedIn's 300-row minimum: merge into B)" if 0 < len(part) < 300 else ""
        print(f"  Tier {tier} ({reason}): {part['group_key'].nunique()} groups, {len(part)} companies{note}")

    if args.officers:
        if flags.empty:
            sys.exit("No accounts_flags.csv yet: run step 2 first.")
        directors = fetch_directors(parents, flags)
        directors.to_csv(LINKEDIN_DIR / "directors.csv", index=False)
        print(f"{len(directors)} current officers written to directors.csv")
    print(f"Files in {LINKEDIN_DIR}")


if __name__ == "__main__":
    main()

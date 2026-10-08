"""Step 1: Defra EPR packaging public register -> large producers grouped under their parent.

    python step1_register.py                      # download from Defra, then process
    python step1_register.py --input file.csv     # process a CSV you downloaded yourself
    python step1_register.py --input file.csv --show-columns   # just show column detection

Writes data/parents.csv (one row per parent) and data/large_producers.csv (every large row,
tagged with its parent). See README.md for the grouping rules.
"""

import argparse
import csv
import re
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

import pandas as pd

import config


def normalise_header(text):
    return re.sub(r"[^a-z0-9]", "", str(text).lower())


def normalise_ch_number(value):
    """Companies House numbers are 8 characters: digits zero-padded, or a 2-letter prefix
    (SC, NI, OC...) plus 6 digits. Registers often drop the leading zeros."""
    if value is None or pd.isna(value):
        return ""
    text = re.sub(r"\s", "", str(value)).upper()
    if text.endswith(".0"):  # spreadsheet tools sometimes turn numbers into floats
        text = text[:-2]
    if not text or text in {"NAN", "NONE", "N/A", "NA", "-"}:
        return ""
    if text.isdigit():
        return text.zfill(8)
    match = re.fullmatch(r"([A-Z]{2})(\d{1,6})", text)
    if match:
        return match.group(1) + match.group(2).zfill(6)
    return text


def clean(value):
    if value is None or pd.isna(value):
        return ""
    return str(value).strip()


def detect_columns(headers):
    """Map our field names to the CSV's actual headers using config.COLUMN_CANDIDATES."""
    by_norm = {}
    for header in headers:
        by_norm.setdefault(normalise_header(header), header)
    mapping = {}
    for field, candidates in config.COLUMN_CANDIDATES.items():
        for candidate in candidates:
            header = by_norm.get(normalise_header(candidate))
            if header is not None and header not in mapping.values():
                mapping[field] = header
                break
    return mapping


# --- download ---------------------------------------------------------------

class _LinkCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []  # (href, text)
        self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._href = dict(attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._href is not None:
            self.links.append((self._href, " ".join("".join(self._text).split())))
            self._href = None


def find_csv_links(html, base_url):
    """Return candidate CSV download links, newest-looking first."""
    parser = _LinkCollector()
    parser.feed(html)
    found = []
    for href, text in parser.links:
        blob = f"{href} {text}".lower()
        if ".csv" in blob or "csv" in text.lower() or "download" in blob:
            years = [int(y) for y in re.findall(r"20\d\d", f"{href} {text}")]
            found.append((max(years, default=0), urljoin(base_url, href), text))
    found.sort(key=lambda item: item[0], reverse=True)
    return [(url, text) for _, url, text in found]


def download_register(url=None):
    import requests

    config.RAW_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers["User-Agent"] = "Ecoveritas prospecting pipeline"
    target = url or config.REGISTER_PAGE_URL
    response = session.get(target, timeout=60)
    response.raise_for_status()

    if "html" in response.headers.get("Content-Type", "").lower():
        links = find_csv_links(response.text, response.url)
        if not links:
            sys.exit(f"No CSV download link found on {target}. Download the CSV in a browser and "
                     "rerun with --input <file>, or pass the direct link with --url.")
        print("CSV links found on the page (newest first):")
        for link, text in links:
            print(f"  {text or '(no text)'}: {link}")
        target = links[0][0]
        print(f"Downloading {target}")
        response = session.get(target, timeout=300)
        response.raise_for_status()

    path = config.RAW_DIR / f"register_{date.today().isoformat()}.csv"
    path.write_bytes(response.content)
    print(f"Saved raw register to {path}")
    return path


# --- processing -------------------------------------------------------------

def find_header_row(lines):
    """The Defra file starts with a few title lines; the header is the first line that
    contains a recognised organisation-name column."""
    names = {normalise_header(c) for c in config.COLUMN_CANDIDATES["name"]}
    for index, line in enumerate(lines[:50]):
        fields = next(csv.reader([line]), [])
        if len(fields) > 2 and any(normalise_header(f) in names for f in fields):
            return index
    return 0


def read_register(path):
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            lines = Path(path).read_text(encoding=encoding).splitlines()
        except UnicodeDecodeError:
            continue
        header_row = find_header_row(lines)
        return pd.read_csv(path, dtype=str, keep_default_na=False, encoding=encoding,
                           skiprows=header_row)
    sys.exit(f"Could not decode {path} as UTF-8 or Windows-1252")


def yes_no(value):
    """The register's yes/no columns are typed by hand ("YES", "Y", "No ", "Np"): keep "yes" or ""."""
    return "yes" if clean(value).lower().startswith("y") else ""


def is_large(size_value):
    value = clean(size_value).lower()
    return value in config.LARGE_SIZE_VALUES or "large" in value


def build_groups(df, cols):
    """Return (rows, strategy): rows is a list of dicts, one per register row, with group keys."""
    def get(row, field):
        header = cols.get(field)
        return clean(row[header]) if header else ""

    if "parent_name" in cols or "parent_companies_house_number" in cols:
        strategy = "explicit parent columns"
    elif "organisation_id" in cols:
        strategy = "shared organisation ID" + (" + subsidiary ID" if "subsidiary_id" in cols else "")
    else:
        strategy = "none (each row is its own parent)"

    rows = []
    for index, row in df.iterrows():
        record = {
            "row": index,
            "name": get(row, "name"),
            "trading_name": get(row, "trading_name"),
            "companies_house_number": normalise_ch_number(get(row, "companies_house_number")),
            "size": get(row, "size"),
            "organisation_id": get(row, "organisation_id"),
            "subsidiary_id": get(row, "subsidiary_id"),
            "nation": get(row, "nation"),
            "compliance_scheme": get(row, "compliance_scheme"),
            "address": get(row, "address"),
            "town": get(row, "town"),
            "postcode": get(row, "postcode"),
            "registration_number": get(row, "registration_number"),
            "cancellation_date": get(row, "cancellation_date"),
            "recycling_obligation": yes_no(get(row, "recycling_obligation")),
            "disposal_fee": yes_no(get(row, "disposal_fee")),
        }
        if config.EXCLUDE_CANCELLED and record["cancellation_date"]:
            continue
        own_key = record["companies_house_number"] or "NAME:" + record["name"].upper()

        if strategy == "explicit parent columns":
            parent_ch = normalise_ch_number(get(row, "parent_companies_house_number"))
            parent_name = get(row, "parent_name")
            if parent_ch:
                record["group_key"] = parent_ch
            elif parent_name:
                record["group_key"] = "NAME:" + parent_name.upper()
            else:
                record["group_key"] = own_key
            record["declared_parent_name"] = parent_name
            record["declared_parent_ch"] = parent_ch
        elif record["organisation_id"]:
            record["group_key"] = "ORG:" + record["organisation_id"]
        else:
            record["group_key"] = own_key
        rows.append(record)
    return rows, strategy


def pick_parent(members):
    """Choose the row that represents the parent company of a group."""
    declared_ch = next((m.get("declared_parent_ch") for m in members if m.get("declared_parent_ch")), "")
    declared_name = next((m.get("declared_parent_name") for m in members if m.get("declared_parent_name")), "")
    if declared_ch:
        match = next((m for m in members if m["companies_house_number"] == declared_ch), None)
        if match:
            return match, False
        return {"name": declared_name, "companies_house_number": declared_ch}, True
    if declared_name:
        match = next((m for m in members if m["name"].upper() == declared_name.upper()), None)
        if match:
            return match, False
        return {"name": declared_name, "companies_house_number": ""}, True
    # Organisation ID grouping: the parent is the row without a subsidiary ID.
    non_subsidiary = [m for m in members if not m["subsidiary_id"]]
    if non_subsidiary:
        return non_subsidiary[0], False
    return members[0], True


def summarise(rows):
    groups = {}
    for record in rows:
        groups.setdefault(record["group_key"], []).append(record)

    parents, members_out = [], []
    for key, members in groups.items():
        if not any(is_large(m["size"]) for m in members):
            continue
        parent, inferred = pick_parent(members)
        parent_ch = parent.get("companies_house_number", "")
        subsidiaries = [m for m in members if m is not parent
                        and not (parent_ch and m["companies_house_number"] == parent_ch)]
        sub_names = sorted({m["name"] for m in subsidiaries if m["name"]})
        sub_numbers = sorted({m["companies_house_number"] for m in subsidiaries if m["companies_house_number"]})
        parents.append({
            "parent_name": parent.get("name", ""),
            "companies_house_number": parent_ch,
            "parent_inferred": "yes" if inferred else "",
            "nation": parent.get("nation", ""),
            "town": parent.get("town", ""),
            "postcode": parent.get("postcode", ""),
            "compliance_scheme": parent.get("compliance_scheme", ""),
            "organisation_id": parent.get("organisation_id", ""),
            "register_rows": len(members),
            "subsidiary_count": len(sub_names),
            "subsidiary_names": "; ".join(sub_names),
            "subsidiary_companies_house_numbers": "; ".join(sub_numbers),
            # Yes if any company in the group is flagged, since EPR obligations are assessed group-wide.
            "pays_disposal_fee": "yes" if any(m.get("disposal_fee") for m in members) else "",
            "recycling_obligation": "yes" if any(m.get("recycling_obligation") for m in members) else "",
            "group_key": key,
        })
        for m in members:
            members_out.append({
                "parent_name": parent.get("name", ""),
                "parent_companies_house_number": parent_ch,
                "is_parent": "yes" if m is parent else "",
                **{k: m[k] for k in ("name", "trading_name", "companies_house_number", "size",
                                     "organisation_id", "subsidiary_id", "nation",
                                     "compliance_scheme", "address", "town", "postcode",
                                     "registration_number", "disposal_fee", "recycling_obligation")},
            })

    parents_df = pd.DataFrame(parents)
    if not parents_df.empty:
        # The same parent can appear under more than one group (e.g. registered both directly
        # and through a compliance scheme). Keep one row per Companies House number.
        with_number = parents_df[parents_df["companies_house_number"] != ""]
        without = parents_df[parents_df["companies_house_number"] == ""]
        with_number = (with_number.sort_values("subsidiary_count", ascending=False)
                       .drop_duplicates("companies_house_number"))
        parents_df = pd.concat([with_number, without]).sort_values("parent_name", key=lambda s: s.str.upper())
    return parents_df, pd.DataFrame(members_out)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", type=Path, help="Use this register CSV instead of downloading")
    parser.add_argument("--url", help="Direct CSV link (or page URL) to download instead of the default page")
    parser.add_argument("--show-columns", action="store_true", help="Print the CSV headers and detected mapping, then stop")
    args = parser.parse_args(argv)

    path = args.input or download_register(args.url)
    df = read_register(path)
    cols = detect_columns(df.columns)

    print(f"{len(df)} rows, columns: {list(df.columns)}")
    print("Detected mapping:")
    for field in config.COLUMN_CANDIDATES:
        print(f"  {field:32} <- {cols.get(field, '(not found)')}")
    if args.show_columns:
        return

    missing = [f for f in ("name", "size") if f not in cols]
    if missing:
        sys.exit(f"Could not find column(s) for {missing}. Add the real header names to "
                 "COLUMN_CANDIDATES in config.py and rerun.")
    if "companies_house_number" not in cols:
        print("WARNING: no Companies House number column found; step 2 will have to search by name.")

    rows, strategy = build_groups(df, cols)
    print(f"Grouping strategy: {strategy}")
    if len(rows) < len(df):
        print(f"Dropped {len(df) - len(rows)} cancelled registrations.")
    parents_df, members_df = summarise(rows)

    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    parents_df.to_csv(config.PARENTS_CSV, index=False)
    members_df.to_csv(config.LARGE_PRODUCERS_CSV, index=False)

    no_number = int((parents_df["companies_house_number"] == "").sum()) if not parents_df.empty else 0
    print(f"{len(members_df)} large-producer rows grouped into {len(parents_df)} parent companies "
          f"({no_number} without a Companies House number).")
    print(f"Wrote {config.PARENTS_CSV} and {config.LARGE_PRODUCERS_CSV}")


if __name__ == "__main__":
    main()

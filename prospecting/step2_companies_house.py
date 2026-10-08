"""Step 2: Companies House lookup for each parent company -> latest accounts -> keyword flags.

    export COMPANIES_HOUSE_API_KEY=...            # or put it in prospecting/.env
    python step2_companies_house.py               # every parent in data/parents.csv
    python step2_companies_house.py --limit 10    # first 10 only (a good first test)
    python step2_companies_house.py --only 01234567
    python step2_companies_house.py --refresh     # redo companies already in the output

Writes data/accounts_flags.csv, one row per parent, saved after every company so an
interrupted run picks up where it left off. Downloaded accounts are cached in data/cache/.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path

import pandas as pd

import config

PREFERRED_FORMATS = [("application/xhtml+xml", "xhtml"), ("application/pdf", "pdf")]
MIN_TEXT_CHARS = 500  # less than this from a PDF means it's a scan

OUTPUT_COLUMNS = [
    "parent_name", "companies_house_number", "match_method", "ch_company_name", "company_status",
    "accounts_made_up_to", "filing_date", "accounts_type", "document_format", "text_chars",
    "flagged", "epr_amount", *[f"hits_{k}" for k in config.KEYWORDS], "snippets", "filing_history_url",
    "subsidiary_count", "error", "group_key",
]


def load_api_key():
    key = os.environ.get(config.CH_API_KEY_ENV, "").strip()
    env_file = config.ROOT / ".env"
    if not key and env_file.exists():
        for line in env_file.read_text().splitlines():
            name, _, value = line.partition("=")
            if name.strip() == config.CH_API_KEY_ENV:
                key = value.strip().strip("'\"")
    if not key:
        sys.exit(f"No API key. Set {config.CH_API_KEY_ENV} or add it to {env_file}")
    return key


class CompaniesHouseClient:
    def __init__(self, api_key, session=None, min_interval=config.CH_MIN_SECONDS_BETWEEN_REQUESTS):
        import requests

        self.session = session or requests.Session()
        self.session.auth = (api_key, "")  # API key is the username, password is blank
        self.min_interval = min_interval
        self._last = 0.0

    def get(self, url, accept="application/json", params=None):
        if url.startswith("/"):
            url = config.CH_API_BASE + url
        for attempt in range(5):
            wait = self.min_interval - (time.monotonic() - self._last)
            if wait > 0:
                time.sleep(wait)
            self._last = time.monotonic()
            response = self.session.get(url, params=params, headers={"Accept": accept}, timeout=120)
            if response.status_code == 429:
                print("  rate limited, waiting 60s")
                time.sleep(60)
                continue
            if response.status_code == 401:
                sys.exit("Companies House rejected the API key (401). Check it is a REST API key.")
            if response.status_code == 404:
                return None
            if response.status_code >= 500 and attempt < 4:
                time.sleep(2 ** attempt)
                continue
            response.raise_for_status()
            return response
        raise RuntimeError(f"Gave up on {url} after repeated rate limiting")

    def get_json(self, url, params=None):
        response = self.get(url, params=params)
        return response.json() if response is not None else None


# --- company matching -------------------------------------------------------

def normalise_company_name(name):
    text = re.sub(r"[^A-Z0-9 ]", " ", name.upper().replace("&", " AND "))
    text = re.sub(r"\bPUBLIC LIMITED COMPANY\b", "PLC", text)
    text = re.sub(r"\bLIMITED\b", "LTD", text)
    text = re.sub(r"\bTHE\b", " ", text)
    return " ".join(text.split())


def find_company_by_name(client, name):
    """Only accept a search result whose normalised name matches exactly; never guess."""
    data = client.get_json("/search/companies", params={"q": name, "items_per_page": 10}) or {}
    target = normalise_company_name(name)
    matches = [item for item in data.get("items", [])
               if normalise_company_name(item.get("title", "")) == target]
    active = [m for m in matches if m.get("company_status") == "active"]
    chosen = active or matches
    return chosen[0]["company_number"] if len(chosen) == 1 else ""


# --- accounts document ------------------------------------------------------

def latest_accounts_filing(client, number):
    data = client.get_json(f"/company/{number}/filing-history",
                           params={"category": "accounts", "items_per_page": 25}) or {}
    items = [i for i in data.get("items", []) if i.get("links", {}).get("document_metadata")]
    items.sort(key=lambda i: i.get("date", ""), reverse=True)
    return items[0] if items else None


def document_id(metadata_url):
    return metadata_url.rstrip("/").split("/")[-1]


def fetch_accounts_document(client, filing, number):
    """Download the filing's document (iXBRL preferred, else PDF), using the cache when possible.
    Returns (path, format)."""
    doc_id = document_id(filing["links"]["document_metadata"])
    config.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    for _, ext in PREFERRED_FORMATS:
        cached = config.CACHE_DIR / f"{number}_{doc_id}.{ext}"
        if cached.exists() and cached.stat().st_size > 0:
            return cached, ext

    doc_url = f"{config.CH_API_BASE.replace('://api.', '://document-api.')}/document/{doc_id}"
    metadata = client.get_json(doc_url) or {}
    resources = metadata.get("resources", {})
    for mime, ext in PREFERRED_FORMATS:
        if mime in resources:
            # Companies House answers with a redirect to a short-lived download link.
            response = client.get(f"{doc_url}/content", accept=mime)
            if response is None:
                continue
            path = config.CACHE_DIR / f"{number}_{doc_id}.{ext}"
            path.write_bytes(response.content)
            return path, ext
    return None, ""


class _TextCollector(HTMLParser):
    SKIP = {"script", "style", "head"}

    def __init__(self):
        super().__init__()
        self.parts, self._skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag.split(":")[-1] in self.SKIP:
            self._skip += 1

    def handle_endtag(self, tag):
        if tag.split(":")[-1] in self.SKIP and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def ocr_available():
    return config.OCR_ENABLED and all(shutil.which(tool) for tool in ("pdftoppm", "tesseract"))


def _ocr_page(path, page, workdir):
    image = Path(workdir) / f"p{page}"
    subprocess.run(["pdftoppm", "-r", str(config.OCR_DPI), "-gray", "-tiff", "-singlefile",
                    "-f", str(page), "-l", str(page), str(path), str(image)],
                   check=True, capture_output=True)
    # One thread per tesseract: with several pages in parallel, its default threading
    # oversubscribes the CPU and a 3-second page takes minutes.
    done = subprocess.run(["tesseract", f"{image}.tif", "-", "--dpi", str(config.OCR_DPI), "-l", "eng"],
                          check=True, capture_output=True, env={**os.environ, "OMP_THREAD_LIMIT": "1"})
    return done.stdout.decode("utf-8", errors="replace")


def ocr_pdf(path, page_count):
    """OCR a scanned PDF, caching the text beside it so reruns don't repeat the work."""
    cached = path.with_suffix(".ocr.txt")
    if cached.exists():
        return cached.read_text(encoding="utf-8")
    pages = range(1, min(page_count, config.OCR_MAX_PAGES) + 1)
    with tempfile.TemporaryDirectory() as workdir, ThreadPoolExecutor(config.OCR_WORKERS) as pool:
        text = " ".join(pool.map(lambda page: _ocr_page(path, page, workdir), pages))
    cached.write_text(text, encoding="utf-8")
    return text


def extract_text(path, fmt):
    """Returns (text, method): method is "ocr" when the PDF had no text layer and was OCR'd."""
    method = "text"
    if fmt == "xhtml":
        parser = _TextCollector()
        parser.feed(path.read_text(encoding="utf-8", errors="replace"))
        text = " ".join(parser.parts)
    else:
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        text = " ".join(page.extract_text() or "" for page in reader.pages)
        if len(text.strip()) < MIN_TEXT_CHARS and ocr_available():
            text, method = ocr_pdf(path, len(reader.pages)), "ocr"
    return " ".join(text.split()), method


def scan_text(text):
    hits, snippets = {}, []
    for name, (pattern, case_sensitive) in config.KEYWORDS.items():
        regex = re.compile(pattern, 0 if case_sensitive else re.IGNORECASE)
        found = list(regex.finditer(text))
        hits[name] = len(found)
        for match in found[:config.MAX_SNIPPETS]:
            start = max(0, match.start() - config.SNIPPET_CHARS)
            end = min(len(text), match.end() + config.SNIPPET_CHARS)
            snippets.append(f"[{name}] …{text[start:end]}…")
    return hits, snippets


EPR_AMOUNT = re.compile(
    r"(?:\bEPR\b|[Ee]xtended\s+[Pp]roducer\s+[Rr]esponsibility)[^£\n]{0,%d}?"
    r"(£\s?\d[\d,.]*(?:\s?(?:m|million|k|bn)\b)?|\b\d{1,3}(?:,\d{3})+\b)" % config.EPR_AMOUNT_WINDOW)


def find_epr_amount(text):
    """First money amount shortly after an EPR mention, e.g. "£465,399" or "£1.2m"."""
    match = EPR_AMOUNT.search(text)
    if not match:
        return ""
    amount = match.group(1).replace(" ", "")
    return amount if amount.startswith("£") else f"£{amount}"


# --- per-company pipeline ---------------------------------------------------

def process_parent(client, parent):
    number = str(parent.get("companies_house_number") or "").strip()
    result = {
        "parent_name": parent.get("parent_name", ""),
        "companies_house_number": number,
        "match_method": "register" if number else "",
        "subsidiary_count": parent.get("subsidiary_count", ""),
        "group_key": parent.get("group_key", ""),
        "error": "",
    }
    try:
        if not number:
            number = find_company_by_name(client, result["parent_name"])
            if not number:
                result["error"] = "no Companies House number in register and no exact name match"
                return result
            result.update(companies_house_number=number, match_method="name search")
        result["filing_history_url"] = f"{config.CH_WEB_BASE}/company/{number}/filing-history"

        profile = client.get_json(f"/company/{number}")
        if profile is None:
            result["error"] = "company not found at Companies House"
            return result
        result["ch_company_name"] = profile.get("company_name", "")
        result["company_status"] = profile.get("company_status", "")
        result["accounts_made_up_to"] = profile.get("accounts", {}).get("last_accounts", {}).get("made_up_to", "")

        filing = latest_accounts_filing(client, number)
        if filing is None:
            result["error"] = "no accounts filing with a document"
            return result
        result["filing_date"] = filing.get("date", "")
        result["accounts_type"] = filing.get("description", "")
        made_up = filing.get("description_values", {}).get("made_up_date")
        if made_up:
            result["accounts_made_up_to"] = made_up

        path, fmt = fetch_accounts_document(client, filing, number)
        if path is None:
            result["error"] = "accounts document not available as XHTML or PDF"
            return result
        result["document_format"] = fmt

        text, method = extract_text(path, fmt)
        if method == "ocr":
            result["document_format"] = "pdf (ocr)"
        result["text_chars"] = len(text)
        if len(text) < MIN_TEXT_CHARS:
            result["error"] = "little or no text extracted (probably a scanned PDF): check manually"
            return result

        hits, snippets = scan_text(text)
        for name, count in hits.items():
            result[f"hits_{name}"] = count
        result["flagged"] = "yes" if any(n for k, n in hits.items() if k not in config.WEAK_KEYWORDS) else "no"
        result["snippets"] = "\n".join(snippets)
        result["epr_amount"] = find_epr_amount(text)
    except Exception as exc:  # keep going; one bad company shouldn't stop the run
        result["error"] = f"{type(exc).__name__}: {exc}"
    return result


SIZE_BANDS = [(0, 0, "0"), (1, 4, "1-4"), (5, 19, "5-19"), (20, 10**9, "20+")]


def size_band(subsidiary_count):
    count = int(subsidiary_count or 0)
    return next(label for low, high, label in SIZE_BANDS if low <= count <= high)


def stratified_sample(parents, n, seed):
    """A test sample spread across group sizes. Each subsidiary-count band gets places in
    proportion to the square root of its size, so the few big groups aren't all left out
    (a plain random sample of 150 would likely have no 20+ groups). Same seed, same sample."""
    frame = pd.DataFrame(parents)
    frame["size_band"] = frame["subsidiary_count"].map(size_band)
    bands = frame.groupby("size_band", sort=False)
    weights = bands.size() ** 0.5
    quota = (weights / weights.sum() * n).round().astype(int).clip(upper=bands.size())
    picked = [group.sample(quota[band], random_state=seed) for band, group in bands]
    return pd.concat(picked).sort_values("parent_name").to_dict("records")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", type=Path, default=config.PARENTS_CSV)
    parser.add_argument("--output", type=Path, default=config.ACCOUNTS_FLAGS_CSV)
    parser.add_argument("--limit", type=int, help="Process at most this many parents")
    parser.add_argument("--only", nargs="+", help="Only these Companies House numbers")
    parser.add_argument("--refresh", action="store_true", help="Reprocess parents already in the output")
    parser.add_argument("--sample", type=int, help="Process a fixed test sample of this many parents, spread across group sizes")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for --sample")
    args = parser.parse_args(argv)

    if not args.input.exists():
        sys.exit(f"{args.input} not found. Run step1_register.py first.")
    parents = pd.read_csv(args.input, dtype=str, keep_default_na=False).to_dict("records")
    if args.only:
        wanted = set(args.only)
        parents = [p for p in parents if p.get("companies_house_number") in wanted]
    if args.sample:
        parents = stratified_sample(parents, args.sample, args.seed)

    done = {}
    if args.output.exists() and not args.refresh:
        for row in pd.read_csv(args.output, dtype=str, keep_default_na=False).to_dict("records"):
            done[row["group_key"]] = row

    todo = [p for p in parents if p.get("group_key") not in done or done[p["group_key"]].get("error")]
    already_done = len(parents) - len(todo)
    if args.limit:
        todo = todo[:args.limit]
    print(f"{len(parents)} parents, {already_done} already done, processing {len(todo)}")

    client = CompaniesHouseClient(load_api_key())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    for i, parent in enumerate(todo, 1):
        result = process_parent(client, parent)
        done[result["group_key"]] = result
        status = result["error"] or f"flagged={result.get('flagged')}"
        print(f"[{i}/{len(todo)}] {result['parent_name']} ({result['companies_house_number'] or '-'}): {status}")
        pd.DataFrame(list(done.values())).reindex(columns=OUTPUT_COLUMNS).to_csv(args.output, index=False)

    results = pd.DataFrame(list(done.values())).reindex(columns=OUTPUT_COLUMNS).fillna("")
    if not results.empty:
        flagged = int((results["flagged"] == "yes").sum())
        errors = int((results["error"] != "").sum())
        print(f"Done. {flagged} flagged, {errors} need manual checking. Results in {args.output}")


if __name__ == "__main__":
    main()

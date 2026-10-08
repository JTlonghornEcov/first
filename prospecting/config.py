"""Settings shared by the prospecting pipeline. Edit here rather than in the step scripts."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
CACHE_DIR = DATA_DIR / "cache"

PARENTS_CSV = DATA_DIR / "parents.csv"
LARGE_PRODUCERS_CSV = DATA_DIR / "large_producers.csv"
ACCOUNTS_FLAGS_CSV = DATA_DIR / "accounts_flags.csv"

# --- Step 1: Defra EPR packaging public register ---------------------------

REGISTER_PAGE_URL = "https://report-packaging-data.defra.gov.uk/public-register"

# Header names we accept for each field, compared after lower-casing and stripping
# everything except letters and digits ("Companies House Number" -> "companieshousenumber").
# If Defra renames a column, add the new name here. Run step 1 with --show-columns to
# see what the file actually contains.
COLUMN_CANDIDATES = {
    "name": ["organisation name", "organisationname", "producer name", "company name",
             "registered name", "name"],
    "trading_name": ["trading name", "tradingname"],
    "companies_house_number": ["companies house number", "company number",
                               "companies house registration number", "registration number",
                               "company registration number"],
    "size": ["large/small", "organisation size", "producer size", "size", "producer type", "organisation type"],
    "organisation_id": ["organisation id", "organisationid", "org id", "producer id",
                        "rpd organisation id", "organisation reference"],
    "subsidiary_id": ["subsidiary id", "subsidiaryid"],
    "parent_name": ["parent company name", "parent organisation name", "holding company name",
                    "parent name", "group name"],
    "parent_companies_house_number": ["parent company companies house number",
                                      "parent companies house number", "parent company number",
                                      "holding company number"],
    "nation": ["nation", "nation of enrolment", "home nation", "regulator nation"],
    "compliance_scheme": ["name of compliance scheme", "compliance scheme", "compliance scheme name"],
    "registration_number": ["producer registration number"],
    "town": ["town", "city"],
    "postcode": ["postcode", "post code"],
    "cancellation_date": ["cancellation date"],
    "address": ["registered address", "address", "registered office address"],
}

# A row is "large" if its size value is one of these, or contains "large" (case-insensitive).
# The Defra register uses "L" / "S".
LARGE_SIZE_VALUES = ["l", "large"]

# Rows with a cancellation date have left the register, so they're dropped.
EXCLUDE_CANCELLED = True

# --- Step 2: Companies House ------------------------------------------------

CH_API_BASE = "https://api.company-information.service.gov.uk"
CH_WEB_BASE = "https://find-and-update.company-information.service.gov.uk"
CH_API_KEY_ENV = "COMPANIES_HOUSE_API_KEY"

# Companies House allows 600 requests per 5 minutes per key; 0.6s keeps us under it.
CH_MIN_SECONDS_BETWEEN_REQUESTS = 0.6

# Keyword name -> (regex, case_sensitive). "EPR" is matched case-sensitively as a whole
# word so it doesn't fire on words that happen to contain those letters.
KEYWORDS = {
    "epr": (r"\bEPR\b", True),
    "extended_producer_responsibility": (r"extended\s+producer\s+responsibilit(?:y|ies)", False),
    "packaging_costs": (r"packaging\s+costs?\b", False),
}

SNIPPET_CHARS = 120  # characters of context either side of a hit
MAX_SNIPPETS = 3

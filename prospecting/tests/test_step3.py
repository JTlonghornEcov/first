import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import step3_linkedin as s3  # noqa: E402


def frame(rows):
    return pd.DataFrame(rows).fillna("")


PARENTS = frame([
    {"group_key": "ORG:1", "parent_name": "Acme Holdings Limited", "companies_house_number": "00000001",
     "pays_disposal_fee": "yes", "recycling_obligation": "", "subsidiary_count": "1",
     "compliance_scheme": "Valpak (EA)"},
    {"group_key": "ORG:2", "parent_name": "Bravo Ltd", "companies_house_number": "00000002",
     "pays_disposal_fee": "", "recycling_obligation": "", "subsidiary_count": "0",
     "compliance_scheme": "Valpak (SEPA)"},
    {"group_key": "ORG:3", "parent_name": "Charlie PLC", "companies_house_number": "00000003",
     "pays_disposal_fee": "", "recycling_obligation": "", "subsidiary_count": "0", "compliance_scheme": ""},
])
MEMBERS = frame([
    {"parent_name": "Acme Holdings Limited", "parent_companies_house_number": "00000001", "is_parent": "yes",
     "name": "Acme Holdings Limited", "trading_name": "", "companies_house_number": "00000001",
     "organisation_id": "1", "town": "Leeds", "postcode": "LS1 1AA"},
    {"parent_name": "Acme Holdings Limited", "parent_companies_house_number": "00000001", "is_parent": "",
     "name": "Acme Foods Ltd", "trading_name": "Acme Snacks", "companies_house_number": "00000011",
     "organisation_id": "1", "town": "Leeds  West", "postcode": "LS2 2AA"},
    {"parent_name": "Bravo Ltd", "parent_companies_house_number": "00000002", "is_parent": "yes",
     "name": "Bravo Ltd", "trading_name": "", "companies_house_number": "00000002",
     "organisation_id": "2", "town": "York", "postcode": "YO1 1AA"},
    {"parent_name": "Charlie PLC", "parent_companies_house_number": "00000003", "is_parent": "yes",
     "name": "Charlie PLC", "trading_name": "", "companies_house_number": "00000003",
     "organisation_id": "3", "town": "Hull", "postcode": "HU1 1AA"},
])
FLAGS = frame([
    {"group_key": "ORG:3", "parent_name": "Charlie PLC", "companies_house_number": "00000003",
     "flagged": "yes", "hits_epr": "2", "filing_history_url": "u", "error": ""},
    {"group_key": "ORG:2", "parent_name": "Bravo Ltd", "companies_house_number": "00000002",
     "flagged": "no", "hits_epr": "0", "filing_history_url": "u", "error": ""},
])


class Step3Tests(unittest.TestCase):
    def test_segments(self):
        parents = PARENTS.copy()
        parents.loc[parents["group_key"] == "ORG:2", "recycling_obligation"] = "yes"
        quals = frame([
            {"group_key": "ORG:1", "over_5m": "likely", "turnover": "", "accounts_size": "full", "company_status": "active"},
            {"group_key": "ORG:2", "over_5m": "yes", "turnover": "9000000", "accounts_size": "small", "company_status": "active"},
            {"group_key": "ORG:3", "over_5m": "unknown", "turnover": "", "accounts_size": "small", "company_status": "active"},
        ])
        master, _ = s3.build_master(parents, MEMBERS, frame([]), frame([]), quals)
        segments = master.groupby("parent_name")["segment"].first().to_dict()
        self.assertEqual(segments, {"Acme Holdings Limited": "3_core", "Bravo Ltd": "1_direct_registrants",
                                    "Charlie PLC": "unverified_turnover"})

    def test_hot_needs_turnover_too(self):
        quals = frame([{"group_key": "ORG:3", "over_5m": "no", "turnover": "3000000", "accounts_size": "full",
                        "company_status": "active"}])
        master, _ = s3.build_master(PARENTS, MEMBERS, FLAGS, frame([]), quals)
        charlie = master[master["parent_name"] == "Charlie PLC"].iloc[0]
        self.assertEqual((charlie["tier"], charlie["segment"]), ("A", "under_5m"))

    def test_linkedin_name_strips_legal_suffix(self):
        self.assertEqual(s3.linkedin_name("3M United Kingdom Plc"), "3M United Kingdom")
        self.assertEqual(s3.linkedin_name("Argos limited"), "Argos")
        self.assertEqual(s3.linkedin_name("Ltd"), "Ltd")

    def test_tiers(self):
        master, _ = s3.build_master(PARENTS, MEMBERS, FLAGS)
        tiers = master.groupby("parent_name")["tier"].first().to_dict()
        # Accounts evidence beats the fee flag; fee payers are B; the rest are C.
        self.assertEqual(tiers, {"Charlie PLC": "A", "Acme Holdings Limited": "B", "Bravo Ltd": "C"})

    def test_epr_job_advert_moves_group_to_tier_a(self):
        jobs = frame([{"companies_house_number": "00000011", "role": "Packaging Compliance Manager",
                       "strength": "strong"},
                      {"companies_house_number": "00000002", "role": "Packaging Technologist", "strength": "weak"}])
        master, _ = s3.build_master(PARENTS, MEMBERS, frame([]), jobs)
        tiers = master.groupby("parent_name")["tier"].first().to_dict()
        # A subsidiary's advert lifts the whole group; a weak signal is noted but doesn't.
        self.assertEqual(tiers["Acme Holdings Limited"], "A")
        self.assertEqual(tiers["Bravo Ltd"], "C")
        self.assertIn("Packaging Technologist (weak)", set(master["job_signals"]))

    def test_competitors_are_left_out(self):
        members = pd.concat([MEMBERS, frame([{
            "parent_name": "Valpak Limited", "parent_companies_house_number": "00000009", "is_parent": "yes",
            "name": "Valpak Limited", "trading_name": "", "companies_house_number": "00000009",
            "organisation_id": "9", "town": "Stratford", "postcode": "CV37 1AA"}])])
        parents = pd.concat([PARENTS, frame([{"group_key": "ORG:9", "parent_name": "Valpak Limited",
                                              "companies_house_number": "00000009", "pays_disposal_fee": "yes",
                                              "subsidiary_count": "0", "compliance_scheme": ""}])])
        master, _ = s3.build_master(parents.fillna(""), members, frame([]))
        self.assertNotIn("Valpak", set(master["companyname"]))

    def test_every_group_company_and_trading_name_gets_a_row(self):
        master, _ = s3.build_master(PARENTS, MEMBERS, frame([]))
        acme = master[master["group_key"] == "ORG:1"]
        self.assertEqual(sorted(acme["companyname"]), ["Acme Foods", "Acme Holdings", "Acme Snacks"])
        self.assertIn("Leeds West", set(acme["town"]))

    def test_upload_has_linkedin_headers(self):
        master, _ = s3.build_master(PARENTS, MEMBERS, FLAGS)
        upload = s3.to_upload(master)
        self.assertEqual(list(upload.columns), s3.UPLOAD_COLUMNS)
        self.assertEqual(set(upload["companycountry"]), {"GB"})

    def test_scheme_exclusions_drop_region_suffix(self):
        names = list(s3.scheme_exclusions(PARENTS)["companyname"])
        self.assertIn("Valpak", names)
        self.assertNotIn("Valpak (EA)", names)


if __name__ == "__main__":
    unittest.main()

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import step1_register as s1  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"


def run(name):
    df = s1.read_register(FIXTURES / name)
    cols = s1.detect_columns(df.columns)
    rows, strategy = s1.build_groups(df, cols)
    parents, members = s1.summarise(rows)
    return cols, strategy, parents.set_index("parent_name"), members


class NormaliseTests(unittest.TestCase):
    def test_ch_numbers(self):
        self.assertEqual(s1.normalise_ch_number("1234567"), "01234567")
        self.assertEqual(s1.normalise_ch_number(" sc 12345 "), "SC012345")
        self.assertEqual(s1.normalise_ch_number("1234567.0"), "01234567")
        self.assertEqual(s1.normalise_ch_number("N/A"), "")
        self.assertEqual(s1.normalise_ch_number(None), "")

    def test_csv_links_prefer_newest_year(self):
        html = ('<a href="/files/register-2024.csv">2024 register (CSV)</a>'
                '<a href="/files/register-2025.csv">2025 register (CSV)</a><a href="/about">About</a>')
        links = s1.find_csv_links(html, "https://example.gov.uk/public-register")
        self.assertEqual(links[0][0], "https://example.gov.uk/files/register-2025.csv")
        self.assertEqual(len(links), 2)


class OrganisationIdGrouping(unittest.TestCase):
    def setUp(self):
        self.cols, self.strategy, self.parents, self.members = run("register_org_ids.csv")

    def test_detects_columns(self):
        self.assertEqual(self.cols["organisation_id"], "Organisation ID")
        self.assertEqual(self.cols["size"], "Organisation size")
        self.assertIn("subsidiary ID", self.strategy)

    def test_groups_subsidiaries_under_parent(self):
        acme = self.parents.loc["Acme Foods Holdings Limited"]
        self.assertEqual(acme["companies_house_number"], "01234567")
        self.assertEqual(acme["subsidiary_count"], 2)
        self.assertEqual(acme["subsidiary_names"], "Acme Bakeries Ltd; Acme Drinks Ltd")
        self.assertEqual(acme["subsidiary_companies_house_numbers"], "02345678; SC012345")

    def test_filters_out_small_groups(self):
        self.assertNotIn("Tiny Crafts Ltd", self.parents.index)
        self.assertIn("Big Retail PLC", self.parents.index)

    def test_group_with_no_parent_row_is_marked_inferred(self):
        self.assertEqual(self.parents.loc["Orphan Sub Ltd"]["parent_inferred"], "yes")
        self.assertEqual(self.parents.loc["Big Retail PLC"]["parent_inferred"], "")

    def test_members_file_keeps_every_large_group_row(self):
        self.assertEqual(len(self.members), 5)
        self.assertEqual((self.members["is_parent"] == "yes").sum(), 3)


class ParentColumnGrouping(unittest.TestCase):
    def setUp(self):
        self.cols, self.strategy, self.parents, self.members = run("register_parent_cols.csv")

    def test_strategy(self):
        self.assertEqual(self.strategy, "explicit parent columns")

    def test_groups_by_parent_number(self):
        gamma = self.parents.loc["Gamma Group plc"]
        self.assertEqual(gamma["companies_house_number"], "00000111")
        self.assertEqual(gamma["subsidiary_count"], 2)

    def test_parent_not_in_register_is_created_from_declared_name(self):
        epsilon = self.parents.loc["Epsilon Holdings Ltd"]
        self.assertEqual(epsilon["parent_inferred"], "yes")
        self.assertEqual(epsilon["subsidiary_names"], "Epsilon Sub Ltd")

    def test_small_excluded(self):
        self.assertNotIn("Delta Ltd", self.parents.index)


class DefraFormat(unittest.TestCase):
    """Matches the real 2026 register: title lines above the header, L/S sizes, cancellations."""

    def setUp(self):
        self.cols, self.strategy, self.parents, self.members = run("register_defra_format.csv")

    def test_skips_title_lines_and_detects_columns(self):
        self.assertEqual(self.cols["name"], "Organisation name")
        self.assertEqual(self.cols["size"], "Large/Small")
        self.assertEqual(self.cols["compliance_scheme"], "Name of compliance scheme")

    def test_groups_and_filters(self):
        self.assertEqual(list(self.parents.index), ["Zeta Holdings Limited"])
        zeta = self.parents.loc["Zeta Holdings Limited"]
        self.assertEqual(zeta["subsidiary_names"], "Zeta Retail Ltd")
        self.assertEqual(zeta["subsidiary_companies_house_numbers"], "01924997")
        self.assertEqual(zeta["postcode"], "LS1 1AA")

    def test_cancelled_registrations_dropped(self):
        self.assertNotIn("Gone Away Ltd", set(self.members["name"]))


if __name__ == "__main__":
    unittest.main()

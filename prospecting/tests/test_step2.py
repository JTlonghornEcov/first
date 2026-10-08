import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import config  # noqa: E402
import step2_companies_house as s2  # noqa: E402

ACCOUNTS_XHTML = b"""<html xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"><head><style>.x{}</style></head><body>
<p>Strategic report. The group faces new packaging costs from 2025 as Extended Producer Responsibility
(EPR) fees are introduced. We estimate EPR will add GBP 4m a year.</p>""" + b"<p>Filler text.</p>" * 60 + b"</body></html>"


class FakeResponse:
    def __init__(self, status=200, json_data=None, content=b""):
        self.status_code, self._json, self.content = status, json_data, content

    def json(self):
        return self._json

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(self.status_code)


class FakeSession:
    """Answers like Companies House for company 01234567 and a name search."""

    def __init__(self):
        self.auth, self.calls = None, []

    def get(self, url, params=None, headers=None, timeout=None):
        self.calls.append((url, headers.get("Accept")))
        if url.endswith("/search/companies"):
            return FakeResponse(json_data={"items": [
                {"title": "ACME FOODS HOLDINGS LIMITED", "company_number": "01234567", "company_status": "active"},
                {"title": "ACME FOODS HOLDINGS (NORTH) LIMITED", "company_number": "09999999", "company_status": "active"},
            ]})
        if url.endswith("/company/01234567"):
            return FakeResponse(json_data={"company_name": "ACME FOODS HOLDINGS LIMITED", "company_status": "active",
                                           "accounts": {"last_accounts": {"made_up_to": "2025-03-31"}}})
        if url.endswith("/company/01234567/filing-history"):
            return FakeResponse(json_data={"items": [
                {"date": "2024-11-01", "description": "accounts-with-accounts-type-full",
                 "links": {"document_metadata": "https://frontend-doc-api.company-information.service.gov.uk/document/OLD"}},
                {"date": "2025-10-01", "description": "accounts-with-accounts-type-group",
                 "description_values": {"made_up_date": "2025-03-31"},
                 "links": {"document_metadata": "https://frontend-doc-api.company-information.service.gov.uk/document/NEW"}},
            ]})
        if url.endswith("/document/NEW"):
            return FakeResponse(json_data={"resources": {"application/pdf": {}, "application/xhtml+xml": {}}})
        if url.endswith("/document/NEW/content"):
            return FakeResponse(content=ACCOUNTS_XHTML)
        return FakeResponse(status=404)


class ScanTests(unittest.TestCase):
    def test_keywords(self):
        hits, snippets = s2.scan_text("Our packaging cost rose. epr is lowercase. EPR and extended producer "
                                      "responsibilities apply. Packaging costs too.")
        self.assertEqual(hits, {"epr": 1, "extended_producer_responsibility": 1, "packaging_costs": 2,
                                "disposal_fee": 0, "packaging_waste": 0, "prn": 0})
        self.assertEqual(len(snippets), 4)  # up to 2 per keyword

    def test_new_keywords(self):
        hits, _ = s2.scan_text("Waste disposal fees under EPR. Packaging waste regulations. PRNs bought. "
                               "Packaging Recovery Notes. The sprn code.")
        self.assertEqual((hits["disposal_fee"], hits["packaging_waste"], hits["prn"]), (1, 1, 2))

    def test_epr_amount(self):
        self.assertEqual(s2.find_epr_amount("Provisions Extended Producer Responsibility provision 465,399 -"),
                         "£465,399")
        self.assertEqual(s2.find_epr_amount("EPR costs of £1.2m were incurred in 2025"), "£1.2m")
        self.assertEqual(s2.find_epr_amount("EPR applies from 2025 onwards"), "")

    def test_no_false_positive_inside_words(self):
        hits, _ = s2.scan_text("The REPRESENTATIVE signed. Packaging costing model.")
        self.assertEqual(sum(hits.values()), 0)

    def test_stratified_sample_covers_every_size_band(self):
        parents = [{"parent_name": f"P{i}", "subsidiary_count": str(count), "group_key": f"G{i}"}
                   for i, count in enumerate([0] * 900 + [2] * 90 + [8] * 9 + [40])]
        sample = s2.stratified_sample(parents, 40, seed=1)
        bands = {s2.size_band(p["subsidiary_count"]) for p in sample}
        self.assertEqual(bands, {"0", "1-4", "5-19", "20+"})
        self.assertEqual(sample, s2.stratified_sample(parents, 40, seed=1))

    def test_name_normalisation(self):
        self.assertEqual(s2.normalise_company_name("The Acme & Co. Limited"),
                         s2.normalise_company_name("ACME AND CO LTD"))


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.patch = mock.patch.object(config, "CACHE_DIR", Path(self.tmp.name))
        self.patch.start()
        self.session = FakeSession()
        self.client = s2.CompaniesHouseClient("test-key", session=self.session, min_interval=0)

    def tearDown(self):
        self.patch.stop()
        self.tmp.cleanup()

    def test_flags_latest_accounts(self):
        result = s2.process_parent(self.client, {"parent_name": "Acme Foods Holdings Limited",
                                                 "companies_house_number": "01234567", "group_key": "ORG:1"})
        self.assertEqual(result["error"], "")
        self.assertEqual(result["flagged"], "yes")
        self.assertEqual(result["filing_date"], "2025-10-01")
        self.assertEqual(result["document_format"], "xhtml")
        self.assertEqual(result["hits_epr"], 2)
        self.assertEqual(result["hits_extended_producer_responsibility"], 1)
        self.assertEqual(result["hits_packaging_costs"], 1)
        # Document calls go to the document API host and ask for XHTML.
        self.assertIn(("https://document-api.company-information.service.gov.uk/document/NEW/content",
                       "application/xhtml+xml"), self.session.calls)
        self.assertEqual(self.session.auth, ("test-key", ""))

    def test_second_run_uses_cache(self):
        parent = {"parent_name": "Acme", "companies_house_number": "01234567", "group_key": "ORG:1"}
        s2.process_parent(self.client, parent)
        self.session.calls.clear()
        s2.process_parent(self.client, parent)
        self.assertFalse(any("/document/" in url for url, _ in self.session.calls))

    def test_name_search_requires_exact_match(self):
        result = s2.process_parent(self.client, {"parent_name": "Acme Foods Holdings Ltd",
                                                 "companies_house_number": "", "group_key": "NAME:X"})
        self.assertEqual(result["match_method"], "name search")
        self.assertEqual(result["companies_house_number"], "01234567")
        miss = s2.process_parent(self.client, {"parent_name": "Acme Foods", "companies_house_number": "",
                                               "group_key": "NAME:Y"})
        self.assertIn("no exact name match", miss["error"])

    def test_unknown_company(self):
        result = s2.process_parent(self.client, {"parent_name": "Ghost", "companies_house_number": "07777777",
                                                 "group_key": "G"})
        self.assertEqual(result["error"], "company not found at Companies House")


@unittest.skipUnless(s2.ocr_available(), "needs pdftoppm and tesseract")
class OcrTests(unittest.TestCase):
    def test_scanned_pdf_is_read_with_ocr(self):
        from PIL import Image, ImageDraw, ImageFont

        lines = ["Strategic report", "Extended Producer Responsibility (EPR) fees",
                 "increased our packaging costs this year."] * 6
        page = Image.new("L", (2480, 3508), 255)
        draw = ImageDraw.Draw(page)
        font = ImageFont.load_default(size=60)
        for i, line in enumerate(lines):
            draw.text((200, 200 + i * 120), line, fill=0, font=font)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "scan.pdf"
            page.save(path, resolution=300)
            text, method = s2.extract_text(path, "pdf")
            self.assertEqual(method, "ocr")
            hits, _ = s2.scan_text(text)
            self.assertGreater(hits["extended_producer_responsibility"], 0)
            self.assertGreater(hits["epr"], 0)
            self.assertTrue(path.with_suffix(".ocr.txt").exists())


if __name__ == "__main__":
    unittest.main()

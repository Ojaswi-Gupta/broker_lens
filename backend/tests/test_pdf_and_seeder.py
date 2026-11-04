"""Comprehensive tests for customs PDF generation, database seeder, and shipment endpoints."""

import os
from app.models.domain import Shipment, FieldEditHistory


# ==============================================================================
# 1. VERIFY ALL 12 PDF FILES ARE GENERATED AND VALID
# ==============================================================================
def test_all_twelve_pdf_files_generated():
    """Verify that all 12 PDF files exist in static/docs/, have valid %PDF- headers, and size > 1000 bytes."""
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", "docs"))
    expected_files = [
        "SHP-24811_INVOICE.pdf",
        "SHP-24811_PACKING_LIST.pdf",
        "SHP-24811_BILL_OF_LADING.pdf",
        "SHP-24812_INVOICE.pdf",
        "SHP-24812_PACKING_LIST.pdf",
        "SHP-24812_BILL_OF_LADING.pdf",
        "SHP-24813_INVOICE.pdf",
        "SHP-24813_PACKING_LIST.pdf",
        "SHP-24813_BILL_OF_LADING.pdf",
        "SHP-24814_INVOICE.pdf",
        "SHP-24814_PACKING_LIST.pdf",
        "SHP-24814_BILL_OF_LADING.pdf",
    ]

    for fname in expected_files:
        fpath = os.path.join(docs_dir, fname)
        assert os.path.exists(fpath), f"Expected PDF missing: {fname}"
        file_size = os.path.getsize(fpath)
        assert file_size > 1000, f"File {fname} is smaller than 1000 bytes: {file_size}"
        with open(fpath, "rb") as f:
            header = f.read(5)
            assert header == b"%PDF-", f"File {fname} does not have a valid %PDF- header: {header}"


# ==============================================================================
# 2. VERIFY SHP-24811 (Company B, China) DATA INTEGRITY & WEIGHT MISMATCH
# ==============================================================================
def test_shp_24811_weight_mismatch_and_cross_check_failure(db_session):
    """Verify SHP-24811 has 3120 kg Invoice weight, 3165 kg PL/BoL weight, and CROSS_CHECK_FAILED status."""
    shp = db_session.query(Shipment).filter(Shipment.shipment_code == "SHP-24811").first()
    assert shp is not None
    assert shp.status == "CROSS_CHECK_FAILED"
    assert shp.requires_manager_approval is True
    assert len(shp.documents) == 3
    assert len(shp.line_items) == 1

    # Check line item math
    item = shp.line_items[0]
    assert item.qty == 2400.0
    assert item.unit_price == 6.80
    assert item.line_total == 16320.00
    assert item.hsn_code == "94054200"

    # Check gross weight extracted fields across documents
    inv_gross = next(f for f in shp.fields if f.field_key == "gross_weight_kg" and f.doc_type == "INVOICE")
    pl_gross = next(f for f in shp.fields if f.field_key == "gross_weight_kg" and f.doc_type == "PACKING_LIST")
    bol_gross = next(f for f in shp.fields if f.field_key == "gross_weight_kg" and f.doc_type == "BILL_OF_LADING")

    assert float(inv_gross.current_value) == 3120.00
    assert float(pl_gross.current_value) == 3165.00
    assert float(bol_gross.current_value) == 3165.00

    # Check 3-way gross weight cross-check failure
    failed_weight_check = next(
        c for c in shp.cross_checks if c.rule_code == "THREE_WAY_GROSS_WEIGHT"
    )
    assert failed_weight_check.status == "FAILED"
    assert failed_weight_check.severity == "CRITICAL"
    assert "45.00 kg" in failed_weight_check.discrepancy_delta


# ==============================================================================
# 3. VERIFY SHP-24812 (Company C, Sweden) SKEW, LOW-CONFIDENCE & NEEDS_REVIEW
# ==============================================================================
def test_shp_24812_skew_and_low_confidence(db_session):
    """Verify SHP-24812 has 180 qty, EUR 42.50 price, 1460 kg weight, and low-confidence fields."""
    shp = db_session.query(Shipment).filter(Shipment.shipment_code == "SHP-24812").first()
    assert shp is not None
    assert shp.status == "NEEDS_REVIEW"
    assert shp.currency == "EUR"
    assert shp.supplier_country == "Sweden"

    # Verify skewed document
    inv_doc = next(d for d in shp.documents if d.doc_type == "INVOICE")
    assert inv_doc.skew_angle_deg == -2.8
    assert inv_doc.is_bilingual is True

    # Check line item
    line_item = shp.line_items[0]
    assert line_item.qty == 180.0
    assert line_item.unit_price == 42.50
    assert line_item.line_total == 7650.00
    assert line_item.hsn_code == "84818030"
    assert line_item.confidence_score == 0.74
    assert line_item.is_low_confidence is True
    assert line_item.is_confirmed_by_human is False

    # Check low-confidence Incoterm field
    incoterm_field = next(f for f in shp.fields if f.field_key == "incoterm")
    assert incoterm_field.confidence_score == 0.78
    assert incoterm_field.is_low_confidence is True
    assert incoterm_field.is_confirmed_by_human is False


# ==============================================================================
# 4. STATIC DOCUMENT SERVING TEST
# ==============================================================================
def test_static_pdf_document_serving(client):
    """Verify that GET /static/docs/SHP-24811_INVOICE.pdf returns HTTP 200 with application/pdf."""
    response = client.get("/static/docs/SHP-24811_INVOICE.pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 1000
    assert response.content.startswith(b"%PDF-")


# ==============================================================================
# 5. API SHIPMENTS LIST & DETAIL WITH DPDP PII MASKING
# ==============================================================================
def test_shipments_api_with_dpdp_masking(client):
    """Verify GET /api/shipments and GET /api/shipments/{code} with DPDP PII masking."""
    # 1. Fetch shipments with PII masking enabled (at least the 4 baseline seeded shipments)
    res_masked = client.get("/api/shipments?mask_pii=true")
    assert res_masked.status_code == 200
    data_masked = res_masked.json()
    assert len(data_masked) >= 4

    codes = [s["shipment_code"] for s in data_masked]
    assert "SHP-24811" in codes
    assert "SHP-24812" in codes
    assert "SHP-24813" in codes
    assert "SHP-24814" in codes

    # Verify DPDP masking on SHP-24811
    shp1_summary = next(s for s in data_masked if s["shipment_code"] == "SHP-24811")
    assert shp1_summary["importer_iec"] == "0314****11"
    assert shp1_summary["failed_crosschecks_count"] == 1

    # 2. Fetch full detail for SHP-24811 with mask_pii=true
    res_detail = client.get("/api/shipments/SHP-24811?mask_pii=true")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["importer_contact_email"] == "r***@luminalighting.in"
    assert "******" in detail["importer_contact_phone"]
    assert detail["importer_iec"] == "0314****11"
    assert len(detail["documents"]) == 3
    assert len(detail["fields"]) >= 10
    assert len(detail["cross_checks"]) >= 3

    # 3. Fetch full detail with mask_pii=false
    res_unmasked = client.get("/api/shipments/SHP-24811?mask_pii=false")
    assert res_unmasked.status_code == 200
    unmasked = res_unmasked.json()
    assert unmasked["importer_contact_email"] == "rohan@luminalighting.in"
    assert unmasked["importer_contact_phone"] == "+91-9876543212"
    assert unmasked["importer_iec"] == "0314098211"


# ==============================================================================
# 6. VERIFY 60+ HISTORICAL EDIT LOGS SEEDED
# ==============================================================================
def test_historical_edit_logs_seeded(db_session):
    """Verify that over 60 historical edit logs exist across all 4 suppliers for the accuracy report."""
    count = db_session.query(FieldEditHistory).count()
    assert count >= 60, f"Expected at least 60 historical edit logs, found {count}"

    suppliers = set(r.supplier_name for r in db_session.query(FieldEditHistory.supplier_name).all())
    assert len(suppliers) >= 4

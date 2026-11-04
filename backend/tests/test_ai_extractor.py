"""Comprehensive automated tests for Vision AI extraction, confidence calibration, upload security, and demo bundle API."""

import os
import io
import pytest
from app.services.ai_extractor import ai_extractor_service
from app.services.pdf_seed_gen import DEFAULT_DOCS_DIR
from app.models.domain import Shipment, ExtractedField, ShipmentLineItem


# ==============================================================================
# 1. HIGH CONFIDENCE COMMERCIAL INVOICE EXTRACTION
# ==============================================================================
def test_extract_high_confidence_invoice():
    """Verify extracting SHP-24811_INVOICE.pdf parses exact fields, HSN, line totals, and weight >= 0.85 confidence."""
    fpath = os.path.join(DEFAULT_DOCS_DIR, "SHP-24811_INVOICE.pdf")
    assert os.path.exists(fpath), f"Seed PDF missing: {fpath}"

    result = ai_extractor_service.extract_document(fpath, doc_type_hint="INVOICE")
    assert result.doc_type == "INVOICE"
    assert result.is_unreadable is False
    assert result.avg_confidence >= 0.85

    # Check key header fields
    field_dict = {f.field_key: f for f in result.fields}
    assert field_dict["invoice_number"].extracted_value == "INV-CB-2026-881"
    assert field_dict["invoice_number"].confidence_score >= 0.85

    assert float(field_dict["gross_weight_kg"].extracted_value) == 3120.00
    assert field_dict["gross_weight_kg"].confidence_score >= 0.85

    assert float(field_dict["invoice_total"].extracted_value) == 16320.00
    assert field_dict["invoice_total"].confidence_score >= 0.85

    # Check line items
    assert len(result.line_items) >= 1
    item = result.line_items[0]
    assert item.hsn_code == "94054200"
    assert item.qty == 2400.0
    assert item.unit_price == 6.80
    assert item.line_total == 16320.00
    assert item.confidence_score >= 0.85


# ==============================================================================
# 2. BILINGUAL PACKING LIST EXTRACTION & WEIGHT (3,165 KG)
# ==============================================================================
def test_extract_bilingual_packing_list():
    """Verify extracting SHP-24811_PACKING_LIST.pdf detects Mandarin bilingual headers and parses 3,165 kg."""
    fpath = os.path.join(DEFAULT_DOCS_DIR, "SHP-24811_PACKING_LIST.pdf")
    assert os.path.exists(fpath), f"Seed PDF missing: {fpath}"

    result = ai_extractor_service.extract_document(fpath, doc_type_hint="PACKING_LIST")
    assert result.doc_type == "PACKING_LIST"
    assert result.is_bilingual is True
    assert "Mandarin" in (result.language_hint or "")

    field_dict = {f.field_key: f for f in result.fields}
    assert "gross_weight_kg" in field_dict
    assert float(field_dict["gross_weight_kg"].extracted_value) == 3165.00


# ==============================================================================
# 3. SKEWED SWEDISH INVOICE EXTRACTION & LOW-CONFIDENCE FLAGGING (< 0.85)
# ==============================================================================
def test_extract_skewed_swedish_invoice_low_confidence():
    """Verify SHP-24812_INVOICE.pdf detects -2.8° scan tilt and flags Incoterm / HSN with < 0.85 confidence."""
    fpath = os.path.join(DEFAULT_DOCS_DIR, "SHP-24812_INVOICE.pdf")
    assert os.path.exists(fpath), f"Seed PDF missing: {fpath}"

    result = ai_extractor_service.extract_document(fpath, doc_type_hint="INVOICE")
    assert result.skew_angle_deg == -2.8
    assert result.is_bilingual is True

    field_dict = {f.field_key: f for f in result.fields}
    assert "incoterm" in field_dict
    # Low confidence on Incoterm due to scan tilt
    assert field_dict["incoterm"].confidence_score < 0.85

    # Low confidence on HSN code
    assert len(result.line_items) >= 1
    assert result.line_items[0].confidence_score < 0.85
    assert result.line_items[0].hsn_code == "84818030"


# ==============================================================================
# 4. DEGRADED / UNREADABLE SCAN MANUAL ENTRY FALLBACK (< 0.45)
# ==============================================================================
def test_extract_unreadable_packing_list_manual_fallback(client, db_session):
    """Verify extracting SHP-24814_PACKING_LIST.pdf sets is_unreadable=True, avg_confidence < 0.45, and manual entry."""
    fpath = os.path.join(DEFAULT_DOCS_DIR, "SHP-24814_PACKING_LIST.pdf")
    assert os.path.exists(fpath), f"Seed PDF missing: {fpath}"

    result = ai_extractor_service.extract_document(fpath, doc_type_hint="PACKING_LIST")
    assert result.is_unreadable is True
    assert result.avg_confidence < 0.45

    # Run extraction via API on SHP-24814 and verify fields are flagged as manual entry
    res = client.post("/api/shipments/SHP-24814/extract")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] in ["NEEDS_REVIEW", "CROSS_CHECK_FAILED"]
    # Check that packing list fields have is_manual_entry == True and is_confirmed_by_human == False
    pl_fields = [f for f in data["fields"] if f["doc_type"] == "PACKING_LIST"]
    assert len(pl_fields) > 0
    for f in pl_fields:
        assert f["is_low_confidence"] is True
        assert f["is_manual_entry"] is True
        assert f["is_confirmed_by_human"] is False


# ==============================================================================
# 5. UPLOAD SECURITY: REJECT INVALID FILE TYPES (e.g. .exe, .sh)
# ==============================================================================
def test_upload_rejects_invalid_file_type(client):
    """Verify that uploading dangerous executable or unsupported file types returns HTTP 400."""
    fake_exe = io.BytesIO(b"MZ executable binary payload")
    response = client.post(
        "/api/shipments/SHP-24811/documents",
        data={"doc_type": "INVOICE"},
        files={"file": ("malicious.exe", fake_exe, "application/x-msdownload")},
    )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]

    fake_sh = io.BytesIO(b"#!/bin/bash\nrm -rf /")
    res_sh = client.post(
        "/api/shipments/SHP-24811/documents",
        data={"doc_type": "INVOICE"},
        files={"file": ("script.sh", fake_sh, "application/x-sh")},
    )
    assert res_sh.status_code == 400


# ==============================================================================
# 6. END-TO-END CREATE, UPLOAD, AND EXTRACT PIPELINE API
# ==============================================================================
def test_end_to_end_create_upload_and_extract_api(client, db_session):
    """Test full cycle: create shipment -> upload 3 documents -> run AI extraction -> inspect fields."""
    # 1. Create new shipment
    create_payload = {
        "title": "E2E Automated Consignment Test",
        "supplier_name": "Company B (China)",
        "supplier_country": "China",
        "importer_name": "Lumina Commercial Lighting Pvt. Ltd.",
        "importer_iec": "0314098211",
        "port_of_loading": "Shenzhen (CNSZX)",
        "port_of_discharge": "Nhava Sheva (INNSA)",
        "currency": "USD",
        "incoterm": "FOB",
    }
    res_create = client.post("/api/shipments", json=create_payload)
    assert res_create.status_code == 201
    shipment_code = res_create.json()["shipment_code"]

    # 2. Upload Invoice PDF
    with open(os.path.join(DEFAULT_DOCS_DIR, "SHP-24811_INVOICE.pdf"), "rb") as f:
        inv_bytes = f.read()
    res_upload_inv = client.post(
        f"/api/shipments/{shipment_code}/documents",
        data={"doc_type": "INVOICE"},
        files={"file": ("invoice.pdf", io.BytesIO(inv_bytes), "application/pdf")},
    )
    assert res_upload_inv.status_code == 200

    # 3. Upload Packing List PDF
    with open(os.path.join(DEFAULT_DOCS_DIR, "SHP-24811_PACKING_LIST.pdf"), "rb") as f:
        pl_bytes = f.read()
    res_upload_pl = client.post(
        f"/api/shipments/{shipment_code}/documents",
        data={"doc_type": "PACKING_LIST"},
        files={"file": ("packing_list.pdf", io.BytesIO(pl_bytes), "application/pdf")},
    )
    assert res_upload_pl.status_code == 200

    # 4. Upload Bill of Lading PDF
    with open(os.path.join(DEFAULT_DOCS_DIR, "SHP-24811_BILL_OF_LADING.pdf"), "rb") as f:
        bol_bytes = f.read()
    res_upload_bol = client.post(
        f"/api/shipments/{shipment_code}/documents",
        data={"doc_type": "BILL_OF_LADING"},
        files={"file": ("bol.pdf", io.BytesIO(bol_bytes), "application/pdf")},
    )
    assert res_upload_bol.status_code == 200

    # 5. Run AI Extraction
    res_extract = client.post(f"/api/shipments/{shipment_code}/extract")
    assert res_extract.status_code == 200
    extracted_data = res_extract.json()

    assert len(extracted_data["fields"]) >= 10
    assert len(extracted_data["line_items"]) >= 1
    assert extracted_data["status"] == "CROSS_CHECK_FAILED"  # Catches 3120 vs 3165 kg!


# ==============================================================================
# 7. ONE-CLICK DEMO BUNDLE ENDPOINT FOR EVALUATORS
# ==============================================================================
def test_one_click_demo_bundle_endpoint(client):
    """Test 1-click demo bundle generation across weight mismatch and clean scenarios."""
    # Test weight mismatch bundle
    res_bundle = client.post("/api/shipments/demo-bundle", json={"scenario": "weight_mismatch"})
    assert res_bundle.status_code == 200
    data = res_bundle.json()
    assert data["shipment_code"].startswith("SHP-")
    assert len(data["documents"]) == 3
    assert len(data["fields"]) >= 10
    assert data["status"] == "CROSS_CHECK_FAILED"

    # Test clean verified bundle
    res_clean = client.post("/api/shipments/demo-bundle", json={"scenario": "clean_verified"})
    assert res_clean.status_code == 200
    data_clean = res_clean.json()
    assert data_clean["shipment_code"].startswith("SHP-")
    assert len(data_clean["documents"]) == 3
    assert len(data_clean["fields"]) >= 4

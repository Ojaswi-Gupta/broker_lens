"""Automated test suite for 3-Way Cross-Check Engine, Export Gatekeeper, and Analytics API.

Verifies:
1. SHP-24811 export is blocked (HTTP 422) by weight mismatch until resolved.
2. SHP-24812 export is blocked (HTTP 422) by low-confidence unconfirmed fields.
3. SHP-24813 clean verified shipment exports CSV (HTTP 200, UTF-8 BOM, text/csv).
4. Editing invoice weight on SHP-24811 clears cross-check and unlocks export.
5. Cross-check override requires Documentation Manager approval RBAC.
6. Confirming low-confidence fields on SHP-24812 transitions status to APPROVED and unlocks export.
7. Analytics overview returns live field and supplier metrics and reflects recent edits.
"""

import pytest
from app.services.seeder import seed_database
from tests.conftest import TestingSessionLocal


@pytest.fixture(scope="module", autouse=True)
def reset_database_after_crosscheck_tests():
    """Ensure baseline test data is pristine after running mutable review tests."""
    yield
    db = TestingSessionLocal()
    try:
        seed_database(db, force_refresh=True)
    finally:
        db.close()


# ==============================================================================
# 1. TEST SHP-24811 EXPORT BLOCKED BY WEIGHT MISMATCH (HTTP 422)
# ==============================================================================
def test_shp_24811_export_blocked_by_weight_mismatch_422(client):
    """Verify GET /api/shipments/SHP-24811/export returns 422 with THREE_WAY_GROSS_WEIGHT blocker."""
    response = client.get("/api/shipments/SHP-24811/export")
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    detail = data["detail"]
    assert detail["code"] == "EXPORT_BLOCKED_UNRESOLVED_ITEMS"
    assert detail["failed_crosschecks_count"] >= 1

    blocking_rules = [c["rule_code"] for c in detail["blocking_crosschecks"]]
    assert "THREE_WAY_GROSS_WEIGHT" in blocking_rules


# ==============================================================================
# 2. TEST SHP-24812 EXPORT BLOCKED BY LOW-CONFIDENCE FIELDS (HTTP 422)
# ==============================================================================
def test_shp_24812_export_blocked_by_low_confidence_fields_422(client):
    """Verify GET /api/shipments/SHP-24812/export returns 422 listing incoterm and hsn_code."""
    response = client.get("/api/shipments/SHP-24812/export")
    assert response.status_code == 422
    data = response.json()
    detail = data["detail"]
    assert detail["code"] == "EXPORT_BLOCKED_UNRESOLVED_ITEMS"

    # Verify low-confidence fields and line items listed
    blocking_fields = [f["field_key"] for f in detail["blocking_fields"]]
    assert "incoterm" in blocking_fields

    blocking_hsn = [li["hsn_code"] for li in detail["blocking_line_items"]]
    assert "84818030" in blocking_hsn


# ==============================================================================
# 3. TEST SHP-24813 CLEAN SHIPMENT EXPORTS CSV (HTTP 200)
# ==============================================================================
def test_shp_24813_clean_shipment_exports_csv_200(client):
    """Verify clean verified shipment exports valid UTF-8 BOM CSV and transitions to EXPORTED."""
    # Preview endpoint check
    preview_resp = client.get("/api/shipments/SHP-24813/export/preview")
    assert preview_resp.status_code == 200
    preview_data = preview_resp.json()
    assert preview_data["is_ready"] is True
    assert preview_data["blocker_detail"] is None
    assert preview_data["total_line_items"] >= 1
    assert len(preview_data["csv_columns"]) == 27

    # Download CSV export
    export_resp = client.get("/api/shipments/SHP-24813/export")
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers["content-type"]
    assert "attachment; filename=\"BrokerLens_Filing_SHP-24813.csv\"" in export_resp.headers["content-disposition"]

    # Verify UTF-8 BOM marker (\xef\xbb\xbf)
    assert export_resp.content.startswith(b"\xef\xbb\xbf")

    # Verify standard customs content
    csv_text = export_resp.text
    assert "Job_Ref_No" in csv_text
    assert "SHP-24813" in csv_text
    assert "Shenzhen Precision Motors" in csv_text

    # Verify status transitioned to EXPORTED
    shp_check = client.get("/api/shipments/SHP-24813").json()
    assert shp_check["status"] == "EXPORTED"
    assert shp_check["exported_at"] is not None


# ==============================================================================
# 4. TEST EDITING INVOICE WEIGHT CLEARS CROSS-CHECK AND UNLOCKS EXPORT
# ==============================================================================
def test_editing_invoice_weight_on_shp_24811_clears_crosscheck_and_unlocks_export(client):
    """Verify correcting Invoice weight from 3120 to 3165 flips cross-check to PASSED and allows export."""
    # Find invoice gross weight field
    shp_resp = client.get("/api/shipments/SHP-24811").json()
    inv_gw_field = next(
        f for f in shp_resp["fields"]
        if f["doc_type"] == "INVOICE" and f["field_key"] == "gross_weight_kg"
    )
    assert inv_gw_field["current_value"] == "3120.00"

    # Update field value to match PL and BoL (3165.00)
    patch_resp = client.patch(
        f"/api/shipments/SHP-24811/fields/{inv_gw_field['id']}",
        json={
            "value": "3165.00",
            "is_confirmed_by_human": True,
            "edit_reason": "Synchronized invoice gross weight to match packing list and ocean bill of lading",
        },
    )
    assert patch_resp.status_code == 200
    updated_shp = patch_resp.json()

    # Verify THREE_WAY_GROSS_WEIGHT dynamically flipped to PASSED
    weight_check = next(
        c for c in updated_shp["cross_checks"]
        if c["rule_code"] == "THREE_WAY_GROSS_WEIGHT"
    )
    assert weight_check["status"] == "PASSED"
    assert "3,165.00 kg" in weight_check["invoice_value"]

    # Status should now be APPROVED
    assert updated_shp["status"] == "APPROVED"

    # Export now unlocks with HTTP 200
    export_resp = client.get("/api/shipments/SHP-24811/export")
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers["content-type"]
    assert "SHP-24811" in export_resp.text
    assert "3165.00" in export_resp.text


# ==============================================================================
# 5. TEST CROSS-CHECK OVERRIDE REQUIRES MANAGER APPROVAL RBAC
# ==============================================================================
def test_crosscheck_override_requires_manager_approval_rbac(client):
    """Verify overriding cross-check requires Manager sign-off: Executive is rejected (403), Manager succeeds (200)."""
    # 1. Fetch demo auth tokens
    exec_login = client.post("/api/auth/demo-login", json={"role": "DOCUMENTATION_EXECUTIVE"}).json()
    exec_token = exec_login["access_token"]

    mgr_login = client.post("/api/auth/demo-login", json={"role": "DOCUMENTATION_MANAGER"}).json()
    mgr_token = mgr_login["access_token"]

    # 2. Reset SHP-24811 invoice weight to 3120.00 so cross-check fails again
    shp_resp = client.get("/api/shipments/SHP-24811").json()
    inv_gw_field = next(
        f for f in shp_resp["fields"]
        if f["doc_type"] == "INVOICE" and f["field_key"] == "gross_weight_kg"
    )
    client.patch(
        f"/api/shipments/SHP-24811/fields/{inv_gw_field['id']}",
        json={"value": "3120.00", "is_confirmed_by_human": True, "edit_reason": "Reset to create mismatch"},
    )

    # 3. Locate the failed THREE_WAY_GROSS_WEIGHT check
    shp_mismatched = client.get("/api/shipments/SHP-24811").json()
    check = next(
        c for c in shp_mismatched["cross_checks"]
        if c["rule_code"] == "THREE_WAY_GROSS_WEIGHT"
    )
    assert check["status"] == "FAILED"

    # 4. Resolve check via OVERRIDE_WITH_AUDIT_NOTE
    override_resp = client.post(
        f"/api/shipments/SHP-24811/crosschecks/{check['id']}/resolve",
        json={
            "action": "OVERRIDE_WITH_AUDIT_NOTE",
            "resolution_note": "Verified with shipper: 45 kg delta is tare weight of 12 wooden pallets excluded from commercial invoice.",
        },
        headers={"Authorization": f"Bearer {exec_token}"},
    )
    assert override_resp.status_code == 200
    overridden_shp = override_resp.json()
    assert overridden_shp["requires_manager_approval"] is True
    assert overridden_shp["status"] == "READY_FOR_APPROVAL"

    # 5. Verify Documentation Executive CANNOT approve (HTTP 403)
    exec_approve = client.post(
        "/api/shipments/SHP-24811/approve",
        json={"approval_note": "Executive attempt to approve"},
        headers={"Authorization": f"Bearer {exec_token}"},
    )
    assert exec_approve.status_code == 403
    assert "Documentation Manager approval is required" in exec_approve.json()["detail"]

    # 6. Verify export is blocked while awaiting manager signoff (HTTP 422)
    blocked_export = client.get("/api/shipments/SHP-24811/export")
    assert blocked_export.status_code == 422
    assert blocked_export.json()["detail"]["requires_manager_signoff"] is True

    # 7. Verify Documentation Manager CAN approve (HTTP 200)
    mgr_approve = client.post(
        "/api/shipments/SHP-24811/approve",
        json={"approval_note": "Approved by Documentation Manager Priya Nair after customs justification review"},
        headers={"Authorization": f"Bearer {mgr_token}"},
    )
    assert mgr_approve.status_code == 200
    approved_shp = mgr_approve.json()
    assert approved_shp["status"] == "APPROVED"

    # 8. Export is now unlocked
    final_export = client.get("/api/shipments/SHP-24811/export")
    assert final_export.status_code == 200
    assert "text/csv" in final_export.headers["content-type"]


# ==============================================================================
# 6. TEST CONFIRMING LOW-CONFIDENCE FIELDS UNLOCKS EXPORT
# ==============================================================================
def test_confirming_low_confidence_fields_on_shp_24812_unlocks_export(client):
    """Verify confirming amber fields on SHP-24812 transitions status to APPROVED and allows export."""
    shp = client.get("/api/shipments/SHP-24812").json()
    assert shp["status"] == "NEEDS_REVIEW"

    # Confirm the low-confidence incoterm field
    incoterm_field = next(f for f in shp["fields"] if f["field_key"] == "incoterm")
    assert incoterm_field["is_low_confidence"] is True
    patch_field_resp = client.patch(
        f"/api/shipments/SHP-24812/fields/{incoterm_field['id']}",
        json={
            "value": "CIF Nhava Sheva",
            "is_confirmed_by_human": True,
            "edit_reason": "Confirmed CIF Incoterm from Swedish header",
        },
    )
    assert patch_field_resp.status_code == 200

    # Confirm the low-confidence line item HSN code
    line_item = shp["line_items"][0]
    assert line_item["is_low_confidence"] is True
    patch_line_resp = client.patch(
        f"/api/shipments/SHP-24812/line-items/{line_item['id']}",
        json={
            "hsn_code": "84818030",
            "is_confirmed_by_human": True,
            "edit_reason": "Confirmed 84818030 industrial valve classification",
        },
    )
    assert patch_line_resp.status_code == 200

    # Shipment should now be fully approved
    updated_shp = patch_line_resp.json()
    assert updated_shp["status"] == "APPROVED"

    # Export now succeeds
    export_resp = client.get("/api/shipments/SHP-24812/export")
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers["content-type"]
    assert "SHP-24812" in export_resp.text
    assert "84818030" in export_resp.text


# ==============================================================================
# 7. TEST ANALYTICS OVERVIEW REFLECTS LIVE FIELD EDITS
# ==============================================================================
def test_analytics_overview_reflects_live_field_edits(client):
    """Verify GET /api/analytics/overview returns KPI summary, field breakdown, supplier stats, and recent edits."""
    resp = client.get("/api/analytics/overview")
    assert resp.status_code == 200
    data = resp.json()

    # Verify Summary KPIs
    assert "summary" in data
    summary = data["summary"]
    assert summary["target_accuracy_pct"] == 95.0
    assert summary["overall_accuracy_pct"] >= 90.0
    assert summary["total_fields_audited"] >= 60

    # Verify By-Field breakdown
    assert "by_field" in data
    assert len(data["by_field"]) >= 10
    field_keys = [f["field_key"] for f in data["by_field"]]
    assert "gross_weight_kg" in field_keys
    assert "incoterm" in field_keys
    assert "hsn_code" in field_keys

    # Verify By-Supplier breakdown
    assert "by_supplier" in data
    assert len(data["by_supplier"]) >= 2
    supplier_names = [s["supplier_name"] for s in data["by_supplier"]]
    assert any("Company B" in s for s in supplier_names)
    assert any("Company C" in s for s in supplier_names)

    # Verify Recent Edits Audit Trail
    assert "recent_edits" in data
    assert len(data["recent_edits"]) > 0
    first_edit = data["recent_edits"][0]
    assert "shipment_code" in first_edit
    assert "field_key" in first_edit
    assert "edited_by_name" in first_edit
    assert "edit_reason" in first_edit

    # Test filtering by supplier
    filtered_supplier_resp = client.get("/api/analytics/overview?supplier=Sweden")
    assert filtered_supplier_resp.status_code == 200
    for edit in filtered_supplier_resp.json()["recent_edits"]:
        assert "Sweden" in edit["supplier_name"]

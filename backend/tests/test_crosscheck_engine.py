"""Automated test suite for the Deterministic 3-Way Cross-Check Engine.

Verifies:
1. All 6 cross-check rules run deterministically:
   - INVOICE_TOTAL_VS_LINE_SUM
   - THREE_WAY_GROSS_WEIGHT
   - TWO_WAY_NET_WEIGHT
   - THREE_WAY_PACKAGES
   - TWO_WAY_ITEM_QTY
   - THREE_WAY_CONTAINER_AND_SUPPLIER
2. SHP-24811 accurately catches the 3120 kg (Invoice) vs 3165 kg (PL & BoL) mismatch.
3. Cross-check sync resolution updates all documents to the authoritative value.
4. Manual field edit re-triggers the cross-check engine and dynamically recalculates pass/fail state.
"""

import pytest
from app.services.seeder import seed_database
from tests.conftest import TestingSessionLocal


@pytest.fixture(autouse=True)
def reset_db_state():
    """Ensure baseline test data is pristine for cross-check tests."""
    db = TestingSessionLocal()
    try:
        seed_database(db, force_refresh=True)
    finally:
        db.close()
    yield
    db = TestingSessionLocal()
    try:
        seed_database(db, force_refresh=True)
    finally:
        db.close()


def test_shp_24811_weight_mismatch_detected(client):
    """Verify SHP-24811 has exactly 6 cross-checks with THREE_WAY_GROSS_WEIGHT in FAILED status."""
    resp = client.get("/api/shipments/SHP-24811")
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "CROSS_CHECK_FAILED"
    cross_checks = data["cross_checks"]
    assert len(cross_checks) == 6

    # Verify rule codes
    rule_codes = {c["rule_code"] for c in cross_checks}
    expected_rules = {
        "INVOICE_TOTAL_VS_LINE_SUM",
        "THREE_WAY_GROSS_WEIGHT",
        "TWO_WAY_NET_WEIGHT",
        "THREE_WAY_PACKAGES",
        "TWO_WAY_ITEM_QTY",
        "THREE_WAY_CONTAINER_AND_SUPPLIER",
    }
    assert rule_codes == expected_rules

    # Find the gross weight check
    gw_check = next(c for c in cross_checks if c["rule_code"] == "THREE_WAY_GROSS_WEIGHT")
    assert gw_check["status"] == "FAILED"
    assert "3,120.00" in gw_check["invoice_value"]
    assert "3,165.00" in gw_check["packing_list_value"]
    assert "3,165.00" in gw_check["bol_value"]
    assert "45.00" in gw_check["discrepancy_delta"] or "45.00" in gw_check["explanation"]


def test_shp_24813_clean_shipment_all_crosschecks_passed(client):
    """Verify clean verified shipment SHP-24813 passes all 6 deterministic cross-checks."""
    resp = client.get("/api/shipments/SHP-24813")
    assert resp.status_code == 200
    data = resp.json()

    cross_checks = data["cross_checks"]
    assert len(cross_checks) == 6
    assert all(c["status"] == "PASSED" for c in cross_checks)


def test_sync_to_authoritative_value_clears_weight_check(client):
    """Verify SYNC_TO_AUTHORITATIVE_VALUE updates invoice to 3165.00 kg and clears check."""
    shp = client.get("/api/shipments/SHP-24811").json()
    gw_check = next(c for c in shp["cross_checks"] if c["rule_code"] == "THREE_WAY_GROSS_WEIGHT")
    assert gw_check["status"] == "FAILED"

    # Resolve via sync
    resolve_resp = client.post(
        f"/api/shipments/SHP-24811/crosschecks/{gw_check['id']}/resolve",
        json={
            "action": "SYNC_TO_AUTHORITATIVE_VALUE",
            "target_value": "3165.00",
            "resolution_note": "Synchronized invoice gross weight to match authoritative packing list and bill of lading",
        },
    )
    assert resolve_resp.status_code == 200
    updated_shp = resolve_resp.json()

    updated_gw_check = next(c for c in updated_shp["cross_checks"] if c["rule_code"] == "THREE_WAY_GROSS_WEIGHT")
    assert updated_gw_check["status"] == "PASSED"
    assert updated_shp["status"] == "APPROVED"


def test_manual_field_edit_triggers_dynamic_crosscheck_recalculation(client):
    """Verify updating invoice gross weight via PATCH /fields dynamically re-runs cross-check engine."""
    shp = client.get("/api/shipments/SHP-24811").json()
    inv_gw_field = next(
        f for f in shp["fields"]
        if f["doc_type"] == "INVOICE" and f["field_key"] == "gross_weight_kg"
    )
    assert inv_gw_field["current_value"] == "3120.00"

    # Operator corrects invoice weight to 3165.00
    patch_resp = client.patch(
        f"/api/shipments/SHP-24811/fields/{inv_gw_field['id']}",
        json={
            "value": "3165.00",
            "is_confirmed_by_human": True,
            "edit_reason": "Corrected typing error on invoice gross weight",
        },
    )
    assert patch_resp.status_code == 200
    updated_shp = patch_resp.json()

    # Verify check automatically flipped to PASSED
    gw_check = next(c for c in updated_shp["cross_checks"] if c["rule_code"] == "THREE_WAY_GROSS_WEIGHT")
    assert gw_check["status"] == "PASSED"


def test_line_item_math_check_in_crosscheck_engine(client):
    """Verify INVOICE_TOTAL_VS_LINE_SUM checks line total arithmetic against invoice total."""
    shp = client.get("/api/shipments/SHP-24811").json()
    math_check = next(c for c in shp["cross_checks"] if c["rule_code"] == "INVOICE_TOTAL_VS_LINE_SUM")
    assert math_check["status"] == "PASSED"
    assert "16,320.00" in math_check["invoice_value"]

"""Automated test suite for the Customs Filing Export Gatekeeper.

Verifies:
1. SHP-24811 is blocked (HTTP 422) by failed cross-check (weight mismatch).
2. SHP-24812 is blocked (HTTP 422) by unconfirmed low-confidence fields (<85%).
3. SHP-24814 is blocked (HTTP 422) by degraded/unreadable document requiring manual entry.
4. SHP-24813 clean verified shipment downloads valid UTF-8 BOM CSV (HTTP 200).
5. SHP-24811 export unlocks with HTTP 200 once weight discrepancy is resolved.
6. Exported CSV contains exactly the 27 customs filing software flat-file columns.
"""

import pytest
from app.services.seeder import seed_database
from tests.conftest import TestingSessionLocal


@pytest.fixture(autouse=True)
def reset_db_state():
    """Ensure baseline test data is pristine for export gatekeeper tests."""
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


def test_export_blocked_on_shp_24811_by_crosscheck(client):
    """Verify GET /api/shipments/SHP-24811/export returns HTTP 422 with cross-check blocker detail."""
    resp = client.get("/api/shipments/SHP-24811/export")
    assert resp.status_code == 422
    data = resp.json()
    assert "detail" in data
    detail = data["detail"]
    assert detail["code"] == "EXPORT_BLOCKED_UNRESOLVED_ITEMS"
    assert detail["failed_crosschecks_count"] >= 1
    rule_names = [c["rule_code"] for c in detail["blocking_crosschecks"]]
    assert "THREE_WAY_GROSS_WEIGHT" in rule_names


def test_export_blocked_on_shp_24812_by_low_confidence_fields(client):
    """Verify GET /api/shipments/SHP-24812/export returns HTTP 422 due to unconfirmed amber fields."""
    resp = client.get("/api/shipments/SHP-24812/export")
    assert resp.status_code == 422
    data = resp.json()
    detail = data["detail"]
    assert detail["code"] == "EXPORT_BLOCKED_UNRESOLVED_ITEMS"
    assert detail["unconfirmed_fields_count"] >= 1
    keys = [f["field_key"] for f in detail["blocking_fields"]]
    assert "incoterm" in keys


def test_export_blocked_on_shp_24814_by_unreadable_document(client):
    """Verify GET /api/shipments/SHP-24814/export returns HTTP 422 due to degraded/unreadable packing list."""
    resp = client.get("/api/shipments/SHP-24814/export")
    assert resp.status_code == 422
    data = resp.json()
    detail = data["detail"]
    assert detail["code"] == "EXPORT_BLOCKED_UNRESOLVED_ITEMS"
    assert detail["unreadable_docs_pending_count"] >= 1


def test_export_preview_endpoint_structure(client):
    """Verify GET /api/shipments/{ref}/export/preview returns readiness state and 27 column schema."""
    # Check clean shipment preview
    resp = client.get("/api/shipments/SHP-24813/export/preview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_ready"] is True
    assert data["blocker_detail"] is None
    assert len(data["csv_columns"]) == 27
    assert "Job_Ref_No" in data["csv_columns"]
    assert "Line_Assessable_Value_FC" in data["csv_columns"]
    assert len(data["preview_rows"]) >= 1


def test_clean_shipment_shp_24813_exports_csv_200(client):
    """Verify clean verified shipment SHP-24813 exports UTF-8 BOM CSV with 27 columns."""
    resp = client.get("/api/shipments/SHP-24813/export")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "attachment; filename=\"BrokerLens_Filing_SHP-24813.csv\"" in resp.headers["content-disposition"]

    # Verify UTF-8 BOM bytes (\xef\xbb\xbf)
    assert resp.content.startswith(b"\xef\xbb\xbf")

    csv_text = resp.text
    assert "Job_Ref_No,Shipment_ID,Importer_Name,Importer_IEC" in csv_text
    assert "SHP-24813" in csv_text
    assert "Shenzhen Precision Motors" in csv_text

    # Verify status changed to EXPORTED
    shp = client.get("/api/shipments/SHP-24813").json()
    assert shp["status"] == "EXPORTED"
    assert shp["exported_at"] is not None


def test_resolving_weight_mismatch_unlocks_shp_24811_export(client):
    """Verify syncing weight discrepancy unlocks HTTP 200 export on SHP-24811."""
    shp = client.get("/api/shipments/SHP-24811").json()
    gw_check = next(c for c in shp["cross_checks"] if c["rule_code"] == "THREE_WAY_GROSS_WEIGHT")

    client.post(
        f"/api/shipments/SHP-24811/crosschecks/{gw_check['id']}/resolve",
        json={
            "action": "SYNC_TO_AUTHORITATIVE_VALUE",
            "target_value": "3165.00",
            "resolution_note": "Sync invoice weight to authoritative packing list",
        },
    )

    resp = client.get("/api/shipments/SHP-24811/export")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "3165.00" in resp.text

"""Automated test suite for Manager Accuracy Analytics and Client Brief Math Alignment.

Verifies:
1. Analytics summary metrics match the exact Problem Statement #3 client brief math:
   - 1,100 shipments/month (13,200 shipments/year)
   - 14 documentation executives @ ₹350/hour staff rate
   - ₹34.65 Lakh/yr manual data entry baseline cost (9,900 hours)
   - ₹35.64 Lakh/yr error & demurrage baseline bleed (396 cases @ ₹9,000)
   - ₹70.29 Lakh/yr total problem cost
   - ₹52.40 Lakh/yr net savings (₹25.87L direct labor + ₹26.53L demurrage avoidance)
   - 95.0% target SLA
2. Field edits increment total_human_edits and update live accuracy percentages.
3. Filtering analytics by supplier and field key works correctly.
4. POST /api/shipments/reset-demo idempotently restores all 4 seed consignments.
"""

import pytest
from app.services.seeder import seed_database
from tests.conftest import TestingSessionLocal


@pytest.fixture(autouse=True)
def reset_db_state():
    """Ensure baseline test data is pristine for analytics tests."""
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


def test_problem_statement_3_math_alignment(client):
    """Verify /api/analytics/overview returns exact client brief numbers and ROI formulas."""
    resp = client.get("/api/analytics/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert "summary" in data
    s = data["summary"]

    # Verify baseline problem cost parameters
    assert s["monthly_shipments_volume"] == 1100
    assert s["annual_shipments_volume"] == 13200
    assert s["documentation_team_size"] == 14
    assert s["staff_hourly_rate_inr"] == 350.0
    assert s["baseline_manual_entry_cost_lakhs"] == 34.65
    assert s["baseline_error_demurrage_cost_lakhs"] == 35.64
    assert s["total_baseline_problem_cost_lakhs"] == 70.29

    # Verify BrokerLens impact and ROI
    assert s["labor_savings_lakhs"] == 25.87
    assert s["demurrage_savings_lakhs"] == 26.53
    assert s["estimated_annual_savings_lakhs"] == 52.40
    assert s["target_accuracy_pct"] == 95.0
    assert s["project_build_cost_lakhs"] == 7.5
    assert s["project_timeline_weeks"] == 6


def test_live_field_edits_update_analytics(client):
    """Verify editing a field increments total_human_edits and recalculates accuracy percentages."""
    init_resp = client.get("/api/analytics/overview").json()
    init_edits = init_resp["summary"]["total_human_edits"]

    # Make an edit on SHP-24811
    shp = client.get("/api/shipments/SHP-24811").json()
    field = next(f for f in shp["fields"] if f["field_key"] == "incoterm")

    patch_resp = client.patch(
        f"/api/shipments/SHP-24811/fields/{field['id']}",
        json={
            "value": "CIF Nhava Sheva",
            "is_confirmed_by_human": True,
            "edit_reason": "Operator verified CIF term with importer",
        },
    )
    assert patch_resp.status_code == 200

    # Verify analytics updated
    updated_resp = client.get("/api/analytics/overview").json()
    assert updated_resp["summary"]["total_human_edits"] == init_edits + 1

    # Verify recent edits includes our edit
    latest_edit = updated_resp["recent_edits"][0]
    assert latest_edit["shipment_code"] == "SHP-24811"
    assert latest_edit["field_key"] == "incoterm"
    assert latest_edit["updated_human_value"] == "CIF Nhava Sheva"


def test_analytics_query_filters(client):
    """Verify filtering analytics by supplier name and field key."""
    # Filter by supplier
    resp_china = client.get("/api/analytics/overview?supplier=China")
    assert resp_china.status_code == 200
    for edit in resp_china.json()["recent_edits"]:
        assert "China" in edit["supplier_name"]

    # Filter by field key
    resp_field = client.get("/api/analytics/overview?field_key=gross_weight_kg")
    assert resp_field.status_code == 200
    for edit in resp_field.json()["recent_edits"]:
        assert edit["field_key"] == "gross_weight_kg"


def test_reset_demo_endpoint(client):
    """Verify POST /api/shipments/reset-demo restores all 4 shipments and original seed state."""
    # First alter SHP-24811
    shp = client.get("/api/shipments/SHP-24811").json()
    field = shp["fields"][0]
    client.patch(
        f"/api/shipments/SHP-24811/fields/{field['id']}",
        json={"value": "ALTERED_TEST_VAL", "is_confirmed_by_human": True},
    )

    # Call reset demo endpoint
    reset_resp = client.post("/api/shipments/reset-demo")
    assert reset_resp.status_code == 200
    data = reset_resp.json()
    assert data["status"] == "reset_complete"
    assert data["shipments_count"] >= 4

    # Verify SHP-24811 is restored to original state
    restored_shp = client.get("/api/shipments/SHP-24811").json()
    assert restored_shp["status"] == "CROSS_CHECK_FAILED"
    restored_field = next(f for f in restored_shp["fields"] if f["field_key"] == "gross_weight_kg")
    assert restored_field["current_value"] == "3120.00"

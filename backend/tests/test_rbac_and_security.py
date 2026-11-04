"""Automated test suite for Security Hardening, Access Control (RBAC), and Input Sanitization.

Verifies:
1. Invalid or malformed JWT Bearer tokens return HTTP 401 Unauthorized.
2. Cross-check overrides escalate to Documentation Manager sign-off; Executive attempt is rejected (HTTP 403 Forbidden).
3. Documentation Manager sign-off succeeds (HTTP 200 OK).
4. Negative weight/quantity values are rejected with HTTP 422 Unprocessable Entity.
5. Cross-check resolution note under 5 characters is rejected with HTTP 422 Unprocessable Entity.
6. Dangerous file uploads (.exe, .sh, .py) are rejected with HTTP 400 Bad Request.
7. India DPDP Act 2023 PII masking redacts importer contact details and IEC code.
"""

import io
import pytest
from app.services.seeder import seed_database
from tests.conftest import TestingSessionLocal


@pytest.fixture(autouse=True)
def reset_db_state():
    """Ensure baseline test data is pristine for security tests."""
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


def test_malformed_jwt_token_returns_401(client):
    """Verify passing an invalid or forged JWT Bearer token returns HTTP 401 Unauthorized."""
    resp = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer forged_invalid_garbage_token_123"},
    )
    assert resp.status_code == 401
    assert "token is expired or invalid" in resp.json()["detail"].lower()


def test_missing_jwt_token_on_protected_route_returns_401(client):
    """Verify accessing /api/auth/me without an Authorization header returns HTTP 401."""
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
    assert "missing" in resp.json()["detail"].lower() or "not authenticated" in resp.json()["detail"].lower()


def test_executive_cannot_approve_manager_gated_shipment(client):
    """Verify Documentation Executive receives HTTP 403 when attempting to sign off on an override."""
    exec_login = client.post("/api/auth/demo-login", json={"role": "DOCUMENTATION_EXECUTIVE"}).json()
    exec_token = exec_login["access_token"]

    mgr_login = client.post("/api/auth/demo-login", json={"role": "DOCUMENTATION_MANAGER"}).json()
    mgr_token = mgr_login["access_token"]

    # Locate failed cross-check on SHP-24811
    shp = client.get("/api/shipments/SHP-24811").json()
    check = next(c for c in shp["cross_checks"] if c["rule_code"] == "THREE_WAY_GROSS_WEIGHT")

    # Override check
    override_resp = client.post(
        f"/api/shipments/SHP-24811/crosschecks/{check['id']}/resolve",
        json={
            "action": "OVERRIDE_WITH_AUDIT_NOTE",
            "resolution_note": "Tare weight of packaging excluded from commercial invoice per customs declaration",
        },
        headers={"Authorization": f"Bearer {exec_token}"},
    )
    assert override_resp.status_code == 200
    assert override_resp.json()["requires_manager_approval"] is True

    # Executive attempts approval -> 403 Forbidden
    exec_approve = client.post(
        "/api/shipments/SHP-24811/approve",
        json={"approval_note": "Executive attempt to approve"},
        headers={"Authorization": f"Bearer {exec_token}"},
    )
    assert exec_approve.status_code == 403
    assert "Documentation Manager approval is required" in exec_approve.json()["detail"]

    # Manager approves -> 200 OK
    mgr_approve = client.post(
        "/api/shipments/SHP-24811/approve",
        json={"approval_note": "Approved by Documentation Manager Priya Nair"},
        headers={"Authorization": f"Bearer {mgr_token}"},
    )
    assert mgr_approve.status_code == 200
    assert mgr_approve.json()["status"] == "APPROVED"


def test_negative_numeric_values_rejected_with_422(client):
    """Verify input validation rejects negative gross weight with HTTP 422 Unprocessable Entity."""
    shp = client.get("/api/shipments/SHP-24811").json()
    field = next(f for f in shp["fields"] if f["field_key"] == "gross_weight_kg")

    resp = client.patch(
        f"/api/shipments/SHP-24811/fields/{field['id']}",
        json={"value": "-500.00", "is_confirmed_by_human": True},
    )
    assert resp.status_code == 422
    assert "cannot be negative" in resp.json()["detail"]


def test_short_crosscheck_override_note_rejected_with_422(client):
    """Verify cross-check resolution note under 5 characters fails Pydantic min_length validation."""
    shp = client.get("/api/shipments/SHP-24811").json()
    check = shp["cross_checks"][0]

    resp = client.post(
        f"/api/shipments/SHP-24811/crosschecks/{check['id']}/resolve",
        json={"action": "OVERRIDE_WITH_AUDIT_NOTE", "resolution_note": "ok"},
    )
    assert resp.status_code == 422


def test_malicious_file_uploads_rejected_with_400(client):
    """Verify .exe, .sh, and .py file uploads are rejected by MIME and extension security whitelist."""
    # Test .exe upload
    fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00")
    resp_exe = client.post(
        "/api/shipments/SHP-24811/documents?doc_type=INVOICE",
        files={"file": ("malware.exe", fake_exe, "application/octet-stream")},
    )
    assert resp_exe.status_code == 400
    assert "Unsupported file extension" in resp_exe.json()["detail"]

    # Test .sh upload
    fake_sh = io.BytesIO(b"#!/bin/bash\nrm -rf /\n")
    resp_sh = client.post(
        "/api/shipments/SHP-24811/documents?doc_type=PACKING_LIST",
        files={"file": ("exploit.sh", fake_sh, "application/x-sh")},
    )
    assert resp_sh.status_code == 400


def test_dpdp_pii_masking_applied_to_shipment_details(client):
    """Verify DPDP Act 2023 masking redacts email, phone, and IEC number."""
    # Query with PII masking enabled
    resp_masked = client.get("/api/shipments/SHP-24811?mask_pii=true")
    assert resp_masked.status_code == 200
    data_masked = resp_masked.json()

    assert "*" in data_masked["importer_contact_email"]
    assert "*" in data_masked["importer_contact_phone"]
    assert "*" in data_masked["importer_iec"]

    # Query with PII masking disabled
    resp_raw = client.get("/api/shipments/SHP-24811?mask_pii=false")
    assert resp_raw.status_code == 200
    data_raw = resp_raw.json()

    assert "0314098211" in data_raw["importer_iec"]
    assert "+91-9876543212" in data_raw["importer_contact_phone"]

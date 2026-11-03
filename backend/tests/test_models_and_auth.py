"""Comprehensive automated tests for database domain models, DPDP privacy, and RBAC authentication."""

from datetime import datetime
from fastapi import Depends, APIRouter

from app.models.domain import (
    User,
    Shipment,
    ShipmentDocument,
    ExtractedField,
    ShipmentLineItem,
    CrossCheckResult,
    FieldEditHistory,
)
from app.core.privacy import (
    mask_email,
    mask_phone,
    mask_iec,
    mask_shipment_pii_dict,
)
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.api.auth import require_executive, require_manager
from app.main import app

# Create router to test RBAC dependency enforcement
rbac_test_router = APIRouter(prefix="/api/test-rbac", tags=["Test RBAC"])


@rbac_test_router.get("/executive-only")
def executive_route(user: User = Depends(require_executive)):
    return {"message": f"Welcome Executive/Manager {user.full_name}"}


@rbac_test_router.get("/manager-only")
def manager_route(user: User = Depends(require_manager)):
    return {"message": f"Welcome Manager {user.full_name}"}


# Avoid registering multiple times if reloaded
if not any(getattr(r, "path", None) == "/api/test-rbac/executive-only" for r in app.routes):
    app.include_router(rbac_test_router)


# ==============================================================================
# 1. DATABASE MODELS TEST (ALL 7 DOMAIN TABLES)
# ==============================================================================
def test_all_seven_domain_models(db_session):
    """Verify that all 7 relational tables instantiate, persist, and maintain relational foreign keys."""
    # 1. User
    manager = User(
        email="manager.modeltest@companya-cha.in",
        full_name="Priya Model Test",
        hashed_password=get_password_hash("TestPass123!"),
        role="DOCUMENTATION_MANAGER",
    )
    db_session.add(manager)
    db_session.commit()
    db_session.refresh(manager)
    assert manager.id is not None
    assert manager.role == "DOCUMENTATION_MANAGER"

    # 2. Shipment
    shipment = Shipment(
        shipment_code="SHP-MODEL-TEST",
        title="Model Test Consignment",
        supplier_name="Test Supplier Co.",
        supplier_country="China",
        importer_name="Lumina Commercial Lighting Pvt. Ltd.",
        importer_iec="0314098211",
        importer_contact_name="Rohan Gupta",
        importer_contact_email="rohan@luminalighting.in",
        importer_contact_phone="+91-9876543212",
        port_of_loading="Shenzhen, China (CNSZX)",
        port_of_discharge="Nhava Sheva / JNPT, India (INNSA)",
        currency="USD",
        incoterm="FOB Shenzhen",
        status="CROSS_CHECK_FAILED",
        requires_manager_approval=True,
        processing_time_minutes=12.4,
        approved_by_id=manager.id,
    )
    db_session.add(shipment)
    db_session.commit()
    db_session.refresh(shipment)
    assert shipment.id is not None
    assert shipment.approved_by.full_name == "Priya Model Test"

    # 3. ShipmentDocument
    doc = ShipmentDocument(
        shipment_id=shipment.id,
        doc_type="INVOICE",
        file_name="TEST_INVOICE.pdf",
        file_url="/static/docs/TEST_INVOICE.pdf",
        page_count=1,
        skew_angle_deg=0.0,
        is_bilingual=True,
        language_hint="Mandarin/English",
        is_unreadable=False,
        avg_confidence=0.96,
        extraction_provider="gemini-2.5-flash",
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)
    assert doc.id is not None
    assert doc.doc_type == "INVOICE"

    # 4. ExtractedField
    field = ExtractedField(
        shipment_id=shipment.id,
        doc_type="INVOICE",
        field_key="gross_weight_kg",
        field_label="Gross Weight (KG)",
        field_category="TOTALS",
        ai_extracted_value="3120.00",
        current_value="3120.00",
        unit="KG",
        confidence_score=0.94,
        is_low_confidence=False,
        is_confirmed_by_human=False,
        page_number=1,
        bbox_hint="Bottom Totals Table",
    )
    db_session.add(field)
    db_session.commit()
    db_session.refresh(field)
    assert field.id is not None
    assert field.field_key == "gross_weight_kg"

    # 5. ShipmentLineItem
    line_item = ShipmentLineItem(
        shipment_id=shipment.id,
        doc_type="INVOICE",
        line_number=1,
        description="LED panel light 40W (600x600mm Backlit)",
        hsn_code="94054200",
        qty=2400.0,
        unit="PCS",
        unit_price=6.80,
        line_total=16320.00,
        gross_weight_kg=3120.0,
        confidence_score=0.97,
        is_low_confidence=False,
        is_confirmed_by_human=True,
    )
    db_session.add(line_item)
    db_session.commit()
    db_session.refresh(line_item)
    assert line_item.id is not None

    # 6. CrossCheckResult
    cross_check = CrossCheckResult(
        shipment_id=shipment.id,
        rule_code="THREE_WAY_GROSS_WEIGHT",
        rule_name="3-Way Gross Weight Cross-Check",
        compared_fields="gross_weight_kg",
        invoice_value="3120.00 kg",
        packing_list_value="3165.00 kg",
        bol_value="3165.00 kg",
        discrepancy_delta="45.00 kg delta",
        status="FAILED",
        severity="CRITICAL",
        explanation="Invoice gross weight is 45 kg lower than Packing List.",
    )
    db_session.add(cross_check)
    db_session.commit()
    db_session.refresh(cross_check)
    assert cross_check.id is not None

    # 7. FieldEditHistory
    edit_history = FieldEditHistory(
        shipment_id=shipment.id,
        shipment_code="SHP-MODEL-TEST",
        supplier_name="Test Supplier Co.",
        doc_type="INVOICE",
        field_key="gross_weight_kg",
        field_label="Gross Weight (KG)",
        original_ai_value="3120.00",
        updated_human_value="3165.00",
        was_ai_correct=False,
        ai_confidence=0.94,
        edited_by_name="Rohan Deshmukh",
        edited_by_role="DOCUMENTATION_EXECUTIVE",
        edit_reason="Authoritative weight confirmed by Packing List",
    )
    db_session.add(edit_history)
    db_session.commit()
    db_session.refresh(edit_history)
    assert edit_history.id is not None

    # Cascades check
    db_session.refresh(shipment)
    assert len(shipment.documents) == 1
    assert len(shipment.fields) == 1
    assert len(shipment.line_items) == 1
    assert len(shipment.cross_checks) == 1
    assert len(shipment.edit_history) == 1

    # Clean up test models so database remains clean for subsequent tests
    db_session.delete(shipment)
    db_session.delete(manager)
    db_session.commit()


# ==============================================================================
# 2. DPDP ACT 2023 PRIVACY MASKING TESTS
# ==============================================================================
def test_dpdp_pii_masking():
    """Verify that DPDP Act 2023 masking correctly obscures emails, phones, and IECs."""
    assert mask_email("rohan@luminalighting.in") == "r***@luminalighting.in"
    assert mask_email("a@b.com") == "a***@b.com"
    assert mask_email(None) is None

    phone_masked = mask_phone("+91-9876543212")
    assert phone_masked.startswith("+91-98")
    assert phone_masked.endswith("12")
    assert "******" in phone_masked

    iec_masked = mask_iec("0314098211")
    assert iec_masked.startswith("0314")
    assert iec_masked.endswith("11")
    assert "****" in iec_masked

    shipment_dict = {
        "importer_name": "Lumina Commercial Lighting Pvt. Ltd.",
        "importer_iec": "0314098211",
        "importer_contact_email": "rohan@luminalighting.in",
        "importer_contact_phone": "+91-9876543212",
        "currency": "USD",
    }
    masked = mask_shipment_pii_dict(shipment_dict, mask_pii=True)
    assert masked["importer_contact_email"] == "r***@luminalighting.in"
    assert "******" in masked["importer_contact_phone"]
    assert masked["importer_iec"] == "0314****11"
    assert masked["currency"] == "USD"

    unmasked = mask_shipment_pii_dict(shipment_dict, mask_pii=False)
    assert unmasked["importer_contact_email"] == "rohan@luminalighting.in"


# ==============================================================================
# 3. SECURITY & JWT TESTS
# ==============================================================================
def test_password_hashing_and_jwt():
    """Verify password hashing with bcrypt and JWT creation/validation."""
    password = "CustomsPassword2026!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

    claims = {"sub": "42", "email": "officer@customs.gov.in", "role": "DOCUMENTATION_MANAGER"}
    token = create_access_token(claims)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "42"
    assert decoded["email"] == "officer@customs.gov.in"
    assert decoded["role"] == "DOCUMENTATION_MANAGER"

    assert decode_access_token("invalid.jwt.token") is None


# ==============================================================================
# 4. API AUTH & RBAC ENDPOINT TESTS
# ==============================================================================
def test_health_check_endpoint(client):
    """Test health check route."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["region"] == "ap-south-1"


def test_auth_demo_login_and_me(client):
    """Verify 1-click demo login for Documentation Executive and Manager."""
    # 1. Login as Executive
    res_exec = client.post(
        "/api/auth/demo-login",
        json={"role": "DOCUMENTATION_EXECUTIVE"},
    )
    assert res_exec.status_code == 200
    exec_data = res_exec.json()
    assert "access_token" in exec_data
    assert exec_data["user"]["role"] == "DOCUMENTATION_EXECUTIVE"
    assert exec_data["user"]["email"] == "exec@companya-cha.in"

    # 2. Login as Manager
    res_mgr = client.post(
        "/api/auth/demo-login",
        json={"role": "DOCUMENTATION_MANAGER"},
    )
    assert res_mgr.status_code == 200
    mgr_data = res_mgr.json()
    assert "access_token" in mgr_data
    assert mgr_data["user"]["role"] == "DOCUMENTATION_MANAGER"
    assert mgr_data["user"]["email"] == "manager@companya-cha.in"

    # 3. Test /me with Executive token
    exec_headers = {"Authorization": f"Bearer {exec_data['access_token']}"}
    res_me = client.get("/api/auth/me", headers=exec_headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "exec@companya-cha.in"

    # 4. Test /me without token
    res_unauth = client.get("/api/auth/me")
    assert res_unauth.status_code == 401


def test_rbac_role_enforcement(client):
    """Test RBAC permission gates: Executive cannot access Manager-only endpoints."""
    exec_token = client.post(
        "/api/auth/demo-login",
        json={"role": "DOCUMENTATION_EXECUTIVE"},
    ).json()["access_token"]

    mgr_token = client.post(
        "/api/auth/demo-login",
        json={"role": "DOCUMENTATION_MANAGER"},
    ).json()["access_token"]

    exec_headers = {"Authorization": f"Bearer {exec_token}"}
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    # Both roles can access executive-allowed route
    res1 = client.get("/api/test-rbac/executive-only", headers=exec_headers)
    assert res1.status_code == 200
    res2 = client.get("/api/test-rbac/executive-only", headers=mgr_headers)
    assert res2.status_code == 200

    # Manager-only route: Executive must get 403 Forbidden, Manager must get 200 OK
    res_forbidden = client.get("/api/test-rbac/manager-only", headers=exec_headers)
    assert res_forbidden.status_code == 403
    assert "Access denied" in res_forbidden.json()["detail"]

    res_allowed = client.get("/api/test-rbac/manager-only", headers=mgr_headers)
    assert res_allowed.status_code == 200
    assert "Welcome Manager Priya Nair" in res_allowed.json()["message"]


def test_standard_login_flow(client):
    """Test standard email/password login endpoint with valid and invalid credentials."""
    res_valid = client.post(
        "/api/auth/login",
        json={"email": "exec@companya-cha.in", "password": "DemoExec!2026"},
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["user"]["email"] == "exec@companya-cha.in"

    res_invalid = client.post(
        "/api/auth/login",
        json={"email": "exec@companya-cha.in", "password": "WrongPassword123!"},
    )
    assert res_invalid.status_code == 401

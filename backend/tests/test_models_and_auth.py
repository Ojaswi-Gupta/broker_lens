"""Comprehensive automated tests for database domain models, DPDP privacy, and RBAC authentication."""

import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import Depends, APIRouter
from fastapi.testclient import TestClient

from app.database import Base, get_db
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

# In-memory SQLite engine with StaticPool so all connections share the same memory instance
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

# Create temporary router to test RBAC dependency enforcement (do not prefix with test_ to avoid pytest warning)
rbac_test_router = APIRouter(prefix="/api/test-rbac", tags=["Test RBAC"])


@rbac_test_router.get("/executive-only")
def executive_route(user: User = Depends(require_executive)):
    return {"message": f"Welcome Executive/Manager {user.full_name}"}


@rbac_test_router.get("/manager-only")
def manager_route(user: User = Depends(require_manager)):
    return {"message": f"Welcome Manager {user.full_name}"}


app.include_router(rbac_test_router)


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    return TestClient(app)


# ==============================================================================
# 1. DATABASE MODELS TEST (ALL 7 DOMAIN TABLES)
# ==============================================================================
def test_all_seven_domain_models():
    """Verify that all 7 relational tables instantiate, persist, and maintain relational foreign keys."""
    db = TestingSessionLocal()
    try:
        # 1. User
        manager = User(
            email="manager.test@companya-cha.in",
            full_name="Priya Nair",
            hashed_password=get_password_hash("TestPass123!"),
            role="DOCUMENTATION_MANAGER",
        )
        db.add(manager)
        db.commit()
        db.refresh(manager)
        assert manager.id is not None
        assert manager.role == "DOCUMENTATION_MANAGER"

        # 2. Shipment
        shipment = Shipment(
            shipment_code="SHP-24811",
            title="Company B (China) — LED Panel Light 40W Consignment",
            supplier_name="Company B (China) / 深圳市B照明有限公司",
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
        db.add(shipment)
        db.commit()
        db.refresh(shipment)
        assert shipment.id is not None
        assert shipment.shipment_code == "SHP-24811"
        assert shipment.approved_by.full_name == "Priya Nair"

        # 3. ShipmentDocument
        doc = ShipmentDocument(
            shipment_id=shipment.id,
            doc_type="INVOICE",
            file_name="SHP-24811_INVOICE.pdf",
            file_url="/static/docs/SHP-24811_INVOICE.pdf",
            page_count=2,
            skew_angle_deg=0.0,
            is_bilingual=True,
            language_hint="Mandarin/English",
            is_unreadable=False,
            avg_confidence=0.96,
            extraction_provider="gemini-2.5-flash",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        assert doc.id is not None
        assert doc.doc_type == "INVOICE"
        assert doc.shipment.shipment_code == "SHP-24811"

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
        db.add(field)
        db.commit()
        db.refresh(field)
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
        db.add(line_item)
        db.commit()
        db.refresh(line_item)
        assert line_item.id is not None
        assert line_item.hsn_code == "94054200"

        # 6. CrossCheckResult
        cross_check = CrossCheckResult(
            shipment_id=shipment.id,
            rule_code="THREE_WAY_GROSS_WEIGHT",
            rule_name="3-Way Gross Weight Cross-Check",
            compared_fields="gross_weight_kg",
            invoice_value="3120.00 kg",
            packing_list_value="3165.00 kg",
            bol_value="3165.00 kg",
            discrepancy_delta="45.00 kg delta between Invoice (3,120 kg) and Packing List/BoL (3,165 kg)",
            status="FAILED",
            severity="CRITICAL",
            explanation="Invoice gross weight is 45 kg lower than Packing List and Bill of Lading.",
        )
        db.add(cross_check)
        db.commit()
        db.refresh(cross_check)
        assert cross_check.id is not None
        assert cross_check.status == "FAILED"

        # 7. FieldEditHistory
        edit_history = FieldEditHistory(
            shipment_id=shipment.id,
            shipment_code="SHP-24811",
            supplier_name="Company B (China)",
            doc_type="INVOICE",
            field_key="gross_weight_kg",
            field_label="Gross Weight (KG)",
            original_ai_value="3120.00",
            updated_human_value="3165.00",
            was_ai_correct=False,
            ai_confidence=0.94,
            edited_by_name="Rohan Deshmukh",
            edited_by_role="DOCUMENTATION_EXECUTIVE",
            edit_reason="Authoritative weight confirmed by Packing List and Bill of Lading",
        )
        db.add(edit_history)
        db.commit()
        db.refresh(edit_history)
        assert edit_history.id is not None
        assert edit_history.updated_human_value == "3165.00"

        # Verify cascades and relationships
        db.refresh(shipment)
        assert len(shipment.documents) == 1
        assert len(shipment.fields) == 1
        assert len(shipment.line_items) == 1
        assert len(shipment.cross_checks) == 1
        assert len(shipment.edit_history) == 1

    finally:
        db.close()


# ==============================================================================
# 2. DPDP ACT 2023 PRIVACY MASKING TESTS
# ==============================================================================
def test_dpdp_pii_masking():
    """Verify that DPDP Act 2023 masking correctly obscures emails, phones, and IECs."""
    # Email masking
    assert mask_email("rohan@luminalighting.in") == "r***@luminalighting.in"
    assert mask_email("a@b.com") == "a***@b.com"
    assert mask_email(None) is None

    # Phone masking
    phone_masked = mask_phone("+91-9876543212")
    assert phone_masked.startswith("+91-98")
    assert phone_masked.endswith("12")
    assert "******" in phone_masked

    # IEC masking (10-digit Indian Importer Exporter Code)
    iec_masked = mask_iec("0314098211")
    assert iec_masked.startswith("0314")
    assert iec_masked.endswith("11")
    assert "****" in iec_masked

    # Dictionary masking
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

    # When masking is disabled
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

    # JWT Token
    claims = {"sub": "42", "email": "officer@customs.gov.in", "role": "DOCUMENTATION_MANAGER"}
    token = create_access_token(claims)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "42"
    assert decoded["email"] == "officer@customs.gov.in"
    assert decoded["role"] == "DOCUMENTATION_MANAGER"

    # Malformed token
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
    # Obtain tokens
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

    # Executive-allowed route: both roles should pass
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
    # Seed users first via demo login call
    client.post("/api/auth/demo-login", json={"role": "DOCUMENTATION_EXECUTIVE"})

    # Valid login
    res_valid = client.post(
        "/api/auth/login",
        json={"email": "exec@companya-cha.in", "password": "DemoExec!2026"},
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["user"]["email"] == "exec@companya-cha.in"

    # Invalid password
    res_invalid = client.post(
        "/api/auth/login",
        json={"email": "exec@companya-cha.in", "password": "WrongPassword123!"},
    )
    assert res_invalid.status_code == 401

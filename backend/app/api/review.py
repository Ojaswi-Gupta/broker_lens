"""Review workbench, field correction, cross-check resolution, export gatekeeper, and analytics endpoints."""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import (
    User,
    Shipment,
    ShipmentDocument,
    ExtractedField,
    ShipmentLineItem,
    CrossCheckResult,
    FieldEditHistory,
)
from app.schemas.review import (
    FieldUpdateRequest,
    LineItemUpdateRequest,
    CrossCheckResolveRequest,
    ShipmentApprovalRequest,
    ExportPreviewResponse,
)
from app.schemas.shipment import ShipmentResponse
from app.api.shipments import serialize_shipment_detail
from app.services.crosscheck_engine import (
    run_three_way_crosschecks,
    recalculate_shipment_status,
    _normalize_string,
)
from app.services.export_service import (
    evaluate_export_readiness,
    generate_customs_filing_csv,
)
from app.services.accuracy_service import get_accuracy_and_audit_analytics
from app.core.security import decode_access_token

router = APIRouter(tags=["Review Workbench & Export Gatekeeper"])
security_scheme = HTTPBearer(auto_error=False)


def get_optional_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Extract authenticated user if present. If an Authorization header is provided, validate strictly."""
    if not auth or not auth.credentials:
        return None
    payload = decode_access_token(auth.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is expired or invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User belonging to this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_shipment_by_ref(ref: str, db: Session) -> Shipment:
    """Find shipment by either shipment_code ('SHP-24811') or numeric primary key."""
    clean_ref = ref.strip()
    if clean_ref.isdigit():
        shipment = db.query(Shipment).filter(Shipment.id == int(clean_ref)).first()
    else:
        shipment = db.query(Shipment).filter(Shipment.shipment_code == clean_ref.upper()).first()

    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{ref}' not found.",
        )
    return shipment


# ==============================================================================
# 1. FIELD & LINE ITEM CORRECTION WORKBENCH
# ==============================================================================
@router.patch("/api/shipments/{shipment_ref}/fields/{field_id}", response_model=ShipmentResponse)
def update_extracted_field(
    shipment_ref: str,
    field_id: int,
    request: FieldUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Edit extracted field value, confirm low-confidence flags, log audit trail, and re-run cross-checks."""
    shipment = get_shipment_by_ref(shipment_ref, db)
    field = db.query(ExtractedField).filter(
        ExtractedField.id == field_id,
        ExtractedField.shipment_id == shipment.id,
    ).first()

    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field {field_id} not found on shipment '{shipment.shipment_code}'.",
        )

    user_name = current_user.full_name if current_user else "Rohan Deshmukh"
    user_role = current_user.role if current_user else "DOCUMENTATION_EXECUTIVE"

    new_val = request.value.strip() if request.value is not None else field.current_value
    original_ai = field.ai_extracted_value

    # Strict numeric validation: reject negative numbers on quantity/weight/price
    numeric_keys = {"gross_weight_kg", "net_weight_kg", "qty", "invoice_total", "unit_price", "packages"}
    if field.field_key in numeric_keys and new_val:
        try:
            val_clean = new_val.replace(",", "").replace("$", "").replace("€", "").replace("kg", "").replace("KG", "").strip()
            numeric_val = float(val_clean)
            if numeric_val < 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Field '{field.field_key}' cannot be negative (got '{new_val}').",
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Field '{field.field_key}' requires a valid numeric value (got '{new_val}').",
            )

    was_correct = _normalize_string(original_ai) == _normalize_string(new_val)

    # Log immutable audit trail entry
    history_entry = FieldEditHistory(
        shipment_id=shipment.id,
        shipment_code=shipment.shipment_code,
        supplier_name=shipment.supplier_name,
        doc_type=field.doc_type,
        field_key=field.field_key,
        field_label=field.field_label,
        original_ai_value=original_ai,
        updated_human_value=new_val,
        was_ai_correct=was_correct,
        ai_confidence=field.confidence_score,
        edited_by_name=user_name,
        edited_by_role=user_role,
        edit_reason=request.edit_reason or ("Verified by operator" if was_correct else "Corrected by operator"),
    )
    db.add(history_entry)

    # Update field state
    field.current_value = new_val
    field.is_confirmed_by_human = request.is_confirmed_by_human
    field.is_manual_entry = False
    field.confirmed_by_name = user_name
    field.confirmed_at = datetime.utcnow()

    # Check if this document was unreadable and if all fields are now confirmed
    doc = db.query(ShipmentDocument).filter(
        ShipmentDocument.shipment_id == shipment.id,
        ShipmentDocument.doc_type == field.doc_type,
    ).first()
    if doc and doc.is_unreadable:
        doc_fields = [f for f in shipment.fields if f.doc_type == field.doc_type]
        if all(f.is_confirmed_by_human for f in doc_fields):
            doc.is_unreadable = False

    db.flush()

    # Re-run 3-way cross-check engine and recalculate shipment status dynamically
    run_three_way_crosschecks(db, shipment)
    recalculate_shipment_status(db, shipment)
    db.commit()
    db.refresh(shipment)

    return serialize_shipment_detail(shipment)


@router.patch("/api/shipments/{shipment_ref}/line-items/{line_id}", response_model=ShipmentResponse)
def update_line_item(
    shipment_ref: str,
    line_id: int,
    request: LineItemUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Update line item classification (8-digit HSN), pricing, or quantity and re-run arithmetic cross-checks."""
    shipment = get_shipment_by_ref(shipment_ref, db)
    line_item = db.query(ShipmentLineItem).filter(
        ShipmentLineItem.id == line_id,
        ShipmentLineItem.shipment_id == shipment.id,
    ).first()

    if not line_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Line item {line_id} not found on shipment '{shipment.shipment_code}'.",
        )

    user_name = current_user.full_name if current_user else "Rohan Deshmukh"
    user_role = current_user.role if current_user else "DOCUMENTATION_EXECUTIVE"

    if request.description is not None:
        line_item.description = request.description
    if request.hsn_code is not None:
        orig_hsn = line_item.hsn_code
        line_item.hsn_code = request.hsn_code.strip()
        # Log HSN change to audit history
        db.add(FieldEditHistory(
            shipment_id=shipment.id,
            shipment_code=shipment.shipment_code,
            supplier_name=shipment.supplier_name,
            doc_type=line_item.doc_type,
            field_key="hsn_code",
            field_label="8-Digit HSN Code",
            original_ai_value=orig_hsn,
            updated_human_value=line_item.hsn_code,
            was_ai_correct=(orig_hsn == line_item.hsn_code),
            ai_confidence=line_item.confidence_score,
            edited_by_name=user_name,
            edited_by_role=user_role,
            edit_reason=request.edit_reason or "HSN classification confirmation",
        ))

    if request.qty is not None:
        line_item.qty = request.qty
    if request.unit_price is not None:
        line_item.unit_price = request.unit_price
    if request.line_total is not None:
        line_item.line_total = request.line_total
    elif request.qty is not None and request.unit_price is not None:
        line_item.line_total = round(request.qty * request.unit_price, 2)

    line_item.is_confirmed_by_human = request.is_confirmed_by_human
    db.flush()

    run_three_way_crosschecks(db, shipment)
    recalculate_shipment_status(db, shipment)
    db.commit()
    db.refresh(shipment)

    return serialize_shipment_detail(shipment)


@router.post("/api/shipments/{shipment_ref}/confirm-all-high-confidence", response_model=ShipmentResponse)
def confirm_all_high_confidence(
    shipment_ref: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """1-click confirmation of all high-confidence fields (>= 0.85) leaving only amber anomalies for inspection."""
    shipment = get_shipment_by_ref(shipment_ref, db)
    user_name = current_user.full_name if current_user else "Rohan Deshmukh"

    for f in shipment.fields:
        if f.confidence_score >= 0.85 and not f.is_manual_entry:
            f.is_confirmed_by_human = True
            f.confirmed_by_name = user_name
            f.confirmed_at = datetime.utcnow()

    for li in shipment.line_items:
        if li.confidence_score >= 0.85:
            li.is_confirmed_by_human = True

    db.flush()
    recalculate_shipment_status(db, shipment)
    db.commit()
    db.refresh(shipment)
    return serialize_shipment_detail(shipment)


# ==============================================================================
# 2. CROSS-CHECK RESOLUTION & APPROVAL GATE
# ==============================================================================
@router.post("/api/shipments/{shipment_ref}/crosschecks/{check_id}/resolve", response_model=ShipmentResponse)
def resolve_crosscheck(
    shipment_ref: str,
    check_id: int,
    request: CrossCheckResolveRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Resolve cross-check discrepancy via authoritative sync or mandatory customs audit justification."""
    shipment = get_shipment_by_ref(shipment_ref, db)
    check = db.query(CrossCheckResult).filter(
        CrossCheckResult.id == check_id,
        CrossCheckResult.shipment_id == shipment.id,
    ).first()

    if not check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cross check {check_id} not found on shipment '{shipment.shipment_code}'.",
        )

    user_name = current_user.full_name if current_user else "Rohan Deshmukh"
    user_role = current_user.role if current_user else "DOCUMENTATION_EXECUTIVE"

    if request.action == "SYNC_TO_AUTHORITATIVE_VALUE":
        if not request.target_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="target_value must be provided when action is SYNC_TO_AUTHORITATIVE_VALUE.",
            )

        # Sync relevant fields matching this check across documents to the authoritative target value
        target_val = request.target_value.strip()
        field_keys = [k.strip() for k in check.compared_fields.split(",")]
        for f in shipment.fields:
            if f.field_key in field_keys:
                orig = f.current_value
                f.current_value = target_val
                f.is_confirmed_by_human = True
                f.is_manual_entry = False
                f.confirmed_by_name = user_name
                f.confirmed_at = datetime.utcnow()

                db.add(FieldEditHistory(
                    shipment_id=shipment.id,
                    shipment_code=shipment.shipment_code,
                    supplier_name=shipment.supplier_name,
                    doc_type=f.doc_type,
                    field_key=f.field_key,
                    field_label=f.field_label,
                    original_ai_value=orig,
                    updated_human_value=target_val,
                    was_ai_correct=(_normalize_string(orig) == _normalize_string(target_val)),
                    ai_confidence=f.confidence_score,
                    edited_by_name=user_name,
                    edited_by_role=user_role,
                    edit_reason=f"Authoritative sync: {request.resolution_note}",
                ))

        db.flush()
        # Re-evaluating cross-checks will now dynamically flip the check to PASSED!
        run_three_way_crosschecks(db, shipment)

    elif request.action == "OVERRIDE_WITH_AUDIT_NOTE":
        check.status = "RESOLVED_BY_HUMAN"
        check.resolution_note = request.resolution_note
        check.resolved_by_name = user_name
        check.resolved_at = datetime.utcnow()
        # Overriding a failed cross-check requires Documentation Manager sign-off
        shipment.requires_manager_approval = True
        shipment.override_reason = request.resolution_note

    recalculate_shipment_status(db, shipment)
    db.commit()
    db.refresh(shipment)
    return serialize_shipment_detail(shipment)


@router.post("/api/shipments/{shipment_ref}/approve", response_model=ShipmentResponse)
def approve_shipment(
    shipment_ref: str,
    request: Optional[ShipmentApprovalRequest] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Approve shipment for customs export. Enforces Documentation Manager RBAC when overrides exist."""
    shipment = get_shipment_by_ref(shipment_ref, db)

    # Enforce Documentation Manager RBAC if an override occurred
    if shipment.requires_manager_approval:
        if not current_user or current_user.role != "DOCUMENTATION_MANAGER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Documentation Manager approval is required when a cross-check discrepancy is overridden.",
            )

    user_name = current_user.full_name if current_user else "Priya Nair"
    user_id = current_user.id if current_user else 2

    shipment.approved_by_id = user_id
    shipment.approved_at = datetime.utcnow()

    recalculate_shipment_status(db, shipment)
    db.commit()
    db.refresh(shipment)
    return serialize_shipment_detail(shipment)


# ==============================================================================
# 3. EXPORT GATEKEEPER & CSV GENERATOR
# ==============================================================================
@router.get("/api/shipments/{shipment_ref}/export/preview", response_model=ExportPreviewResponse)
def preview_export(
    shipment_ref: str,
    db: Session = Depends(get_db),
):
    """Checklist inspection endpoint returning export readiness and flat-file table preview."""
    shipment = get_shipment_by_ref(shipment_ref, db)
    readiness = evaluate_export_readiness(db, shipment)
    return ExportPreviewResponse(
        is_ready=readiness["is_ready"],
        blocker_detail=readiness["blocker_detail"],
        preview_rows=readiness["preview_rows"],
        csv_columns=readiness["csv_columns"],
        total_line_items=readiness["total_line_items"],
        invoice_total_fc=readiness["invoice_total_fc"],
        currency=readiness["currency"],
    )


@router.get("/api/shipments/{shipment_ref}/export")
def export_customs_filing_csv(
    shipment_ref: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Download ICEGATE / VisualIMPEX Excel CSV. Rejects with HTTP 422 if any blocker remains."""
    shipment = get_shipment_by_ref(shipment_ref, db)
    user_name = current_user.full_name if current_user else "Documentation Operator"
    csv_str = generate_customs_filing_csv(db, shipment, user_name=user_name)

    filename = f"BrokerLens_Filing_{shipment.shipment_code}.csv"
    return Response(
        content=csv_str,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )


# ==============================================================================
# 4. ACCURACY ANALYTICS & AUDIT TRAIL API
# ==============================================================================
@router.get("/api/analytics/overview")
def get_analytics_overview(
    supplier: Optional[str] = Query(None, description="Filter by supplier name"),
    field_key: Optional[str] = Query(None, description="Filter by field key"),
    db: Session = Depends(get_db),
):
    """Manager Accuracy Report: extraction accuracy per field & supplier + immutable audit history."""
    return get_accuracy_and_audit_analytics(db, supplier=supplier, field_key=field_key)

"""Shipment management and inquiry API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import (
    Shipment,
    ShipmentDocument,
    ExtractedField,
    ShipmentLineItem,
    CrossCheckResult,
)
from app.schemas.shipment import (
    ShipmentResponse,
    ShipmentSummaryResponse,
    ShipmentDocumentResponse,
    ExtractedFieldResponse,
    ShipmentLineItemResponse,
    CrossCheckResultResponse,
)
from app.core.privacy import mask_email, mask_phone, mask_iec
from app.config import settings

router = APIRouter(prefix="/api/shipments", tags=["Shipments"])


def serialize_shipment_summary(shipment: Shipment, mask_pii: bool = True) -> ShipmentSummaryResponse:
    """Serialize shipment to summary schema with optional DPDP PII masking."""
    email = mask_email(shipment.importer_contact_email) if mask_pii else shipment.importer_contact_email
    phone = mask_phone(shipment.importer_contact_phone) if mask_pii else shipment.importer_contact_phone
    iec = mask_iec(shipment.importer_iec) if mask_pii else shipment.importer_iec

    unconfirmed_count = sum(
        1 for f in shipment.fields if f.is_low_confidence and not f.is_confirmed_by_human
    )
    failed_crosschecks = sum(1 for c in shipment.cross_checks if c.status == "FAILED")

    return ShipmentSummaryResponse(
        id=shipment.id,
        shipment_code=shipment.shipment_code,
        title=shipment.title,
        supplier_name=shipment.supplier_name,
        supplier_country=shipment.supplier_country,
        importer_name=shipment.importer_name,
        importer_iec=iec,
        port_of_loading=shipment.port_of_loading,
        port_of_discharge=shipment.port_of_discharge,
        currency=shipment.currency,
        incoterm=shipment.incoterm,
        status=shipment.status,
        requires_manager_approval=shipment.requires_manager_approval,
        processing_time_minutes=shipment.processing_time_minutes,
        created_at=shipment.created_at,
        updated_at=shipment.updated_at,
        documents_count=len(shipment.documents),
        unconfirmed_fields_count=unconfirmed_count,
        failed_crosschecks_count=failed_crosschecks,
    )


def serialize_shipment_detail(shipment: Shipment, mask_pii: bool = True) -> ShipmentResponse:
    """Serialize full shipment graph with all relational child tables and optional DPDP PII masking."""
    email = mask_email(shipment.importer_contact_email) if mask_pii else shipment.importer_contact_email
    phone = mask_phone(shipment.importer_contact_phone) if mask_pii else shipment.importer_contact_phone
    iec = mask_iec(shipment.importer_iec) if mask_pii else shipment.importer_iec

    return ShipmentResponse(
        id=shipment.id,
        shipment_code=shipment.shipment_code,
        title=shipment.title,
        supplier_name=shipment.supplier_name,
        supplier_country=shipment.supplier_country,
        importer_name=shipment.importer_name,
        importer_iec=iec,
        importer_contact_name=shipment.importer_contact_name,
        importer_contact_email=email,
        importer_contact_phone=phone,
        port_of_loading=shipment.port_of_loading,
        port_of_discharge=shipment.port_of_discharge,
        currency=shipment.currency,
        incoterm=shipment.incoterm,
        status=shipment.status,
        requires_manager_approval=shipment.requires_manager_approval,
        override_reason=shipment.override_reason,
        processing_time_minutes=shipment.processing_time_minutes,
        approved_by_id=shipment.approved_by_id,
        approved_at=shipment.approved_at,
        exported_at=shipment.exported_at,
        created_at=shipment.created_at,
        updated_at=shipment.updated_at,
        documents=[ShipmentDocumentResponse.model_validate(d) for d in shipment.documents],
        fields=[ExtractedFieldResponse.model_validate(f) for f in shipment.fields],
        line_items=[ShipmentLineItemResponse.model_validate(li) for li in shipment.line_items],
        cross_checks=[CrossCheckResultResponse.model_validate(cc) for cc in shipment.cross_checks],
    )


@router.get("", response_model=List[ShipmentSummaryResponse])
def get_shipments(
    mask_pii: bool = Query(default=settings.ENABLE_PII_MASKING_BY_DEFAULT, description="Apply India DPDP Act 2023 PII masking"),
    db: Session = Depends(get_db),
):
    """List all customs shipments with operational KPIs and document counts."""
    shipments = db.query(Shipment).order_by(Shipment.id.asc()).all()
    return [serialize_shipment_summary(s, mask_pii=mask_pii) for s in shipments]


@router.get("/{shipment_code}", response_model=ShipmentResponse)
def get_shipment_by_code(
    shipment_code: str,
    mask_pii: bool = Query(default=settings.ENABLE_PII_MASKING_BY_DEFAULT, description="Apply India DPDP Act 2023 PII masking"),
    db: Session = Depends(get_db),
):
    """Retrieve full shipment review workbench details including documents, fields, line items, and cross-checks."""
    shipment = db.query(Shipment).filter(Shipment.shipment_code == shipment_code.upper()).first()
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with code '{shipment_code}' not found.",
        )
    return serialize_shipment_detail(shipment, mask_pii=mask_pii)

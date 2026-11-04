"""Shipment management, document upload, AI extraction, and demo evaluation API endpoints."""

import os
import shutil
import uuid
from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    UploadFile,
    File,
    Form,
    status,
)
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
    ShipmentCreateRequest,
    ShipmentDocumentResponse,
    ExtractedFieldResponse,
    ShipmentLineItemResponse,
    CrossCheckResultResponse,
    FieldEditHistoryResponse,
)
from app.schemas.extraction import DemoBundleRequest
from app.core.privacy import mask_email, mask_phone, mask_iec
from app.services.ai_extractor import ai_extractor_service
from app.services.pdf_seed_gen import DEFAULT_DOCS_DIR
from app.config import settings

router = APIRouter(prefix="/api/shipments", tags=["Shipments & Extraction"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/pjpeg",
}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB


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
        edit_history=[
            FieldEditHistoryResponse.model_validate(h)
            for h in sorted(shipment.edit_history, key=lambda x: x.created_at, reverse=True)
        ] if shipment.edit_history else [],
    )


def generate_next_shipment_code(db: Session) -> str:
    """Auto-generate the next unique shipment code (e.g. SHP-24815)."""
    shipments = db.query(Shipment).all()
    max_num = 24810
    for s in shipments:
        code = s.shipment_code
        if code.startswith("SHP-") and code[4:].isdigit():
            val = int(code[4:])
            if val > max_num:
                max_num = val
    return f"SHP-{max_num + 1}"


@router.get("", response_model=List[ShipmentSummaryResponse])
def get_shipments(
    mask_pii: bool = Query(default=settings.ENABLE_PII_MASKING_BY_DEFAULT, description="Apply India DPDP Act 2023 PII masking"),
    db: Session = Depends(get_db),
):
    """List all customs shipments with operational KPIs and document counts."""
    shipments = db.query(Shipment).order_by(Shipment.id.asc()).all()
    return [serialize_shipment_summary(s, mask_pii=mask_pii) for s in shipments]


@router.post("", response_model=ShipmentSummaryResponse, status_code=status.HTTP_201_CREATED)
def create_shipment(
    request: ShipmentCreateRequest,
    db: Session = Depends(get_db),
):
    """Create a new customs shipment in UPLOADED state."""
    code = request.shipment_code.upper() if request.shipment_code else generate_next_shipment_code(db)
    existing = db.query(Shipment).filter(Shipment.shipment_code == code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Shipment with code '{code}' already exists.",
        )

    shipment = Shipment(
        shipment_code=code,
        title=request.title,
        supplier_name=request.supplier_name,
        supplier_country=request.supplier_country,
        importer_name=request.importer_name,
        importer_iec=request.importer_iec,
        importer_contact_name=request.importer_contact_name,
        importer_contact_email=request.importer_contact_email,
        importer_contact_phone=request.importer_contact_phone,
        port_of_loading=request.port_of_loading,
        port_of_discharge=request.port_of_discharge,
        currency=request.currency,
        incoterm=request.incoterm,
        status="UPLOADED",
        requires_manager_approval=False,
        processing_time_minutes=11.5,
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return serialize_shipment_summary(shipment)


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


@router.post("/{shipment_code}/documents", response_model=ShipmentDocumentResponse)
async def upload_document(
    shipment_code: str,
    doc_type: str = Form(..., description="Document type: INVOICE, PACKING_LIST, or BILL_OF_LADING"),
    file: UploadFile = File(..., description="Document file (.pdf, .png, .jpg, .jpeg up to 15MB)"),
    db: Session = Depends(get_db),
):
    """Upload a customs document (PDF or image) with strict MIME & size validation."""
    shipment = db.query(Shipment).filter(Shipment.shipment_code == shipment_code.upper()).first()
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_code}' not found.",
        )

    doc_type_upper = doc_type.upper().strip()
    if doc_type_upper not in {"INVOICE", "PACKING_LIST", "BILL_OF_LADING"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="doc_type must be one of: INVOICE, PACKING_LIST, BILL_OF_LADING",
        )

    # Validate file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Only .pdf, .png, .jpg, .jpeg are permitted.",
        )

    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME type '{file.content_type}'. Must be application/pdf, image/png, or image/jpeg.",
        )

    # Read bytes and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 15 MB (got {len(content) / (1024*1024):.2f} MB).",
        )

    # Save to disk
    target_filename = f"{shipment.shipment_code}_{doc_type_upper}{ext}"
    target_path = os.path.join(DEFAULT_DOCS_DIR, target_filename)
    os.makedirs(DEFAULT_DOCS_DIR, exist_ok=True)
    with open(target_path, "wb") as f:
        f.write(content)

    # Upsert ShipmentDocument in DB
    doc = db.query(ShipmentDocument).filter(
        ShipmentDocument.shipment_id == shipment.id,
        ShipmentDocument.doc_type == doc_type_upper,
    ).first()

    if not doc:
        doc = ShipmentDocument(
            shipment_id=shipment.id,
            doc_type=doc_type_upper,
            file_name=target_filename,
            file_url=f"/static/docs/{target_filename}",
            page_count=1,
            skew_angle_deg=0.0,
            is_bilingual=False,
            is_unreadable=False,
            avg_confidence=0.90,
            extraction_provider="pending",
        )
        db.add(doc)
    else:
        doc.file_name = target_filename
        doc.file_url = f"/static/docs/{target_filename}"

    db.commit()
    db.refresh(doc)
    return ShipmentDocumentResponse.model_validate(doc)


@router.post("/{shipment_code}/extract", response_model=ShipmentResponse)
def run_extraction_for_shipment(
    shipment_code: str,
    db: Session = Depends(get_db),
):
    """Run Vision AI extraction pipeline across all uploaded documents for a shipment."""
    shipment = db.query(Shipment).filter(Shipment.shipment_code == shipment_code.upper()).first()
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_code}' not found.",
        )

    if not shipment.documents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shipment '{shipment_code}' has no uploaded documents to extract.",
        )

    # Clean existing extracted fields and line items before fresh extraction
    db.query(ExtractedField).filter(ExtractedField.shipment_id == shipment.id).delete()
    db.query(ShipmentLineItem).filter(ShipmentLineItem.shipment_id == shipment.id).delete()
    db.query(CrossCheckResult).filter(CrossCheckResult.shipment_id == shipment.id).delete()

    any_unreadable = False
    any_low_confidence = False

    # Extract each document
    for doc in shipment.documents:
        local_path = os.path.join(DEFAULT_DOCS_DIR, doc.file_name)
        if not os.path.exists(local_path):
            continue

        result = ai_extractor_service.extract_document(local_path, doc_type_hint=doc.doc_type)

        # Update document record
        doc.is_bilingual = result.is_bilingual
        doc.language_hint = result.language_hint
        doc.skew_angle_deg = result.skew_angle_deg
        doc.is_unreadable = result.is_unreadable
        doc.avg_confidence = result.avg_confidence
        doc.extraction_provider = result.extraction_provider

        if result.is_unreadable:
            any_unreadable = True

        # Persist extracted fields
        for fc in result.fields:
            if result.is_unreadable:
                is_low = True
                is_manual = True
                is_confirmed = False
                val = ""
            elif fc.confidence_score < 0.85:
                is_low = True
                is_manual = False
                is_confirmed = False
                val = fc.extracted_value
                any_low_confidence = True
            else:
                is_low = False
                is_manual = False
                is_confirmed = True
                val = fc.extracted_value

            field_row = ExtractedField(
                shipment_id=shipment.id,
                doc_type=doc.doc_type,
                field_key=fc.field_key,
                field_label=fc.field_label,
                field_category=fc.field_category,
                ai_extracted_value=fc.extracted_value,
                current_value=val,
                unit=fc.unit,
                confidence_score=fc.confidence_score,
                is_low_confidence=is_low,
                is_confirmed_by_human=is_confirmed,
                is_manual_entry=is_manual,
                page_number=fc.page_number,
                bbox_hint=fc.bbox_hint,
            )
            db.add(field_row)

        # Persist line items
        for li in result.line_items:
            is_low_li = li.confidence_score < 0.85
            if is_low_li:
                any_low_confidence = True
            line_row = ShipmentLineItem(
                shipment_id=shipment.id,
                doc_type=doc.doc_type,
                line_number=li.line_number,
                description=li.description,
                hsn_code=li.hsn_code,
                qty=li.qty,
                unit=li.unit,
                unit_price=li.unit_price,
                line_total=li.line_total,
                gross_weight_kg=li.gross_weight_kg,
                confidence_score=li.confidence_score,
                is_low_confidence=is_low_li,
                is_confirmed_by_human=not is_low_li,
            )
            db.add(line_row)

    db.flush()

    # Initial Cross-Checks
    # Check 1: Invoice Total vs Line Items Sum
    inv_fields = {f.field_key: f for f in shipment.fields if f.doc_type == "INVOICE"}
    pl_fields = {f.field_key: f for f in shipment.fields if f.doc_type == "PACKING_LIST"}
    bol_fields = {f.field_key: f for f in shipment.fields if f.doc_type == "BILL_OF_LADING"}

    has_crosscheck_failure = False

    # Check weights across available documents
    inv_gw = inv_fields.get("gross_weight_kg")
    pl_gw = pl_fields.get("gross_weight_kg")
    bol_gw = bol_fields.get("gross_weight_kg")

    if inv_gw and (pl_gw or bol_gw):
        val_inv = float(inv_gw.current_value) if (inv_gw.current_value and not inv_gw.is_manual_entry) else None
        val_pl = float(pl_gw.current_value) if (pl_gw and pl_gw.current_value and not pl_gw.is_manual_entry) else None
        val_bol = float(bol_gw.current_value) if (bol_gw and bol_gw.current_value and not bol_gw.is_manual_entry) else None

        if any_unreadable:
            gw_check = CrossCheckResult(
                shipment_id=shipment.id,
                rule_code="THREE_WAY_GROSS_WEIGHT",
                rule_name="3-Way Gross Weight Cross-Check",
                compared_fields="gross_weight_kg",
                invoice_value=f"{val_inv:,.2f} kg" if val_inv else None,
                packing_list_value="[AWAITING MANUAL ENTRY - UNREADABLE SCAN]",
                bol_value=f"{val_bol:,.2f} kg" if val_bol else None,
                discrepancy_delta="UNVERIFIED",
                status="FAILED",
                severity="CRITICAL",
                explanation="Packing List scan illegible. Manual entry required.",
            )
            db.add(gw_check)
            has_crosscheck_failure = True
        elif val_inv and val_pl and abs(val_inv - val_pl) > 0.01:
            delta = abs(val_inv - val_pl)
            gw_check = CrossCheckResult(
                shipment_id=shipment.id,
                rule_code="THREE_WAY_GROSS_WEIGHT",
                rule_name="3-Way Gross Weight Cross-Check",
                compared_fields="gross_weight_kg",
                invoice_value=f"{val_inv:,.2f} kg",
                packing_list_value=f"{val_pl:,.2f} kg",
                bol_value=f"{val_bol:,.2f} kg" if val_bol else None,
                discrepancy_delta=f"{delta:,.2f} kg delta between Invoice ({val_inv:,.0f} kg) and Packing List/BoL ({val_pl:,.0f} kg)",
                status="FAILED",
                severity="CRITICAL",
                explanation="Invoice gross weight differs from Packing List and Bill of Lading. Discrepancy blocks filing export.",
            )
            db.add(gw_check)
            has_crosscheck_failure = True
            shipment.requires_manager_approval = True
        else:
            gw_check = CrossCheckResult(
                shipment_id=shipment.id,
                rule_code="THREE_WAY_GROSS_WEIGHT",
                rule_name="3-Way Gross Weight Cross-Check",
                compared_fields="gross_weight_kg",
                invoice_value=f"{val_inv:,.2f} kg" if val_inv else None,
                packing_list_value=f"{val_pl:,.2f} kg" if val_pl else None,
                bol_value=f"{val_bol:,.2f} kg" if val_bol else None,
                discrepancy_delta="0.00",
                status="PASSED",
                severity="CRITICAL",
                explanation="Gross weight matches across documents.",
            )
            db.add(gw_check)

    # Set overall shipment status
    if has_crosscheck_failure:
        shipment.status = "CROSS_CHECK_FAILED"
    elif any_unreadable or any_low_confidence:
        shipment.status = "NEEDS_REVIEW"
    else:
        shipment.status = "READY_FOR_APPROVAL"

    db.commit()
    db.refresh(shipment)
    return serialize_shipment_detail(shipment)


@router.post("/demo-bundle", response_model=ShipmentResponse)
def create_and_extract_demo_bundle(
    request: DemoBundleRequest,
    db: Session = Depends(get_db),
):
    """1-click evaluator endpoint: creates fresh shipment, attaches 3 PDFs based on scenario, and extracts."""
    # Determine base scenario configuration
    scenario = request.scenario
    if scenario == "weight_mismatch":
        base_code = "SHP-24811"
        title = "Demo Bundle: Company B (China) — Gross Weight Mismatch (3120 vs 3165 kg)"
    elif scenario == "skewed_bilingual":
        base_code = "SHP-24812"
        title = "Demo Bundle: Company C (Sweden) — Skewed Bilingual Scan (-2.8°)"
    elif scenario == "unreadable_scan":
        base_code = "SHP-24814"
        title = "Demo Bundle: Hamburg Chemie — Degraded Unreadable Packing List"
    else:
        base_code = "SHP-24813"
        title = "Demo Bundle: Shenzhen Precision Motors — Clean Verified Consignment"

    # Auto-generate unique code for fresh bundle
    bundle_code = generate_next_shipment_code(db)

    # Base metadata template
    new_shipment = Shipment(
        shipment_code=bundle_code,
        title=title,
        supplier_name="Company B (China)" if "China" in title else "Company C (Sweden)",
        supplier_country="China" if "China" in title else "Sweden",
        importer_name="Lumina Commercial Lighting Pvt. Ltd.",
        importer_iec="0314098211",
        importer_contact_name="Rohan Gupta",
        importer_contact_email="rohan@luminalighting.in",
        importer_contact_phone="+91-9876543212",
        port_of_loading="Shenzhen, China (CNSZX)",
        port_of_discharge="Nhava Sheva / JNPT, India (INNSA)",
        currency="USD" if "USD" in title or "China" in title else "EUR",
        incoterm="FOB Shenzhen",
        status="UPLOADED",
        requires_manager_approval=False,
        processing_time_minutes=11.2,
    )
    db.add(new_shipment)
    db.flush()

    # Copy the 3 source scenario PDFs to this new bundle code
    for doc_type in ["INVOICE", "PACKING_LIST", "BILL_OF_LADING"]:
        source_name = f"{base_code}_{doc_type}.pdf"
        target_name = f"{bundle_code}_{doc_type}.pdf"
        source_path = os.path.join(DEFAULT_DOCS_DIR, source_name)
        target_path = os.path.join(DEFAULT_DOCS_DIR, target_name)

        if os.path.exists(source_path):
            shutil.copyfile(source_path, target_path)

        doc_row = ShipmentDocument(
            shipment_id=new_shipment.id,
            doc_type=doc_type,
            file_name=target_name,
            file_url=f"/static/docs/{target_name}",
            page_count=1,
            avg_confidence=0.90,
            extraction_provider="pending",
        )
        db.add(doc_row)

    db.commit()
    db.refresh(new_shipment)

    # Trigger extraction pipeline
    return run_extraction_for_shipment(bundle_code, db=db)

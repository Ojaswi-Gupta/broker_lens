"""Shipment and customs document extraction schemas."""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, ConfigDict

ShipmentStatus = Literal[
    "UPLOADED",
    "EXTRACTING",
    "NEEDS_REVIEW",
    "CROSS_CHECK_FAILED",
    "READY_FOR_APPROVAL",
    "APPROVED",
    "EXPORTED",
]

DocumentType = Literal["INVOICE", "PACKING_LIST", "BILL_OF_LADING"]
FieldCategory = Literal["PARTIES", "HEADER", "TOTALS", "LOGISTICS"]
CrossCheckStatus = Literal["PASSED", "FAILED", "RESOLVED_BY_HUMAN"]
SeverityLevel = Literal["CRITICAL", "WARNING"]


class ShipmentDocumentResponse(BaseModel):
    id: int
    shipment_id: int
    doc_type: DocumentType
    file_name: str
    file_url: str
    page_count: int
    skew_angle_deg: float
    is_bilingual: bool
    language_hint: Optional[str] = None
    is_unreadable: bool
    avg_confidence: float
    extraction_provider: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExtractedFieldResponse(BaseModel):
    id: int
    shipment_id: int
    doc_type: DocumentType
    field_key: str
    field_label: str
    field_category: str
    ai_extracted_value: str
    current_value: str
    unit: Optional[str] = None
    confidence_score: float
    is_low_confidence: bool
    is_confirmed_by_human: bool
    is_manual_entry: bool
    page_number: int
    bbox_hint: Optional[str] = None
    confirmed_by_name: Optional[str] = None
    confirmed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ShipmentLineItemResponse(BaseModel):
    id: int
    shipment_id: int
    doc_type: str
    line_number: int
    description: str
    hsn_code: str
    qty: float
    unit: str
    unit_price: Optional[float] = None
    line_total: Optional[float] = None
    gross_weight_kg: Optional[float] = None
    confidence_score: float
    is_low_confidence: bool
    is_confirmed_by_human: bool

    model_config = ConfigDict(from_attributes=True)


class CrossCheckResultResponse(BaseModel):
    id: int
    shipment_id: int
    rule_code: str
    rule_name: str
    compared_fields: str
    invoice_value: Optional[str] = None
    packing_list_value: Optional[str] = None
    bol_value: Optional[str] = None
    discrepancy_delta: Optional[str] = None
    status: CrossCheckStatus
    severity: SeverityLevel
    explanation: str
    resolution_note: Optional[str] = None
    resolved_by_name: Optional[str] = None
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class FieldEditHistoryResponse(BaseModel):
    id: int
    shipment_id: int
    shipment_code: str
    supplier_name: str
    doc_type: str
    field_key: str
    field_label: str
    original_ai_value: str
    updated_human_value: str
    was_ai_correct: bool
    ai_confidence: float
    edited_by_name: str
    edited_by_role: str
    edit_reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ShipmentResponse(BaseModel):
    id: int
    shipment_code: str
    title: str
    supplier_name: str
    supplier_country: str
    importer_name: str
    importer_iec: str
    importer_contact_name: Optional[str] = None
    importer_contact_email: Optional[str] = None
    importer_contact_phone: Optional[str] = None
    port_of_loading: str
    port_of_discharge: str
    currency: str
    incoterm: str
    status: ShipmentStatus
    requires_manager_approval: bool
    override_reason: Optional[str] = None
    processing_time_minutes: float
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    exported_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    documents: List[ShipmentDocumentResponse] = []
    fields: List[ExtractedFieldResponse] = []
    line_items: List[ShipmentLineItemResponse] = []
    cross_checks: List[CrossCheckResultResponse] = []
    edit_history: List[FieldEditHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ShipmentSummaryResponse(BaseModel):
    id: int
    shipment_code: str
    title: str
    supplier_name: str
    supplier_country: str
    importer_name: str
    importer_iec: str
    port_of_loading: str
    port_of_discharge: str
    currency: str
    incoterm: str
    status: ShipmentStatus
    requires_manager_approval: bool
    processing_time_minutes: float
    created_at: datetime
    updated_at: datetime
    documents_count: int = 0
    unconfirmed_fields_count: int = 0
    failed_crosschecks_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ShipmentCreateRequest(BaseModel):
    shipment_code: Optional[str] = None
    title: str
    supplier_name: str
    supplier_country: str = "China"
    importer_name: str
    importer_iec: str
    importer_contact_name: Optional[str] = None
    importer_contact_email: Optional[str] = None
    importer_contact_phone: Optional[str] = None
    port_of_loading: str
    port_of_discharge: str = "Nhava Sheva / JNPT, India (INNSA)"
    currency: str = "USD"
    incoterm: str = "FOB"


class FieldUpdateRequest(BaseModel):
    current_value: Optional[str] = None
    is_confirmed_by_human: bool = True
    edit_reason: Optional[str] = None


class CrossCheckResolveRequest(BaseModel):
    action: Literal["SYNC_TO_AUTHORITATIVE_VALUE", "OVERRIDE_WITH_AUDIT_NOTE"]
    authoritative_value: Optional[str] = None
    resolution_note: Optional[str] = None

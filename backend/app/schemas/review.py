"""Request and response schemas for human review workbench, cross-check resolution, export readiness, and analytics."""

from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict


class FieldUpdateRequest(BaseModel):
    value: Optional[str] = None
    is_confirmed_by_human: bool = True
    edit_reason: Optional[str] = "Operator review confirmation"


class LineItemUpdateRequest(BaseModel):
    description: Optional[str] = None
    hsn_code: Optional[str] = None
    qty: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    line_total: Optional[float] = None
    gross_weight_kg: Optional[float] = None
    is_confirmed_by_human: bool = True
    edit_reason: Optional[str] = "Line item verification"


class CrossCheckResolveRequest(BaseModel):
    action: Literal["SYNC_TO_AUTHORITATIVE_VALUE", "OVERRIDE_WITH_AUDIT_NOTE"]
    target_value: Optional[str] = None
    resolution_note: str = Field(..., min_length=5)


class ShipmentApprovalRequest(BaseModel):
    approval_note: Optional[str] = "Approved for customs Bill of Entry filing"


class ExportBlockerDetail(BaseModel):
    code: str = "EXPORT_BLOCKED_UNRESOLVED_ITEMS"
    message: str
    unconfirmed_fields_count: int = 0
    unconfirmed_line_items_count: int = 0
    failed_crosschecks_count: int = 0
    unreadable_docs_pending_count: int = 0
    requires_manager_signoff: bool = False
    blocking_fields: List[Dict[str, Any]] = []
    blocking_line_items: List[Dict[str, Any]] = []
    blocking_crosschecks: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)


class ExportPreviewResponse(BaseModel):
    is_ready: bool
    blocker_detail: Optional[ExportBlockerDetail] = None
    preview_rows: List[Dict[str, Any]] = []
    csv_columns: List[str] = []
    total_line_items: int = 0
    invoice_total_fc: float = 0.0
    currency: str = "USD"

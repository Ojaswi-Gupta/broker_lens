"""Pydantic v2 schemas for Vision AI extraction candidate fields, line items, and document extraction payloads."""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict

FieldCategoryType = Literal["PARTIES", "HEADER", "TOTALS", "LOGISTICS"]
DocumentTypeLiteral = Literal["INVOICE", "PACKING_LIST", "BILL_OF_LADING"]


class ExtractedFieldCandidate(BaseModel):
    field_key: str
    field_label: str
    field_category: FieldCategoryType = "HEADER"
    extracted_value: str
    unit: Optional[str] = None
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    page_number: int = 1
    bbox_hint: str = "Document Header"

    model_config = ConfigDict(from_attributes=True)


class ExtractedLineItemCandidate(BaseModel):
    line_number: int
    description: str
    hsn_code: str
    qty: float
    unit: str
    unit_price: Optional[float] = None
    line_total: Optional[float] = None
    gross_weight_kg: Optional[float] = None
    confidence_score: float = Field(..., ge=0.0, le=1.0)

    model_config = ConfigDict(from_attributes=True)


class DocumentExtractionOutput(BaseModel):
    doc_type: DocumentTypeLiteral
    is_bilingual: bool = False
    language_hint: Optional[str] = None
    skew_angle_deg: float = 0.0
    is_unreadable: bool = False
    unreadable_reason: Optional[str] = None
    avg_confidence: float = 1.0
    extraction_provider: str = "gemini-2.5-flash"
    fields: List[ExtractedFieldCandidate] = []
    line_items: List[ExtractedLineItemCandidate] = []

    model_config = ConfigDict(from_attributes=True)


class DemoBundleRequest(BaseModel):
    scenario: Literal[
        "weight_mismatch",
        "skewed_bilingual",
        "unreadable_scan",
        "clean_verified",
    ] = "weight_mismatch"

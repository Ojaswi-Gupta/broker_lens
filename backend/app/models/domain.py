"""SQLAlchemy 2.0 domain models for BrokerLens."""

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # DOCUMENTATION_EXECUTIVE | DOCUMENTATION_MANAGER
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    approved_shipments = relationship("Shipment", back_populates="approved_by")


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    shipment_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. SHP-24811
    title = Column(String(255), nullable=False)
    supplier_name = Column(String(255), nullable=False)
    supplier_country = Column(String(100), default="China", nullable=False)
    importer_name = Column(String(255), nullable=False)
    importer_iec = Column(String(50), nullable=False)
    importer_contact_name = Column(String(255), nullable=True)
    importer_contact_email = Column(String(255), nullable=True)
    importer_contact_phone = Column(String(50), nullable=True)
    port_of_loading = Column(String(100), nullable=False)
    port_of_discharge = Column(String(100), default="Nhava Sheva / JNPT, India (INNSA)", nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    incoterm = Column(String(50), default="FOB", nullable=False)
    status = Column(String(50), default="UPLOADED", nullable=False)
    # Statuses: UPLOADED | EXTRACTING | NEEDS_REVIEW | CROSS_CHECK_FAILED | READY_FOR_APPROVAL | APPROVED | EXPORTED
    requires_manager_approval = Column(Boolean, default=False, nullable=False)
    override_reason = Column(Text, nullable=True)
    processing_time_minutes = Column(Float, default=11.5, nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    exported_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    approved_by = relationship("User", back_populates="approved_shipments")
    documents = relationship("ShipmentDocument", back_populates="shipment", cascade="all, delete-orphan")
    fields = relationship("ExtractedField", back_populates="shipment", cascade="all, delete-orphan")
    line_items = relationship("ShipmentLineItem", back_populates="shipment", cascade="all, delete-orphan")
    cross_checks = relationship("CrossCheckResult", back_populates="shipment", cascade="all, delete-orphan")
    edit_history = relationship("FieldEditHistory", back_populates="shipment", cascade="all, delete-orphan")


class ShipmentDocument(Base):
    __tablename__ = "shipment_documents"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False, index=True)
    doc_type = Column(String(50), nullable=False)  # INVOICE | PACKING_LIST | BILL_OF_LADING
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    page_count = Column(Integer, default=1, nullable=False)
    skew_angle_deg = Column(Float, default=0.0, nullable=False)
    is_bilingual = Column(Boolean, default=False, nullable=False)
    language_hint = Column(String(100), default="English", nullable=True)
    is_unreadable = Column(Boolean, default=False, nullable=False)
    avg_confidence = Column(Float, default=0.90, nullable=False)
    extraction_provider = Column(String(50), default="gemini-2.5-flash", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    shipment = relationship("Shipment", back_populates="documents")


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False, index=True)
    doc_type = Column(String(50), nullable=False)  # INVOICE | PACKING_LIST | BILL_OF_LADING
    field_key = Column(String(100), nullable=False, index=True)
    field_label = Column(String(255), nullable=False)
    field_category = Column(String(50), default="HEADER", nullable=False)  # PARTIES | HEADER | TOTALS | LOGISTICS
    ai_extracted_value = Column(String(500), nullable=False)
    current_value = Column(String(500), nullable=False)
    unit = Column(String(50), nullable=True)
    confidence_score = Column(Float, default=1.0, nullable=False)
    is_low_confidence = Column(Boolean, default=False, nullable=False)
    is_confirmed_by_human = Column(Boolean, default=False, nullable=False)
    is_manual_entry = Column(Boolean, default=False, nullable=False)
    page_number = Column(Integer, default=1, nullable=False)
    bbox_hint = Column(String(255), nullable=True)
    confirmed_by_name = Column(String(255), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)

    shipment = relationship("Shipment", back_populates="fields")


class ShipmentLineItem(Base):
    __tablename__ = "shipment_line_items"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False, index=True)
    doc_type = Column(String(50), default="INVOICE", nullable=False)  # INVOICE | PACKING_LIST
    line_number = Column(Integer, default=1, nullable=False)
    description = Column(String(500), nullable=False)
    hsn_code = Column(String(20), nullable=False)  # 8-digit Indian Customs HSN/ITC(HS)
    qty = Column(Float, nullable=False)
    unit = Column(String(20), default="PCS", nullable=False)  # PCS | NOS | KG | SET
    unit_price = Column(Float, nullable=True)
    line_total = Column(Float, nullable=True)
    gross_weight_kg = Column(Float, nullable=True)
    confidence_score = Column(Float, default=1.0, nullable=False)
    is_low_confidence = Column(Boolean, default=False, nullable=False)
    is_confirmed_by_human = Column(Boolean, default=False, nullable=False)

    shipment = relationship("Shipment", back_populates="line_items")


class CrossCheckResult(Base):
    __tablename__ = "cross_check_results"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False, index=True)
    rule_code = Column(String(100), nullable=False)
    rule_name = Column(String(255), nullable=False)
    compared_fields = Column(String(255), nullable=False)
    invoice_value = Column(String(255), nullable=True)
    packing_list_value = Column(String(255), nullable=True)
    bol_value = Column(String(255), nullable=True)
    discrepancy_delta = Column(String(255), nullable=True)
    status = Column(String(50), default="PASSED", nullable=False)  # PASSED | FAILED | RESOLVED_BY_HUMAN
    severity = Column(String(50), default="CRITICAL", nullable=False)  # CRITICAL | WARNING
    explanation = Column(Text, nullable=False)
    resolution_note = Column(Text, nullable=True)
    resolved_by_name = Column(String(255), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    shipment = relationship("Shipment", back_populates="cross_checks")


class FieldEditHistory(Base):
    __tablename__ = "field_edit_history"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False, index=True)
    shipment_code = Column(String(50), nullable=False)
    supplier_name = Column(String(255), nullable=False)
    doc_type = Column(String(50), nullable=False)
    field_key = Column(String(100), nullable=False, index=True)
    field_label = Column(String(255), nullable=False)
    original_ai_value = Column(String(500), nullable=False)
    updated_human_value = Column(String(500), nullable=False)
    was_ai_correct = Column(Boolean, default=True, nullable=False)
    ai_confidence = Column(Float, default=1.0, nullable=False)
    edited_by_name = Column(String(255), nullable=False)
    edited_by_role = Column(String(50), nullable=False)
    edit_reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    shipment = relationship("Shipment", back_populates="edit_history")

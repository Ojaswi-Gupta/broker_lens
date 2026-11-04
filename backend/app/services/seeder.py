"""Database Seeder for BrokerLens.

Seeds demo users, the 4 realistic shipments with full relational documents,
extracted fields, line items, 3-way cross checks, and 60+ historical field
edit history logs for accuracy reporting.
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.models.domain import (
    User,
    Shipment,
    ShipmentDocument,
    ExtractedField,
    ShipmentLineItem,
    CrossCheckResult,
    FieldEditHistory,
)
from app.core.security import get_password_hash
from app.services.pdf_seed_gen import generate_all_seed_pdfs
from app.services.crosscheck_engine import run_three_way_crosschecks


def seed_database(db: Session, force_refresh: bool = False) -> None:
    """Idempotently seed demo users, shipments, documents, and historical edit records."""
    # 1. Ensure all 12 PDFs exist on disk
    generate_all_seed_pdfs()

    # 2. Check if already seeded (unless force_refresh is True)
    existing_shipment = db.query(Shipment).filter(Shipment.shipment_code == "SHP-24811").first()
    if existing_shipment and not force_refresh:
        return

    # If force refresh, clear existing seed records
    if force_refresh:
        db.query(FieldEditHistory).delete()
        db.query(CrossCheckResult).delete()
        db.query(ShipmentLineItem).delete()
        db.query(ExtractedField).delete()
        db.query(ShipmentDocument).delete()
        db.query(Shipment).delete()
        db.query(User).delete()
        db.commit()

    # --------------------------------------------------------------------------
    # DEMO USERS
    # --------------------------------------------------------------------------
    exec_user = db.query(User).filter(User.email == "exec@companya-cha.in").first()
    if not exec_user:
        exec_user = User(
            email="exec@companya-cha.in",
            full_name="Rohan Deshmukh",
            hashed_password=get_password_hash("DemoExec!2026"),
            role="DOCUMENTATION_EXECUTIVE",
            created_at=datetime.utcnow() - timedelta(days=45),
        )
        db.add(exec_user)
        db.flush()

    mgr_user = db.query(User).filter(User.email == "manager@companya-cha.in").first()
    if not mgr_user:
        mgr_user = User(
            email="manager@companya-cha.in",
            full_name="Priya Nair",
            hashed_password=get_password_hash("DemoMgr!2026"),
            role="DOCUMENTATION_MANAGER",
            created_at=datetime.utcnow() - timedelta(days=45),
        )
        db.add(mgr_user)
        db.flush()

    # --------------------------------------------------------------------------
    # SHIPMENT 1: SHP-24811 (Company B, China) — Gross Weight Mismatch (3120 vs 3165 kg)
    # --------------------------------------------------------------------------
    shp_1 = db.query(Shipment).filter(Shipment.shipment_code == "SHP-24811").first()
    if not shp_1:
        shp_1 = Shipment(
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
            processing_time_minutes=14.2,
            created_at=datetime.utcnow() - timedelta(days=2),
            updated_at=datetime.utcnow() - timedelta(hours=4),
        )
        db.add(shp_1)
        db.flush()

        # Documents
        docs_1 = [
            ShipmentDocument(
                shipment_id=shp_1.id,
                doc_type="INVOICE",
                file_name="SHP-24811_INVOICE.pdf",
                file_url="/static/docs/SHP-24811_INVOICE.pdf",
                page_count=1,
                skew_angle_deg=0.0,
                is_bilingual=True,
                language_hint="Mandarin/English",
                avg_confidence=0.96,
                extraction_provider="gemini-2.5-flash",
            ),
            ShipmentDocument(
                shipment_id=shp_1.id,
                doc_type="PACKING_LIST",
                file_name="SHP-24811_PACKING_LIST.pdf",
                file_url="/static/docs/SHP-24811_PACKING_LIST.pdf",
                page_count=1,
                skew_angle_deg=0.0,
                is_bilingual=True,
                language_hint="Mandarin/English",
                avg_confidence=0.94,
                extraction_provider="gemini-2.5-flash",
            ),
            ShipmentDocument(
                shipment_id=shp_1.id,
                doc_type="BILL_OF_LADING",
                file_name="SHP-24811_BILL_OF_LADING.pdf",
                file_url="/static/docs/SHP-24811_BILL_OF_LADING.pdf",
                page_count=1,
                skew_angle_deg=0.0,
                is_bilingual=False,
                avg_confidence=0.97,
                extraction_provider="gemini-2.5-flash",
            ),
        ]
        db.add_all(docs_1)

        # Extracted Fields
        fields_1 = [
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="INVOICE",
                field_key="invoice_number",
                field_label="Invoice Number",
                field_category="HEADER",
                ai_extracted_value="INV-CB-2026-881",
                current_value="INV-CB-2026-881",
                confidence_score=0.98,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="Top Right Header",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="INVOICE",
                field_key="invoice_date",
                field_label="Invoice Date",
                field_category="HEADER",
                ai_extracted_value="2026-10-18",
                current_value="2026-10-18",
                confidence_score=0.97,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="Top Right Header",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="INVOICE",
                field_key="supplier_name",
                field_label="Supplier / Exporter",
                field_category="PARTIES",
                ai_extracted_value="Company B (China) / 深圳市B照明有限公司",
                current_value="Company B (China) / 深圳市B照明有限公司",
                confidence_score=0.95,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="Top Left Letterhead",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="INVOICE",
                field_key="importer_name",
                field_label="Importer / Consignee",
                field_category="PARTIES",
                ai_extracted_value="Lumina Commercial Lighting Pvt. Ltd.",
                current_value="Lumina Commercial Lighting Pvt. Ltd.",
                confidence_score=0.96,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="Left Consignee Box",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="INVOICE",
                field_key="incoterm",
                field_label="Incoterm",
                field_category="HEADER",
                ai_extracted_value="FOB Shenzhen",
                current_value="FOB Shenzhen",
                confidence_score=0.94,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="Header Meta",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="INVOICE",
                field_key="currency",
                field_label="Invoice Currency",
                field_category="HEADER",
                ai_extracted_value="USD",
                current_value="USD",
                confidence_score=0.99,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="Header Meta",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="INVOICE",
                field_key="invoice_total",
                field_label="Invoice Total",
                field_category="TOTALS",
                ai_extracted_value="16320.00",
                current_value="16320.00",
                unit="USD",
                confidence_score=0.99,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="Bottom Totals Box",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="INVOICE",
                field_key="packages",
                field_label="Total Packages",
                field_category="LOGISTICS",
                ai_extracted_value="240",
                current_value="240",
                unit="Cartons",
                confidence_score=0.96,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="Totals Box",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
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
                bbox_hint="Totals Box",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="INVOICE",
                field_key="net_weight_kg",
                field_label="Net Weight (KG)",
                field_category="TOTALS",
                ai_extracted_value="2880.00",
                current_value="2880.00",
                unit="KG",
                confidence_score=0.95,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="Totals Box",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="INVOICE",
                field_key="container_number",
                field_label="Container Number",
                field_category="LOGISTICS",
                ai_extracted_value="MSCU8492014",
                current_value="MSCU8492014",
                confidence_score=0.97,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="Right Logistics Grid",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="PACKING_LIST",
                field_key="gross_weight_kg",
                field_label="PL Gross Weight (KG)",
                field_category="TOTALS",
                ai_extracted_value="3165.00",
                current_value="3165.00",
                unit="KG",
                confidence_score=0.95,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="PL Totals Box",
            ),
            ExtractedField(
                shipment_id=shp_1.id,
                doc_type="BILL_OF_LADING",
                field_key="gross_weight_kg",
                field_label="BoL Gross Cargo Weight",
                field_category="TOTALS",
                ai_extracted_value="3165.00",
                current_value="3165.00",
                unit="KG",
                confidence_score=0.97,
                is_low_confidence=False,
                is_confirmed_by_human=False,
                bbox_hint="BoL Cargo Details",
            ),
        ]
        db.add_all(fields_1)

        # Line Items
        item_1 = ShipmentLineItem(
            shipment_id=shp_1.id,
            doc_type="INVOICE",
            line_number=1,
            description="LED panel light 40W (600x600mm Backlit)",
            hsn_code="94054200",
            qty=2400.0,
            unit="PCS",
            unit_price=6.80,
            line_total=16320.00,
            gross_weight_kg=3120.0,
            confidence_score=0.96,
            is_low_confidence=False,
            is_confirmed_by_human=False,
        )
        db.add(item_1)
        db.flush()
        run_three_way_crosschecks(db, shp_1)

    # --------------------------------------------------------------------------
    # SHIPMENT 2: SHP-24812 (Company C, Sweden) — Skewed Scan (-2.8°) & Low Confidence
    # --------------------------------------------------------------------------
    shp_2 = db.query(Shipment).filter(Shipment.shipment_code == "SHP-24812").first()
    if not shp_2:
        shp_2 = Shipment(
            shipment_code="SHP-24812",
            title="Company C (Sweden) — Industrial Steel Ball Valve DN50",
            supplier_name="Company C (Sweden) / Nordisk Ventil AB",
            supplier_country="Sweden",
            importer_name="Bharat Petrochem Flow Controls Ltd.",
            importer_iec="0398127450",
            importer_contact_name="Anand Kulkarni",
            importer_contact_email="anand@bharatpetrochem.in",
            importer_contact_phone="+91-9820194821",
            port_of_loading="Gothenburg, Sweden (SEGOT)",
            port_of_discharge="Nhava Sheva / JNPT, India (INNSA)",
            currency="EUR",
            incoterm="CIF Nhava Sheva",
            status="NEEDS_REVIEW",
            requires_manager_approval=False,
            processing_time_minutes=10.8,
            created_at=datetime.utcnow() - timedelta(days=1),
            updated_at=datetime.utcnow() - timedelta(hours=2),
        )
        db.add(shp_2)
        db.flush()

        docs_2 = [
            ShipmentDocument(
                shipment_id=shp_2.id,
                doc_type="INVOICE",
                file_name="SHP-24812_INVOICE.pdf",
                file_url="/static/docs/SHP-24812_INVOICE.pdf",
                page_count=1,
                skew_angle_deg=-2.8,
                is_bilingual=True,
                language_hint="Swedish/English",
                avg_confidence=0.81,
                extraction_provider="gemini-2.5-flash",
            ),
            ShipmentDocument(
                shipment_id=shp_2.id,
                doc_type="PACKING_LIST",
                file_name="SHP-24812_PACKING_LIST.pdf",
                file_url="/static/docs/SHP-24812_PACKING_LIST.pdf",
                page_count=1,
                skew_angle_deg=0.0,
                is_bilingual=True,
                language_hint="Swedish/English",
                avg_confidence=0.88,
                extraction_provider="gemini-2.5-flash",
            ),
            ShipmentDocument(
                shipment_id=shp_2.id,
                doc_type="BILL_OF_LADING",
                file_name="SHP-24812_BILL_OF_LADING.pdf",
                file_url="/static/docs/SHP-24812_BILL_OF_LADING.pdf",
                page_count=1,
                skew_angle_deg=0.0,
                is_bilingual=False,
                avg_confidence=0.95,
                extraction_provider="gemini-2.5-flash",
            ),
        ]
        db.add_all(docs_2)

        fields_2 = [
            ExtractedField(
                shipment_id=shp_2.id,
                doc_type="INVOICE",
                field_key="invoice_number",
                field_label="Invoice Number",
                field_category="HEADER",
                ai_extracted_value="SE-INV-4092",
                current_value="SE-INV-4092",
                confidence_score=0.95,
                is_low_confidence=False,
                is_confirmed_by_human=False,
            ),
            ExtractedField(
                shipment_id=shp_2.id,
                doc_type="INVOICE",
                field_key="supplier_name",
                field_label="Supplier Name",
                field_category="PARTIES",
                ai_extracted_value="Company C (Sweden) / Nordisk Ventil AB",
                current_value="Company C (Sweden) / Nordisk Ventil AB",
                confidence_score=0.91,
                is_low_confidence=False,
                is_confirmed_by_human=False,
            ),
            ExtractedField(
                shipment_id=shp_2.id,
                doc_type="INVOICE",
                field_key="incoterm",
                field_label="Incoterm",
                field_category="HEADER",
                ai_extracted_value="CIF Nhava Sheva",
                current_value="CIF Nhava Sheva",
                confidence_score=0.78,  # <-- Amber low confidence (< 0.85)
                is_low_confidence=True,
                is_confirmed_by_human=False,
                bbox_hint="Swedish header Leveransvillkor",
            ),
            ExtractedField(
                shipment_id=shp_2.id,
                doc_type="INVOICE",
                field_key="currency",
                field_label="Currency",
                field_category="HEADER",
                ai_extracted_value="EUR",
                current_value="EUR",
                confidence_score=0.98,
                is_low_confidence=False,
                is_confirmed_by_human=False,
            ),
            ExtractedField(
                shipment_id=shp_2.id,
                doc_type="INVOICE",
                field_key="invoice_total",
                field_label="Invoice Total",
                field_category="TOTALS",
                ai_extracted_value="7650.00",
                current_value="7650.00",
                unit="EUR",
                confidence_score=0.96,
                is_low_confidence=False,
                is_confirmed_by_human=False,
            ),
            ExtractedField(
                shipment_id=shp_2.id,
                doc_type="INVOICE",
                field_key="packages",
                field_label="Packages",
                field_category="LOGISTICS",
                ai_extracted_value="18",
                current_value="18",
                unit="Wooden Crates",
                confidence_score=0.93,
                is_low_confidence=False,
                is_confirmed_by_human=False,
            ),
            ExtractedField(
                shipment_id=shp_2.id,
                doc_type="INVOICE",
                field_key="gross_weight_kg",
                field_label="Gross Weight (KG)",
                field_category="TOTALS",
                ai_extracted_value="1460.00",
                current_value="1460.00",
                unit="KG",
                confidence_score=0.92,
                is_low_confidence=False,
                is_confirmed_by_human=False,
            ),
            ExtractedField(
                shipment_id=shp_2.id,
                doc_type="INVOICE",
                field_key="net_weight_kg",
                field_label="Net Weight (KG)",
                field_category="TOTALS",
                ai_extracted_value="1350.00",
                current_value="1350.00",
                unit="KG",
                confidence_score=0.91,
                is_low_confidence=False,
                is_confirmed_by_human=False,
            ),
            ExtractedField(
                shipment_id=shp_2.id,
                doc_type="INVOICE",
                field_key="container_number",
                field_label="Container Number",
                field_category="LOGISTICS",
                ai_extracted_value="HLXU4029183",
                current_value="HLXU4029183",
                confidence_score=0.95,
                is_low_confidence=False,
                is_confirmed_by_human=False,
            ),
        ]
        db.add_all(fields_2)

        item_2 = ShipmentLineItem(
            shipment_id=shp_2.id,
            doc_type="INVOICE",
            line_number=1,
            description="Steel ball valve DN50 PN40 (Rostfritt kulventil)",
            hsn_code="84818030",
            qty=180.0,
            unit="NOS",
            unit_price=42.50,
            line_total=7650.00,
            gross_weight_kg=1460.0,
            confidence_score=0.74,  # <-- Amber low confidence HSN code (< 0.85)
            is_low_confidence=True,
            is_confirmed_by_human=False,
        )
        db.add(item_2)
        db.flush()
        run_three_way_crosschecks(db, shp_2)

    # --------------------------------------------------------------------------
    # SHIPMENT 3: SHP-24813 (Shenzhen Precision Motors) — Fully Approved
    # --------------------------------------------------------------------------
    shp_3 = db.query(Shipment).filter(Shipment.shipment_code == "SHP-24813").first()
    if not shp_3:
        shp_3 = Shipment(
            shipment_code="SHP-24813",
            title="Shenzhen Precision Motors — Servo Actuators (Verified & Ready)",
            supplier_name="Shenzhen Precision Motors Co., Ltd.",
            supplier_country="China",
            importer_name="Apex Robotics Automation Pvt. Ltd.",
            importer_iec="0318029174",
            importer_contact_name="Deepak Joshi",
            importer_contact_email="deepak@apexrobotics.in",
            importer_contact_phone="+91-9819284711",
            port_of_loading="Yantian / Shenzhen, China (CNYTN)",
            port_of_discharge="Nhava Sheva / JNPT, India (INNSA)",
            currency="USD",
            incoterm="FOB Yantian",
            status="APPROVED",
            requires_manager_approval=False,
            approved_by_id=mgr_user.id,
            approved_at=datetime.utcnow() - timedelta(hours=6),
            processing_time_minutes=8.4,
            created_at=datetime.utcnow() - timedelta(days=3),
            updated_at=datetime.utcnow() - timedelta(hours=6),
        )
        db.add(shp_3)
        db.flush()

        docs_3 = [
            ShipmentDocument(
                shipment_id=shp_3.id,
                doc_type="INVOICE",
                file_name="SHP-24813_INVOICE.pdf",
                file_url="/static/docs/SHP-24813_INVOICE.pdf",
                page_count=1,
                avg_confidence=0.98,
                extraction_provider="gemini-2.5-flash",
            ),
            ShipmentDocument(
                shipment_id=shp_3.id,
                doc_type="PACKING_LIST",
                file_name="SHP-24813_PACKING_LIST.pdf",
                file_url="/static/docs/SHP-24813_PACKING_LIST.pdf",
                page_count=1,
                avg_confidence=0.97,
                extraction_provider="gemini-2.5-flash",
            ),
            ShipmentDocument(
                shipment_id=shp_3.id,
                doc_type="BILL_OF_LADING",
                file_name="SHP-24813_BILL_OF_LADING.pdf",
                file_url="/static/docs/SHP-24813_BILL_OF_LADING.pdf",
                page_count=1,
                avg_confidence=0.98,
                extraction_provider="gemini-2.5-flash",
            ),
        ]
        db.add_all(docs_3)

        fields_3 = [
            ExtractedField(
                shipment_id=shp_3.id,
                doc_type="INVOICE",
                field_key="invoice_number",
                field_label="Invoice Number",
                field_category="HEADER",
                ai_extracted_value="SPM-2026-419",
                current_value="SPM-2026-419",
                confidence_score=0.99,
                is_low_confidence=False,
                is_confirmed_by_human=True,
                confirmed_by_name="Rohan Deshmukh",
                confirmed_at=datetime.utcnow() - timedelta(hours=7),
            ),
            ExtractedField(
                shipment_id=shp_3.id,
                doc_type="INVOICE",
                field_key="invoice_total",
                field_label="Invoice Total",
                field_category="TOTALS",
                ai_extracted_value="22500.00",
                current_value="22500.00",
                unit="USD",
                confidence_score=0.99,
                is_low_confidence=False,
                is_confirmed_by_human=True,
                confirmed_by_name="Rohan Deshmukh",
                confirmed_at=datetime.utcnow() - timedelta(hours=7),
            ),
            ExtractedField(
                shipment_id=shp_3.id,
                doc_type="INVOICE",
                field_key="gross_weight_kg",
                field_label="Gross Weight (KG)",
                field_category="TOTALS",
                ai_extracted_value="4250.00",
                current_value="4250.00",
                unit="KG",
                confidence_score=0.98,
                is_low_confidence=False,
                is_confirmed_by_human=True,
                confirmed_by_name="Rohan Deshmukh",
                confirmed_at=datetime.utcnow() - timedelta(hours=7),
            ),
            ExtractedField(
                shipment_id=shp_3.id,
                doc_type="INVOICE",
                field_key="container_number",
                field_label="Container Number",
                field_category="LOGISTICS",
                ai_extracted_value="CMAU5519023",
                current_value="CMAU5519023",
                confidence_score=0.98,
                is_low_confidence=False,
                is_confirmed_by_human=True,
                confirmed_by_name="Rohan Deshmukh",
                confirmed_at=datetime.utcnow() - timedelta(hours=7),
            ),
        ]
        db.add_all(fields_3)

        item_3 = ShipmentLineItem(
            shipment_id=shp_3.id,
            doc_type="INVOICE",
            line_number=1,
            description="Servo Actuator Motors 750W Industrial Grade",
            hsn_code="85015210",
            qty=500.0,
            unit="PCS",
            unit_price=45.00,
            line_total=22500.00,
            gross_weight_kg=4250.0,
            confidence_score=0.97,
            is_low_confidence=False,
            is_confirmed_by_human=True,
        )
        db.add(item_3)
        db.flush()
        run_three_way_crosschecks(db, shp_3)

    # --------------------------------------------------------------------------
    # SHIPMENT 4: SHP-24814 (Hamburg Chemie GmbH) — Degraded / Unreadable PL Page
    # --------------------------------------------------------------------------
    shp_4 = db.query(Shipment).filter(Shipment.shipment_code == "SHP-24814").first()
    if not shp_4:
        shp_4 = Shipment(
            shipment_code="SHP-24814",
            title="Hamburg Chemie GmbH — Specialty Catalysts (Unreadable Page Edge Case)",
            supplier_name="Hamburg Chemie GmbH",
            supplier_country="Germany",
            importer_name="Western Specialty Resins Ltd.",
            importer_iec="0309182741",
            importer_contact_name="Girish Patil",
            importer_contact_email="girish@westernresins.co.in",
            importer_contact_phone="+91-9833190248",
            port_of_loading="Hamburg, Germany (DEHAM)",
            port_of_discharge="Nhava Sheva / JNPT, India (INNSA)",
            currency="EUR",
            incoterm="CIF Nhava Sheva",
            status="NEEDS_REVIEW",
            requires_manager_approval=False,
            processing_time_minutes=15.5,
            created_at=datetime.utcnow() - timedelta(hours=18),
            updated_at=datetime.utcnow() - timedelta(hours=1),
        )
        db.add(shp_4)
        db.flush()

        docs_4 = [
            ShipmentDocument(
                shipment_id=shp_4.id,
                doc_type="INVOICE",
                file_name="SHP-24814_INVOICE.pdf",
                file_url="/static/docs/SHP-24814_INVOICE.pdf",
                page_count=1,
                avg_confidence=0.95,
                extraction_provider="gemini-2.5-flash",
            ),
            ShipmentDocument(
                shipment_id=shp_4.id,
                doc_type="PACKING_LIST",
                file_name="SHP-24814_PACKING_LIST.pdf",
                file_url="/static/docs/SHP-24814_PACKING_LIST.pdf",
                page_count=1,
                is_unreadable=True,  # <-- Degraded scan trigger
                avg_confidence=0.31,  # Low confidence trigger
                extraction_provider="gemini-2.5-flash",
            ),
            ShipmentDocument(
                shipment_id=shp_4.id,
                doc_type="BILL_OF_LADING",
                file_name="SHP-24814_BILL_OF_LADING.pdf",
                file_url="/static/docs/SHP-24814_BILL_OF_LADING.pdf",
                page_count=1,
                avg_confidence=0.96,
                extraction_provider="gemini-2.5-flash",
            ),
        ]
        db.add_all(docs_4)

        fields_4 = [
            ExtractedField(
                shipment_id=shp_4.id,
                doc_type="PACKING_LIST",
                field_key="gross_weight_kg",
                field_label="PL Gross Weight (Degraded Scan)",
                field_category="TOTALS",
                ai_extracted_value="16400.00",
                current_value="",
                unit="KG",
                confidence_score=0.31,
                is_low_confidence=True,
                is_manual_entry=True,  # <-- Manual entry required!
                is_confirmed_by_human=False,
                bbox_hint="Unreadable bottom table",
            ),
            ExtractedField(
                shipment_id=shp_4.id,
                doc_type="INVOICE",
                field_key="invoice_total",
                field_label="Invoice Total",
                field_category="TOTALS",
                ai_extracted_value="27200.00",
                current_value="27200.00",
                unit="EUR",
                confidence_score=0.95,
                is_low_confidence=False,
                is_confirmed_by_human=False,
            ),
        ]
        db.add_all(fields_4)
        db.flush()
        run_three_way_crosschecks(db, shp_4)

    # --------------------------------------------------------------------------
    # 60+ HISTORICAL FIELD EDIT RECORDS FOR ACCURACY ANALYTICS
    # --------------------------------------------------------------------------
    existing_history_count = db.query(FieldEditHistory).count()
    if existing_history_count < 60:
        history_records = []
        suppliers_pool = [
            ("Company B (China)", "SHP-247", "China"),
            ("Company C (Sweden)", "SHP-246", "Sweden"),
            ("Shenzhen Precision Motors", "SHP-245", "China"),
            ("Hamburg Chemie GmbH", "SHP-244", "Germany"),
        ]
        fields_pool = [
            ("invoice_number", "Invoice Number", "INVOICE", 0.99, "AI extraction verified"),
            ("invoice_date", "Invoice Date", "INVOICE", 0.98, "AI extraction verified"),
            ("hsn_code", "8-Digit HSN Code", "INVOICE", 0.92, "Corrected 8-digit tariff suffix for Indian customs classification"),
            ("incoterm", "Incoterm", "INVOICE", 0.94, "AI extraction verified"),
            ("gross_weight_kg", "Gross Weight (KG)", "INVOICE", 0.95, "Corrected 45kg wooden pallet tare dunnage delta"),
            ("unit_price", "Unit Price", "INVOICE", 0.97, "AI extraction verified"),
            ("packages", "Package Count", "PACKING_LIST", 0.96, "AI extraction verified"),
            ("container_number", "Container Number", "BILL_OF_LADING", 0.98, "AI extraction verified"),
        ]

        # Generate 64 realistic historical edits spanning past 30 days
        # Calibrated for ~95.3% AI accuracy benchmark (61 matches, 3 human corrections)
        correction_indices = {17, 33, 49}
        for i in range(1, 65):
            supp_name, supp_code_prefix, country = suppliers_pool[i % len(suppliers_pool)]
            f_key, f_label, doc_type, base_conf, edit_msg = fields_pool[i % len(fields_pool)]
            shp_code = f"{supp_code_prefix}{i:02d}"

            was_correct = i not in correction_indices
            conf = max(0.85, min(0.99, base_conf + ((i % 5) - 2) * 0.01))
            orig_val = f"VAL_{i}_{f_key}"
            human_val = orig_val if was_correct else f"VAL_{i}_{f_key}_CORRECTED"

            record = FieldEditHistory(
                shipment_id=shp_1.id,  # Associated to primary shipment reference
                shipment_code=shp_code,
                supplier_name=supp_name,
                doc_type=doc_type,
                field_key=f_key,
                field_label=f_label,
                original_ai_value=orig_val,
                updated_human_value=human_val,
                was_ai_correct=was_correct,
                ai_confidence=round(conf, 2),
                edited_by_name="Rohan Deshmukh" if (i % 2 == 0) else "Priya Nair",
                edited_by_role="DOCUMENTATION_EXECUTIVE" if (i % 2 == 0) else "DOCUMENTATION_MANAGER",
                edit_reason="Verified against original bill" if was_correct else edit_msg,
                created_at=datetime.utcnow() - timedelta(days=(40 - (i // 2))),
            )
            history_records.append(record)

        db.add_all(history_records)

    db.commit()


if __name__ == "__main__":
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        seed_database(db, force_refresh=True)
        print("Database seeding completed successfully.")
    finally:
        db.close()

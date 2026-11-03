"""Synthetic Customs Document PDF Generator for BrokerLens.

Generates 12 visually authentic customs PDFs (Commercial Invoice, Packing List,
and Ocean Bill of Lading) across 4 seed shipments, including bilingual headers,
simulated scanner tilt, and degraded scan noise.
"""

import os
from typing import Dict, List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

# Attempt to register ReportLab CJK font for Chinese characters
CJK_FONT_NAME = "STSong-Light"
CJK_AVAILABLE = False
try:
    pdfmetrics.registerFont(UnicodeCIDFont(CJK_FONT_NAME))
    CJK_AVAILABLE = True
except Exception:
    CJK_AVAILABLE = False


class SkewedCanvas(canvas.Canvas):
    """Canvas that applies a -2.8 degree rotation to simulate flatbed scanner skew."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.saveState()
        self.translate(15, -10)
        self.rotate(-2.8)

    def showPage(self):
        self.restoreState()
        super().showPage()


def get_base_styles(use_cjk: bool = False):
    """Return configured ReportLab ParagraphStyles."""
    styles = getSampleStyleSheet()
    font_name = CJK_FONT_NAME if (use_cjk and CJK_AVAILABLE) else "Helvetica"
    font_bold = CJK_FONT_NAME if (use_cjk and CJK_AVAILABLE) else "Helvetica-Bold"

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName=font_bold,
        fontSize=14,
        leading=17,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4,
    )

    header_style = ParagraphStyle(
        "CompanyHeader",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#1E293B"),
    )

    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName=font_name,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1E293B"),
    )

    body_bold = ParagraphStyle(
        "DocBodyBold",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
    )

    body_muted = ParagraphStyle(
        "DocBodyMuted",
        parent=styles["Normal"],
        fontName=font_name,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#64748B"),
    )

    table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0F172A"),
        alignment=1,  # Center
    )

    return {
        "title": title_style,
        "header": header_style,
        "body": body_style,
        "bold": body_bold,
        "muted": body_muted,
        "table_header": table_header,
        "font_name": font_name,
        "font_bold": font_bold,
    }


def draw_degradation_noise(c: canvas.Canvas, doc):
    """Draw simulated degradation, blur noise, and unreadable watermark on canvas."""
    c.saveState()
    # Diagonal watermark
    c.setFont("Helvetica-Bold", 32)
    c.setFillColor(colors.HexColor("#EF4444"), alpha=0.18)
    c.translate(300, 400)
    c.rotate(35)
    c.drawCentredString(0, 0, "UNREADABLE / LOW CONFIDENCE SCAN")
    c.setFont("Helvetica", 16)
    c.drawCentredString(0, -30, "AI CONFIDENCE: 0.31 — OPERATOR MANUAL ENTRY REQUIRED")
    c.restoreState()

    # Simulated scan smudge lines across page
    c.saveState()
    c.setStrokeColor(colors.HexColor("#94A3B8"), alpha=0.35)
    c.setLineWidth(2)
    for y in [180, 260, 340, 520, 610, 680]:
        c.line(40, y, 570, y + 6)
    c.restoreState()


# ==============================================================================
# DOCUMENT BUILDERS
# ==============================================================================
def build_invoice_pdf(
    filepath: str,
    doc_number: str,
    date_str: str,
    supplier_name: str,
    supplier_address: str,
    importer_name: str,
    importer_address: str,
    importer_iec: str,
    incoterm: str,
    currency: str,
    pol: str,
    pod: str,
    vessel: str,
    container_no: str,
    line_items: List[Dict],
    packages_count: int,
    packages_unit: str,
    gross_wt_kg: float,
    net_wt_kg: float,
    invoice_total: float,
    is_skewed: bool = False,
    bilingual_title: str = "COMMERCIAL INVOICE",
    use_cjk: bool = False,
):
    """Generate high-density, professional Customs Commercial Invoice PDF."""
    canvas_class = SkewedCanvas if is_skewed else canvas.Canvas
    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = get_base_styles(use_cjk=use_cjk)
    story = []

    # Title & Letterhead
    header_data = [
        [
            Paragraph(f"<b>{supplier_name}</b><br/>{supplier_address}", styles["body"]),
            Paragraph(
                f"<font size='13'><b>{bilingual_title}</b></font><br/>"
                f"<b>Invoice No:</b> {doc_number}<br/>"
                f"<b>Date:</b> {date_str}<br/>"
                f"<b>Incoterm:</b> {incoterm}<br/>"
                f"<b>Currency:</b> {currency}",
                styles["body"],
            ),
        ]
    ]
    header_table = Table(header_data, colWidths=[330, 210])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#0F172A")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 8))

    # Parties & Logistics Grid
    parties_data = [
        [
            Paragraph(
                f"<b>CONSIGNEE / IMPORTER (INDIA):</b><br/>"
                f"<b>{importer_name}</b><br/>"
                f"{importer_address}<br/>"
                f"<b>Importer Exporter Code (IEC):</b> {importer_iec}<br/>"
                f"<b>Port of Discharge:</b> {pod}",
                styles["body"],
            ),
            Paragraph(
                f"<b>SHIPPING & VESSEL DETAILS:</b><br/>"
                f"<b>Port of Loading:</b> {pol}<br/>"
                f"<b>Vessel / Voyage:</b> {vessel}<br/>"
                f"<b>Container No:</b> <font color='#0F172A'><b>{container_no}</b></font><br/>"
                f"<b>Customs Filing Notice:</b> Direct Nhava Sheva JNPT Clearance",
                styles["body"],
            ),
        ]
    ]
    parties_table = Table(parties_data, colWidths=[270, 270])
    parties_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#64748B")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(parties_table)
    story.append(Spacer(1, 10))

    # Line Items Table
    table_rows = [
        [
            Paragraph("<b>#</b>", styles["table_header"]),
            Paragraph("<b>Item Description</b>", styles["table_header"]),
            Paragraph("<b>HSN Code</b>", styles["table_header"]),
            Paragraph("<b>Qty</b>", styles["table_header"]),
            Paragraph("<b>Unit</b>", styles["table_header"]),
            Paragraph(f"<b>Price ({currency})</b>", styles["table_header"]),
            Paragraph(f"<b>Total ({currency})</b>", styles["table_header"]),
        ]
    ]

    for idx, item in enumerate(line_items, 1):
        table_rows.append([
            Paragraph(str(idx), styles["body"]),
            Paragraph(item["description"], styles["body"]),
            Paragraph(f"<b>{item['hsn_code']}</b>", styles["body"]),
            Paragraph(f"{item['qty']:,.2f}", styles["body"]),
            Paragraph(item["unit"], styles["body"]),
            Paragraph(f"{item['unit_price']:,.2f}", styles["body"]),
            Paragraph(f"<b>{item['line_total']:,.2f}</b>", styles["body"]),
        ])

    items_table = Table(table_rows, colWidths=[25, 205, 75, 55, 45, 65, 70])
    items_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(items_table)
    story.append(Spacer(1, 8))

    # Totals & Weight Summary Box
    totals_data = [
        [
            Paragraph(
                f"<b>Total Packages:</b> {packages_count} {packages_unit}<br/>"
                f"<b>Total Net Weight:</b> {net_wt_kg:,.2f} KG<br/>"
                f"<b>Total Gross Weight:</b> <font color='#0F172A'><b>{gross_wt_kg:,.2f} KG</b></font>",
                styles["body"],
            ),
            Paragraph(
                f"<font size='10'><b>INVOICE TOTAL:</b></font><br/>"
                f"<font size='13' color='#0F172A'><b>{currency} {invoice_total:,.2f}</b></font><br/>"
                f"<i>Amount in words: {currency} {invoice_total:,.2f} Only</i>",
                styles["body"],
            ),
        ]
    ]
    totals_table = Table(totals_data, colWidths=[310, 230])
    totals_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#0F172A")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(totals_table)
    story.append(Spacer(1, 12))

    # Declaration & Signature
    decl_data = [
        [
            Paragraph(
                "<b>Customs Declaration:</b> We hereby certify that this invoice shows the actual price "
                "of the goods described and that all particulars are true and correct.",
                styles["muted"],
            ),
            Paragraph(
                f"For <b>{supplier_name}</b><br/><br/><br/>"
                "__________________________<br/>Authorized Signatory",
                styles["body"],
            ),
        ]
    ]
    decl_table = Table(decl_data, colWidths=[360, 180])
    story.append(decl_table)

    doc.build(story, canvasmaker=canvas_class)


def build_packing_list_pdf(
    filepath: str,
    doc_number: str,
    date_str: str,
    ref_invoice_no: str,
    supplier_name: str,
    importer_name: str,
    container_no: str,
    item_description: str,
    total_qty: float,
    unit: str,
    packages_count: int,
    package_type: str,
    net_wt_kg: float,
    gross_wt_kg: float,
    bilingual_title: str = "PACKING LIST",
    is_unreadable: bool = False,
    use_cjk: bool = False,
):
    """Generate Customs Packing List PDF, with optional bilingual headers and simulated degradation noise."""
    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = get_base_styles(use_cjk=use_cjk)
    story = []

    # Title & Header
    header_data = [
        [
            Paragraph(f"<b>{supplier_name}</b>", styles["header"]),
            Paragraph(
                f"<font size='13'><b>{bilingual_title}</b></font><br/>"
                f"<b>Packing List No:</b> {doc_number}<br/>"
                f"<b>Date:</b> {date_str}<br/>"
                f"<b>Ref Invoice No:</b> {ref_invoice_no}",
                styles["body"],
            ),
        ]
    ]
    header_table = Table(header_data, colWidths=[330, 210])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#0F172A")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 8))

    # Parties Box
    parties_data = [
        [
            Paragraph(
                f"<b>SHIPPER:</b> {supplier_name}<br/>"
                f"<b>CONSIGNEE:</b> {importer_name}<br/>"
                f"<b>DESTINATION:</b> Nhava Sheva / JNPT, India",
                styles["body"],
            ),
            Paragraph(
                f"<b>SHIPPING CONTAINER:</b><br/>"
                f"<font size='11' color='#0F172A'><b>{container_no}</b></font><br/>"
                f"<b>Total Packages:</b> {packages_count} {package_type}",
                styles["body"],
            ),
        ]
    ]
    parties_table = Table(parties_data, colWidths=[330, 210])
    parties_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(parties_table)
    story.append(Spacer(1, 10))

    # Package Breakdown Table
    table_rows = [
        [
            Paragraph("<b>Package Range</b>", styles["table_header"]),
            Paragraph("<b>Description of Goods</b>", styles["table_header"]),
            Paragraph("<b>Qty / Pkg</b>", styles["table_header"]),
            Paragraph("<b>Total Qty</b>", styles["table_header"]),
            Paragraph("<b>Net Wt (KG)</b>", styles["table_header"]),
            Paragraph("<b>Gross Wt (KG)</b>", styles["table_header"]),
        ]
    ]

    qty_per_pkg = total_qty / max(packages_count, 1)
    net_per_pkg = net_wt_kg / max(packages_count, 1)
    gross_per_pkg = gross_wt_kg / max(packages_count, 1)

    table_rows.append([
        Paragraph(f"001 — {packages_count:03d}", styles["body"]),
        Paragraph(item_description, styles["body"]),
        Paragraph(f"{qty_per_pkg:.1f} {unit}", styles["body"]),
        Paragraph(f"<b>{total_qty:,.0f} {unit}</b>", styles["body"]),
        Paragraph(f"{net_wt_kg:,.2f}", styles["body"]),
        Paragraph(f"<b>{gross_wt_kg:,.2f}</b>", styles["body"]),
    ])

    pkg_table = Table(table_rows, colWidths=[80, 210, 60, 65, 60, 65])
    pkg_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
            ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(pkg_table)
    story.append(Spacer(1, 8))

    # Packing Summary Box
    summary_data = [
        [
            Paragraph(
                f"<b>TOTAL PACKAGES:</b> {packages_count} {package_type}<br/>"
                f"<b>TOTAL UNITS:</b> {total_qty:,.0f} {unit}",
                styles["body"],
            ),
            Paragraph(
                f"<b>TOTAL NET WEIGHT:</b> {net_wt_kg:,.2f} KG<br/>"
                f"<b>TOTAL GROSS WEIGHT:</b> <font size='10' color='#0F172A'><b>{gross_wt_kg:,.2f} KG</b></font>",
                styles["body"],
            ),
        ]
    ]
    summary_table = Table(summary_data, colWidths=[270, 270])
    summary_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#0F172A")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(summary_table)

    # Build with degradation callback if marked unreadable
    if is_unreadable:
        doc.build(story, onFirstPage=draw_degradation_noise)
    else:
        doc.build(story)


def build_bill_of_lading_pdf(
    filepath: str,
    bol_number: str,
    carrier_name: str,
    vessel: str,
    pol: str,
    pod: str,
    shipper: str,
    consignee: str,
    container_no: str,
    packages_count: int,
    package_type: str,
    goods_description: str,
    gross_wt_kg: float,
    measurement_cbm: float = 24.5,
):
    """Generate authentic Ocean Bill of Lading (BoL) PDF."""
    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = get_base_styles()
    story = []

    # Carrier & BoL Header
    header_data = [
        [
            Paragraph(
                f"<font size='14'><b>{carrier_name}</b></font><br/>"
                "<b>GLOBAL CONTAINER OCEAN TRANSPORT</b>",
                styles["body"],
            ),
            Paragraph(
                f"<font size='12'><b>BILL OF LADING</b></font><br/>"
                f"<b>B/L Number:</b> <font color='#0F172A'><b>{bol_number}</b></font><br/>"
                "<b>Status:</b> ORIGINAL / FREIGHT PREPAID",
                styles["body"],
            ),
        ]
    ]
    header_table = Table(header_data, colWidths=[330, 210])
    header_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#0F172A")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 8))

    # Shipper, Consignee, and Voyage Details
    routing_data = [
        [
            Paragraph(
                f"<b>SHIPPER / EXPORTER:</b><br/>{shipper}<br/><br/>"
                f"<b>CONSIGNEE:</b><br/>{consignee}<br/><br/>"
                f"<b>NOTIFY PARTY:</b><br/>SAME AS CONSIGNEE",
                styles["body"],
            ),
            Paragraph(
                f"<b>OCEAN VESSEL & VOYAGE:</b><br/>{vessel}<br/><br/>"
                f"<b>PORT OF LOADING:</b><br/>{pol}<br/><br/>"
                f"<b>PORT OF DISCHARGE:</b><br/>{pod}<br/><br/>"
                f"<b>PLACE OF DELIVERY:</b><br/>JNPT Nhava Sheva CFS",
                styles["body"],
            ),
        ]
    ]
    routing_table = Table(routing_data, colWidths=[270, 270])
    routing_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#64748B")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(routing_table)
    story.append(Spacer(1, 10))

    # Cargo Details Table
    cargo_data = [
        [
            Paragraph("<b>Container & Seal No</b>", styles["table_header"]),
            Paragraph("<b>No of Packages</b>", styles["table_header"]),
            Paragraph("<b>Description of Packages & Goods</b>", styles["table_header"]),
            Paragraph("<b>Gross Cargo Wt</b>", styles["table_header"]),
            Paragraph("<b>Measurement</b>", styles["table_header"]),
        ],
        [
            Paragraph(f"<b>{container_no}</b><br/>SEAL: ML-98241", styles["body"]),
            Paragraph(f"<b>{packages_count}</b> {package_type}", styles["body"]),
            Paragraph(goods_description, styles["body"]),
            Paragraph(f"<font size='9'><b>{gross_wt_kg:,.2f} KG</b></font>", styles["body"]),
            Paragraph(f"{measurement_cbm:.2f} CBM", styles["body"]),
        ],
    ]
    cargo_table = Table(cargo_data, colWidths=[120, 80, 200, 80, 60])
    cargo_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
            ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(cargo_table)
    story.append(Spacer(1, 10))

    # Legal clause & signature
    legal_data = [
        [
            Paragraph(
                "SHIPPED on board in apparent good order and condition, unless otherwise stated. "
                "Weight, measure, marks, numbers, quality, quantity, condition, contents and value "
                "unknown. Clean on Board.",
                styles["muted"],
            ),
            Paragraph(
                f"Signed for Carrier <b>{carrier_name}</b><br/><br/>"
                "__________________________<br/>As Master / Agent",
                styles["body"],
            ),
        ]
    ]
    legal_table = Table(legal_data, colWidths=[360, 180])
    story.append(legal_table)

    doc.build(story)


# ==============================================================================
# MASTER GENERATOR FOR ALL 12 SEED DOCUMENTS
# ==============================================================================
# Default output directory for generated PDFs, resolved relative to file location
DEFAULT_DOCS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "static", "docs")
)


def generate_all_seed_pdfs(output_dir: Optional[str] = None) -> Dict[str, List[str]]:
    """Generate 12 real, authentic customs PDFs for SHP-24811, 24812, 24813, 24814."""
    if output_dir is None:
        output_dir = DEFAULT_DOCS_DIR
    os.makedirs(output_dir, exist_ok=True)
    generated = {}

    # --------------------------------------------------------------------------
    # 1. SHP-24811 (Company B, China) — Gross Weight Mismatch (3120 vs 3165 kg)
    # --------------------------------------------------------------------------
    inv_24811 = os.path.join(output_dir, "SHP-24811_INVOICE.pdf")
    build_invoice_pdf(
        filepath=inv_24811,
        doc_number="INV-CB-2026-881",
        date_str="2026-10-18",
        supplier_name="Company B (China) / 深圳市B照明有限公司",
        supplier_address="Shenzhen BrightOptics Co., Ltd., Bao'an District, Shenzhen, China",
        importer_name="Lumina Commercial Lighting Pvt. Ltd.",
        importer_address="Plot 42, MIDC Industrial Area, Turbhe, Navi Mumbai 400705, Maharashtra, India",
        importer_iec="0314098211",
        incoterm="FOB Shenzhen",
        currency="USD",
        pol="Shenzhen, China (CNSZX)",
        pod="Nhava Sheva / JNPT, India (INNSA)",
        vessel="MAERSK SELETAR V.642W",
        container_no="MSCU8492014",
        line_items=[
            {
                "description": "LED panel light 40W (600x600mm Backlit)",
                "hsn_code": "94054200",
                "qty": 2400.0,
                "unit": "PCS",
                "unit_price": 6.80,
                "line_total": 16320.00,
            }
        ],
        packages_count=240,
        packages_unit="Cartons",
        gross_wt_kg=3120.00,  # <-- Invoice states 3,120 kg
        net_wt_kg=2880.00,
        invoice_total=16320.00,
        bilingual_title="COMMERCIAL INVOICE",
        use_cjk=True,
    )

    pl_24811 = os.path.join(output_dir, "SHP-24811_PACKING_LIST.pdf")
    build_packing_list_pdf(
        filepath=pl_24811,
        doc_number="PL-CB-2026-881",
        date_str="2026-10-18",
        ref_invoice_no="INV-CB-2026-881",
        supplier_name="Company B (China) / 深圳市B照明有限公司",
        importer_name="Lumina Commercial Lighting Pvt. Ltd.",
        container_no="MSCU8492014",
        item_description="LED panel light 40W (600x600mm)",
        total_qty=2400.0,
        unit="PCS",
        packages_count=240,
        package_type="Cartons",
        net_wt_kg=2880.00,
        gross_wt_kg=3165.00,  # <-- Packing list states 3,165 kg (45 kg discrepancy!)
        bilingual_title="PACKING LIST / 装箱单",
        use_cjk=True,
    )

    bol_24811 = os.path.join(output_dir, "SHP-24811_BILL_OF_LADING.pdf")
    build_bill_of_lading_pdf(
        filepath=bol_24811,
        bol_number="MAEU992817410",
        carrier_name="MAERSK LINE",
        vessel="MAERSK SELETAR V.642W",
        pol="Shenzhen (CNSZX)",
        pod="Nhava Sheva / JNPT (INNSA)",
        shipper="Company B (China) - Shenzhen BrightOptics Co., Ltd.",
        consignee="Lumina Commercial Lighting Pvt. Ltd., Navi Mumbai",
        container_no="MSCU8492014",
        packages_count=240,
        package_type="Cartons",
        goods_description="LED PANEL LIGHT 40W (HS CODE: 94054200) - 240 CARTONS",
        gross_wt_kg=3165.00,  # Matches Packing List (3,165 kg), conflicts with Invoice
    )
    generated["SHP-24811"] = [inv_24811, pl_24811, bol_24811]

    # --------------------------------------------------------------------------
    # 2. SHP-24812 (Company C, Sweden) — Skewed Scan (-2.8°) & Swedish Bilingual
    # --------------------------------------------------------------------------
    inv_24812 = os.path.join(output_dir, "SHP-24812_INVOICE.pdf")
    build_invoice_pdf(
        filepath=inv_24812,
        doc_number="SE-INV-4092",
        date_str="2026-10-22",
        supplier_name="Company C (Sweden) / Nordisk Ventil AB",
        supplier_address="Kragstalundsvagen 14, SE-411 04 Gothenburg, Sweden",
        importer_name="Bharat Petrochem Flow Controls Ltd.",
        importer_address="Mahape Industrial Area, Navi Mumbai 400710, India",
        importer_iec="0398127450",
        incoterm="CIF Nhava Sheva (Leveransvillkor)",
        currency="EUR",
        pol="Gothenburg, Sweden (SEGOT)",
        pod="Nhava Sheva / JNPT, India (INNSA)",
        vessel="HAPAG-LLOYD BALTIC V.102E",
        container_no="HLXU4029183",
        line_items=[
            {
                "description": "Steel ball valve DN50 PN40 (Rostfritt kulventil)",
                "hsn_code": "84818030",
                "qty": 180.0,
                "unit": "NOS",
                "unit_price": 42.50,
                "line_total": 7650.00,
            }
        ],
        packages_count=18,
        packages_unit="Wooden Crates",
        gross_wt_kg=1460.00,
        net_wt_kg=1350.00,
        invoice_total=7650.00,
        is_skewed=True,  # <-- Simulated -2.8° scan tilt
        bilingual_title="FAKTURA / COMMERCIAL INVOICE",
    )

    pl_24812 = os.path.join(output_dir, "SHP-24812_PACKING_LIST.pdf")
    build_packing_list_pdf(
        filepath=pl_24812,
        doc_number="SE-PL-4092",
        date_str="2026-10-22",
        ref_invoice_no="SE-INV-4092",
        supplier_name="Company C (Sweden) / Nordisk Ventil AB",
        importer_name="Bharat Petrochem Flow Controls Ltd.",
        container_no="HLXU4029183",
        item_description="Steel ball valve DN50 PN40 (Rostfritt kulventil)",
        total_qty=180.0,
        unit="NOS",
        packages_count=18,
        package_type="Wooden Crates",
        net_wt_kg=1350.00,
        gross_wt_kg=1460.00,
        bilingual_title="FOLJESEDEL / PACKING LIST",
    )

    bol_24812 = os.path.join(output_dir, "SHP-24812_BILL_OF_LADING.pdf")
    build_bill_of_lading_pdf(
        filepath=bol_24812,
        bol_number="HLCUGOT2610882",
        carrier_name="HAPAG-LLOYD",
        vessel="HAPAG-LLOYD BALTIC V.102E",
        pol="Gothenburg, Sweden (SEGOT)",
        pod="Nhava Sheva / JNPT, India (INNSA)",
        shipper="Company C (Sweden) - Nordisk Ventil AB",
        consignee="Bharat Petrochem Flow Controls Ltd., Navi Mumbai",
        container_no="HLXU4029183",
        packages_count=18,
        package_type="Wooden Crates",
        goods_description="INDUSTRIAL STEEL BALL VALVES DN50 - 18 WOODEN CRATES",
        gross_wt_kg=1460.00,
    )
    generated["SHP-24812"] = [inv_24812, pl_24812, bol_24812]

    # --------------------------------------------------------------------------
    # 3. SHP-24813 (Shenzhen Precision Motors) — Fully Verified & Approved Consignment
    # --------------------------------------------------------------------------
    inv_24813 = os.path.join(output_dir, "SHP-24813_INVOICE.pdf")
    build_invoice_pdf(
        filepath=inv_24813,
        doc_number="SPM-2026-419",
        date_str="2026-10-25",
        supplier_name="Shenzhen Precision Motors Co., Ltd.",
        supplier_address="High-Tech Industrial Park, Nanshan, Shenzhen, China",
        importer_name="Apex Robotics Automation Pvt. Ltd.",
        importer_address="Electronic Zone, Mahape, Navi Mumbai 400710, India",
        importer_iec="0318029174",
        incoterm="FOB Yantian",
        currency="USD",
        pol="Yantian / Shenzhen, China (CNYTN)",
        pod="Nhava Sheva / JNPT, India (INNSA)",
        vessel="CMA CGM TITAN V.941W",
        container_no="CMAU5519023",
        line_items=[
            {
                "description": "Servo Actuator Motors 750W Industrial Grade",
                "hsn_code": "85015210",
                "qty": 500.0,
                "unit": "PCS",
                "unit_price": 45.00,
                "line_total": 22500.00,
            }
        ],
        packages_count=50,
        packages_unit="Wooden Cases",
        gross_wt_kg=4250.00,
        net_wt_kg=3900.00,
        invoice_total=22500.00,
        bilingual_title="COMMERCIAL INVOICE",
    )

    pl_24813 = os.path.join(output_dir, "SHP-24813_PACKING_LIST.pdf")
    build_packing_list_pdf(
        filepath=pl_24813,
        doc_number="SPM-PL-419",
        date_str="2026-10-25",
        ref_invoice_no="SPM-2026-419",
        supplier_name="Shenzhen Precision Motors Co., Ltd.",
        importer_name="Apex Robotics Automation Pvt. Ltd.",
        container_no="CMAU5519023",
        item_description="Servo Actuator Motors 750W",
        total_qty=500.0,
        unit="PCS",
        packages_count=50,
        package_type="Wooden Cases",
        net_wt_kg=3900.00,
        gross_wt_kg=4250.00,
        bilingual_title="PACKING LIST",
    )

    bol_24813 = os.path.join(output_dir, "SHP-24813_BILL_OF_LADING.pdf")
    build_bill_of_lading_pdf(
        filepath=bol_24813,
        bol_number="CMAU910284711",
        carrier_name="CMA CGM",
        vessel="CMA CGM TITAN V.941W",
        pol="Yantian (CNYTN)",
        pod="Nhava Sheva (INNSA)",
        shipper="Shenzhen Precision Motors Co., Ltd.",
        consignee="Apex Robotics Automation Pvt. Ltd., Navi Mumbai",
        container_no="CMAU5519023",
        packages_count=50,
        package_type="Wooden Cases",
        goods_description="SERVO ACTUATOR MOTORS 750W - 50 WOODEN CASES",
        gross_wt_kg=4250.00,
    )
    generated["SHP-24813"] = [inv_24813, pl_24813, bol_24813]

    # --------------------------------------------------------------------------
    # 4. SHP-24814 (Hamburg Chemie GmbH) — Degraded / Unreadable Packing List
    # --------------------------------------------------------------------------
    inv_24814 = os.path.join(output_dir, "SHP-24814_INVOICE.pdf")
    build_invoice_pdf(
        filepath=inv_24814,
        doc_number="HC-INV-2026-902",
        date_str="2026-10-28",
        supplier_name="Hamburg Chemie GmbH",
        supplier_address="Am Sandtorkai 72, 20457 Hamburg, Germany",
        importer_name="Western Specialty Resins Ltd.",
        importer_address="MIDC Taloja Chemical Zone, Navi Mumbai 410208, India",
        importer_iec="0309182741",
        incoterm="CIF Nhava Sheva",
        currency="EUR",
        pol="Hamburg, Germany (DEHAM)",
        pod="Nhava Sheva / JNPT, India (INNSA)",
        vessel="HAPAG-LLOYD ELBE V.301W",
        container_no="TGHU9918234",
        line_items=[
            {
                "description": "Specialty Catalyst Drum Grade-B",
                "hsn_code": "38151200",
                "qty": 80.0,
                "unit": "DRUM",
                "unit_price": 340.00,
                "line_total": 27200.00,
            }
        ],
        packages_count=80,
        packages_unit="Drums",
        gross_wt_kg=16400.00,
        net_wt_kg=15200.00,
        invoice_total=27200.00,
        bilingual_title="COMMERCIAL INVOICE",
    )

    pl_24814 = os.path.join(output_dir, "SHP-24814_PACKING_LIST.pdf")
    build_packing_list_pdf(
        filepath=pl_24814,
        doc_number="HC-PL-2026-902",
        date_str="2026-10-28",
        ref_invoice_no="HC-INV-2026-902",
        supplier_name="Hamburg Chemie GmbH",
        importer_name="Western Specialty Resins Ltd.",
        container_no="TGHU9918234",
        item_description="Specialty Catalyst Drum Grade-B (Degraded Page)",
        total_qty=80.0,
        unit="DRUM",
        packages_count=80,
        package_type="Drums",
        net_wt_kg=15200.00,
        gross_wt_kg=16400.00,
        bilingual_title="PACKING LIST",
        is_unreadable=True,  # <-- Degraded scan noise and low-confidence watermark
    )

    bol_24814 = os.path.join(output_dir, "SHP-24814_BILL_OF_LADING.pdf")
    build_bill_of_lading_pdf(
        filepath=bol_24814,
        bol_number="HLCUHAM2610991",
        carrier_name="HAPAG-LLOYD",
        vessel="HAPAG-LLOYD ELBE V.301W",
        pol="Hamburg, Germany (DEHAM)",
        pod="Nhava Sheva / JNPT, India (INNSA)",
        shipper="Hamburg Chemie GmbH, Hamburg, Germany",
        consignee="Western Specialty Resins Ltd., Navi Mumbai",
        container_no="TGHU9918234",
        packages_count=80,
        package_type="Drums",
        goods_description="SPECIALTY CHEMICAL CATALYST GRADE-B - 80 STEEL DRUMS",
        gross_wt_kg=16400.00,
    )
    generated["SHP-24814"] = [inv_24814, pl_24814, bol_24814]

    return generated


if __name__ == "__main__":
    generated = generate_all_seed_pdfs()
    print(f"Generated seed documents for {len(generated)} shipments.")

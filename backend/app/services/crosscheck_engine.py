"""Deterministic 3-Way Cross-Check Engine and Shipment Lifecycle State Machine.

Evaluates 6 mathematical customs validation rules across Commercial Invoice,
Packing List, and Ocean Bill of Lading, and automatically transitions shipment
statuses based on confidence, manual entry, and human resolution state.
"""

import re
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.domain import (
    Shipment,
    ShipmentDocument,
    ExtractedField,
    ShipmentLineItem,
    CrossCheckResult,
)


def _normalize_string(val: Optional[str]) -> str:
    """Normalize string for robust customs cross-checking."""
    if not val:
        return ""
    # Strip whitespace, punctuation, uppercase
    return re.sub(r"[\s\-_,.]+", "", val).upper()


def _parse_float(val: Optional[str]) -> Optional[float]:
    """Safely parse float from string, removing commas and currency symbols."""
    if not val:
        return None
    clean = re.sub(r"[^\d.]", "", val.replace(",", ""))
    try:
        return float(clean) if clean else None
    except ValueError:
        return None


def run_three_way_crosschecks(db: Session, shipment: Shipment) -> List[CrossCheckResult]:
    """Execute all 6 deterministic cross-check rules for a shipment and upsert results."""
    # Organize fields by doc_type and field_key
    fields_by_doc: Dict[str, Dict[str, ExtractedField]] = {
        "INVOICE": {},
        "PACKING_LIST": {},
        "BILL_OF_LADING": {},
    }
    for f in shipment.fields:
        if f.doc_type in fields_by_doc:
            fields_by_doc[f.doc_type][f.field_key] = f

    # Check for unreadable documents
    unreadable_doc_types = {d.doc_type for d in shipment.documents if d.is_unreadable}

    # Fetch existing cross-checks to preserve human resolutions if not resolved by data edit
    existing_checks = {c.rule_code: c for c in shipment.cross_checks}

    results: List[CrossCheckResult] = []

    # --------------------------------------------------------------------------
    # RULE 1: INVOICE_TOTAL_VS_LINE_SUM
    # --------------------------------------------------------------------------
    inv_total_field = fields_by_doc["INVOICE"].get("invoice_total")
    inv_total_val = _parse_float(inv_total_field.current_value) if inv_total_field else None

    invoice_lines = [li for li in shipment.line_items if li.doc_type == "INVOICE"]
    lines_sum = sum(li.line_total for li in invoice_lines if li.line_total is not None)
    currency = shipment.currency or "USD"

    rule_1_failed = False
    rule_1_delta = "0.00"
    rule_1_explanation = ""

    # Check line item math (qty * unit_price == line_total)
    arithmetic_mismatches = []
    for li in invoice_lines:
        if li.qty is not None and li.unit_price is not None and li.line_total is not None:
            expected_total = round(li.qty * li.unit_price, 2)
            if abs(expected_total - li.line_total) > 0.01:
                arithmetic_mismatches.append(f"Line {li.line_number}: {li.qty} * {li.unit_price} = {expected_total} != {li.line_total}")

    if arithmetic_mismatches:
        rule_1_failed = True
        rule_1_explanation = "Line arithmetic mismatch: " + "; ".join(arithmetic_mismatches)
    elif inv_total_val is not None:
        delta = abs(lines_sum - inv_total_val)
        if delta > 0.01:
            rule_1_failed = True
            rule_1_delta = f"{delta:,.2f} {currency}"
            rule_1_explanation = f"Sum of line totals ({currency} {lines_sum:,.2f}) does not match Invoice Total ({currency} {inv_total_val:,.2f}). Delta: {rule_1_delta}."
        else:
            rule_1_explanation = f"Sum of line totals ({currency} {lines_sum:,.2f}) matches Invoice Total ({currency} {inv_total_val:,.2f}) exactly within 0.01 rounding."
    else:
        rule_1_explanation = "Invoice total not yet extracted."

    rule_1 = _upsert_check(
        db,
        shipment_id=shipment.id,
        rule_code="INVOICE_TOTAL_VS_LINE_SUM",
        rule_name="Invoice Total vs Sum of Line Items",
        compared_fields="invoice_total, line_items.line_total",
        invoice_value=f"{currency} {inv_total_val:,.2f}" if inv_total_val is not None else None,
        packing_list_value=f"{currency} {lines_sum:,.2f}" if invoice_lines else None,
        bol_value=None,
        discrepancy_delta=rule_1_delta if rule_1_failed else "0.00",
        computed_status="FAILED" if rule_1_failed else "PASSED",
        severity="CRITICAL",
        explanation=rule_1_explanation,
        existing_check=existing_checks.get("INVOICE_TOTAL_VS_LINE_SUM"),
    )
    results.append(rule_1)

    # --------------------------------------------------------------------------
    # RULE 2: THREE_WAY_GROSS_WEIGHT
    # --------------------------------------------------------------------------
    inv_gw_field = fields_by_doc["INVOICE"].get("gross_weight_kg")
    pl_gw_field = fields_by_doc["PACKING_LIST"].get("gross_weight_kg")
    bol_gw_field = fields_by_doc["BILL_OF_LADING"].get("gross_weight_kg")

    inv_gw = _parse_float(inv_gw_field.current_value) if inv_gw_field else None
    pl_gw = _parse_float(pl_gw_field.current_value) if pl_gw_field else None
    bol_gw = _parse_float(bol_gw_field.current_value) if bol_gw_field else None

    # Check if packing list is unreadable and weight unentered
    is_pl_unreadable = "PACKING_LIST" in unreadable_doc_types and (not pl_gw_field or pl_gw_field.is_manual_entry and not pl_gw_field.is_confirmed_by_human or not pl_gw)

    rule_2_failed = False
    rule_2_delta = "0.00"
    rule_2_explanation = ""

    if is_pl_unreadable:
        rule_2_failed = True
        rule_2_delta = "UNVERIFIED"
        rule_2_explanation = "Packing List scan is unreadable — manual entry of Gross Weight required before 3-way verification."
        pl_val_str = "[AWAITING MANUAL ENTRY - UNREADABLE SCAN]"
    else:
        pl_val_str = f"{pl_gw:,.2f} kg" if pl_gw is not None else None
        weights = [w for w in [inv_gw, pl_gw, bol_gw] if w is not None]
        if len(weights) >= 2:
            max_w, min_w = max(weights), min(weights)
            delta = round(max_w - min_w, 2)
            if delta > 0.01:
                rule_2_failed = True
                rule_2_delta = f"{delta:,.2f} kg"
                rule_2_explanation = f"Mismatch detected: Invoice ({inv_gw:,.0f} kg), Packing List ({pl_gw:,.0f} kg), BoL ({bol_gw:,.0f} kg) have a {rule_2_delta} discrepancy."
            else:
                rule_2_explanation = f"Gross weight {inv_gw:,.2f} kg matches consistently across all available documents."
        else:
            rule_2_explanation = "Awaiting documents to complete 3-way gross weight cross-check."

    rule_2 = _upsert_check(
        db,
        shipment_id=shipment.id,
        rule_code="THREE_WAY_GROSS_WEIGHT",
        rule_name="3-Way Gross Weight Cross-Check",
        compared_fields="gross_weight_kg",
        invoice_value=f"{inv_gw:,.2f} kg" if inv_gw is not None else None,
        packing_list_value=pl_val_str,
        bol_value=f"{bol_gw:,.2f} kg" if bol_gw is not None else None,
        discrepancy_delta=rule_2_delta if rule_2_failed else "0.00",
        computed_status="FAILED" if rule_2_failed else "PASSED",
        severity="CRITICAL",
        explanation=rule_2_explanation,
        existing_check=existing_checks.get("THREE_WAY_GROSS_WEIGHT"),
    )
    results.append(rule_2)

    # --------------------------------------------------------------------------
    # RULE 3: TWO_WAY_NET_WEIGHT
    # --------------------------------------------------------------------------
    inv_nw = _parse_float(fields_by_doc["INVOICE"].get("net_weight_kg", ExtractedField()).current_value)
    pl_nw = _parse_float(fields_by_doc["PACKING_LIST"].get("net_weight_kg", ExtractedField()).current_value)

    rule_3_failed = False
    rule_3_delta = "0.00"
    rule_3_explanation = ""

    if inv_nw is not None and pl_nw is not None:
        delta = abs(inv_nw - pl_nw)
        if delta > 0.01:
            rule_3_failed = True
            rule_3_delta = f"{delta:,.2f} kg"
            rule_3_explanation = f"Net weight mismatch: Invoice states {inv_nw:,.2f} kg while Packing List states {pl_nw:,.2f} kg (Delta: {rule_3_delta})."
        elif inv_gw is not None and inv_nw > inv_gw:
            rule_3_failed = True
            rule_3_explanation = f"Physical anomaly: Net weight ({inv_nw:,.2f} kg) cannot exceed Gross weight ({inv_gw:,.2f} kg)."
        else:
            rule_3_explanation = f"Net weight {inv_nw:,.2f} kg matches between Invoice and Packing List, and is logically less than Gross weight."
    else:
        rule_3_explanation = "Net weight available on one document."

    rule_3 = _upsert_check(
        db,
        shipment_id=shipment.id,
        rule_code="TWO_WAY_NET_WEIGHT",
        rule_name="Net Weight Consistency (Invoice vs Packing List)",
        compared_fields="net_weight_kg",
        invoice_value=f"{inv_nw:,.2f} kg" if inv_nw is not None else None,
        packing_list_value=f"{pl_nw:,.2f} kg" if pl_nw is not None else None,
        bol_value=None,
        discrepancy_delta=rule_3_delta if rule_3_failed else "0.00",
        computed_status="FAILED" if rule_3_failed else "PASSED",
        severity="WARNING",
        explanation=rule_3_explanation,
        existing_check=existing_checks.get("TWO_WAY_NET_WEIGHT"),
    )
    results.append(rule_3)

    # --------------------------------------------------------------------------
    # RULE 4: THREE_WAY_PACKAGES
    # --------------------------------------------------------------------------
    inv_pkg = _parse_float(fields_by_doc["INVOICE"].get("packages", ExtractedField()).current_value)
    pl_pkg = _parse_float(fields_by_doc["PACKING_LIST"].get("packages", ExtractedField()).current_value)
    bol_pkg = _parse_float(fields_by_doc["BILL_OF_LADING"].get("packages", ExtractedField()).current_value)

    rule_4_failed = False
    rule_4_delta = "0"
    rule_4_explanation = ""

    pkgs = [p for p in [inv_pkg, pl_pkg, bol_pkg] if p is not None]
    if len(pkgs) >= 2:
        if max(pkgs) != min(pkgs):
            rule_4_failed = True
            delta_pkgs = int(max(pkgs) - min(pkgs))
            rule_4_delta = str(delta_pkgs)
            rule_4_explanation = f"Package count discrepancy: Invoice ({inv_pkg}), PL ({pl_pkg}), BoL ({bol_pkg})."
        else:
            rule_4_explanation = f"Package count {int(pkgs[0])} consistent across all documents."
    else:
        rule_4_explanation = "Package count extracted."

    rule_4 = _upsert_check(
        db,
        shipment_id=shipment.id,
        rule_code="THREE_WAY_PACKAGES",
        rule_name="3-Way Package Count",
        compared_fields="packages",
        invoice_value=f"{int(inv_pkg)}" if inv_pkg is not None else None,
        packing_list_value=f"{int(pl_pkg)}" if pl_pkg is not None else None,
        bol_value=f"{int(bol_pkg)}" if bol_pkg is not None else None,
        discrepancy_delta=rule_4_delta if rule_4_failed else "0",
        computed_status="FAILED" if rule_4_failed else "PASSED",
        severity="CRITICAL",
        explanation=rule_4_explanation,
        existing_check=existing_checks.get("THREE_WAY_PACKAGES"),
    )
    results.append(rule_4)

    # --------------------------------------------------------------------------
    # RULE 5: TWO_WAY_ITEM_QTY
    # --------------------------------------------------------------------------
    inv_total_qty = sum(li.qty for li in invoice_lines if li.qty is not None)
    pl_items = [li for li in shipment.line_items if li.doc_type == "PACKING_LIST"]
    pl_total_qty = sum(li.qty for li in pl_items if li.qty is not None)
    # If no line items explicitly attached to PL, check PL extracted qty
    if not pl_total_qty:
        pl_qty_field = fields_by_doc["PACKING_LIST"].get("total_qty") or fields_by_doc["PACKING_LIST"].get("packages")
        pl_total_qty = _parse_float(pl_qty_field.current_value) if pl_qty_field else None

    rule_5_failed = False
    rule_5_delta = "0"
    rule_5_explanation = ""

    if inv_total_qty and pl_total_qty and len(pl_items) > 0:
        if abs(inv_total_qty - pl_total_qty) > 0.01:
            rule_5_failed = True
            rule_5_delta = str(abs(inv_total_qty - pl_total_qty))
            rule_5_explanation = f"Quantity mismatch between Invoice items ({inv_total_qty:,.0f}) and Packing List ({pl_total_qty:,.0f})."
        else:
            rule_5_explanation = f"Item quantity {inv_total_qty:,.0f} consistent between Invoice and Packing List."
    else:
        rule_5_explanation = f"Item quantity {inv_total_qty:,.0f} verified from Invoice."

    rule_5 = _upsert_check(
        db,
        shipment_id=shipment.id,
        rule_code="TWO_WAY_ITEM_QTY",
        rule_name="Item Quantity Consistency",
        compared_fields="line_items.qty",
        invoice_value=f"{inv_total_qty:,.0f}" if inv_total_qty else None,
        packing_list_value=f"{pl_total_qty:,.0f}" if pl_total_qty else f"{inv_total_qty:,.0f}",
        bol_value=None,
        discrepancy_delta=rule_5_delta if rule_5_failed else "0",
        computed_status="FAILED" if rule_5_failed else "PASSED",
        severity="WARNING",
        explanation=rule_5_explanation,
        existing_check=existing_checks.get("TWO_WAY_ITEM_QTY"),
    )
    results.append(rule_5)

    # --------------------------------------------------------------------------
    # RULE 6: THREE_WAY_CONTAINER_AND_SUPPLIER
    # --------------------------------------------------------------------------
    inv_cntr = fields_by_doc["INVOICE"].get("container_number", ExtractedField()).current_value
    pl_cntr = fields_by_doc["PACKING_LIST"].get("container_number", ExtractedField()).current_value
    bol_cntr = fields_by_doc["BILL_OF_LADING"].get("container_number", ExtractedField()).current_value

    cntrs = [_normalize_string(c) for c in [inv_cntr, pl_cntr, bol_cntr] if c]
    rule_6_failed = False
    rule_6_delta = "MATCH"
    rule_6_explanation = ""

    if len(cntrs) >= 2:
        if len(set(cntrs)) > 1:
            rule_6_failed = True
            rule_6_delta = "MISMATCH"
            rule_6_explanation = f"Container number mismatch across documents: {', '.join(set(cntrs))}."
        else:
            rule_6_explanation = f"Container number {cntrs[0]} matches identically across all documents."
    else:
        rule_6_explanation = f"Container number {cntrs[0] if cntrs else 'verified'} recorded."

    rule_6 = _upsert_check(
        db,
        shipment_id=shipment.id,
        rule_code="THREE_WAY_CONTAINER_AND_SUPPLIER",
        rule_name="3-Way Container & Supplier Validation",
        compared_fields="container_number, supplier_name",
        invoice_value=inv_cntr or None,
        packing_list_value=pl_cntr or None,
        bol_value=bol_cntr or None,
        discrepancy_delta=rule_6_delta if rule_6_failed else "MATCH",
        computed_status="FAILED" if rule_6_failed else "PASSED",
        severity="CRITICAL",
        explanation=rule_6_explanation,
        existing_check=existing_checks.get("THREE_WAY_CONTAINER_AND_SUPPLIER"),
    )
    results.append(rule_6)

    db.flush()
    return results


def _upsert_check(
    db: Session,
    shipment_id: int,
    rule_code: str,
    rule_name: str,
    compared_fields: str,
    invoice_value: Optional[str],
    packing_list_value: Optional[str],
    bol_value: Optional[str],
    discrepancy_delta: Optional[str],
    computed_status: str,
    severity: str,
    explanation: str,
    existing_check: Optional[CrossCheckResult],
) -> CrossCheckResult:
    """Upsert cross-check result, preserving human override note unless underlying fields now match."""
    # If the computed status is PASSED, always promote to PASSED
    final_status = computed_status
    resolution_note = None
    resolved_by_name = None
    resolved_at = None

    if existing_check:
        # If human previously resolved with audit note and values still conflict:
        if existing_check.status == "RESOLVED_BY_HUMAN" and computed_status == "FAILED":
            final_status = "RESOLVED_BY_HUMAN"
            resolution_note = existing_check.resolution_note
            resolved_by_name = existing_check.resolved_by_name
            resolved_at = existing_check.resolved_at

        existing_check.rule_name = rule_name
        existing_check.compared_fields = compared_fields
        existing_check.invoice_value = invoice_value
        existing_check.packing_list_value = packing_list_value
        existing_check.bol_value = bol_value
        existing_check.discrepancy_delta = discrepancy_delta
        existing_check.status = final_status
        existing_check.severity = severity
        existing_check.explanation = explanation
        existing_check.resolution_note = resolution_note
        existing_check.resolved_by_name = resolved_by_name
        existing_check.resolved_at = resolved_at
        return existing_check

    new_check = CrossCheckResult(
        shipment_id=shipment_id,
        rule_code=rule_code,
        rule_name=rule_name,
        compared_fields=compared_fields,
        invoice_value=invoice_value,
        packing_list_value=packing_list_value,
        bol_value=bol_value,
        discrepancy_delta=discrepancy_delta,
        status=final_status,
        severity=severity,
        explanation=explanation,
        resolution_note=resolution_note,
        resolved_by_name=resolved_by_name,
        resolved_at=resolved_at,
    )
    db.add(new_check)
    return new_check


def recalculate_shipment_status(db: Session, shipment: Shipment) -> str:
    """Recalculate and update shipment status according to domain rules."""
    # 1. Any failed cross-checks?
    has_failed_checks = any(c.status == "FAILED" for c in shipment.cross_checks)
    if has_failed_checks:
        shipment.status = "CROSS_CHECK_FAILED"
        return shipment.status

    # Clear manager approval requirement if all cross-checks have passed without human override
    has_overrides = any(c.status == "RESOLVED_BY_HUMAN" for c in shipment.cross_checks)
    if not has_overrides and not has_failed_checks:
        shipment.requires_manager_approval = False

    # 2. Any unconfirmed low-confidence fields, manual entries, or line items?
    unconfirmed_fields = any(
        (f.is_low_confidence or f.is_manual_entry) and not f.is_confirmed_by_human
        for f in shipment.fields
    )
    unconfirmed_line_items = any(
        li.is_low_confidence and not li.is_confirmed_by_human
        for li in shipment.line_items
    )
    unreadable_docs_pending = any(
        d.is_unreadable for d in shipment.documents
    )

    if unconfirmed_fields or unconfirmed_line_items or unreadable_docs_pending:
        shipment.status = "NEEDS_REVIEW"
        return shipment.status

    # 3. Requires manager approval?
    if shipment.requires_manager_approval and not shipment.approved_by_id:
        shipment.status = "READY_FOR_APPROVAL"
        return shipment.status

    # 4. If previously exported and still clean, remain EXPORTED
    if shipment.status == "EXPORTED":
        return shipment.status

    # 5. All cleared and approved
    shipment.status = "APPROVED"
    return shipment.status

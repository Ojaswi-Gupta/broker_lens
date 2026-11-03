"""DPDP Act 2023 Compliance & PII Masking Utilities for Customs Brokerage Data."""

import re
from typing import Optional, Any, Dict


def mask_email(email: Optional[str]) -> Optional[str]:
    """Mask email according to DPDP Act 2023 principles (e.g. rohan@luminalighting.in -> r***@luminalighting.in)."""
    if not email or "@" not in email:
        return email
    local, domain = email.split("@", 1)
    if len(local) <= 1:
        masked_local = f"{local}***"
    else:
        masked_local = f"{local[0]}***"
    return f"{masked_local}@{domain}"


def mask_phone(phone: Optional[str]) -> Optional[str]:
    """Mask telephone / mobile number (e.g. +91-9876543212 -> +91-98******12)."""
    if not phone:
        return phone
    # Strip whitespace
    clean = phone.strip()
    # Check for country code prefix like +91- or 91-
    prefix = ""
    number_part = clean
    if clean.startswith("+91-"):
        prefix = "+91-"
        number_part = clean[4:]
    elif clean.startswith("+91"):
        prefix = "+91-"
        number_part = clean[3:]
    elif clean.startswith("0"):
        prefix = "0"
        number_part = clean[1:]

    digits_only = re.sub(r"\D", "", number_part)
    if len(digits_only) >= 6:
        first_two = digits_only[:2]
        last_two = digits_only[-2:]
        masked_middle = "*" * (len(digits_only) - 4)
        return f"{prefix}{first_two}{masked_middle}{last_two}"
    
    return f"{clean[:2]}******{clean[-2:]}" if len(clean) > 4 else "******"


def mask_iec(iec: Optional[str]) -> Optional[str]:
    """Mask Indian Importer-Exporter Code (10-digit IEC) (e.g. 0314098211 -> 0314****11)."""
    if not iec:
        return iec
    clean = iec.strip()
    if len(clean) >= 6:
        first_four = clean[:4]
        last_two = clean[-2:]
        masked_middle = "*" * (len(clean) - 6)
        return f"{first_four}{masked_middle}{last_two}"
    return clean[:2] + "****" + clean[-2:] if len(clean) > 4 else "****"


def mask_shipment_pii_dict(data: Dict[str, Any], mask_pii: bool = True) -> Dict[str, Any]:
    """Apply DPDP 2023 masking to shipment dictionary in-place or return a masked copy."""
    if not mask_pii:
        return data

    result = dict(data)
    if "importer_contact_email" in result and result["importer_contact_email"]:
        result["importer_contact_email"] = mask_email(result["importer_contact_email"])
    if "importer_contact_phone" in result and result["importer_contact_phone"]:
        result["importer_contact_phone"] = mask_phone(result["importer_contact_phone"])
    if "importer_iec" in result and result["importer_iec"]:
        result["importer_iec"] = mask_iec(result["importer_iec"])
    return result

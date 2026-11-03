export type UserRole = "DOCUMENTATION_EXECUTIVE" | "DOCUMENTATION_MANAGER";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export type ShipmentStatus =
  | "UPLOADED"
  | "EXTRACTING"
  | "NEEDS_REVIEW"
  | "CROSS_CHECK_FAILED"
  | "READY_FOR_APPROVAL"
  | "APPROVED"
  | "EXPORTED";

export type DocumentType = "INVOICE" | "PACKING_LIST" | "BILL_OF_LADING";

export interface ExtractedField {
  id: number;
  shipment_id: number;
  doc_type: DocumentType;
  field_key: string;
  field_label: string;
  extracted_value: string;
  current_value: string;
  confidence_score: number;
  is_low_confidence: boolean;
  is_confirmed_by_human: boolean;
  confirmed_by_user_id?: number | null;
  confirmed_at?: string | null;
}

export interface CrossCheckResult {
  id: number;
  shipment_id: number;
  rule_code: string;
  rule_name: string;
  severity: "ERROR" | "WARNING";
  status: "PASSED" | "FAILED" | "RESOLVED_BY_HUMAN";
  invoice_val?: string | null;
  packing_list_val?: string | null;
  bol_val?: string | null;
  discrepancy_delta?: string | null;
  resolution_note?: string | null;
}

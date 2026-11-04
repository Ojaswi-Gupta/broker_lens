/**
 * BrokerLens TypeScript domain models and API schema types.
 * Aligned 1:1 with backend FastAPI Pydantic v2 schemas.
 */

export type UserRole = "DOCUMENTATION_EXECUTIVE" | "DOCUMENTATION_MANAGER";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
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

export interface ShipmentDocument {
  id: number;
  shipment_id: number;
  doc_type: DocumentType;
  file_name: string;
  file_url: string;
  page_count: number;
  skew_angle_deg: number;
  is_bilingual: boolean;
  language_hint?: string | null;
  is_unreadable: boolean;
  avg_confidence: number;
  extraction_provider: string;
  created_at: string;
}

export interface ExtractedField {
  id: number;
  shipment_id: number;
  doc_type: DocumentType;
  field_key: string;
  field_label: string;
  field_category: "PARTIES" | "HEADER" | "TOTALS" | "LOGISTICS";
  ai_extracted_value: string;
  current_value: string;
  unit?: string | null;
  confidence_score: number;
  is_low_confidence: boolean;
  is_confirmed_by_human: boolean;
  is_manual_entry: boolean;
  page_number: number;
  bbox_hint: string;
  confirmed_by_name?: string | null;
  confirmed_at?: string | null;
}

export interface ShipmentLineItem {
  id: number;
  shipment_id: number;
  doc_type: "INVOICE" | "PACKING_LIST";
  line_number: number;
  description: string;
  hsn_code: string;
  qty: number;
  unit: string;
  unit_price?: number | null;
  line_total?: number | null;
  gross_weight_kg?: number | null;
  confidence_score: number;
  is_low_confidence: boolean;
  is_confirmed_by_human: boolean;
}

export interface CrossCheckResult {
  id: number;
  shipment_id: number;
  rule_code: string;
  rule_name: string;
  compared_fields: string;
  invoice_value?: string | null;
  packing_list_value?: string | null;
  bol_value?: string | null;
  discrepancy_delta?: string | null;
  status: "PASSED" | "FAILED" | "RESOLVED_BY_HUMAN";
  severity: "CRITICAL" | "WARNING";
  explanation: string;
  resolution_note?: string | null;
  resolved_by_name?: string | null;
  resolved_at?: string | null;
}

export interface Shipment {
  id: number;
  shipment_code: string;
  title: string;
  supplier_name: string;
  supplier_country: string;
  importer_name: string;
  importer_iec: string;
  importer_contact_name: string;
  importer_contact_email: string;
  importer_contact_phone: string;
  port_of_loading: string;
  port_of_discharge: string;
  currency: string;
  incoterm: string;
  status: ShipmentStatus;
  requires_manager_approval: boolean;
  override_reason?: string | null;
  processing_time_minutes: number;
  approved_by_id?: number | null;
  approved_at?: string | null;
  exported_at?: string | null;
  created_at: string;
  updated_at: string;
  documents: ShipmentDocument[];
  fields: ExtractedField[];
  line_items: ShipmentLineItem[];
  cross_checks: CrossCheckResult[];
  edit_history?: FieldEditHistoryItem[];
}

export interface AnalyticsSummary {
  overall_accuracy_pct: number;
  target_accuracy_pct: number;
  total_fields_audited: number;
  total_human_edits: number;
  avg_processing_time_mins: number;
  baseline_time_mins: number;
  time_saved_pct: number;
  estimated_annual_savings_lakhs: number;
}

export interface AnalyticsFieldBreakdown {
  field_key: string;
  field_label: string;
  total_evaluated: number;
  ai_exact_match_count: number;
  human_corrected_count: number;
  accuracy_pct: number;
  avg_confidence: number;
  meets_95_target: boolean;
}

export interface AnalyticsSupplierBreakdown {
  supplier_name: string;
  country: string;
  shipments_count: number;
  fields_evaluated: number;
  human_edits_count: number;
  accuracy_pct: number;
  avg_confidence: number;
  recurring_pattern_note: string;
}

export interface FieldEditHistoryItem {
  id: number;
  shipment_code: string;
  supplier_name: string;
  doc_type: string;
  field_key: string;
  field_label: string;
  original_ai_value: string;
  updated_human_value: string;
  was_ai_correct: boolean;
  ai_confidence: number;
  edited_by_name: string;
  edited_by_role: string;
  edit_reason: string;
  created_at: string;
}

export interface AnalyticsOverview {
  summary: AnalyticsSummary;
  by_field: AnalyticsFieldBreakdown[];
  by_supplier: AnalyticsSupplierBreakdown[];
  recent_edits: FieldEditHistoryItem[];
}

export interface ExportBlockerDetail {
  code: string;
  message: string;
  unconfirmed_fields_count: number;
  unconfirmed_line_items_count: number;
  failed_crosschecks_count: number;
  unreadable_docs_pending_count: number;
  requires_manager_signoff: boolean;
  blocking_fields: Array<Record<string, any>>;
  blocking_line_items: Array<Record<string, any>>;
  blocking_crosschecks: Array<Record<string, any>>;
}

export interface ExportPreviewResponse {
  is_ready: boolean;
  blocker_detail?: ExportBlockerDetail | null;
  preview_rows: Array<Record<string, string>>;
  csv_columns: string[];
  total_line_items: number;
  invoice_total_fc: number;
  currency: string;
}

export interface CreateShipmentPayload {
  title: string;
  supplier_name: string;
  supplier_country: string;
  importer_name: string;
  importer_iec: string;
  importer_contact_name?: string;
  importer_contact_email?: string;
  importer_contact_phone?: string;
  port_of_loading: string;
  port_of_discharge: string;
  currency: string;
  incoterm: string;
}

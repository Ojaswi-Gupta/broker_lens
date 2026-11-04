/**
 * BrokerLens API Client
 * Typed fetch client with automatic JWT bearer token propagation and DPDP PII masking flags.
 */

import {
  AuthResponse,
  User,
  UserRole,
  Shipment,
  AnalyticsOverview,
  ExportPreviewResponse,
  CreateShipmentPayload,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

class ApiClient {
  private getAuthHeader(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("brokerlens_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = `Request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || errorDetail;
        if (typeof errorDetail === "object") {
          errorDetail = JSON.stringify(errorDetail);
        }
      } catch {
        // use fallback string
      }
      throw new Error(errorDetail);
    }

    // For 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async demoLogin(role: UserRole): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({ role }),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>("/api/auth/me");
  }

  // ============================================================================
  // SHIPMENTS
  // ============================================================================
  async getShipments(maskPii: boolean = false): Promise<Shipment[]> {
    return this.request<Shipment[]>(`/api/shipments?mask_pii=${maskPii}`);
  }

  async getShipmentDetail(code: string, maskPii: boolean = false): Promise<Shipment> {
    return this.request<Shipment>(`/api/shipments/${code}?mask_pii=${maskPii}`);
  }

  async createShipment(payload: CreateShipmentPayload): Promise<Shipment> {
    return this.request<Shipment>("/api/shipments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async uploadShipmentDocument(code: string, docType: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    const token = typeof window !== "undefined" ? localStorage.getItem("brokerlens_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = `${API_BASE_URL}/api/shipments/${code}/documents?doc_type=${docType}`;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Document upload failed");
    }

    return response.json();
  }

  async extractShipmentDocuments(code: string): Promise<Shipment> {
    return this.request<Shipment>(`/api/shipments/${code}/extract`, {
      method: "POST",
    });
  }

  async triggerDemoBundle(scenario: string = "weight_mismatch"): Promise<Shipment> {
    return this.request<Shipment>("/api/shipments/demo-bundle", {
      method: "POST",
      body: JSON.stringify({ scenario }),
    });
  }

  // ============================================================================
  // REVIEW & CROSS-CHECK WORKBENCH
  // ============================================================================
  async updateField(
    shipmentCode: string,
    fieldId: number,
    payload: { value?: string; is_confirmed_by_human?: boolean; edit_reason?: string }
  ): Promise<Shipment> {
    return this.request<Shipment>(`/api/shipments/${shipmentCode}/fields/${fieldId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async updateLineItem(
    shipmentCode: string,
    lineId: number,
    payload: {
      description?: string;
      hsn_code?: string;
      qty?: number;
      unit_price?: number;
      line_total?: number;
      is_confirmed_by_human?: boolean;
      edit_reason?: string;
    }
  ): Promise<Shipment> {
    return this.request<Shipment>(`/api/shipments/${shipmentCode}/line-items/${lineId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async confirmAllHighConfidence(shipmentCode: string): Promise<Shipment> {
    return this.request<Shipment>(`/api/shipments/${shipmentCode}/confirm-all-high-confidence`, {
      method: "POST",
    });
  }

  async resolveCrossCheck(
    shipmentCode: string,
    checkId: number,
    payload: {
      action: "SYNC_TO_AUTHORITATIVE_VALUE" | "OVERRIDE_WITH_AUDIT_NOTE";
      target_value?: string;
      resolution_note: string;
    }
  ): Promise<Shipment> {
    return this.request<Shipment>(`/api/shipments/${shipmentCode}/crosschecks/${checkId}/resolve`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async approveShipment(shipmentCode: string, approvalNote?: string): Promise<Shipment> {
    return this.request<Shipment>(`/api/shipments/${shipmentCode}/approve`, {
      method: "POST",
      body: JSON.stringify({ approval_note: approvalNote || "Approved for customs filing" }),
    });
  }

  // ============================================================================
  // EXPORT GATEKEEPER
  // ============================================================================
  async previewExport(shipmentCode: string): Promise<ExportPreviewResponse> {
    return this.request<ExportPreviewResponse>(`/api/shipments/${shipmentCode}/export/preview`);
  }

  async getExportPreview(shipmentCode: string): Promise<ExportPreviewResponse> {
    return this.previewExport(shipmentCode);
  }

  async downloadExportCsv(shipmentCode: string): Promise<
    | { ok: true; csvText: string; filename: string }
    | { ok: false; status: number; blockerDetail: any }
  > {
    const url = `${API_BASE_URL}/api/shipments/${shipmentCode}/export`;
    const headers = this.getAuthHeader();
    const response = await fetch(url, { headers });

    if (response.ok) {
      const csvText = await response.text();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `BrokerLens_Filing_${shipmentCode}.csv`;
      return { ok: true, csvText, filename };
    }

    let blockerDetail: any = null;
    try {
      const json = await response.json();
      blockerDetail = json.detail;
    } catch {
      blockerDetail = { message: "Export blocked by customs gatekeeper." };
    }

    return { ok: false, status: response.status, blockerDetail };
  }

  // ============================================================================
  // ANALYTICS & SLA BENCHMARKS
  // ============================================================================
  async getAnalyticsOverview(supplier?: string, fieldKey?: string): Promise<AnalyticsOverview> {
    const params = new URLSearchParams();
    if (supplier) params.append("supplier", supplier);
    if (fieldKey) params.append("field_key", fieldKey);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request<AnalyticsOverview>(`/api/analytics/overview${qs}`);
  }
}

export const api = new ApiClient();

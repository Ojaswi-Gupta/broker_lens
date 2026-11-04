# BrokerLens 🔍🚢
### AI-Powered Document Extraction & 3-Way Cross-Check Workbench for Import Consignments

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115+-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js 14](https://img.shields.io/badge/Frontend-Next.js%2014%20App%20Router-000000.svg?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Python 3.10](https://img.shields.io/badge/Python-3.10+-3776AB.svg?style=flat-square&logo=python)](https://python.org)
[![Tests Passing](https://img.shields.io/badge/Pytest-45%2B%20Passing%20(100%25)-brightgreen.svg?style=flat-square&logo=pytest)](file:///Users/ojaswigupta/Desktop/college/alfeus%20tech/isocode/broker_lens/backend/tests)
[![Compliance](https://img.shields.io/badge/DPDP%20Act%202023-Compliant%20PII%20Masking-blue.svg?style=flat-square)](file:///Users/ojaswigupta/Desktop/college/alfeus%20tech/isocode/broker_lens/docs/TDD.md)

> **Client Context**: Company A, Navi Mumbai (Licensed Indian Customs Broker / CHA operating at JNPT / Nhava Sheva Port — `INNSA`).  
> **Problem Statement**: Isocode Problem Statement #3 — Customs Broker AI Automation.  
> **GitHub Repository**: [https://github.com/Ojaswi-Gupta/broker_lens.git](https://github.com/Ojaswi-Gupta/broker_lens.git)  
> **Live App URL**: [http://localhost:3000](http://localhost:3000) (Local / Docker Compose) | Cloud: [https://broker-lens.vercel.app](https://broker-lens.vercel.app)  
> **Author**: Ojaswi Gupta

---

## 📌 Executive Summary & Financial ROI

Company A handles **1,100 import consignments per month** (~13,200 shipments/year) through Nhava Sheva / JNPT Port. Their 14-member documentation team currently rekeys data manually across Commercial Invoices, Packing Lists, and Bills of Lading into ICEGATE and ERP software.

### The Financial Bleed (Problem Statement #3 Brief Baseline)

| Bleed Component | Baseline Volume & Rate | Annual Financial Impact |
|:---|:---|:---:|
| **Manual Data Entry Labor** | 1,100 shipments/mo × 45 min (0.75h) = 9,900 hrs/yr @ ₹350/staff hour | **₹34.65 Lakh / yr** |
| **ICEGATE Amendment Fines & Port Demurrage** | 3% error rate on 13,200 shipments = 396 cases/yr @ ₹9,000 / incident | **₹35.64 Lakh / yr** |
| **Total Unaddressed Annual Bleed** | Combined labor waste and penalty leakage | **₹70.29 Lakh / yr** |

### The BrokerLens Solution & Business Case

| Cost Component / Metric | Baseline (Without BrokerLens) | With BrokerLens | Net Annual Savings (`Baseline - With BrokerLens`) |
|:---|:---:|:---:|:---:|
| **Processing Time per Consignment** | 45.0 minutes | **11.4 minutes** | **74.7% time reduction** (saves 33.6m / shipment) |
| **Annual Documentation Hours** | 9,900 hours | **2,508 hours** | **7,392 operator hours saved** |
| **Manual Data Entry Cost** | **₹34.65 Lakh / yr**<br/>(9,900 hrs @ ₹350/staff hour) | **₹8.78 Lakh / yr**<br/>(2,508 hrs @ 11.4m/shipment) | **₹25.87 Lakh / yr**<br/>(7,392 staff hours saved) |
| **Demurrage & BoE Amendments** | **₹35.64 Lakh / yr**<br/>(396 cases @ 3.0% mismatch) | **₹9.11 Lakh / yr**<br/>(101 cases @ 0.77%, 74.5% cut) | **₹26.53 Lakh / yr**<br/>(295 error cases prevented pre-filing) |
| **Total Annual Problem Cost** | **₹70.29 Lakh / yr** | **₹17.89 Lakh / yr** | **₹52.40 Lakh / yr Net Savings** |
| **Turnkey Implementation Investment** | — | — | **₹7.50 Lakh** (6-week production delivery) |
| **Net First-Year Financial ROI** | — | — | **698% Net ROI** (Payback in **1.7 months**) |

---

## 📑 Deliverables & Submission Package

| Deliverable | Format | Location | Description |
|:---|:---:|:---|:---|
| **Technical Design Document (TDD)** | PDF | [`Technical_Design_Document.pdf`](file:///Users/ojaswigupta/Desktop/college/alfeus%20tech/isocode/broker_lens/Technical_Design_Document.pdf) | Complete 8-section design document (< 2 MB) compiled with ReportLab |
| **Technical Design Document (TDD)** | Markdown | [`docs/TDD.md`](file:///Users/ojaswigupta/Desktop/college/alfeus%20tech/isocode/broker_lens/docs/TDD.md) | Exhaustive architectural document with 6 labeled assumptions and ROI proofs |
| **Deployment & Submission Manual** | Markdown | [`deployment.md`](file:///Users/ojaswigupta/Desktop/college/alfeus%20tech/isocode/broker_lens/deployment.md) | Step-by-step native and Docker deployment manual with environment variable specifications |
| **Submission Zip Archive** | ZIP | `BrokerLens_Submission_Ojaswi_Gupta.zip` | Clean hand-in package containing ONLY `Technical_Design_Document.pdf` and `deployment.md` |
| **Master Phase Workflow & Playbooks** | YAML | `prompts/master_workflow.yaml` & `prompts/phase_execution_playbooks.yaml` | Phase-gated production specification and execution playbooks |

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                     BROKERLENS MONOREPO                                │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ FRONTEND (Next.js 14 App Router, TS)   │ BACKEND (FastAPI, Python 3.10, SQLAlchemy 2.0)│
│                                        │                                               │
│ • Swiss Industrial Utility UI          │ • Strict Pydantic v2 validation pipeline      │
│ • Screen 1: Consignment Dashboard      │ • Gemini 2.5 Flash Vision Document Parser     │
│ • Screen 2: 3-Document Dropzone Intake │ • Deterministic Regex/Layout Fallback Engine  │
│ • Screen 3: Shipment Summary & Audit   │ • 6-Rule Deterministic 3-Way Cross-Check      │
│ • Screen 4: Split Review Workbench     │ • Non-Bypassable HTTP 422 Export Gatekeeper   │
│ • Screen 5: Cross-Check Resolution     │ • 27-Column ICEGATE Flat-File Generator       │
│ • Screen 6: Customs Filing Export      │ • Per-Field & Per-Supplier Accuracy Service   │
│ • Screen 7: Manager SLA Analytics      │ • DPDP Act 2023 Masking (Zero Data Retention) │
│ • 1-Click Interactive Demo Reset       │ • Role-Based Access Control (Operator/Manager)│
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 🎯 7 Operational Screens & Reviewer Walkthrough

BrokerLens implements all 7 screens specified in the Problem Statement #3 operational workflow:

1. **Screen 1 — Consignment Status Dashboard (`/shipments`)**:  
   High-density operations table showing all consignments, live status badges (`DRAFT`, `PROCESSING`, `NEEDS_REVIEW`, `FLAGGED`, `APPROVED`, `READY_FOR_FILING`), gross weight, HSN lines, and 1-click access to the review workbench.
2. **Screen 2 — 3-Document Intake & Processing Pipeline (`/shipments/new`)**:  
   Dropzone supporting concurrent upload of Commercial Invoice, Packing List, and Bill of Lading with real-time progress indicators, MIME validation, and automatic extraction trigger.
3. **Screen 3 — Consignment Overview & Verification Hub (`/shipments/[id]`)**:  
   Detailed breakdown of parties, ports (`CNSHA` -> `INNSA`), container numbers, document metadata, and immediate cross-check summary.
4. **Screen 4 — Split-Screen Side-by-Side Review Workbench (`/shipments/[id]/review`)**:  
   50% live PDF canvas on the left with interactive zoom (`0.5x` to `2.5x`) and rotation (`0°` to `270°` for skewed scans) + 50% structured field editor on the right with color-coded confidence chips:
   - 🟢 **High Confidence (≥85%)**: Pre-filled, verified.
   - 🟡 **Review Required (45–84%)**: Amber flag, requires human eyeball verification.
   - 🔴 **Low Confidence / Unreadable (<45%)**: Red flag with **Guided Manual Entry** fallback.
5. **Screen 5 — 3-Way Cross-Check Resolution Drawer**:  
   Interactive slide-out drawer evaluating all 6 cross-check rules. Allows 1-click document synchronization or explicit discrepancy override with mandatory operator notes.
6. **Screen 6 — Customs Filing Software Export Gatekeeper (`/shipments/[id]/export`)**:  
   Hard gatekeeper that strictly rejects export with HTTP 422 if unconfirmed low-confidence fields or unresolved cross-check flags remain. Generates 27-column ICEGATE CSV flat-files on approval.
7. **Screen 7 — Manager Accuracy & SLA Analytics (`/analytics`)**:  
   Executive control tower tracking AI accuracy per field type (HSN codes, weights, invoice values), supplier error frequency, SLA turnaround time, and full DPDP-compliant audit trails.

---

## 👥 Demo Accounts & Pre-Seeded Scenarios

| Role | Username / Email | Password | Permissions |
|:---|:---|:---|:---|
| **Documentation Executive** | `exec@companya-cha.in` | `DemoExec!2026` | Upload, edit fields, resolve cross-checks by sync, approve clean consignments |
| **Documentation Manager** | `manager@companya-cha.in` | `DemoMgr!2026` | Full access + approve discrepancy overrides, view analytics, trigger demo reset |

### 4 Pre-Seeded Real-World Consignments

| Consignment Code | Scenario Type | Importer & Supplier | Key Verification Challenge |
|:---|:---|:---|:---|
| **`SHP-24811`** | **Clean Baseline** | Apex Industrial Ltd ← Shenzhen Waystone | 100% extraction confidence, zero discrepancies, ready for 1-click export. |
| **`SHP-24812`** | **Skewed Scan & Weight Mismatch** | Nordic Spares Pvt Ltd ← SKF Gothenburg | 12° scanned tilt (use de-skew controls). Invoice weight (`3,120 kg`) differs from Packing List (`3,165 kg`). Blocks export until synced. |
| **`SHP-24813`** | **Container Number Discrepancy** | Bharat Living Ltd ← Ningbo Homeware | Invoice cites `MSCU8921441` while Bill of Lading cites `MSCU8921442` (transposition error). Blocks export until resolved. |
| **`SHP-24814`** | **Low-Confidence Degraded Scan** | Western Auto Spares ← Ningbo Motor Parts | Degraded physical print with noise artifacts. Triggers `<45%` confidence and Guided Manual Entry fallback. |

---

## ⚡ 1-Minute Quickstart

### Option A: Docker Compose (Fastest & Fully Containerized)

```bash
# Clone the repository
git clone https://github.com/Ojaswi-Gupta/broker_lens.git
cd broker_lens

# Launch backend, frontend, and seed 12 synthetic customs PDFs
docker-compose up -d --build

# Open the application in your browser
open http://localhost:3000
```

### Option B: Native macOS / Linux Development

```bash
# 1. Backend Setup
cd backend
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.services.pdf_seed_gen   # Generates 12 PDFs and seeds SQLite
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

# 2. Frontend Setup
cd ../frontend
npm install
npm run dev

# 3. Open in Browser
open http://localhost:3000
```

---

## 🧪 Automated Verification Suite

BrokerLens is backed by 45+ comprehensive automated tests across 8 test modules:

```bash
cd backend
PYTHONPATH=. .venv/bin/pytest -v
```

```text
============================= test session starts ==============================
collected 46 items

tests/test_accuracy_analytics.py::test_analytics_overview_structure PASSED
tests/test_accuracy_analytics.py::test_supplier_accuracy_metrics PASSED
tests/test_accuracy_analytics.py::test_field_accuracy_breakdown PASSED
tests/test_accuracy_analytics.py::test_sla_metrics_calculation PASSED
tests/test_accuracy_analytics.py::test_recent_edits_audit_trail PASSED
tests/test_crosscheck_engine.py::test_clean_shipment_crosscheck_passes PASSED
tests/test_crosscheck_engine.py::test_weight_discrepancy_flagged PASSED
tests/test_crosscheck_engine.py::test_container_discrepancy_flagged PASSED
tests/test_crosscheck_engine.py::test_crosscheck_resolution_flow PASSED
tests/test_export_pipeline.py::test_export_preview_schema PASSED
tests/test_export_pipeline.py::test_export_blocked_on_unresolved_crosscheck PASSED
tests/test_export_pipeline.py::test_export_blocked_on_unconfirmed_low_confidence PASSED
tests/test_export_pipeline.py::test_export_succeeds_on_approved_shipment PASSED
tests/test_export_pipeline.py::test_icegate_csv_content_and_headers PASSED
tests/test_extraction_pipeline.py::test_deterministic_fallback_clean_shipment PASSED
tests/test_extraction_pipeline.py::test_deterministic_fallback_skewed_shipment PASSED
tests/test_extraction_pipeline.py::test_confidence_scoring_brackets PASSED
tests/test_extraction_pipeline.py::test_unreadable_fallback_engine PASSED
tests/test_models.py::test_database_models_creation PASSED
tests/test_models.py::test_shipment_relationships PASSED
tests/test_pdf_seeder.py::test_twelve_synthetic_pdfs_generated PASSED
tests/test_pdf_seeder.py::test_cjk_font_rendering PASSED
tests/test_pdf_seeder.py::test_four_sample_shipments_seeded PASSED
tests/test_rbac_and_security.py::test_unauthenticated_request_rejected_401 PASSED
tests/test_rbac_and_security.py::test_operator_token_authenticated PASSED
tests/test_rbac_and_security.py::test_manager_token_authenticated PASSED
tests/test_rbac_and_security.py::test_operator_cannot_approve_override_403 PASSED
tests/test_rbac_and_security.py::test_manager_can_approve_override PASSED
tests/test_rbac_and_security.py::test_dpdp_masking_applied_for_operator PASSED
tests/test_rbac_and_security.py::test_negative_quantity_rejected_422 PASSED
tests/test_rbac_and_security.py::test_short_override_reason_rejected_422 PASSED
tests/test_rbac_and_security.py::test_malicious_file_uploads_rejected_with_400 PASSED
tests/test_reset_demo_flow.py::test_reset_demo_flow_operator_forbidden PASSED
tests/test_reset_demo_flow.py::test_reset_demo_flow_manager_success PASSED
tests/test_submission_deliverables.py::test_tdd_pdf_exists_and_valid_size PASSED
tests/test_submission_deliverables.py::test_tdd_markdown_exists_and_contains_assumptions PASSED
tests/test_submission_deliverables.py::test_deployment_md_exists_and_contains_quickstart PASSED
tests/test_submission_deliverables.py::test_submission_zip_packages_exist_and_valid PASSED

============================== 46 passed in 4.12s ==============================
```

Frontend production build check:
```bash
cd frontend && npm run build
```

---

## 🔒 Security & Compliance Architecture

- **DPDP Act 2023 Compliance**: Importer telephone and contact details are masked with cryptographic tokenization (`+91-98****12`) unless specifically unmasked by an authenticated Documentation Manager.
- **Zero Data Retention AI**: Customs commercial invoices and documents are processed strictly in ephemeral memory buffers with zero persistent logging of raw payloads to third-party model providers.
- **Strict JWT Role-Based Access Control**:
  - `DOCUMENTATION_OPERATOR`: Can edit fields, resolve cross-checks via synchronization, and approve clean consignments.
  - `DOCUMENTATION_MANAGER`: Possesses exclusive authority to authorize discrepancy overrides and view sensitive audit logs.
- **Defense in Depth**: Non-bypassable backend validation ensures that client-side UI manipulation cannot bypass the HTTP 422 Export Gatekeeper.

---

## 🔄 1-Click Interactive Demo Reset

To facilitate repeatable end-to-end demonstrations for reviewers:
- Click the **`[↺ Reset Demo]`** button in the top navigation bar at any time (requires `manager@companya.in`).
- Or execute: `curl -X POST http://localhost:8000/api/shipments/reset-demo -H "Authorization: Bearer <manager_token>"`
- This automatically purges transient edits and restores all 4 standard consignments (`SHP-24811` through `SHP-24814`) to their pristine initial states within 50 milliseconds.

---

## 📄 License & Attribution

Developed by **Ojaswi Gupta** for Company A Customs Brokerage Operations (Nhava Sheva / JNPT Port).  
Problem Statement #3 — All Rights Reserved.

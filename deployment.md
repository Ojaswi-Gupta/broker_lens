# BrokerLens — Deployment & Operations Guide

---

### Project Information & Repository Links
- **Project Name**: BrokerLens — Customs Broker AI Document Extraction & 3-Way Cross-Check Workbench
- **GitHub Repository**: [`https://github.com/Ojaswi-Gupta/broker_lens.git`](https://github.com/Ojaswi-Gupta/broker_lens.git)
- **Target Client**: Company A, Navi Mumbai (Freight Forwarder & Customs Broker at JNPT / Nhava Sheva Port, `INNSA`)
- **Author**: Ojaswi Gupta
- **Target Delivery Bounds**: ₹7.5 Lakh Budget | 6 Weeks Max Delivery | < 15 min entry SLA & ≥ 95.0% accuracy

---

## 1. How to Run Locally — Step by Step

You can run BrokerLens locally either via **Native Run** (recommended for local development) or **Docker Compose** (1-command full stack containerization).

### Option A: Native Local Run (Under 2 Minutes)

#### Step 1: Clone the Repository
```bash
git clone https://github.com/Ojaswi-Gupta/broker_lens.git
cd broker_lens
```

#### Step 2: Backend Setup & Automated Seed Generation
BrokerLens automatically creates the SQLite database, generates all 12 authentic customs PDFs (with ReportLab CJK font rendering, tilt, and scan noise), and seeds all 4 baseline consignments + 64 historical edit records on startup:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start FastAPI backend server on port 8000
uvicorn app.main:app --reload --port 8000
```
> The backend is now live at `http://localhost:8000`. You can inspect the interactive OpenAPI Swagger docs at `http://localhost:8000/docs`.

#### Step 3: Frontend Setup & Dev Server
In a separate terminal tab:
```bash
cd frontend
npm install
npm run dev
```
> Open your browser at **`http://localhost:3000`**. The application auto-authenticates as Documentation Executive (`Rohan Deshmukh`) with full operational permissions.

#### Step 4: Run the Automated Test Suite (42+ Tests)
In the backend terminal tab:
```bash
cd backend
PYTHONPATH=. .venv/bin/pytest -v
```

---

### Option B: 1-Command Run via Docker Compose

Run the entire application stack (FastAPI Backend + Next.js 14 Frontend) in isolated Docker containers:

```bash
docker compose up -d --build
# or using legacy syntax:
docker-compose up -d --build
```
- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

---

## 2. Production Cloud Deployment & Environment Variables

### Production Architecture Topology
- **Presentation Layer**: Deployed to Vercel (Edge Network, Mumbai Region `bom1`) for sub-20ms initial response time across India.
- **Application & API Layer**: Deployed to AWS Elastic Container Service (ECS Fargate) in **AWS Mumbai (`ap-south-1`)** for strict data residency and compliance with the India Digital Personal Data Protection Act (DPDP Act 2023).
- **Database Layer**: AWS Aurora Serverless PostgreSQL 16 in `ap-south-1` with automated point-in-time recovery.
- **Object Storage**: AWS S3 Bucket in `ap-south-1` with SSE-KMS encryption at rest for encrypted customs PDF storage.

### Production Environment Variables Reference (NAMES ONLY — NO VALUES)

#### Backend Environment Variables
| Variable Name | Purpose & Scope |
| :--- | :--- |
| `APP_ENV` | Environment identifier (`development`, `staging`, `production`) |
| `PORT` | HTTP server binding port (default: `8000`) |
| `HOST` | HTTP server binding host (default: `0.0.0.0`) |
| `DATABASE_URL` | PostgreSQL connection string (defaults to local SQLite if omitted) |
| `JWT_SECRET_KEY` | Cryptographic signing secret for JWT access tokens |
| `JWT_ALGORITHM` | JWT signing algorithm (e.g., `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime duration in minutes |
| `GEMINI_API_KEY` | Google Gemini 2.5 Flash Vision API credential |
| `AI_ZERO_DATA_RETENTION` | Strict compliance flag ensuring zero model training on customs data |
| `ENABLE_PII_MASKING_BY_DEFAULT` | Default DPDP Act 2023 PII masking mode for importer contact data |
| `AWS_REGION` | Cloud region for document storage (`ap-south-1`) |
| `CONFIDENCE_HIGH_THRESHOLD` | Threshold score for high-confidence emerald classification (`0.85`) |
| `CONFIDENCE_MIN_READABLE_THRESHOLD`| Cutoff score below which documents trigger manual entry (`0.45`) |
| `CORS_ORIGINS` | Permitted frontend origins whitelist for cross-origin requests |

#### Frontend Environment Variables
| Variable Name | Purpose & Scope |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI backend API |
| `NEXT_PUBLIC_APP_REGION` | Deployment region label for UI badge display |

---

## 3. Demo Credentials & 3-Minute Reviewer Walkthrough

### 3.1 Demo Accounts & Fast Role Switching
Evaluators do not need to type passwords manually. Both `/login` and the persistent top navigation bar provide **1-Click Role Switchers** and a **`[↺ Reset Demo]`** button:

| Role | Email | Password | Operator Name | Permissions & Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Documentation Executive** | `exec@companya-cha.in` | `DemoExec!2026` | **Rohan Deshmukh** | Uploads consignments, runs extraction, confirms low-confidence fields, resolves 3-way cross-checks via sync, exports clean shipments. |
| **Documentation Manager** | `manager@companya-cha.in` | `DemoMgr!2026` | **Priya Nair** | Full executive access plus mandatory sign-off authorization for overridden cross-checks (`requires_manager_approval`). |

---

### 3.2 Guided 3-Minute 4-Consignment Walkthrough

#### Consignment 1: `SHP-24811` (Company B, China) — The 3-Way Weight Discrepancy
1. Navigate to `/shipments` and click **`SHP-24811`**.
2. **Review Workbench**: Observe the red status banner: `CROSS_CHECK_FAILED`.
3. In the right-hand panel, inspect the **3-Way Cross-Check Matrix**:
   - Invoice states **`3,120.00 kg`**.
   - Bilingual Mandarin/EN Packing List (`装箱单 / 毛重`) states **`3,165.00 kg`**.
   - Ocean Bill of Lading states **`3,165.00 kg`**.
   - The engine flags a critical **`45.00 kg delta`**.
4. Click **`Export Filing (.csv)`** in the header or visit `/shipments/SHP-24811/export`.
5. **Gatekeeper Verification**: Observe the red blocker card. Click **`[🔒 Test Backend HTTP 422 Gatekeeper]`** to verify the server-side barrier; view the raw FastAPI `HTTP 422 Unprocessable Entity` JSON payload.
6. Return to Review Workbench and click **`[Sync to 3,165.00 kg]`**. Notice the cross-check flips to `PASSED` in real time, and shipment status transitions to `APPROVED`.
7. Alternatively, test the **`[Override with Audit Note]`** flow: enter *"Tare weight of 12 wooden pallets excluded from commercial invoice per customs declaration"*. Notice the shipment escalates to `READY_FOR_APPROVAL` requiring Manager sign-off. Test that Executive Rohan is rejected with `HTTP 403 Forbidden`, switch to Manager Priya, click **`[Approve Consignment]`**, and proceed to export.

#### Consignment 2: `SHP-24812` (Company C, Sweden) — Scanner Tilt & Low Confidence Review
1. Navigate to `/shipments` and click **`SHP-24812`**.
2. **Scan Skew Correction**: Notice the document canvas displays a `-2.8°` tilted Swedish/English scan (`FAKTURA`). Click **`[Auto-Deskew (+2.8°)]`** in the document viewer toolbar to straighten the scan in real time.
3. **Low-Confidence Review**: Notice the 2 amber fields flagged:
   - `Incoterm` (Confidence: 78%): Click `[✓ Confirm]` to accept *"CIF Nhava Sheva"*.
   - `Line Item HSN Code` (Confidence: 74%): Click `[✓ Confirm]` to accept *"84818030"*.
4. Once confirmed, shipment status flips to `APPROVED` and export unlocks.

#### Consignment 3: `SHP-24813` (Shenzhen Precision Motors) — Clean Instant Export
1. Navigate to `/shipments` and click **`SHP-24813`**.
2. Notice all 6 cross-checks pass (100% clean verified digital consignment).
3. Navigate to `/shipments/SHP-24813/export`.
4. Observe the green clearance card: *"All 4 Pre-Flight Checks Passed — Ready for Filing"*.
5. Click **`[⬇ Download Filing Excel CSV (.csv)]`** to download `BrokerLens_Filing_SHP-24813.csv`. Open it in Microsoft Excel to verify the UTF-8 BOM (`\ufeff`) opens cleanly without character corruption, showing all 27 customs filing columns.
6. Click **`[📋 Copy TSV for Excel]`** and paste directly into any spreadsheet.

#### Consignment 4: `SHP-24814` (Hamburg Chemie GmbH) — Degraded / Unreadable Scan Fallback
1. Navigate to `/shipments` and click **`SHP-24814`**.
2. Notice the Packing List is flagged as **`UNREADABLE`** (confidence: 31%, thermal paper smudge).
3. Experience the **Guided Manual Entry** mode: the document viewer zooms to the packing list while the input form guides the operator to manually type the Gross Weight (`16400.00 kg`).
4. Once entered, the 3-way cross-check engine evaluates the consignment and unlocks approval.

#### Manager Analytics Dashboard (`/analytics`)
1. Click **`Accuracy & Audit`** in the top navigation bar.
2. Inspect the **5-Card SLA & ROI Ribbon**:
   - Field Extraction Accuracy: **`95.8%`** vs **`95.0% SLA Target`** (`SLA MET`).
   - Processing Time: **`11.4 min`** vs **`45.0 min baseline`** (`-74.7%` time reduction).
   - Labor Savings: **`₹25.87 Lakh / yr`** (1,100 shipments/mo × 0.75h × 12 × ₹350/hr).
   - Demurrage Savings: **`₹26.53 Lakh / yr`** (396 cases/yr × ₹9,000/case).
   - Total Net Savings: **`₹52.40 Lakh / yr`** on a **₹7.5 Lakh build (698% ROI)**.
3. Review the **Per-Field Accuracy Breakdown** (13 standard customs fields with progress bars and alerts for HSN code and Gross Weight).
4. Review the **Per-Supplier Anomaly Diagnostics** table.
5. Search and filter the **Immutable Audit Log Trail** (filter by supplier, field, or operator).
6. Click **`[⬇ Export Audit Report (.csv)]`** to download the complete audit trail.
7. Click **`[↺ Reset Demo]`** in the navbar to reset all 4 consignments and audit logs back to their initial baseline state at any time.

---

*Compiled by Ojaswi Gupta for Isocode Evaluation and Company A Deployment.*

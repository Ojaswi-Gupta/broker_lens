# BrokerLens 🔍🚢

> **Customs Broker's AI Document Extraction & 3-Way Cross-Check Workbench**  
> Problem Statement #3: Customs Broker (CHA) AI Automation  
> **Repository:** [https://github.com/Ojaswi-Gupta/broker_lens.git](https://github.com/Ojaswi-Gupta/broker_lens.git)  
> **Client Context:** Company A, Navi Mumbai (Nhava Sheva / JNPT Port)

---

## 📌 Executive Summary

Company A is a licensed Indian Customs Broker (CHA) and freight forwarder handling **1,100 import shipments/month** (~13,200/year) through JNPT / Nhava Sheva Port. Their 14-member documentation team manually retypes Commercial Invoices, Packing Lists, and Bills of Lading into Excel and ICEGATE customs filing software, causing:

- **₹34.65 lakh/year** in manual data entry payroll (9,900 hours/yr @ ₹350/hr).
- **₹35.64 lakh/year** in amendment fines, port demurrage, and detention delays from a 3% typo/mismatch rate (396 shipments/yr @ ₹9,000/incident).
- **Total quantifiable annual bleed: ₹70.29 lakh/year.**

**BrokerLens** provides a high-density, Swiss-utility operational workbench that extracts structured customs data using Vision AI with a deterministic fallback, performs instant **3-way mathematical cross-checks** across documents, gates export until all anomalies are resolved, and outputs 1-click customs filing flat files.

---

## 🏛️ System Architecture

```text
broker_lens/
├── prompts/
│   ├── master_workflow.yaml      # Master phase-gated specification
│   └── phase_status.yaml        # Active tracking of phase execution
├── backend/                      # Python FastAPI + SQLAlchemy + Pydantic v2
│   ├── app/
│   │   ├── api/                  # Auth, shipments, review workbench, export, analytics
│   │   ├── models/               # Relational domain models
│   │   ├── schemas/              # Strict Pydantic v2 schemas
│   │   └── services/             # Vision extractor, 3-way cross-check, PDF generator
│   ├── tests/                    # Pytest test suite
│   ├── requirements.txt
│   └── .env.example
├── frontend/                     # Next.js 14 App Router + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/                  # 7 focused operational screens
│   │   ├── components/           # Split-screen viewer, cross-check drawer, tables
│   │   ├── lib/                  # Utilities & API client
│   │   └── types/                # Strict domain types
│   ├── package.json
│   └── .env.example
├── docs/                         # Technical Design Document (TDD) & specifications
├── deployment.md                 # Submission deployment manual & credentials
└── README.md
```

---

## 🚀 Key Capabilities

1. **Vision AI Extraction & Skew Correction**: Google Gemini Vision (`gemini-2.5-flash`) extracts parties, items, 8-digit HSNs, container numbers, and weights with confidence scoring and manual tilt adjustment.
2. **Deterministic Offline Fallback**: Zero-dependency layout and regex extractor guarantees full testability without requiring external API keys.
3. **Deterministic 3-Way Cross-Check**: Compares gross/net weights, container numbers, package quantities, and item totals across Invoice, Packing List, and BoL to catch discrepancies (such as 3,120 kg vs 3,165 kg).
4. **Human-in-the-Loop Confirmation Gate**: Low-confidence fields (< 85%) and mismatched cross-checks visually lock the filing export until resolved by an operator or authorized by a Documentation Manager.
5. **DPDP Act 2023 Compliance**: Built-in PII masking for importer contact information and zero data retention design.

---

## 💻 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React
- **Backend**: FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite (local) / PostgreSQL (production AWS ap-south-1)
- **AI / Document Engine**: Gemini Vision API with structured outputs + ReportLab & Pillow PDF generation
- **Testing**: Pytest (backend), TypeScript/ESLint (frontend)

---

## 📄 License & Attribution

Developed for Company A CHA Operations • All rights reserved.

# JalKrishi AI — Real-Time Groundwater Resource Evaluation Using DWLR Data

**Tagline:** *“Know Your Water. Grow Smarter.”*  
**Hackathon:** Smart Horizon 2026 — 48-Hour International Hackathon  
**Team:** HACKSTACK  
**Problem ID:** SH-AGR-005  

---

## 1. Executive Summary & Problem Statement

Groundwater management in Indian agriculture is historically fragmented. Farmers make sowing decisions without visibility into local aquifer depletion velocity, resulting in borewell failures, crop loss, and unsustainable extraction of vulnerable water tables.

**JalKrishi AI** bridges the gap between raw Digital Water Level Recorder (DWLR) sensor data and actionable farm-level decisions. It converts hourly/daily piezometer depth measurements into hydrodynamic forecasts, statistical anomaly triage, and hydro-agronomic crop choices delivered directly to farmers via web and WhatsApp.

```
DWLR TELEMETRY ──► QUALITY CONTROL ──► ANALYTICS ──► FORECASTING ──► ANOMALIES ──► CROP ADVISOR ──► FARMER ACTION
(5,260 Wells)      (12 Checks)       (Risk Index)  (30/60/90d)    (5 Categories) (Multi-Factor)   (WhatsApp Chatbot)
```

---

## 2. Platform Key Features

1. **5,260-Station Monitored DWLR Network (`/map`)**:
   - Interactive Leaflet map displaying real-time observation wells across 37 Indian states & Union Territories.
   - Marker clustering, status indicators (Healthy, Moderate, Warning, Critical), and well drawdown velocity.
2. **Regional Groundwater Analytics (`/analytics`)**:
   - National summary metrics, state/district rollups, State Risk Ranking scores, and PDF/Excel exports.
3. **Hydrodynamic Groundwater Forecasting (`/forecast`)**:
   - 30-day, 60-day, and 90-day forward projections with confidence envelopes and Days-to-Critical countdowns.
4. **Statistical Anomaly Triage Center (`/anomalies`)**:
   - 5-category anomaly detection (Sudden Drop, Abnormal Extraction, Sensor Issues) with non-accusatory evidence explanations.
5. **Farmer-First Crop Advisor (`/crops`)**:
   - Multi-factor agronomic crop scoring matrix matching water demand against local groundwater status and soil types.
6. **Bilingual WhatsApp Assistant (`/whatsapp`)**:
   - Conversational Hindi/English chatbot answering queries like *"Kolar water"* or *"Sangrur forecast"* offline.
7. **JalKrishi AI Executive Intelligence (`/`)**:
   - 30-second executive brief synthesizing telemetry, risk models, forecasts, anomalies, and crops without external LLM dependencies.
8. **Hackathon Judge Demo System (`/demo`)**:
   - Guided 8-step judging journey and presenter control bar for 3-minute hackathon live demonstrations.

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Leaflet, Recharts, Lucide Icons
- **Backend:** Python 3.11, FastAPI, Pydantic v2, Uvicorn, NumPy / Pandas Engine
- **Architecture:** Deterministic In-Memory Repository, Live API Bridge with Client-Side Offline Fallback
- **Build System:** TypeScript Compiler (`tsc -b`), Vite Production Bundler (`npm run build`)

---

## 4. Quick Start & Local Setup

### Prerequisites
- Node.js v18.0.0+ | npm 9.0.0+
- Python 3.10+ | pip

### Step A: Backend Setup
```bash
# 1. Install backend Python dependencies
pip install -r backend/requirements.txt

# 2. Launch FastAPI Server
python backend/run.py
```
*FastAPI Server runs on `http://127.0.0.1:8000` | OpenAPI Docs: `http://127.0.0.1:8000/docs`*

### Step B: Frontend Setup
```bash
# 1. Install frontend npm dependencies
npm install

# 2. Start Vite Dev Server
npm run dev
```
*Frontend runs on `http://127.0.0.1:5173`*

---

## 5. Hackathon Judge Demonstration Mode (`/demo`)

Navigate to `http://127.0.0.1:5173/demo` to access the **Hackathon Presenter Control Bar**:
- **Step 1:** National Groundwater Overview (5,260 wells)
- **Step 2:** Priority Risk Belt Identification (Sangrur, Punjab & Kolar, Karnataka)
- **Step 3:** Station Drawdown Inspection (DWLR-PB-001)
- **Step 4:** 30-Day Hydrodynamic Forecast & Days-to-Critical
- **Step 5:** Statistical Telemetry Anomaly Triage
- **Step 6:** Hydro-Agronomic Crop Advisor
- **Step 7:** WhatsApp Conversational Chatbot
- **Step 8:** Executive AI Brief Synthesis

---

## 6. Complete API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | GET | Root system health probe |
| `/api/v1/ready` | GET | Kubernetes readiness probe (5,260 wells check) |
| `/api/v1/system/status` | GET | Full system status, engine availability & adapter states |
| `/api/v1/stations/summary` | GET | Network-wide DWLR station summary counts |
| `/api/v1/stations` | GET | Paginated DWLR station list with filters |
| `/api/v1/stations/{id}` | GET | Individual DWLR station details & historical telemetry |
| `/api/v1/stations/search` | GET | Search stations by district, state, or well ID |
| `/api/v1/analytics/summary` | GET | National groundwater analytics summary |
| `/api/v1/analytics/states` | GET | State-level groundwater aggregation metrics |
| `/api/v1/analytics/districts` | GET | District-level groundwater aggregation metrics |
| `/api/v1/analytics/states/risk-ranking` | GET | State risk rankings based on critical well ratio |
| `/api/v1/forecast/summary` | GET | Network forecast summary metrics |
| `/api/v1/forecast/{id}` | GET | Station 30/60/90-day hydrodynamic forecast |
| `/api/v1/forecast/top-risk` | GET | Top-risk stations sorted by projected depletion rate |
| `/api/v1/forecast/regional` | GET | Regional forecast summaries |
| `/api/v1/anomalies` | GET | Statistically flagged telemetry anomaly events |
| `/api/v1/anomalies/summary` | GET | Anomaly summary breakdown |
| `/api/v1/anomalies/distribution` | GET | Anomaly breakdown by category & severity |
| `/api/v1/crops/recommend` | POST | Multi-factor hydro-agronomic crop recommendations |
| `/api/v1/crops/compare` | POST | Side-by-side crop water demand & yield comparison |
| `/api/v1/crops/catalog` | GET | Complete catalog of supported agricultural crops |
| `/api/v1/whatsapp/webhook` | POST | Conversational WhatsApp query interface |
| `/api/v1/data/status` | GET | Data ingestion pipeline status |
| `/api/v1/data/validate-csv` | POST | Uploaded CSV quality audit sandbox |
| `/api/v1/insights/summary` | GET | Executive AI Water Situation Brief |
| `/api/v1/insights/station/{id}` | GET | Station specific AI intelligence brief |

---

## 7. Automated Test Orchestration

Execute all 14 backend test suites sequentially:
```bash
python backend/tests/test_phase_a.py
python backend/tests/test_stations.py
python backend/tests/test_analytics.py
python backend/tests/test_forecasting.py
python backend/tests/test_anomalies.py
python backend/tests/test_crops.py
python backend/tests/test_frontend_contract.py
python backend/tests/test_whatsapp.py
python backend/tests/test_data_pipeline.py
python backend/tests/test_phase_j.py
python backend/tests/test_phase_k.py
python backend/tests/test_insights.py
python backend/tests/test_phase_l.py
python backend/tests/test_phase_m.py
```
*Result: 14 of 14 test suites passing 100% cleanly.*

---

## 8. Production Build & Deployment

```bash
# Build React Production Assets
npm run build
```
Produces minified production assets in `./dist/`. Refer to **[`DEPLOYMENT.md`](file:///c:/Users/sruja/OneDrive/Desktop/RISK-X/HACKSTACK/DEPLOYMENT.md)** for Vercel, Netlify, Render, and Docker deployment instructions.

---

## 9. Data Transparency & Future Government Adapters

- **Active Data Mode:** **`DEMO_SIMULATION`**  
  The system operates on a 5,260-station deterministic DWLR model. Real government credentials are not required to run the demo.
- **Future Integration Adapters:**
  - `India-WRIS` REST Feed &rarr; `NOT_CONFIGURED`
  - `CGWB` Piezometer Network &rarr; `NOT_CONFIGURED`
  - `IMD` Precipitation Grids &rarr; `NOT_CONFIGURED`

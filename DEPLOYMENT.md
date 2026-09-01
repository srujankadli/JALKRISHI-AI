# JalKrishi AI — Production Deployment Guide

**Project:** JalKrishi AI — Real-Time Groundwater Resource Evaluation Using DWLR Data  
**Tagline:** *“Know Your Water. Grow Smarter.”*  
**Hackathon:** Smart Horizon 2026 — 48-Hour International Hackathon  
**Team:** HACKSTACK  
**Problem ID:** SH-AGR-005  

---

## 1. System Requirements & Prerequisites

- **Frontend Environment:** Node.js v18.0.0+ | npm 9.0.0+
- **Backend Environment:** Python 3.10+ | pip
- **Operating System:** Cross-platform (Linux / macOS / Windows)
- **Database:** None required for `DEMO_SIMULATION` (In-memory high-performance DWLR repository)

---

## 2. Environment Configuration

### A. Frontend Environment (`.env` or Cloud Hosting Settings)
```env
# Production Deployed FastAPI Base URL
VITE_API_BASE_URL=https://jalkrishi-api.onrender.com/api/v1
```
*Note: In local development, leave unset or set to `http://127.0.0.1:8000/api/v1`.*

### B. Backend Environment (`.env` or Cloud Hosting Settings)
```env
APP_ENV=production
HOST=0.0.0.0
PORT=8000
DEBUG=false
LOG_LEVEL=INFO
DATA_MODE=DEMO_SIMULATION
CORS_ORIGINS=https://jalkrishi-ai.vercel.app,https://jalkrishi.gov.in
CSV_MAX_SIZE_BYTES=5242880
MAX_PAGINATION_LIMIT=10000
```

---

## 3. Local Development Commands

### Start Backend (FastAPI Server):
```bash
python backend/run.py
```
*Backend runs on: `http://127.0.0.1:8000` | Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`*

### Start Frontend (Vite React Server):
```bash
npm run dev
```
*Frontend runs on: `http://127.0.0.1:5173`*

---

## 4. Production Build & Deployment

### Step A: Build Frontend Bundle
```bash
# Set production API URL before building
export VITE_API_BASE_URL="https://<your-deployed-backend-domain>/api/v1"

# Run production build & typecheck
npm run build
```
This produces optimized static assets in the `./dist/` directory.

### Step B: Deploy Frontend (Vercel / Netlify / Cloudflare Pages / AWS S3)
Deploy the `./dist/` folder to any static hosting service.

**SPA Routing Rewrite Rule:**  
Ensure single-page application routing is configured so direct links like `https://<domain>/map` or `https://<domain>/forecast` resolve to `index.html`:
- **Vercel (`vercel.json`):**
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
- **Netlify (`_redirects`):**
  ```
  /*    /index.html   200
  ```

### Step C: Deploy Backend (Render / Railway / AWS App Runner / GCP / Docker)

#### Option 1: Native Python Runner (Render Cloud Web Service)
- **Language:** Python 3
- **Branch:** `main`
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python run.py`
- **Host Binding:** Server automatically binds to `0.0.0.0` and reads Render's dynamic `PORT` environment variable (`PORT=10000`).

#### Option 2: Docker Container Deployment
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend /app/backend
ENV PYTHONPATH=/app/backend
EXPOSE 8000
CMD ["python", "backend/run.py"]
```

---

## 5. Production Health Checks & Diagnostics

Verify deployment health using these endpoints:
1. **Health Probe:** `GET /health` &rarr; Returns `{"status": "healthy", "data_mode": "DEMO_SIMULATION"}`
2. **Readiness Probe:** `GET /api/v1/ready` &rarr; Returns `{"ready": true, "station_count": 5260}`
3. **Full Diagnostics:** `GET /api/v1/system/status` &rarr; Exposes active data mode, quality score, uptime, 7 active engines, and adapter states.

---

## 6. Data Mode Transparency & Future Government Adapters

- **Active Data Mode:** **`DEMO_SIMULATION`**  
  The system currently runs on a high-precision 5,260-station deterministic DWLR network. Real India-WRIS or CGWB credentials are **not** required to run the platform.
- **Future Integration Adapters:**
  - `India-WRIS` REST Connector &rarr; `NOT_CONFIGURED`
  - `CGWB` Monitoring Well Network &rarr; `NOT_CONFIGURED`
  - `IMD` Precipitation Telemetry &rarr; `NOT_CONFIGURED`

---

## 7. Automated Test Verification (11 of 11 Test Suites Passed 100%)

Run the complete regression test matrix before deployment:
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
```

# JalKrishi AI — Agent Quick Start Guide (< 2 Minutes)

## 1. Executive Summary
- **Project:** JalKrishi AI (*Know Your Water. Grow Smarter.*)
- **Repo:** `https://github.com/srujankadli/JALKRISHNA-AI.git` (Branch: `main`)
- **Backend:** FastAPI (Python 3.14) in `backend/`
- **Frontend:** Vite + React 18 + TypeScript 5 in root (`src/`)
- **Deployments:**
  - Frontend: `https://jalkrishi-ai-1.onrender.com`
  - Backend: `https://jalkrishi-ai.onrender.com`
  - API: `https://jalkrishi-ai.onrender.com/api/v1`

---

## 2. Core Architecture Invariant
> **DATABASE/NETWORK CAN BE NATIONWIDE — BUT FARMER EXPERIENCE MUST BE LOCAL.**
- **Farmer:** Only sees *My Farm*, localized nearby station evidence (or satellite-assisted spatial proxy), crop recommendations, local water watch, and localized forecast.
- **Official:** Sees nationwide network (5,260 reference simulation stations), regional rollups, statistical anomalies, and proactive policy warnings.

---

## 3. How to Run Locally

### Backend (Terminal 1)
```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend (Terminal 2)
```powershell
npm run dev
# Running on http://localhost:5173
```

---

## 4. Verification & Testing Commands

```powershell
# Run backend tests (134 tests)
python -m pytest backend/tests

# Check TypeScript static types
npx tsc --noEmit

# Build production bundle
npm run build
```

---

## 5. Current Git Baseline & Status
- **Current HEAD:** `15a5b3acc1e634b41b98635b32161727ffd1c8ab`
- **Origin/Main:** `15a5b3acc1e634b41b98635b32161727ffd1c8ab`
- **Worktree:** `DIRTY` (16 uncommitted component files from ongoing multilingual task)
- **Current Unfinished Task:** Website-wide multilingual synchronization across 13 Indian regional languages.

---

## 6. DO NOT BREAK LIST (Strict Architectural Invariants)
1. **NO Silent Fallback Locations:** Never default missing/invalid locations to Kolar, Ballari, Shivamogga, Sangrur, or `(20.5937, 78.9629)`. Unverified locations must fail cleanly.
2. **NO Fake Telemetry Claims:** 5,260 stations represent the **Reference Simulation Dataset**, NOT live government DWLR telemetry. GRACE/Sentinel-1 are `NOT_CONFIGURED`.
3. **DO NOT Reset FarmContext on Language Change:** Farmer's selected farm location, crop, and water profile must survive language toggling without reload.
4. **DO NOT Expose Station IDs or Raw Anomalies to Farmers:** Farmer UI should only show plain-language evidence and proximal distances ($\le 15\text{ km}$ Direct, $15-35\text{ km}$ Regional, $> 35\text{ km}$ Satellite-Assisted).
5. **DO NOT Confuse Forecast Terminology:** Use **Model Projection Envelope** (not 95% confidence interval) and **Station Reference Threshold** (not universal 25m threshold). Historical rainfall is contextual reference, not rainfall prediction.

---

## 7. Key Files at a Glance
- `src/context/FarmContext.tsx` — Authoritative farmer session state.
- `src/context/LanguageContext.tsx` — Authoritative language & RTL/LTR dictionary.
- `src/pages/ForecastPage.tsx` — Dual-mode (Farmer Local vs Station Graph) forecast.
- `backend/app/pipeline/location_resolver.py` — Nationwide Indian gazetteer & PIN resolver.
- `backend/app/engines/forecasting.py` — Groundwater forecast projection engine.
- `backend/app/adapters/provider_resilience.py` — 3-tier data provider fallback adapter.

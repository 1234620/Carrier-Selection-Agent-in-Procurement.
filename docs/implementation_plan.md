# AI-Powered Carrier Selection Agent — Implementation Plan

Build a working prototype of the Four-Brain Multi-Modal Carrier Selection Agent for hackathon demo. Focus on end-to-end functionality over depth.

## Proposed Changes

### Project Setup & Synthetic Data

#### [NEW] Project scaffolding
- Initialize project at `/Users/manthanvarma/Desktop/untitled folder 4/Carrier-Selection-Agent-in-Procurement./`
- Backend: Python + FastAPI in `backend/`
- Frontend: React + Vite in `frontend/`
- Data: Synthetic datasets in `data/`

#### [NEW] `data/synthetic/` — Synthetic Data Generator
- `generate_data.py` — Python script producing:
  - `carriers.json` — 40 carriers across 4 modes (10 per mode) with attributes
  - `lanes.json` — 50 origin-destination lane pairs
  - `shipments.json` — 200 historical shipments
  - `bids.json` — 300 carrier bids in mode-specific formats
  - `performance_history.json` — Carrier performance data (OTD, delays, damage)

#### [NEW] `data/sample_bids/` — 3 demo bid PDFs
- Ocean freight bid, air freight bid, road freight bid (text-based for LLM parsing)

---

### Backend — FastAPI Core Engine

#### [NEW] `backend/app/main.py` — FastAPI app entry point
- CORS, lifespan, router mounting

#### [NEW] `backend/app/api/routes.py` — API endpoints
- `POST /api/parse-bid` — Upload bid file → parsed + normalized JSON
- `POST /api/score-carriers` — Score carriers for a shipment
- `POST /api/select-mode` — Get mode recommendation for a shipment
- `POST /api/optimize` — Run MILP allocation
- `GET /api/carriers` — List all carriers by mode
- `GET /api/shipments` — List sample shipments
- `POST /api/chat` — Co-pilot chat endpoint

#### [NEW] `backend/app/agents/mode_selector.py` — Brain 0
- Random Forest trained on synthetic data
- SHAP explanations for each prediction
- Input: shipment features → Output: mode probability distribution

#### [NEW] `backend/app/agents/carrier_analyst.py` — Brain 1
- AHP weight profiles per mode (hardcoded for hackathon speed)
- TOPSIS ranking within each mode
- Cross-modal normalization to 0-100 universal score

#### [NEW] `backend/app/agents/risk_predictor.py` — Brain 2
- LightGBM delay classifier trained on synthetic performance data
- Risk score per carrier-lane combination

#### [NEW] `backend/app/agents/strategist_optimizer.py` — Brain 3
- Multi-objective MILP via OR-Tools/PuLP
- Decision variables: x[shipment, mode, carrier]
- Objective: minimize weighted sum of cost, risk, carbon, time
- Constraints: demand coverage, capacity, delivery deadlines

#### [NEW] `backend/app/parsers/bid_parser.py` — Bid Parser
- Google Gemini API for LLM-powered extraction
- Mode-specific schema mapping
- Normalize all bids to $/ton-km for cross-modal comparison

#### [NEW] `backend/app/models/scoring.py` — AHP-TOPSIS Engine
- AHP pairwise matrices per mode
- TOPSIS ideal/anti-ideal solution calculation
- Min-max normalization to universal score

---

### Frontend — React Dashboard

#### [NEW] Frontend via Vite + React
- `frontend/` — 5 key screens
  1. **BidUploader** — Drag-drop PDF, show parsed JSON + normalized cost
  2. **ModeComparison** — Side-by-side cards: Road vs Ocean vs Air vs Rail
  3. **CarrierLeaderboard** — Ranked carrier cards per mode with scores
  4. **WhatIfSimulator** — Sliders for modal shift → re-optimization
  5. **CoPilotChat** — Chat interface to query the AI agent
- Modern dark-mode UI with glassmorphism, gradients, animations

---

## Verification Plan

### Automated Tests
1. **Backend health**: `curl http://localhost:8000/docs` — Swagger UI loads
2. **Data generation**: `python data/synthetic/generate_data.py` produces all JSON files
3. **Scoring engine**: Run `pytest backend/tests/test_scoring.py` — AHP-TOPSIS produces valid 0-100 scores
4. **Bid parser**: `curl -X POST http://localhost:8000/api/parse-bid` with sample bid → returns structured JSON

### Manual / Browser Verification
1. Start backend (`uvicorn backend.app.main:app --reload`) and frontend (`npm run dev`)
2. Open dashboard → upload a sample bid PDF → confirm parsed data appears
3. Navigate to Mode Comparison → confirm 4 mode cards display with scores
4. Use What-If simulator → drag slider → confirm metrics update
5. Open Co-Pilot chat → ask "Which carrier for Mumbai to Hamburg?" → confirm response

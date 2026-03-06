"""
FastAPI Application — AI-Powered Multi-Modal Carrier Selection Agent
Main entry point for the backend server.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import json

# Import agents
from .agents.mode_selector import get_mode_selector, train_mode_selector
from .agents.carrier_analyst import get_carrier_analyst
from .agents.risk_predictor import get_risk_predictor
from .agents.strategist_optimizer import get_optimizer
from .parsers.bid_parser import get_bid_parser
from .api.routes import router


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "synthetic")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize all AI brains on startup."""
    print("🧠 Initializing Four-Brain AI System...")
    
    # Load and train Mode Selector (Brain 0)
    try:
        with open(os.path.join(DATA_DIR, "shipments.json")) as f:
            shipments = json.load(f)
        train_mode_selector(shipments)
        print("  ✅ Brain 0 (Mode Selector): Trained on", len(shipments), "shipments")
    except Exception as e:
        print(f"  ⚠️ Brain 0 (Mode Selector): Using rules-based fallback ({e})")

    # Load Carrier Analyst (Brain 1)
    try:
        analyst = get_carrier_analyst()
        print(f"  ✅ Brain 1 (Carrier Analyst): Loaded {len(analyst.carriers)} carriers")
    except Exception as e:
        print(f"  ⚠️ Brain 1 (Carrier Analyst): {e}")

    # Load Risk Predictor (Brain 2)
    try:
        predictor = get_risk_predictor()
        print(f"  ✅ Brain 2 (Risk Predictor): Models trained")
    except Exception as e:
        print(f"  ⚠️ Brain 2 (Risk Predictor): Using heuristic fallback ({e})")

    # Load Strategist Optimizer (Brain 3)
    try:
        optimizer = get_optimizer()
        print(f"  ✅ Brain 3 (Strategist Optimizer): Loaded {len(optimizer.carriers)} carriers")
    except Exception as e:
        print(f"  ⚠️ Brain 3 (Strategist Optimizer): {e}")

    print("🚀 All brains initialized. Server ready!")
    
    yield  # Server running
    
    print("👋 Shutting down...")


app = FastAPI(
    title="AI Carrier Selection Agent",
    description="Multi-Modal Procurement Co-Pilot — Four-Brain AI System for Road, Ocean, Air, and Rail freight carrier selection",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": "AI-Powered Multi-Modal Carrier Selection Agent",
        "version": "1.0.0",
        "brains": [
            "Brain 0: Mode Selector (Random Forest + SHAP)",
            "Brain 1: Carrier Analyst (AHP-TOPSIS)",
            "Brain 2: Risk Predictor (GradientBoosting)",
            "Brain 3: Strategist Optimizer (Multi-Objective MILP)",
        ],
        "modes": ["road", "rail", "ocean", "air"],
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "brains_active": 4}

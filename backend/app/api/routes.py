"""
API Routes — All endpoints for the Carrier Selection Agent.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import json
import os

from ..agents.mode_selector import get_mode_selector
from ..agents.carrier_analyst import get_carrier_analyst
from ..agents.risk_predictor import get_risk_predictor
from ..agents.strategist_optimizer import get_optimizer
from ..parsers.bid_parser import get_bid_parser

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "synthetic")


# ─── Pydantic Models ─────────────────────────────────────────────────────

class ShipmentRequest(BaseModel):
    origin: str = "Mumbai"
    destination: str = "Delhi"
    weight_tons: float = 20.0
    distance_km: float = 1400
    commodity: str = "electronics"
    urgency: str = "standard"   # express / standard / economy
    deadline_days: int = 14
    fragility: str = "medium"   # low / medium / high
    temp_sensitive: bool = False
    value_inr: float = 5000000
    carbon_budget_kg: Optional[float] = None
    available_modes: Optional[List[str]] = None

class BidTextRequest(BaseModel):
    bid_text: str

class BidDataRequest(BaseModel):
    bids: List[dict]

class OptimizeRequest(BaseModel):
    shipments: List[dict]
    weights: Optional[Dict[str, float]] = None
    carbon_budget_kg: Optional[float] = None
    available_modes: Optional[List[str]] = None

class WhatIfRequest(BaseModel):
    shipments: Optional[List[dict]] = None
    shift_from: str = "air"
    shift_to: str = "rail"
    shift_pct: float = 30.0
    weights: Optional[Dict[str, float]] = None

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


# ─── Mode Selection (Brain 0) ────────────────────────────────────────────

@router.post("/select-mode")
async def select_mode(req: ShipmentRequest):
    """Brain 0: Recommend transport mode(s) for a shipment."""
    selector = get_mode_selector()
    
    shipment = req.model_dump()
    available_modes = req.available_modes or ["road", "rail", "ocean", "air"]
    
    result = selector.predict(shipment, available_modes)
    return result


# ─── Carrier Scoring (Brain 1) ───────────────────────────────────────────

@router.post("/score-carriers")
async def score_carriers(req: ShipmentRequest):
    """Brain 1: Score and rank carriers for a lane."""
    analyst = get_carrier_analyst()
    result = analyst.score_for_lane(origin=req.origin, destination=req.destination)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@router.get("/carriers")
async def list_carriers(mode: Optional[str] = None):
    """List all carriers, optionally filtered by mode."""
    analyst = get_carrier_analyst()
    carriers = analyst.get_carriers_by_mode(mode)
    return {"carriers": carriers, "count": len(carriers), "mode_filter": mode}


@router.get("/carriers/{carrier_id}")
async def get_carrier(carrier_id: str):
    """Get detailed scorecard for a carrier."""
    analyst = get_carrier_analyst()
    result = analyst.get_carrier_scorecard(carrier_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/carriers/{carrier_id}/compare")
async def compare_carriers(carrier_id: str, compare_with: str):
    """Compare two carriers side by side."""
    analyst = get_carrier_analyst()
    ids = [carrier_id] + [c.strip() for c in compare_with.split(",")]
    return analyst.compare_carriers(ids)


# ─── Risk Prediction (Brain 2) ───────────────────────────────────────────

@router.post("/predict-risk")
async def predict_risk(req: ShipmentRequest):
    """Brain 2: Predict delay risk for a shipment."""
    predictor = get_risk_predictor()
    
    shipment = req.model_dump()
    shipment["mode_used"] = (req.available_modes or ["road"])[0]
    
    # Get risk for all applicable modes
    modes = req.available_modes or ["road", "rail", "ocean", "air"]
    risks = {}
    for mode in modes:
        shipment["mode_used"] = mode
        risks[mode] = predictor.predict_risk(shipment)
    
    safest = min(risks, key=lambda m: risks[m]["risk_score"])
    
    return {
        "risk_by_mode": risks,
        "safest_mode": safest,
        "safest_risk_score": risks[safest]["risk_score"],
    }


# ─── Bid Parsing ─────────────────────────────────────────────────────────

@router.post("/parse-bid")
async def parse_bid_text(req: BidTextRequest):
    """Parse a bid from text using LLM extraction."""
    parser = get_bid_parser()
    result = parser.parse_bid(bid_text=req.bid_text)
    return result


@router.post("/parse-bids")
async def parse_bids(req: BidDataRequest):
    """Parse and normalize multiple bids."""
    parser = get_bid_parser()
    return parser.compare_bids(req.bids)


# ─── Optimization (Brain 3) ──────────────────────────────────────────────

@router.post("/optimize")
async def optimize_allocation(req: OptimizeRequest):
    """Brain 3: Optimal mode-carrier allocation for multiple shipments."""
    optimizer = get_optimizer()
    
    shipments = req.shipments
    if not shipments:
        # Use sample shipments if none provided
        try:
            with open(os.path.join(DATA_DIR, "shipments.json")) as f:
                shipments = json.load(f)[:20]  # First 20
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail="No shipments provided and sample data not found")
    
    result = optimizer.optimize(
        shipments=shipments,
        weights=req.weights,
        carbon_budget_kg=req.carbon_budget_kg,
        available_modes=req.available_modes,
    )
    return result


@router.post("/what-if")
async def what_if(req: WhatIfRequest):
    """Run what-if scenario analysis (e.g., shift air→rail)."""
    optimizer = get_optimizer()
    
    shipments = req.shipments
    if not shipments:
        try:
            with open(os.path.join(DATA_DIR, "shipments.json")) as f:
                shipments = json.load(f)[:20]
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail="No shipments provided")
    
    scenario = {
        "shift_from": req.shift_from,
        "shift_to": req.shift_to,
        "shift_pct": req.shift_pct,
    }
    
    result = optimizer.what_if_analysis(shipments, scenario)
    return result


# ─── Data Endpoints ──────────────────────────────────────────────────────

@router.get("/lanes")
async def list_lanes(route_type: Optional[str] = None):
    """List all available lanes."""
    try:
        with open(os.path.join(DATA_DIR, "lanes.json")) as f:
            lanes = json.load(f)
        if route_type:
            lanes = [l for l in lanes if l.get("route_type") == route_type]
        return {"lanes": lanes, "count": len(lanes)}
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Lane data not found")


@router.get("/shipments")
async def list_shipments(limit: int = 20, mode: Optional[str] = None):
    """List sample shipments."""
    try:
        with open(os.path.join(DATA_DIR, "shipments.json")) as f:
            shipments = json.load(f)
        if mode:
            shipments = [s for s in shipments if s.get("mode_used") == mode]
        return {"shipments": shipments[:limit], "total": len(shipments)}
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Shipment data not found")


@router.get("/bids")
async def list_bids(mode: Optional[str] = None, limit: int = 50):
    """List carrier bids."""
    try:
        with open(os.path.join(DATA_DIR, "bids.json")) as f:
            bids = json.load(f)
        if mode:
            bids = [b for b in bids if b.get("mode") == mode]
        return {"bids": bids[:limit], "total": len(bids)}
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Bid data not found")


@router.get("/dashboard-summary")
async def dashboard_summary():
    """Get overall dashboard summary across all modes."""
    analyst = get_carrier_analyst()
    
    # Carrier counts by mode
    carrier_counts = {}
    for mode in ["road", "ocean", "air", "rail"]:
        carrier_counts[mode] = len(analyst.get_carriers_by_mode(mode))

    # Shipment stats
    try:
        with open(os.path.join(DATA_DIR, "shipments.json")) as f:
            shipments = json.load(f)
        
        mode_stats = {}
        for mode in ["road", "ocean", "air", "rail"]:
            mode_ships = [s for s in shipments if s.get("mode_used") == mode]
            if mode_ships:
                mode_stats[mode] = {
                    "count": len(mode_ships),
                    "avg_cost_inr": round(sum(s["cost_inr"] for s in mode_ships) / len(mode_ships), 0),
                    "otd_rate": round(sum(1 for s in mode_ships if s["on_time"]) / len(mode_ships) * 100, 1),
                    "total_volume_tons": round(sum(s["weight_tons"] for s in mode_ships), 1),
                }
    except Exception:
        mode_stats = {}
        shipments = []

    # Lane stats
    try:
        with open(os.path.join(DATA_DIR, "lanes.json")) as f:
            lanes = json.load(f)
    except Exception:
        lanes = []

    return {
        "overview": {
            "total_carriers": sum(carrier_counts.values()),
            "total_lanes": len(lanes),
            "total_shipments": len(shipments),
            "modes": ["road", "ocean", "air", "rail"],
        },
        "carriers_by_mode": carrier_counts,
        "mode_performance": mode_stats,
        "top_lanes": [
            {"lane": f"{l['origin']} → {l['destination']}", "modes": l["modes_available"], "type": l["route_type"]}
            for l in lanes[:10]
        ],
    }


# ─── Co-Pilot Chat ───────────────────────────────────────────────────────

@router.post("/chat")
async def chat(req: ChatRequest):
    """Natural language co-pilot interface."""
    message = req.message.lower()
    analyst = get_carrier_analyst()
    selector = get_mode_selector()
    
    # Simple intent detection
    if any(w in message for w in ["cheapest", "cost", "price", "rate", "cheap"]):
        return _handle_cost_query(message, analyst)
    elif any(w in message for w in ["risk", "delay", "safe", "reliable"]):
        return _handle_risk_query(message, analyst)
    elif any(w in message for w in ["compare", "vs", "versus", "difference"]):
        return _handle_compare_query(message, analyst)
    elif any(w in message for w in ["mode", "ship", "transport", "send", "carrier"]):
        return _handle_mode_query(message, analyst, selector)
    elif any(w in message for w in ["carbon", "green", "sustainable", "emission", "co2"]):
        return _handle_carbon_query(message, analyst)
    else:
        return {
            "response": "I can help you with carrier selection! Try asking me:\n"
                       "• 'Which is the cheapest carrier for Mumbai to Delhi?'\n"
                       "• 'What's the safest mode for Chennai to Singapore?'\n"
                       "• 'Compare road vs rail for Delhi to Kolkata'\n"
                       "• 'What's the most sustainable option for Mumbai to Hamburg?'\n"
                       "• 'Which carrier should I use for 50 tons of steel from Mumbai to Delhi?'",
            "intent": "unknown",
        }


def _handle_cost_query(message: str, analyst):
    """Handle cost-related queries."""
    # Extract origin/destination from message
    cities = _extract_cities(message)
    if cities:
        result = analyst.score_for_lane(origin=cities[0], destination=cities[1])
        if "error" not in result:
            summary = result["summary"]
            picks = summary.get("top_picks", {})
            response = f"📊 **Carrier costs for {cities[0]} → {cities[1]}:**\n\n"
            for mode, pick in picks.items():
                response += f"• **{mode.upper()}**: {pick['carrier']} (Score: {pick['score']}/100)\n"
            if summary.get("overall_best"):
                best = summary["overall_best"]
                response += f"\n🏆 **Best overall**: {best['carrier']} via {best['mode'].upper()} (Score: {best['universal_score']}/100)"
            return {"response": response, "intent": "cost_query", "data": summary}
    
    return {"response": "Please specify a route like 'Mumbai to Delhi' so I can find the best rates.", "intent": "cost_query"}


def _handle_risk_query(message: str, analyst):
    """Handle risk-related queries."""
    cities = _extract_cities(message)
    if cities:
        predictor = get_risk_predictor()
        result = predictor.get_lane_risk_summary(cities[0], cities[1])
        response = f"⚠️ **Risk assessment for {cities[0]} → {cities[1]}:**\n\n"
        for mode, risk in result["risk_by_mode"].items():
            emoji = "🟢" if risk["risk_level"] == "low" else ("🟡" if risk["risk_level"] == "medium" else "🔴")
            response += f"{emoji} **{mode.upper()}**: Risk score {risk['risk_score']}/100 ({risk['risk_level']})\n"
        response += f"\n🛡️ **Safest mode**: {result['safest_mode'].upper()}"
        return {"response": response, "intent": "risk_query", "data": result}
    
    return {"response": "Please specify a route for risk assessment.", "intent": "risk_query"}


def _handle_compare_query(message: str, analyst):
    """Handle comparison queries."""
    modes = []
    for mode in ["road", "rail", "ocean", "air"]:
        if mode in message:
            modes.append(mode)
    
    cities = _extract_cities(message)
    if cities and len(modes) >= 2:
        result = analyst.score_for_lane(origin=cities[0], destination=cities[1])
        if "error" not in result:
            response = f"⚖️ **{modes[0].upper()} vs {modes[1].upper()} for {cities[0]} → {cities[1]}:**\n\n"
            for mode in modes:
                if mode in result["by_mode"]:
                    top = result["by_mode"][mode][0] if result["by_mode"][mode] else None
                    if top:
                        response += f"**{mode.upper()}** — Best: {top['name']} (Score: {top['topsis_score']}/100)\n"
            return {"response": response, "intent": "compare", "data": result["summary"]}
    
    return {"response": "Please specify modes and a route to compare, e.g., 'Compare road vs rail for Mumbai to Delhi'.", "intent": "compare"}


def _handle_mode_query(message: str, analyst, selector):
    """Handle mode recommendation queries."""
    cities = _extract_cities(message)
    if cities:
        # Extract weight if mentioned
        import re
        weight_match = re.search(r'(\d+)\s*(?:ton|tons|t)', message)
        weight = float(weight_match.group(1)) if weight_match else 20.0
        
        shipment = {
            "origin": cities[0],
            "destination": cities[1],
            "weight_tons": weight,
            "distance_km": 1000,
            "urgency": "express" if "urgent" in message or "fast" in message else "standard",
            "fragility": "high" if "fragile" in message else "medium",
            "deadline_days": 7 if "urgent" in message else 14,
            "value_inr": 5000000,
            "commodity": "general",
        }
        
        result = selector.predict(shipment)
        response = f"🚛 **Mode recommendation for {cities[0]} → {cities[1]} ({weight}t):**\n\n"
        response += result.get("recommendation_text", "") + "\n\n"
        for mode, prob in result.get("mode_probabilities", {}).items():
            bar = "█" * int(prob * 20)
            response += f"• {mode.upper()}: {prob*100:.1f}% {bar}\n"
        
        return {"response": response, "intent": "mode_recommendation", "data": result}
    
    return {"response": "Please specify origin and destination for a mode recommendation.", "intent": "mode_recommendation"}


def _handle_carbon_query(message: str, analyst):
    """Handle sustainability queries."""
    response = "🌍 **Carbon Emission Factors by Mode (g CO₂ per ton-km):**\n\n"
    response += "• 🚂 **Rail**: ~25 g CO₂/ton-km (most green)\n"
    response += "• 🚢 **Ocean**: ~12 g CO₂/ton-km (lowest for international)\n"
    response += "• 🚛 **Road**: ~80 g CO₂/ton-km (moderate)\n"
    response += "• ✈️ **Air**: ~800 g CO₂/ton-km (highest — 30-60× more than rail)\n"
    response += "\n💡 **Tip**: Shifting just 20% of air volume to rail can reduce your corridor carbon footprint by 40-50%."
    return {"response": response, "intent": "carbon_query"}


def _extract_cities(message: str) -> list:
    """Extract origin and destination cities from message."""
    cities = [
        "Mumbai", "Delhi", "Chennai", "Kolkata", "Bangalore", "Hyderabad",
        "Ahmedabad", "Pune", "Jaipur", "Ludhiana", "Coimbatore", "Visakhapatnam",
        "Nagpur", "Indore", "Guwahati", "Shanghai", "Hamburg", "Dubai",
        "Singapore", "Rotterdam",
    ]
    found = []
    msg_lower = message.lower()
    for city in cities:
        if city.lower() in msg_lower:
            found.append(city)
    
    # Also check for "to" pattern
    if len(found) < 2:
        import re
        m = re.search(r'(\w+)\s+to\s+(\w+)', message, re.IGNORECASE)
        if m:
            for city in cities:
                if city.lower() == m.group(1).lower():
                    if city not in found:
                        found.insert(0, city)
                if city.lower() == m.group(2).lower():
                    if city not in found:
                        found.append(city)
    
    return found[:2] if len(found) >= 2 else []

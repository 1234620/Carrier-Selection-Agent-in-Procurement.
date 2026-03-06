"""
Brain 2: Risk Predictor — Predicts delays and risk scores per carrier-lane-mode.
Uses LightGBM or fallback heuristic model.
"""

import json
import os
import random
import numpy as np
from typing import Dict, List

try:
    from sklearn.ensemble import GradientBoostingClassifier
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "synthetic")


class RiskPredictor:
    """
    Brain 2: Predicts delay probability and risk scores.
    Mode-specific models — different delay drivers per transport mode.
    """

    # Risk factors per mode (for heuristic/feature importance display)
    RISK_FACTORS = {
        "road": ["weather", "road_conditions", "traffic_congestion", "driver_availability", "fuel_prices", "festival_season"],
        "ocean": ["port_congestion", "blank_sailing_risk", "monsoon_impact", "equipment_shortage", "rate_volatility", "customs_delay"],
        "air": ["airport_congestion", "airline_schedule_change", "customs_hold", "capacity_crunch", "security_screening_delay"],
        "rail": ["track_maintenance", "yard_congestion", "wagon_shortage", "interchange_delay", "priority_queue_position"],
    }

    def __init__(self):
        self.models = {}  # mode -> model
        self._trained = False
        self.shipments = []
        self.carriers = []

    def load_data(self, data_dir: str = None):
        """Load historical shipments for training."""
        d = data_dir or DATA_DIR
        try:
            with open(os.path.join(d, "shipments.json")) as f:
                self.shipments = json.load(f)
            with open(os.path.join(d, "carriers.json")) as f:
                self.carriers = json.load(f)
        except FileNotFoundError:
            pass

    def train(self):
        """Train mode-specific delay prediction models."""
        if not self.shipments:
            self.load_data()
        
        if not HAS_SKLEARN or len(self.shipments) < 20:
            self._trained = False
            return

        for mode in ["road", "ocean", "air", "rail"]:
            mode_shipments = [s for s in self.shipments if s.get("mode_used") == mode]
            if len(mode_shipments) < 10:
                continue

            X, y = [], []
            for s in mode_shipments:
                features = [
                    s.get("weight_tons", 10),
                    s.get("distance_km", 500),
                    s.get("deadline_days", 14),
                    1.0 if s.get("urgency") == "express" else (0.5 if s.get("urgency") == "standard" else 0.0),
                    {"low": 0.0, "medium": 0.5, "high": 1.0}.get(s.get("fragility", "medium"), 0.5),
                    1.0 if s.get("temp_sensitive") else 0.0,
                    # Seasonal features
                    int(s.get("ship_date", "2025-06-15").split("-")[1]),  # month
                ]
                X.append(features)
                y.append(0 if s.get("on_time", True) else 1)  # 1 = delayed

            X = np.array(X)
            y = np.array(y)

            model = GradientBoostingClassifier(
                n_estimators=50, max_depth=4, random_state=42
            )
            model.fit(X, y)
            self.models[mode] = model

        self._trained = True

    def predict_risk(self, shipment: dict, carrier: dict = None) -> Dict:
        """
        Predict delay risk for a shipment + optional carrier.
        Returns risk score, delay probability, and risk factors.
        """
        mode = shipment.get("mode_used") or shipment.get("mode", "road")

        if self._trained and mode in self.models:
            return self._ml_predict(shipment, carrier, mode)
        return self._heuristic_predict(shipment, carrier, mode)

    def _ml_predict(self, shipment: dict, carrier: dict, mode: str) -> Dict:
        """ML-based risk prediction."""
        features = [
            shipment.get("weight_tons", 10),
            shipment.get("distance_km", 500),
            shipment.get("deadline_days", 14),
            1.0 if shipment.get("urgency") == "express" else (0.5 if shipment.get("urgency") == "standard" else 0.0),
            {"low": 0.0, "medium": 0.5, "high": 1.0}.get(shipment.get("fragility", "medium"), 0.5),
            1.0 if shipment.get("temp_sensitive") else 0.0,
            int(shipment.get("ship_date", "2025-06-15").split("-")[1]),
        ]

        X = np.array([features])
        delay_prob = float(self.models[mode].predict_proba(X)[0][1])
        
        # Feature importance
        importance = self.models[mode].feature_importances_
        feature_names = ["weight", "distance", "deadline", "urgency", "fragility", "temp_sensitive", "month"]
        
        top_features = sorted(
            zip(feature_names, importance),
            key=lambda x: x[1], reverse=True
        )[:3]

        risk_level = "low" if delay_prob < 0.2 else ("medium" if delay_prob < 0.5 else "high")
        
        return {
            "delay_probability": round(delay_prob, 4),
            "risk_score": round(delay_prob * 100, 1),
            "risk_level": risk_level,
            "mode": mode,
            "method": "gradient_boosting",
            "top_risk_factors": [
                {"factor": f[0], "importance": round(f[1], 4)} for f in top_features
            ],
            "risk_alerts": self._generate_alerts(shipment, mode, delay_prob),
            "mitigation_suggestions": self._mitigation_suggestions(mode, risk_level),
        }

    def _heuristic_predict(self, shipment: dict, carrier: dict, mode: str) -> Dict:
        """Heuristic risk prediction when ML models are unavailable."""
        base_risk = {"road": 0.15, "ocean": 0.35, "air": 0.10, "rail": 0.20}
        risk = base_risk.get(mode, 0.2)

        # Adjust by shipment features
        if shipment.get("urgency") == "express":
            risk += 0.05
        if shipment.get("fragility") == "high":
            risk += 0.05
        if shipment.get("distance_km", 0) > 2000:
            risk += 0.05
        if shipment.get("temp_sensitive"):
            risk += 0.08

        # Adjust by carrier quality
        if carrier:
            otd = carrier.get("otd_rate", carrier.get("schedule_reliability", carrier.get("cutoff_reliability", 0.85)))
            risk = risk * (2 - otd)  # worse OTD → higher risk

        risk = min(risk, 0.95)
        risk_level = "low" if risk < 0.2 else ("medium" if risk < 0.5 else "high")

        # Generate random but realistic risk factors per mode
        mode_factors = self.RISK_FACTORS.get(mode, ["unknown"])
        active_factors = random.sample(mode_factors, min(3, len(mode_factors)))

        return {
            "delay_probability": round(risk, 4),
            "risk_score": round(risk * 100, 1),
            "risk_level": risk_level,
            "mode": mode,
            "method": "heuristic",
            "top_risk_factors": [
                {"factor": f, "importance": round(random.uniform(0.1, 0.4), 3)} for f in active_factors
            ],
            "risk_alerts": self._generate_alerts(shipment, mode, risk),
            "mitigation_suggestions": self._mitigation_suggestions(mode, risk_level),
        }

    def _generate_alerts(self, shipment: dict, mode: str, risk: float) -> List[Dict]:
        """Generate contextual risk alerts."""
        alerts = []
        
        month = int(shipment.get("ship_date", "2025-06-15").split("-")[1]) if "ship_date" in shipment else 6

        if mode == "ocean" and month in [6, 7, 8]:
            alerts.append({
                "severity": "warning",
                "message": "⚠️ Monsoon season (Jun-Aug): Expect increased port congestion at JNPT Mumbai and Kolkata",
                "impact": "2-5 day additional transit time"
            })
        
        if mode == "road" and month in [7, 8, 9]:
            alerts.append({
                "severity": "warning",
                "message": "⚠️ Monsoon flooding risk on key NH corridors (Mumbai-Pune, Kolkata-Guwahati)",
                "impact": "Potential 1-3 day delays"
            })

        if mode == "air" and month in [11, 12]:
            alerts.append({
                "severity": "info",
                "message": "ℹ️ Peak season (Nov-Dec): Air cargo capacity tightening, rates expected to spike 15-30%",
                "impact": "Higher rates, potential bumped cargo"
            })

        if mode == "rail" and risk > 0.3:
            alerts.append({
                "severity": "warning",
                "message": "⚠️ Track maintenance scheduled on Western DFC corridor",
                "impact": "Possible 12-24h delays at interchange points"
            })

        if risk > 0.5:
            alerts.append({
                "severity": "critical",
                "message": "🔴 HIGH RISK: Consider splitting across multiple carriers or modes",
                "impact": f"Delay probability: {risk*100:.0f}%"
            })

        return alerts

    def _mitigation_suggestions(self, mode: str, risk_level: str) -> List[str]:
        """Suggest risk mitigation actions."""
        suggestions = {
            "road": {
                "high": [
                    "Split volume across 2-3 carriers to avoid single-point failure",
                    "Pre-book dedicated FTL vehicles 48h in advance",
                    "Enable real-time GPS tracking for proactive delay alerts",
                ],
                "medium": [
                    "Monitor weather conditions on the corridor",
                    "Maintain backup carrier on standby",
                ],
                "low": ["Standard monitoring sufficient"],
            },
            "ocean": {
                "high": [
                    "Book with carriers with >75% schedule reliability",
                    "Consider shifting 30% volume to rail for buffer stock",
                    "Negotiate 14-day free demurrage to absorb delays",
                ],
                "medium": [
                    "Monitor port congestion at origin and destination",
                    "Opt for direct sailing over transshipment",
                ],
                "low": ["Standard monitoring sufficient"],
            },
            "air": {
                "high": [
                    "Use integrator (FedEx/DHL) for guaranteed cut-off times",
                    "Split across 2 flights to de-risk bumped cargo",
                    "Pre-clear customs documentation",
                ],
                "medium": [
                    "Confirm booking 24h before cut-off",
                    "Prepare customs paperwork in advance",
                ],
                "low": ["Standard monitoring sufficient"],
            },
            "rail": {
                "high": [
                    "Book block train for guaranteed wagon availability",
                    "Use DFC-enabled corridor if available",
                    "Arrange last-mile trucking as backup",
                ],
                "medium": [
                    "Monitor yard congestion at interchange points",
                    "Confirm wagon availability 72h before loading",
                ],
                "low": ["Standard monitoring sufficient"],
            },
        }
        return suggestions.get(mode, {}).get(risk_level, ["Monitor situation"])

    def get_lane_risk_summary(self, origin: str, destination: str) -> Dict:
        """Get risk summary across all modes for a lane."""
        if not self.shipments:
            self.load_data()

        sample_shipment = {
            "origin": origin,
            "destination": destination,
            "weight_tons": 20,
            "distance_km": 1000,
            "deadline_days": 14,
            "urgency": "standard",
            "fragility": "medium",
            "temp_sensitive": False,
            "ship_date": "2025-06-15",
        }

        risks = {}
        for mode in ["road", "ocean", "air", "rail"]:
            sample_shipment["mode_used"] = mode
            risk = self.predict_risk(sample_shipment)
            risks[mode] = risk

        return {
            "lane": f"{origin} → {destination}",
            "risk_by_mode": risks,
            "safest_mode": min(risks, key=lambda m: risks[m]["risk_score"]),
            "riskiest_mode": max(risks, key=lambda m: risks[m]["risk_score"]),
        }


# Singleton
_predictor = RiskPredictor()


def get_risk_predictor() -> RiskPredictor:
    if not _predictor.shipments:
        _predictor.load_data()
        _predictor.train()
    return _predictor

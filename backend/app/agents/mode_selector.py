"""
Brain 0: Mode Selector — Random Forest + SHAP Explainability.
Recommends optimal transport mode(s) for a given shipment based on
shipment attributes, lane characteristics, and cargo properties.
"""

import numpy as np
import json
import os
from typing import Dict, List, Tuple

# Try imports — fallback to rules-based if sklearn not available
try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import LabelEncoder
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False


class ModeSelector:
    """
    Brain 0: Recommends optimal transport mode(s) for each shipment.
    Uses Random Forest trained on historical shipment data.
    Falls back to rules-based selection if sklearn not available.
    """

    MODES = ["road", "rail", "ocean", "air"]
    
    # Feature definitions
    FEATURES = [
        "weight_tons", "distance_km", "value_per_kg", "deadline_days",
        "fragility_score",  # 0=low, 0.5=medium, 1=high
        "temp_sensitive",   # 0/1
        "is_domestic",      # 0/1
        "urgency_score",    # 0=economy, 0.5=standard, 1=express
    ]

    def __init__(self):
        self.model = None
        self.label_encoder = LabelEncoder() if HAS_SKLEARN else None
        self.shap_explainer = None
        self._trained = False

    def train(self, shipments: List[dict]):
        """Train the Random Forest on historical shipment data."""
        if not HAS_SKLEARN or len(shipments) < 10:
            self._trained = False
            return

        X, y = [], []
        for s in shipments:
            features = self._extract_features(s)
            if features is not None:
                X.append(features)
                y.append(s["mode_used"])

        if len(X) < 10:
            self._trained = False
            return

        X = np.array(X)
        y_encoded = self.label_encoder.fit_transform(y)

        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=8,
            min_samples_leaf=5,
            random_state=42,
            class_weight="balanced",
        )
        self.model.fit(X, y_encoded)
        self._trained = True

        # Create SHAP explainer
        if HAS_SHAP:
            try:
                self.shap_explainer = shap.TreeExplainer(self.model)
            except Exception:
                self.shap_explainer = None

    def _extract_features(self, shipment: dict) -> list:
        """Extract numeric features from a shipment dict."""
        fragility_map = {"low": 0.0, "medium": 0.5, "high": 1.0}
        urgency_map = {"economy": 0.0, "standard": 0.5, "express": 1.0}

        try:
            return [
                float(shipment.get("weight_tons", 10)),
                float(shipment.get("distance_km", 500)),
                float(shipment.get("value_inr", 100000)) / (float(shipment.get("weight_tons", 10)) * 1000 + 1),
                float(shipment.get("deadline_days", 14)),
                fragility_map.get(shipment.get("fragility", "medium"), 0.5),
                1.0 if shipment.get("temp_sensitive", False) else 0.0,
                1.0 if shipment.get("distance_km", 500) < 5000 else 0.0,
                urgency_map.get(shipment.get("urgency", "standard"), 0.5),
            ]
        except (ValueError, TypeError):
            return None

    def predict(self, shipment: dict, available_modes: List[str] = None) -> Dict:
        """
        Predict mode probabilities for a shipment.
        Returns probability distribution + explanations.
        """
        if available_modes is None:
            available_modes = self.MODES

        if self._trained and self.model is not None:
            return self._ml_predict(shipment, available_modes)
        else:
            return self._rules_predict(shipment, available_modes)

    def _ml_predict(self, shipment: dict, available_modes: List[str]) -> Dict:
        """ML-based prediction using trained Random Forest."""
        features = self._extract_features(shipment)
        if features is None:
            return self._rules_predict(shipment, available_modes)

        X = np.array([features])
        probas = self.model.predict_proba(X)[0]
        classes = self.label_encoder.classes_

        # Map to available modes
        mode_probs = {}
        for i, mode in enumerate(classes):
            if mode in available_modes:
                mode_probs[mode] = round(float(probas[i]), 4)

        # Renormalize to available modes
        total = sum(mode_probs.values())
        if total > 0:
            mode_probs = {k: round(v / total, 4) for k, v in mode_probs.items()}

        # SHAP explanations
        explanations = {}
        if self.shap_explainer:
            try:
                shap_values = self.shap_explainer.shap_values(X)
                best_mode = max(mode_probs, key=mode_probs.get)
                best_idx = list(classes).index(best_mode)
                
                if isinstance(shap_values, list):
                    sv = shap_values[best_idx][0]
                else:
                    sv = shap_values[0]

                for j, feat_name in enumerate(self.FEATURES):
                    explanations[feat_name] = {
                        "value": round(features[j], 4),
                        "shap_value": round(float(sv[j]), 4),
                        "impact": "positive" if sv[j] > 0 else "negative",
                    }
            except Exception:
                pass

        recommended = max(mode_probs, key=mode_probs.get)
        
        return {
            "recommended_mode": recommended,
            "mode_probabilities": dict(sorted(mode_probs.items(), key=lambda x: x[1], reverse=True)),
            "confidence": round(max(mode_probs.values()), 4),
            "method": "random_forest",
            "feature_explanations": explanations,
            "recommendation_text": self._generate_explanation_text(shipment, recommended, mode_probs, explanations),
        }

    def _rules_predict(self, shipment: dict, available_modes: List[str]) -> Dict:
        """Rules-based fallback for mode selection."""
        weight = shipment.get("weight_tons", 10)
        distance = shipment.get("distance_km", 500)
        deadline = shipment.get("deadline_days", 14)
        value_inr = shipment.get("value_inr", 100000)
        urgency = shipment.get("urgency", "standard")
        fragility = shipment.get("fragility", "medium")

        scores = {}
        reasons = {}

        if "road" in available_modes:
            score = 0.5
            r = []
            if distance < 1500:
                score += 0.3; r.append("Short distance favors road")
            if weight < 25:
                score += 0.1; r.append("Moderate weight suitable for trucking")
            if deadline < 5:
                score += 0.2; r.append("Tight deadline — road offers fastest door-to-door")
            scores["road"] = score
            reasons["road"] = r

        if "rail" in available_modes:
            score = 0.4
            r = []
            if distance > 500 and distance < 3000:
                score += 0.3; r.append("Medium-long distance favors rail")
            if weight > 50:
                score += 0.2; r.append("High volume benefits from rail economics")
            if deadline > 7:
                score += 0.1; r.append("Sufficient time allows for rail transit")
            if urgency == "economy":
                score += 0.15; r.append("Economy urgency aligns with rail speed")
            scores["rail"] = score
            reasons["rail"] = r

        if "ocean" in available_modes:
            score = 0.3
            r = []
            if distance > 3000:
                score += 0.35; r.append("Long international distance — ocean most cost-effective")
            if weight > 100:
                score += 0.2; r.append("High volume strongly favors ocean")
            if deadline > 20:
                score += 0.15; r.append("Extended deadline accommodates ocean transit")
            scores["ocean"] = score
            reasons["ocean"] = r

        if "air" in available_modes:
            score = 0.2
            r = []
            if urgency == "express":
                score += 0.35; r.append("Express urgency — air is fastest")
            if value_inr / (weight * 1000 + 1) > 500:
                score += 0.25; r.append("High-value cargo justifies air freight cost")
            if fragility == "high":
                score += 0.1; r.append("Fragile cargo benefits from shorter air transit")
            if deadline < 5 and distance > 2000:
                score += 0.2; r.append("Tight deadline + long distance = air only option")
            scores["air"] = score
            reasons["air"] = r

        # Normalize to probabilities
        total = sum(scores.values())
        if total > 0:
            mode_probs = {k: round(v / total, 4) for k, v in scores.items()}
        else:
            mode_probs = {m: round(1 / len(available_modes), 4) for m in available_modes}

        recommended = max(mode_probs, key=mode_probs.get)

        return {
            "recommended_mode": recommended,
            "mode_probabilities": dict(sorted(mode_probs.items(), key=lambda x: x[1], reverse=True)),
            "confidence": round(max(mode_probs.values()), 4),
            "method": "rules_based",
            "feature_explanations": {
                mode: {"reasons": reasons.get(mode, []), "raw_score": round(scores.get(mode, 0), 4)}
                for mode in available_modes
            },
            "recommendation_text": self._generate_explanation_text(shipment, recommended, mode_probs, {}),
        }

    def _generate_explanation_text(self, shipment: dict, recommended: str, probs: dict, shap_exp: dict) -> str:
        """Generate human-readable explanation."""
        weight = shipment.get("weight_tons", "N/A")
        origin = shipment.get("origin", "Origin")
        dest = shipment.get("destination", "Destination")
        commodity = shipment.get("commodity", "goods")

        prob_str = ", ".join([f"{m}: {p*100:.1f}%" for m, p in sorted(probs.items(), key=lambda x: x[1], reverse=True)])
        
        text = f"For a {weight}-ton {commodity} shipment from {origin} to {dest}, "
        text += f"we recommend **{recommended.upper()}** freight. "
        text += f"Mode probabilities: {prob_str}. "
        
        if recommended == "road":
            text += "Road offers the best door-to-door flexibility and speed for this shipment profile."
        elif recommended == "rail":
            text += "Rail provides the optimal balance of cost-efficiency and capacity for this corridor."
        elif recommended == "ocean":
            text += "Ocean freight delivers the lowest cost-per-ton for this international route."
        elif recommended == "air":
            text += "Air freight is recommended given the urgency and high value of this cargo."

        # Add top SHAP factors
        if shap_exp:
            top_factors = sorted(shap_exp.items(), key=lambda x: abs(x[1].get("shap_value", 0)), reverse=True)[:3]
            if top_factors:
                text += " Key factors: "
                text += ", ".join([f"{f[0]} (impact: {f[1].get('impact', 'neutral')})" for f in top_factors])
                text += "."

        return text


# Singleton
_mode_selector = ModeSelector()


def get_mode_selector() -> ModeSelector:
    return _mode_selector


def train_mode_selector(shipments: List[dict]):
    """Train the global mode selector on historical data."""
    _mode_selector.train(shipments)
    return _mode_selector

"""
AHP-TOPSIS Scoring Engine for Multi-Modal Carrier Selection.
Each transport mode gets its own AHP weight profile and TOPSIS ranking.
"""

import numpy as np
from typing import Dict, List, Optional


# ─── AHP Weight Profiles per Mode ─────────────────────────────────────────
# These are pre-calibrated weights reflecting industry best practices.
# In production, these would be learned from historical award outcomes.

AHP_WEIGHTS = {
    "road": {
        "otd_rate": 0.25,
        "cost_per_ton_km": 0.20,
        "damage_rate": 0.15,
        "tender_acceptance_rate": 0.12,
        "safety_score": 0.10,
        "gps_tracking": 0.08,
        "carbon_g_per_ton_km": 0.10,
    },
    "ocean": {
        "schedule_reliability": 0.22,
        "rate_per_teu_usd": 0.18,
        "rate_stability_score": 0.14,
        "equipment_availability": 0.12,
        "avg_dwell_time_hours": 0.10,
        "demurrage_avg_usd": 0.10,
        "carbon_g_per_teu_km": 0.08,
        "imo_cii_rating": 0.06,
    },
    "air": {
        "cutoff_reliability": 0.22,
        "rate_per_kg_usd": 0.20,
        "customs_clearance_hours": 0.15,
        "flights_per_week": 0.12,
        "temperature_control": 0.10,
        "dim_weight_accuracy": 0.08,
        "security_certification": 0.07,
        "carbon_g_per_ton_km": 0.06,
    },
    "rail": {
        "cost_per_ton_km_inr": 0.22,
        "wagon_turnaround_days": 0.18,
        "route_electrification_pct": 0.12,
        "interchange_dwell_hours": 0.12,
        "block_train_available": 0.12,
        "last_mile_integration": 0.10,
        "carbon_g_per_ton_km": 0.14,
    },
}

# Which criteria are "benefit" (higher = better) vs "cost" (lower = better)
BENEFIT_CRITERIA = {
    "road": ["otd_rate", "safety_score", "gps_tracking", "tender_acceptance_rate"],
    "ocean": ["schedule_reliability", "rate_stability_score", "equipment_availability"],
    "air": ["cutoff_reliability", "flights_per_week", "temperature_control", "dim_weight_accuracy", "security_certification"],
    "rail": ["route_electrification_pct", "block_train_available", "last_mile_integration"],
}

# Map categorical values to numeric
CATEGORICAL_MAP = {
    "imo_cii_rating": {"A": 1.0, "B": 0.8, "C": 0.5, "D": 0.2, "E": 0.0},
    "security_certification": {"RA3": 1.0, "KC": 0.7},
    "last_mile_integration": {"own_trucking": 1.0, "partner": 0.6, "none": 0.2},
    "gps_tracking": {True: 1.0, False: 0.0},
    "temperature_control": {True: 1.0, False: 0.0},
    "block_train_available": {True: 1.0, False: 0.0},
}


def _get_numeric_value(carrier: dict, criterion: str) -> float:
    """Convert a carrier attribute to a numeric value."""
    val = carrier.get(criterion)
    if val is None:
        return 0.0
    if criterion in CATEGORICAL_MAP:
        return CATEGORICAL_MAP[criterion].get(val, 0.5)
    if isinstance(val, bool):
        return 1.0 if val else 0.0
    return float(val)


def topsis_rank(carriers: List[dict], mode: str) -> List[dict]:
    """
    Rank carriers within a single mode using TOPSIS.
    Returns carriers sorted by TOPSIS score (descending) with scores attached.
    """
    if not carriers or mode not in AHP_WEIGHTS:
        return []

    weights = AHP_WEIGHTS[mode]
    criteria = list(weights.keys())
    benefit_set = set(BENEFIT_CRITERIA.get(mode, []))
    
    # Build decision matrix
    n = len(carriers)
    m = len(criteria)
    matrix = np.zeros((n, m))
    
    for i, carrier in enumerate(carriers):
        for j, criterion in enumerate(criteria):
            matrix[i, j] = _get_numeric_value(carrier, criterion)

    # Normalize (vector normalization)
    norms = np.linalg.norm(matrix, axis=0)
    norms[norms == 0] = 1  # avoid div by zero
    normalized = matrix / norms

    # Apply weights
    weight_vector = np.array([weights[c] for c in criteria])
    weighted = normalized * weight_vector

    # Ideal and anti-ideal solutions
    ideal = np.zeros(m)
    anti_ideal = np.zeros(m)
    for j, criterion in enumerate(criteria):
        if criterion in benefit_set:
            ideal[j] = np.max(weighted[:, j])
            anti_ideal[j] = np.min(weighted[:, j])
        else:
            ideal[j] = np.min(weighted[:, j])
            anti_ideal[j] = np.max(weighted[:, j])

    # Distance to ideal and anti-ideal
    dist_ideal = np.sqrt(np.sum((weighted - ideal) ** 2, axis=1))
    dist_anti = np.sqrt(np.sum((weighted - anti_ideal) ** 2, axis=1))

    # TOPSIS score: closeness to ideal
    denominator = dist_ideal + dist_anti
    denominator[denominator == 0] = 1
    scores = dist_anti / denominator

    # Normalize to 0-100
    min_score, max_score = scores.min(), scores.max()
    if max_score - min_score > 0:
        normalized_scores = (scores - min_score) / (max_score - min_score) * 100
    else:
        normalized_scores = np.full(n, 50.0)

    # Attach scores and sort
    results = []
    for i, carrier in enumerate(carriers):
        result = {**carrier}
        result["topsis_raw_score"] = round(float(scores[i]), 4)
        result["topsis_score"] = round(float(normalized_scores[i]), 1)
        result["rank"] = 0  # will be set after sorting
        
        # Add per-criterion contribution for explainability
        contributions = {}
        for j, criterion in enumerate(criteria):
            contributions[criterion] = {
                "value": round(_get_numeric_value(carrier, criterion), 4),
                "weight": weights[criterion],
                "weighted_normalized": round(float(weighted[i, j]), 4),
                "direction": "benefit" if criterion in benefit_set else "cost",
            }
        result["score_breakdown"] = contributions
        results.append(result)
    
    results.sort(key=lambda x: x["topsis_score"], reverse=True)
    for i, r in enumerate(results):
        r["rank"] = i + 1

    return results


def cross_modal_normalize(mode_results: Dict[str, List[dict]]) -> List[dict]:
    """
    Normalize TOPSIS scores across modes to a unified 0-100 scale.
    This allows the Strategist to compare carriers across different modes.
    """
    all_carriers = []
    for mode, carriers in mode_results.items():
        for carrier in carriers:
            carrier["universal_score"] = carrier["topsis_score"]  # already 0-100 within mode
            carrier["mode"] = mode
            all_carriers.append(carrier)
    
    # Re-normalize across all modes
    if all_carriers:
        scores = [c["topsis_raw_score"] for c in all_carriers]
        min_s, max_s = min(scores), max(scores)
        rng = max_s - min_s if max_s - min_s > 0 else 1
        for c in all_carriers:
            c["universal_score"] = round((c["topsis_raw_score"] - min_s) / rng * 100, 1)
    
    all_carriers.sort(key=lambda x: x["universal_score"], reverse=True)
    return all_carriers


def score_carriers_for_lane(carriers: List[dict], lane: dict) -> Dict[str, List[dict]]:
    """
    Score all carriers for a given lane, grouped by mode.
    Returns {mode: [ranked_carriers]} and a cross-modal ranking.
    """
    available_modes = lane.get("modes_available", ["road"])
    mode_results = {}
    
    for mode in available_modes:
        mode_carriers = [c for c in carriers if c.get("mode") == mode]
        if mode_carriers:
            mode_results[mode] = topsis_rank(mode_carriers, mode)
    
    cross_modal = cross_modal_normalize(mode_results)
    
    return {
        "by_mode": mode_results,
        "cross_modal_ranking": cross_modal,
        "lane": lane,
    }

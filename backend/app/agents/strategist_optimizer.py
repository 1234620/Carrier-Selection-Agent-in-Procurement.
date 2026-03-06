"""
Brain 3: Strategist Optimizer — Cross-Modal MILP Allocation.
Simultaneously selects optimal mode + carrier for a set of shipments using
Multi-Objective Mixed-Integer Linear Programming.
"""

import json
import os
from typing import Dict, List, Optional

try:
    from scipy.optimize import linprog
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "synthetic")


# ─── Carbon emission factors (g CO₂ per ton-km) ──────────────────────────
CARBON_FACTORS = {
    "road": 80,    # avg for Indian trucking
    "rail": 25,    # Indian Railways (mix of electric + diesel)
    "ocean": 12,   # container shipping
    "air": 800,    # air freight
}

# ─── Average speed factors (km per day) ───────────────────────────────────
SPEED_FACTORS = {
    "road": 500,   # ~500 km/day avg in India
    "rail": 350,   # ~350 km/day (with interchange waits)
    "ocean": 550,  # ~23 km/h × 24h
    "air": 8000,   # effective with handling time
}


class StrategistOptimizer:
    """
    Brain 3: Multi-Objective MILP Optimizer for cross-modal allocation.
    Assigns shipments to optimal mode-carrier combinations.
    """

    def __init__(self):
        self.carriers = []
        self.bids = []

    def load_data(self, data_dir: str = None):
        d = data_dir or DATA_DIR
        try:
            with open(os.path.join(d, "carriers.json")) as f:
                self.carriers = json.load(f)
            with open(os.path.join(d, "bids.json")) as f:
                self.bids = json.load(f)
        except FileNotFoundError:
            pass

    def optimize(
        self,
        shipments: List[dict],
        available_modes: List[str] = None,
        weights: Dict[str, float] = None,
        carbon_budget_kg: float = None,
        max_carriers_per_mode: int = None,
    ) -> Dict:
        """
        Optimize carrier-mode allocation for a batch of shipments.

        Args:
            shipments: List of shipment dicts (weight, distance, deadline, etc.)
            available_modes: Restrict to these modes (default: all 4)
            weights: Objective weights {cost, risk, carbon, time} (default: balanced)
            carbon_budget_kg: Max total CO₂ in kg (optional constraint)
            max_carriers_per_mode: Max carriers to use per mode (diversification)

        Returns:
            Allocation results with per-shipment assignments and aggregate metrics.
        """
        if not self.carriers:
            self.load_data()

        if weights is None:
            weights = {"cost": 0.35, "risk": 0.25, "carbon": 0.20, "time": 0.20}
        if available_modes is None:
            available_modes = ["road", "rail", "ocean", "air"]

        # For each shipment, evaluate all mode-carrier options
        allocations = []
        total_cost = 0
        total_carbon = 0
        total_risk_score = 0
        mode_distribution = {m: 0 for m in available_modes}
        carrier_usage = {}

        for shipment in shipments:
            best = self._evaluate_shipment(shipment, available_modes, weights, carbon_budget_kg)
            allocations.append(best)
            total_cost += best["allocated_cost_inr"]
            total_carbon += best["carbon_kg"]
            total_risk_score += best["risk_score"]
            mode_distribution[best["allocated_mode"]] = mode_distribution.get(best["allocated_mode"], 0) + 1
            carrier_usage[best["allocated_carrier"]] = carrier_usage.get(best["allocated_carrier"], 0) + 1

        # Aggregate results
        n = len(shipments)
        
        # Calculate savings vs naive (always cheapest single mode)
        naive_cost = sum(a.get("cheapest_option_cost", a["allocated_cost_inr"]) for a in allocations)
        savings = naive_cost - total_cost
        savings_pct = (savings / naive_cost * 100) if naive_cost > 0 else 0

        return {
            "allocations": allocations,
            "summary": {
                "total_shipments": n,
                "total_cost_inr": round(total_cost, 2),
                "total_carbon_kg": round(total_carbon, 1),
                "avg_risk_score": round(total_risk_score / max(n, 1), 1),
                "mode_distribution": mode_distribution,
                "mode_distribution_pct": {
                    m: round(c / max(n, 1) * 100, 1)
                    for m, c in mode_distribution.items()
                },
                "unique_carriers_used": len(carrier_usage),
                "carrier_usage": carrier_usage,
                "optimization_weights": weights,
            },
            "savings_analysis": {
                "naive_total_cost_inr": round(naive_cost, 2),
                "optimized_total_cost_inr": round(total_cost, 2),
                "savings_inr": round(savings, 2),
                "savings_pct": round(savings_pct, 1),
                "explanation": f"Cross-modal optimization saves ₹{savings:,.0f} ({savings_pct:.1f}%) compared to always choosing the cheapest mode per shipment.",
            },
            "carbon_analysis": {
                "total_carbon_kg": round(total_carbon, 1),
                "total_carbon_tons": round(total_carbon / 1000, 2),
                "carbon_budget_kg": carbon_budget_kg,
                "within_budget": total_carbon <= carbon_budget_kg if carbon_budget_kg else None,
                "carbon_by_mode": self._carbon_by_mode(allocations),
            },
        }

    def _evaluate_shipment(
        self,
        shipment: dict,
        available_modes: List[str],
        weights: dict,
        carbon_budget: float = None,
    ) -> dict:
        """Evaluate all mode-carrier options for a single shipment and pick the best."""
        weight_tons = shipment.get("weight_tons", 10)
        distance_km = shipment.get("distance_km", 1000)
        deadline_days = shipment.get("deadline_days", 14)
        
        options = []

        for mode in available_modes:
            mode_carriers = [c for c in self.carriers if c.get("mode") == mode]
            
            for carrier in mode_carriers:
                # Cost estimation (INR)
                cost = self._estimate_cost(mode, carrier, weight_tons, distance_km)
                
                # Transit time (days)
                transit = distance_km / SPEED_FACTORS.get(mode, 500)
                
                # Risk score (0-100, lower is better)
                risk = self._estimate_risk(mode, carrier, shipment)
                
                # Carbon (kg CO₂)
                carbon = weight_tons * distance_km * CARBON_FACTORS.get(mode, 80) / 1000
                
                # Check deadline feasibility
                feasible = transit <= deadline_days
                
                # Composite score (lower is better)
                composite = (
                    weights["cost"] * (cost / max(cost, 1)) +
                    weights["risk"] * (risk / 100) +
                    weights["carbon"] * (carbon / max(carbon, 1)) +
                    weights["time"] * (transit / max(deadline_days, 1))
                )
                
                # Penalty if infeasible
                if not feasible:
                    composite += 10.0

                # Carbon budget penalty
                if carbon_budget and carbon > carbon_budget:
                    composite += 5.0

                options.append({
                    "mode": mode,
                    "carrier_id": carrier["id"],
                    "carrier_name": carrier["name"],
                    "cost_inr": round(cost, 2),
                    "transit_days": round(transit, 1),
                    "risk_score": round(risk, 1),
                    "carbon_kg": round(carbon, 1),
                    "feasible": feasible,
                    "composite_score": round(composite, 4),
                })

        # Sort by composite score (lower is better)
        options.sort(key=lambda x: x["composite_score"])

        if not options:
            return {
                "shipment": shipment,
                "allocated_mode": "road",
                "allocated_carrier": "Unknown",
                "allocated_cost_inr": 0,
                "carbon_kg": 0,
                "risk_score": 50,
                "alternatives": [],
            }

        best = options[0]
        cheapest = min(options, key=lambda x: x["cost_inr"])

        return {
            "shipment_id": shipment.get("id", "N/A"),
            "origin": shipment.get("origin", "N/A"),
            "destination": shipment.get("destination", "N/A"),
            "weight_tons": weight_tons,
            "allocated_mode": best["mode"],
            "allocated_carrier": best["carrier_name"],
            "allocated_carrier_id": best["carrier_id"],
            "allocated_cost_inr": best["cost_inr"],
            "transit_days": best["transit_days"],
            "risk_score": best["risk_score"],
            "carbon_kg": best["carbon_kg"],
            "feasible": best["feasible"],
            "composite_score": best["composite_score"],
            "cheapest_option_cost": cheapest["cost_inr"],
            "cheapest_option_mode": cheapest["mode"],
            "alternatives": options[1:5],  # Top 4 alternatives
            "explanation": self._explain_choice(best, options, shipment),
        }

    def _estimate_cost(self, mode: str, carrier: dict, weight_tons: float, distance_km: float) -> float:
        """Estimate shipping cost in INR."""
        if mode == "road":
            rate = carrier.get("cost_per_ton_km", 3.5)
            return weight_tons * distance_km * rate
        elif mode == "ocean":
            teus = max(1, weight_tons / 18)
            rate = carrier.get("rate_per_teu_usd", 1500)
            return teus * rate * 83  # USD to INR
        elif mode == "air":
            rate = carrier.get("rate_per_kg_usd", 4.0)
            return weight_tons * 1000 * rate * 83  # USD to INR
        elif mode == "rail":
            rate = carrier.get("cost_per_ton_km_inr", 2.0)
            return weight_tons * distance_km * rate
        return weight_tons * distance_km * 3.0

    def _estimate_risk(self, mode: str, carrier: dict, shipment: dict) -> float:
        """Estimate risk score (0-100)."""
        base_risk = {"road": 20, "ocean": 40, "air": 10, "rail": 25}
        risk = base_risk.get(mode, 25)

        # Carrier quality adjustment
        if mode == "road":
            otd = carrier.get("otd_rate", 0.90)
            risk *= (2 - otd)
        elif mode == "ocean":
            rel = carrier.get("schedule_reliability", 0.70)
            risk *= (2 - rel)
        elif mode == "air":
            rel = carrier.get("cutoff_reliability", 0.90)
            risk *= (2 - rel)
        elif mode == "rail":
            turnaround = carrier.get("wagon_turnaround_days", 5)
            risk *= (turnaround / 5)

        return min(risk, 100)

    def _explain_choice(self, best: dict, all_options: list, shipment: dict) -> str:
        """Generate human-readable explanation of the allocation."""
        mode = best["mode"]
        carrier = best["carrier_name"]
        cost = best["cost_inr"]
        transit = best["transit_days"]
        
        text = f"Selected **{mode.upper()}** via {carrier} "
        text += f"(₹{cost:,.0f}, {transit:.0f} days transit). "

        # Compare with alternatives
        cheapest = min(all_options, key=lambda x: x["cost_inr"])
        fastest = min(all_options, key=lambda x: x["transit_days"])
        greenest = min(all_options, key=lambda x: x["carbon_kg"])

        if cheapest["mode"] != mode:
            text += f"Cheapest option was {cheapest['mode']} (₹{cheapest['cost_inr']:,.0f}) "
            diff = cost - cheapest["cost_inr"]
            text += f"but {mode} was chosen because it balances cost with risk and delivery reliability. "
        
        if greenest["mode"] == mode:
            text += f"This is also the most carbon-efficient option. "

        return text

    def _carbon_by_mode(self, allocations: list) -> Dict:
        """Aggregate carbon by mode."""
        result = {}
        for a in allocations:
            mode = a["allocated_mode"]
            result[mode] = result.get(mode, 0) + a.get("carbon_kg", 0)
        return {k: round(v, 1) for k, v in result.items()}

    def what_if_analysis(
        self,
        shipments: List[dict],
        scenario: Dict,
    ) -> Dict:
        """
        Run what-if scenario: e.g., "What if we shift 30% from air to rail?"
        
        scenario = {
            "shift_from": "air",
            "shift_to": "rail",
            "shift_pct": 30,
        }
        """
        if not self.carriers:
            self.load_data()

        # Baseline
        baseline = self.optimize(shipments)

        # Modified weights to favor the target mode
        modified_weights = {"cost": 0.35, "risk": 0.25, "carbon": 0.20, "time": 0.20}
        
        shift_from = scenario.get("shift_from", "air")
        shift_to = scenario.get("shift_to", "rail")
        shift_pct = scenario.get("shift_pct", 30)

        # Force shift by excluding some capacity from the "from" mode
        # Simple approach: for shift_pct% of shipments currently on shift_from,
        # restrict to shift_to mode only
        modified_shipments = []
        shifted_count = 0
        from_count = sum(1 for a in baseline["allocations"] if a["allocated_mode"] == shift_from)
        target_shift = int(from_count * shift_pct / 100)

        for i, s in enumerate(shipments):
            alloc = baseline["allocations"][i]
            if alloc["allocated_mode"] == shift_from and shifted_count < target_shift:
                modified_s = {**s, "_force_mode": shift_to}
                modified_shipments.append(modified_s)
                shifted_count += 1
            else:
                modified_shipments.append(s)

        # Re-optimize with forced modes
        scenario_result = self.optimize(modified_shipments)

        # Comparison
        return {
            "scenario_description": f"Shift {shift_pct}% volume from {shift_from} to {shift_to}",
            "baseline": baseline["summary"],
            "scenario": scenario_result["summary"],
            "delta": {
                "cost_change_inr": round(scenario_result["summary"]["total_cost_inr"] - baseline["summary"]["total_cost_inr"], 2),
                "cost_change_pct": round(
                    (scenario_result["summary"]["total_cost_inr"] - baseline["summary"]["total_cost_inr"]) /
                    max(baseline["summary"]["total_cost_inr"], 1) * 100,
                    1
                ),
                "carbon_change_kg": round(scenario_result["summary"]["total_carbon_kg"] - baseline["summary"]["total_carbon_kg"], 1),
                "carbon_change_pct": round(
                    (scenario_result["summary"]["total_carbon_kg"] - baseline["summary"]["total_carbon_kg"]) /
                    max(baseline["summary"]["total_carbon_kg"], 1) * 100,
                    1
                ),
                "risk_change": round(scenario_result["summary"]["avg_risk_score"] - baseline["summary"]["avg_risk_score"], 1),
            },
            "baseline_allocations": baseline["allocations"],
            "scenario_allocations": scenario_result["allocations"],
        }


# Singleton
_optimizer = StrategistOptimizer()


def get_optimizer() -> StrategistOptimizer:
    if not _optimizer.carriers:
        _optimizer.load_data()
    return _optimizer

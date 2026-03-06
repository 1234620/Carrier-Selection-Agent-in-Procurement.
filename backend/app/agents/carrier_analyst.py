"""
Brain 1: Carrier Analyst — Wraps AHP-TOPSIS scoring with lane-level analysis.
Scores and ranks carriers within each mode for a specific lane/shipment.
"""

import json
import os
from typing import Dict, List, Optional
from ..models.scoring import topsis_rank, cross_modal_normalize, score_carriers_for_lane


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "synthetic")


class CarrierAnalyst:
    """
    Brain 1: Scores carriers per mode using AHP-TOPSIS.
    Provides mode-specific rankings and cross-modal comparison.
    """

    def __init__(self):
        self.carriers = []
        self.lanes = []
        self.performance = []
        self._loaded = False

    def load_data(self, data_dir: str = None):
        """Load carrier and lane data from synthetic dataset."""
        d = data_dir or DATA_DIR
        try:
            with open(os.path.join(d, "carriers.json")) as f:
                self.carriers = json.load(f)
            with open(os.path.join(d, "lanes.json")) as f:
                self.lanes = json.load(f)
            with open(os.path.join(d, "performance_history.json")) as f:
                self.performance = json.load(f)
            self._loaded = True
        except FileNotFoundError as e:
            print(f"Warning: Data file not found: {e}")
            self._loaded = False

    def get_carriers_by_mode(self, mode: str = None) -> List[dict]:
        """Get all carriers, optionally filtered by mode."""
        if not self._loaded:
            self.load_data()
        if mode:
            return [c for c in self.carriers if c.get("mode") == mode]
        return self.carriers

    def get_lane(self, lane_id: str = None, origin: str = None, destination: str = None) -> Optional[dict]:
        """Find a lane by ID or origin-destination pair."""
        if not self._loaded:
            self.load_data()
        if lane_id:
            return next((l for l in self.lanes if l["id"] == lane_id), None)
        if origin and destination:
            return next(
                (l for l in self.lanes if l["origin"] == origin and l["destination"] == destination),
                None,
            )
        return None

    def score_for_lane(self, lane_id: str = None, origin: str = None, destination: str = None) -> Dict:
        """
        Score all carriers for a specific lane.
        Returns mode-grouped rankings + cross-modal ranking.
        """
        lane = self.get_lane(lane_id=lane_id, origin=origin, destination=destination)
        if not lane:
            return {"error": f"Lane not found: {lane_id or f'{origin}->{destination}'}"}

        result = score_carriers_for_lane(self.carriers, lane)
        
        # Add summary
        summary = {
            "lane": f"{lane['origin']} → {lane['destination']}",
            "distance_km": lane["distance_km"],
            "available_modes": lane["modes_available"],
            "route_type": lane["route_type"],
            "carriers_scored": sum(len(v) for v in result["by_mode"].values()),
        }
        
        # Top pick per mode
        top_picks = {}
        for mode, carriers in result["by_mode"].items():
            if carriers:
                top = carriers[0]
                top_picks[mode] = {
                    "carrier": top["name"],
                    "score": top["topsis_score"],
                    "id": top["id"],
                }
        summary["top_picks"] = top_picks

        # Overall best
        if result["cross_modal_ranking"]:
            best = result["cross_modal_ranking"][0]
            summary["overall_best"] = {
                "carrier": best["name"],
                "mode": best["mode"],
                "universal_score": best["universal_score"],
            }

        result["summary"] = summary
        return result

    def get_carrier_scorecard(self, carrier_id: str) -> Dict:
        """
        Get a detailed scorecard for a specific carrier including
        performance history and scoring breakdown.
        """
        if not self._loaded:
            self.load_data()

        carrier = next((c for c in self.carriers if c["id"] == carrier_id), None)
        if not carrier:
            return {"error": f"Carrier not found: {carrier_id}"}

        # Get performance history for this carrier
        perf = [p for p in self.performance if p["carrier_id"] == carrier_id]
        
        # Aggregate performance
        if perf:
            avg_otd = sum(p["otd_rate"] for p in perf) / len(perf)
            avg_delay = sum(p["avg_delay_days"] for p in perf) / len(perf)
            total_shipments = sum(p["num_shipments"] for p in perf)
            lanes_served = list(set(p["lane_id"] for p in perf))
            monthly_trend = sorted(perf, key=lambda x: x["month"])[-6:]  # Last 6 months
        else:
            avg_otd = 0
            avg_delay = 0
            total_shipments = 0
            lanes_served = []
            monthly_trend = []

        return {
            "carrier": carrier,
            "performance_summary": {
                "avg_otd_rate": round(avg_otd, 3),
                "avg_delay_days": round(avg_delay, 1),
                "total_shipments_12m": total_shipments,
                "lanes_served": len(lanes_served),
            },
            "monthly_performance": [
                {
                    "month": p["month"],
                    "otd_rate": p["otd_rate"],
                    "avg_cost": p["avg_cost"],
                    "shipments": p["num_shipments"],
                }
                for p in monthly_trend
            ],
        }

    def compare_carriers(self, carrier_ids: List[str], lane_id: str = None) -> Dict:
        """Side-by-side comparison of specific carriers."""
        if not self._loaded:
            self.load_data()

        carriers_data = []
        for cid in carrier_ids:
            carrier = next((c for c in self.carriers if c["id"] == cid), None)
            if carrier:
                scorecard = self.get_carrier_scorecard(cid)
                carriers_data.append(scorecard)

        return {
            "comparison": carriers_data,
            "count": len(carriers_data),
        }


# Singleton
_analyst = CarrierAnalyst()


def get_carrier_analyst() -> CarrierAnalyst:
    if not _analyst._loaded:
        _analyst.load_data()
    return _analyst

"""
Bid Parser — Multi-format bid extraction and normalization.
Parses carrier bids from text/JSON input and normalizes to $/ton-km 
for cross-modal comparison. Uses LLM (Google Gemini) when available,
with rule-based fallback.
"""

import json
import re
import os
from typing import Dict, List, Optional

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

# Exchange rate
USD_TO_INR = 83.0

# Mode-specific bid schemas
BID_SCHEMAS = {
    "road": {
        "required_fields": ["rate_per_ton_km", "vehicle_type", "transit_days"],
        "optional_fields": ["fuel_surcharge_pct", "min_weight_tons", "loading_charges", "toll_charges"],
        "cost_unit": "INR per ton-km",
        "normalization": "rate_per_ton_km",
    },
    "ocean": {
        "required_fields": ["rate_per_teu_usd", "transit_days", "container_type"],
        "optional_fields": ["baf_usd", "thc_origin_usd", "thc_dest_usd", "isps_usd", "free_days_demurrage", "transshipment"],
        "cost_unit": "USD per TEU",
        "normalization": "all_in_rate_per_teu_usd",
    },
    "air": {
        "required_fields": ["rate_per_kg_usd", "transit_hours"],
        "optional_fields": ["fuel_surcharge_per_kg_usd", "security_surcharge_usd", "min_weight_kg", "dim_factor"],
        "cost_unit": "USD per kg",
        "normalization": "all_in_rate_per_kg_usd",
    },
    "rail": {
        "required_fields": ["rate_per_ton_km_inr", "wagon_type", "transit_days"],
        "optional_fields": ["terminal_handling_inr", "min_wagons", "capacity_per_wagon_tons", "last_mile_included"],
        "cost_unit": "INR per ton-km",
        "normalization": "rate_per_ton_km_inr",
    },
}

# LLM extraction prompt
EXTRACTION_PROMPT = """You are a freight procurement bid parser. Extract structured data from this carrier bid.

Determine the transport mode (road/ocean/air/rail) and extract all relevant pricing fields.

Return a JSON object with these fields:
- mode: "road" | "ocean" | "air" | "rail"
- carrier_name: string
- origin: string
- destination: string
- For ROAD: rate_per_ton_km (INR), vehicle_type, transit_days, fuel_surcharge_pct, min_weight_tons
- For OCEAN: rate_per_teu_usd, baf_usd, thc_origin_usd, thc_dest_usd, isps_usd, transit_days, container_type, transshipment, free_days_demurrage
- For AIR: rate_per_kg_usd (at different weight breaks if available), fuel_surcharge_per_kg_usd, security_surcharge_usd, transit_hours, min_weight_kg
- For RAIL: rate_per_ton_km_inr, wagon_type, transit_days, terminal_handling_inr, min_wagons, capacity_per_wagon_tons

BID TEXT:
{bid_text}

Return ONLY valid JSON, no markdown formatting.
"""


class BidParser:
    """Multi-format bid parser with LLM extraction and rule-based normalization."""

    def __init__(self, gemini_api_key: str = None):
        self.gemini_model = None
        if HAS_GEMINI and gemini_api_key:
            try:
                genai.configure(api_key=gemini_api_key)
                self.gemini_model = genai.GenerativeModel("gemini-2.0-flash")
            except Exception as e:
                print(f"Gemini init failed: {e}")

    def parse_bid(self, bid_text: str = None, bid_data: dict = None) -> Dict:
        """
        Parse a bid from text (LLM extraction) or structured data (rule normalization).
        Returns normalized bid with all-in costs and cross-modal $/ton-km equivalent.
        """
        if bid_data:
            # Already structured — just normalize
            return self._normalize_bid(bid_data)
        
        if bid_text:
            # Extract structure from text
            extracted = self._extract_from_text(bid_text)
            if extracted:
                return self._normalize_bid(extracted)
            return {"error": "Could not parse bid text", "raw_text": bid_text}
        
        return {"error": "No bid_text or bid_data provided"}

    def _extract_from_text(self, bid_text: str) -> Optional[Dict]:
        """Extract structured data from bid text using LLM or rules."""
        if self.gemini_model:
            return self._llm_extract(bid_text)
        return self._rule_extract(bid_text)

    def _llm_extract(self, bid_text: str) -> Optional[Dict]:
        """Use Gemini to extract structured bid data from text."""
        try:
            prompt = EXTRACTION_PROMPT.format(bid_text=bid_text)
            response = self.gemini_model.generate_content(prompt)
            text = response.text.strip()
            # Clean markdown formatting if present
            text = re.sub(r'^```json\s*', '', text)
            text = re.sub(r'\s*```$', '', text)
            return json.loads(text)
        except Exception as e:
            print(f"LLM extraction failed: {e}")
            return self._rule_extract(bid_text)

    def _rule_extract(self, bid_text: str) -> Optional[Dict]:
        """Rule-based extraction as fallback."""
        result = {}
        text_lower = bid_text.lower()

        # Detect mode
        if any(w in text_lower for w in ["teu", "container", "ocean", "vessel", "fcl", "lcl", "baf", "thc"]):
            result["mode"] = "ocean"
        elif any(w in text_lower for w in ["per kg", "air", "flight", "cargo aircraft", "uld", "awb"]):
            result["mode"] = "air"
        elif any(w in text_lower for w in ["wagon", "rail", "train", "concor", "dfc", "rake"]):
            result["mode"] = "rail"
        else:
            result["mode"] = "road"

        # Extract numbers with context
        # Look for currency amounts
        inr_pattern = r'(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d+)?)'
        usd_pattern = r'(?:\$|USD)\s*([\d,]+(?:\.\d+)?)'
        
        inr_matches = re.findall(inr_pattern, bid_text)
        usd_matches = re.findall(usd_pattern, bid_text)

        # Extract carrier name (first line or after "Carrier:")
        carrier_match = re.search(r'(?:carrier|company|from)[:\s]+([A-Z][A-Za-z\s]+)', bid_text)
        if carrier_match:
            result["carrier_name"] = carrier_match.group(1).strip()

        # Extract origin-destination
        route_match = re.search(r'(\w+)\s*(?:to|→|->|–)\s*(\w+)', bid_text)
        if route_match:
            result["origin"] = route_match.group(1)
            result["destination"] = route_match.group(2)

        # Transit time
        transit_match = re.search(r'(\d+)\s*(?:days?|hrs?|hours?)', text_lower)
        if transit_match:
            val = int(transit_match.group(1))
            if result["mode"] == "air":
                result["transit_hours"] = val
            else:
                result["transit_days"] = val

        # Mode-specific extractions
        if result["mode"] == "road":
            if inr_matches:
                result["rate_per_ton_km"] = float(inr_matches[0].replace(",", ""))
            result["vehicle_type"] = "FTL_20ft"
        elif result["mode"] == "ocean":
            if usd_matches:
                result["rate_per_teu_usd"] = float(usd_matches[0].replace(",", ""))
            result["container_type"] = "20GP"
        elif result["mode"] == "air":
            if usd_matches:
                result["rate_per_kg_usd"] = float(usd_matches[0].replace(",", ""))
        elif result["mode"] == "rail":
            if inr_matches:
                result["rate_per_ton_km_inr"] = float(inr_matches[0].replace(",", ""))
            result["wagon_type"] = "BOXN"

        return result if result.get("mode") else None

    def _normalize_bid(self, bid: dict) -> Dict:
        """
        Normalize a parsed bid to compute all-in costs and $/ton-km equivalent.
        """
        mode = bid.get("mode", "road")
        normalized = {**bid, "normalization": {}}

        if mode == "road":
            rate = bid.get("rate_per_ton_km", 0)
            fuel_surcharge = rate * bid.get("fuel_surcharge_pct", 0) / 100
            all_in = rate + fuel_surcharge
            normalized["normalization"] = {
                "base_rate_inr_per_ton_km": rate,
                "fuel_surcharge_inr": fuel_surcharge,
                "all_in_rate_inr_per_ton_km": round(all_in, 2),
                "equivalent_usd_per_ton_km": round(all_in / USD_TO_INR, 4),
            }

        elif mode == "ocean":
            base = bid.get("rate_per_teu_usd", 0)
            baf = bid.get("baf_usd", 0)
            thc_o = bid.get("thc_origin_usd", 0)
            thc_d = bid.get("thc_dest_usd", 0)
            isps = bid.get("isps_usd", 0)
            all_in = base + baf + thc_o + thc_d + isps
            
            # Estimate $/ton-km: assume 18 tons per TEU, distance from bid or default
            distance = bid.get("distance_km", 5000)
            tons_per_teu = 18
            usd_per_ton_km = all_in / (tons_per_teu * distance) if distance > 0 else 0
            
            normalized["normalization"] = {
                "base_rate_usd": base,
                "baf_usd": baf,
                "thc_total_usd": thc_o + thc_d,
                "all_in_rate_per_teu_usd": round(all_in, 2),
                "all_in_rate_per_teu_inr": round(all_in * USD_TO_INR, 2),
                "equivalent_usd_per_ton_km": round(usd_per_ton_km, 4),
                "surcharges_pct_of_base": round((all_in - base) / max(base, 1) * 100, 1),
            }

        elif mode == "air":
            rate = bid.get("rate_per_kg_usd", bid.get("rate_per_kg_usd_45", 0))
            fsc = bid.get("fuel_surcharge_per_kg_usd", 0)
            ssc = bid.get("security_surcharge_usd", 0)
            all_in = rate + fsc + ssc
            
            # $/ton-km: assume distance from bid
            distance = bid.get("distance_km", 3000)
            usd_per_ton_km = all_in * 1000 / distance if distance > 0 else 0
            
            normalized["normalization"] = {
                "base_rate_usd_per_kg": rate,
                "fuel_surcharge_usd_per_kg": fsc,
                "all_in_rate_usd_per_kg": round(all_in, 2),
                "all_in_rate_inr_per_kg": round(all_in * USD_TO_INR, 2),
                "equivalent_usd_per_ton_km": round(usd_per_ton_km, 4),
                "weight_breaks": {
                    k: bid[k] for k in bid
                    if k.startswith("rate_per_kg_usd_")
                },
            }

        elif mode == "rail":
            rate = bid.get("rate_per_ton_km_inr", 0)
            terminal = bid.get("terminal_handling_inr", 0)
            distance = bid.get("distance_km", 1000)
            weight_per_wagon = bid.get("capacity_per_wagon_tons", 60)
            
            # Terminal handling spread across the distance
            terminal_per_ton_km = terminal / (weight_per_wagon * distance) if distance > 0 else 0
            all_in = rate + terminal_per_ton_km
            
            normalized["normalization"] = {
                "base_rate_inr_per_ton_km": rate,
                "terminal_handling_inr": terminal,
                "terminal_per_ton_km": round(terminal_per_ton_km, 4),
                "all_in_rate_inr_per_ton_km": round(all_in, 2),
                "equivalent_usd_per_ton_km": round(all_in / USD_TO_INR, 4),
            }

        # Cross-modal comparable metric
        normalized["usd_per_ton_km"] = normalized["normalization"].get("equivalent_usd_per_ton_km", 0)
        
        return normalized

    def parse_multiple_bids(self, bids: List[dict]) -> List[Dict]:
        """Parse and normalize multiple bids."""
        return [self.parse_bid(bid_data=bid) for bid in bids]

    def compare_bids(self, bids: List[dict]) -> Dict:
        """Compare normalized bids across modes."""
        parsed = self.parse_multiple_bids(bids)
        
        # Sort by $/ton-km
        parsed.sort(key=lambda x: x.get("usd_per_ton_km", float("inf")))
        
        # Group by mode
        by_mode = {}
        for b in parsed:
            mode = b.get("mode", "unknown")
            if mode not in by_mode:
                by_mode[mode] = []
            by_mode[mode].append(b)

        return {
            "ranked_bids": parsed,
            "by_mode": by_mode,
            "cheapest": parsed[0] if parsed else None,
            "most_expensive": parsed[-1] if parsed else None,
            "spread_usd_per_ton_km": round(
                parsed[-1].get("usd_per_ton_km", 0) - parsed[0].get("usd_per_ton_km", 0), 4
            ) if len(parsed) > 1 else 0,
        }


# Singleton
_parser = BidParser(gemini_api_key=os.environ.get("GEMINI_API_KEY"))


def get_bid_parser() -> BidParser:
    return _parser

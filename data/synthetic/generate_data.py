"""
Synthetic Data Generator for AI-Powered Multi-Modal Carrier Selection Agent
Generates realistic Indian geography-based freight procurement data.
"""

import json
import random
import os
from datetime import datetime, timedelta

random.seed(42)

# ─── Indian Cities & Ports ───────────────────────────────────────────────
INDIAN_CITIES = {
    "Mumbai": {"lat": 19.076, "lon": 72.877, "type": "metro", "port": True, "airport": True, "rail_hub": True},
    "Delhi": {"lat": 28.704, "lon": 77.102, "type": "metro", "port": False, "airport": True, "rail_hub": True},
    "Chennai": {"lat": 13.083, "lon": 80.270, "type": "metro", "port": True, "airport": True, "rail_hub": True},
    "Kolkata": {"lat": 22.572, "lon": 88.364, "type": "metro", "port": True, "airport": True, "rail_hub": True},
    "Bangalore": {"lat": 12.972, "lon": 77.595, "type": "metro", "port": False, "airport": True, "rail_hub": True},
    "Hyderabad": {"lat": 17.385, "lon": 78.487, "type": "metro", "port": False, "airport": True, "rail_hub": True},
    "Ahmedabad": {"lat": 23.023, "lon": 72.571, "type": "metro", "port": False, "airport": True, "rail_hub": True},
    "Pune": {"lat": 18.520, "lon": 73.856, "type": "metro", "port": False, "airport": True, "rail_hub": True},
    "Jaipur": {"lat": 26.912, "lon": 75.787, "type": "tier2", "port": False, "airport": True, "rail_hub": True},
    "Ludhiana": {"lat": 30.901, "lon": 75.857, "type": "tier2", "port": False, "airport": False, "rail_hub": True},
    "Coimbatore": {"lat": 11.017, "lon": 76.956, "type": "tier2", "port": False, "airport": True, "rail_hub": True},
    "Visakhapatnam": {"lat": 17.687, "lon": 83.218, "type": "tier2", "port": True, "airport": True, "rail_hub": True},
    "Nagpur": {"lat": 21.146, "lon": 79.088, "type": "tier2", "port": False, "airport": True, "rail_hub": True},
    "Indore": {"lat": 22.720, "lon": 75.858, "type": "tier2", "port": False, "airport": True, "rail_hub": True},
    "Guwahati": {"lat": 26.144, "lon": 91.736, "type": "tier2", "port": False, "airport": True, "rail_hub": True},
    # International destinations for ocean/air
    "Shanghai": {"lat": 31.230, "lon": 121.474, "type": "intl", "port": True, "airport": True, "rail_hub": False},
    "Hamburg": {"lat": 53.551, "lon": 9.994, "type": "intl", "port": True, "airport": True, "rail_hub": True},
    "Dubai": {"lat": 25.204, "lon": 55.270, "type": "intl", "port": True, "airport": True, "rail_hub": False},
    "Singapore": {"lat": 1.352, "lon": 103.820, "type": "intl", "port": True, "airport": True, "rail_hub": False},
    "Rotterdam": {"lat": 51.924, "lon": 4.477, "type": "intl", "port": True, "airport": True, "rail_hub": True},
}

# Indian port names for ocean freight
INDIAN_PORTS = ["JNPT Mumbai", "Mundra", "Chennai Port", "Kolkata Dock", "Visakhapatnam Port", "Cochin Port", "Kandla"]

# ─── Carrier Templates ───────────────────────────────────────────────────
def generate_carriers():
    carriers = []

    # Road carriers (Indian trucking/logistics companies)
    road_carriers = [
        {"name": "TCI Freight", "fleet_size": 5000, "coverage": "Pan India"},
        {"name": "Rivigo Express", "fleet_size": 3500, "coverage": "North & West India"},
        {"name": "Delhivery Freight", "fleet_size": 4200, "coverage": "Pan India"},
        {"name": "VRL Logistics", "fleet_size": 6000, "coverage": "Pan India"},
        {"name": "Gati KWE", "fleet_size": 3000, "coverage": "Pan India"},
        {"name": "Safexpress", "fleet_size": 2800, "coverage": "Pan India"},
        {"name": "Blue Dart Express Freight", "fleet_size": 1500, "coverage": "Metro Cities"},
        {"name": "Om Logistics", "fleet_size": 2000, "coverage": "North India"},
        {"name": "ABC India Transport", "fleet_size": 1800, "coverage": "West & South India"},
        {"name": "Mahindra Logistics Road", "fleet_size": 3200, "coverage": "Pan India"},
    ]
    for i, rc in enumerate(road_carriers):
        carriers.append({
            "id": f"ROAD-{i+1:03d}",
            "name": rc["name"],
            "mode": "road",
            "fleet_size": rc["fleet_size"],
            "coverage": rc["coverage"],
            "otd_rate": round(random.uniform(0.82, 0.97), 3),
            "cost_per_ton_km": round(random.uniform(2.5, 5.5), 2),  # INR
            "damage_rate": round(random.uniform(0.001, 0.015), 4),
            "gps_tracking": random.choice([True, True, True, False]),
            "tender_acceptance_rate": round(random.uniform(0.75, 0.95), 3),
            "safety_score": round(random.uniform(7.0, 9.8), 1),
            "avg_transit_days_per_1000km": round(random.uniform(1.2, 2.5), 1),
            "carbon_g_per_ton_km": round(random.uniform(60, 120), 1),
        })

    # Ocean carriers
    ocean_carriers = [
        {"name": "Maersk Line", "alliance": "2M", "vessels": 700},
        {"name": "MSC", "alliance": "2M", "vessels": 600},
        {"name": "CMA CGM", "alliance": "Ocean Alliance", "vessels": 550},
        {"name": "Hapag-Lloyd", "alliance": "THE Alliance", "vessels": 250},
        {"name": "ONE (Ocean Network Express)", "alliance": "THE Alliance", "vessels": 210},
        {"name": "Evergreen Line", "alliance": "Ocean Alliance", "vessels": 200},
        {"name": "Yang Ming", "alliance": "Ocean Alliance", "vessels": 90},
        {"name": "ZIM Integrated", "alliance": "Independent", "vessels": 130},
        {"name": "Shipping Corp of India", "alliance": "Independent", "vessels": 60},
        {"name": "Adani Ports Carrier", "alliance": "Independent", "vessels": 40},
    ]
    for i, oc in enumerate(ocean_carriers):
        carriers.append({
            "id": f"OCEAN-{i+1:03d}",
            "name": oc["name"],
            "mode": "ocean",
            "alliance": oc["alliance"],
            "vessel_count": oc["vessels"],
            "schedule_reliability": round(random.uniform(0.55, 0.85), 3),
            "rate_per_teu_usd": round(random.uniform(800, 3500), 0),
            "avg_dwell_time_hours": round(random.uniform(18, 72), 1),
            "demurrage_avg_usd": round(random.uniform(50, 300), 0),
            "rate_stability_score": round(random.uniform(0.4, 0.9), 2),
            "equipment_availability": round(random.uniform(0.7, 0.95), 2),
            "carbon_g_per_teu_km": round(random.uniform(8, 25), 1),
            "imo_cii_rating": random.choice(["A", "B", "C", "C", "D"]),
        })

    # Air carriers
    air_carriers = [
        {"name": "Air India Cargo", "type": "belly", "flights_week": 120},
        {"name": "IndiGo CarGo", "type": "belly", "flights_week": 200},
        {"name": "SpiceJet Cargo", "type": "freighter", "flights_week": 45},
        {"name": "Blue Dart Aviation", "type": "freighter", "flights_week": 60},
        {"name": "Emirates SkyCargo", "type": "freighter", "flights_week": 80},
        {"name": "Qatar Airways Cargo", "type": "freighter", "flights_week": 70},
        {"name": "Singapore Airlines Cargo", "type": "freighter", "flights_week": 50},
        {"name": "Lufthansa Cargo", "type": "freighter", "flights_week": 40},
        {"name": "FedEx Express India", "type": "integrator", "flights_week": 90},
        {"name": "DHL Express India", "type": "integrator", "flights_week": 85},
    ]
    for i, ac in enumerate(air_carriers):
        carriers.append({
            "id": f"AIR-{i+1:03d}",
            "name": ac["name"],
            "mode": "air",
            "carrier_type": ac["type"],
            "flights_per_week": ac["flights_week"],
            "cutoff_reliability": round(random.uniform(0.80, 0.96), 3),
            "rate_per_kg_usd": round(random.uniform(1.5, 8.0), 2),
            "customs_clearance_hours": round(random.uniform(4, 24), 1),
            "temperature_control": random.choice([True, True, False]),
            "security_certification": random.choice(["RA3", "KC", "RA3", "KC"]),
            "dim_weight_accuracy": round(random.uniform(0.88, 0.99), 3),
            "carbon_g_per_ton_km": round(random.uniform(500, 1200), 1),
        })

    # Rail carriers (Indian Railways + Private)
    rail_carriers = [
        {"name": "CONCOR (Container Corp)", "type": "public", "wagons": 20000},
        {"name": "Adani Rail Logistics", "type": "private", "wagons": 5000},
        {"name": "Gateway Rail Freight", "type": "private", "wagons": 3500},
        {"name": "Hind Terminals", "type": "private", "wagons": 2800},
        {"name": "Kribhco Rail", "type": "private", "wagons": 1500},
        {"name": "DP World Rail", "type": "private", "wagons": 2200},
        {"name": "JM Baxi Rail", "type": "private", "wagons": 1800},
        {"name": "Dedicated Freight Corridor Corp", "type": "public", "wagons": 15000},
        {"name": "Indian Railways Parcel", "type": "public", "wagons": 30000},
        {"name": "Pipavav Rail Corp", "type": "private", "wagons": 1200},
    ]
    for i, rc in enumerate(rail_carriers):
        carriers.append({
            "id": f"RAIL-{i+1:03d}",
            "name": rc["name"],
            "mode": "rail",
            "operator_type": rc["type"],
            "wagon_fleet": rc["wagons"],
            "wagon_turnaround_days": round(random.uniform(3, 10), 1),
            "route_electrification_pct": round(random.uniform(0.3, 0.85), 2),
            "interchange_dwell_hours": round(random.uniform(6, 48), 1),
            "block_train_available": random.choice([True, True, False]),
            "cost_per_ton_km_inr": round(random.uniform(1.0, 3.0), 2),
            "last_mile_integration": random.choice(["own_trucking", "partner", "none"]),
            "carbon_g_per_ton_km": round(random.uniform(15, 40), 1),
        })

    return carriers


# ─── Lane Generation (Indian + International Routes) ─────────────────────
def generate_lanes():
    lanes = []
    
    # Domestic road lanes
    domestic_pairs = [
        ("Mumbai", "Delhi"), ("Delhi", "Bangalore"), ("Chennai", "Mumbai"),
        ("Kolkata", "Delhi"), ("Ahmedabad", "Mumbai"), ("Pune", "Hyderabad"),
        ("Mumbai", "Nagpur"), ("Delhi", "Jaipur"), ("Chennai", "Bangalore"),
        ("Hyderabad", "Visakhapatnam"), ("Delhi", "Ludhiana"), ("Mumbai", "Ahmedabad"),
        ("Bangalore", "Coimbatore"), ("Kolkata", "Guwahati"), ("Delhi", "Indore"),
        ("Chennai", "Hyderabad"), ("Mumbai", "Pune"), ("Nagpur", "Kolkata"),
        ("Jaipur", "Ahmedabad"), ("Ludhiana", "Delhi"),
    ]
    for i, (o, d) in enumerate(domestic_pairs):
        dist = _haversine(INDIAN_CITIES[o], INDIAN_CITIES[d])
        lanes.append({
            "id": f"LANE-{i+1:03d}",
            "origin": o, "destination": d,
            "distance_km": round(dist),
            "modes_available": ["road", "rail"],
            "route_type": "domestic",
            "commodity_types": random.sample(
                ["auto_parts", "textiles", "pharmaceuticals", "electronics", "fmcg", "chemicals", "steel", "agri_products"],
                k=random.randint(2, 4)
            ),
        })

    # International ocean/air lanes (from Indian ports to global)
    intl_pairs = [
        ("Mumbai", "Dubai"), ("Mumbai", "Rotterdam"), ("Chennai", "Singapore"),
        ("Mumbai", "Shanghai"), ("Kolkata", "Singapore"), ("Mumbai", "Hamburg"),
        ("Chennai", "Dubai"), ("Visakhapatnam", "Shanghai"), ("Mumbai", "Singapore"),
        ("Chennai", "Rotterdam"),
    ]
    for i, (o, d) in enumerate(intl_pairs):
        dist = _haversine(INDIAN_CITIES[o], INDIAN_CITIES[d])
        modes = ["ocean", "air"]
        if d in ["Dubai", "Singapore"]:
            modes.append("road")  # can truck via land corridors
        lanes.append({
            "id": f"LANE-{len(domestic_pairs)+i+1:03d}",
            "origin": o, "destination": d,
            "distance_km": round(dist),
            "modes_available": modes,
            "route_type": "international",
            "commodity_types": random.sample(
                ["electronics", "pharmaceuticals", "textiles", "auto_parts", "chemicals", "machinery", "gems_jewelry"],
                k=random.randint(2, 4)
            ),
        })

    # Dedicated Freight Corridor rail lanes
    dfc_lanes = [
        ("Mumbai", "Delhi"), ("Delhi", "Kolkata"), ("Chennai", "Delhi"),
        ("Ahmedabad", "Delhi"), ("Mumbai", "Nagpur"), ("Ludhiana", "Mumbai"),
        ("Jaipur", "Mumbai"), ("Kolkata", "Mumbai"), ("Delhi", "Chennai"),
        ("Bangalore", "Delhi"),
    ]
    for i, (o, d) in enumerate(dfc_lanes):
        dist = _haversine(INDIAN_CITIES[o], INDIAN_CITIES[d])
        lanes.append({
            "id": f"LANE-{len(domestic_pairs)+len(intl_pairs)+i+1:03d}",
            "origin": o, "destination": d,
            "distance_km": round(dist),
            "modes_available": ["rail", "road"],
            "route_type": "dfc_corridor",
            "commodity_types": random.sample(
                ["steel", "coal", "cement", "food_grains", "containers", "fertilizer", "automobiles"],
                k=random.randint(2, 4)
            ),
        })

    return lanes


def _haversine(c1, c2):
    """Approximate distance between two coordinates in km."""
    import math
    R = 6371
    dlat = math.radians(c2["lat"] - c1["lat"])
    dlon = math.radians(c2["lon"] - c1["lon"])
    a = math.sin(dlat/2)**2 + math.cos(math.radians(c1["lat"])) * math.cos(math.radians(c2["lat"])) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


# ─── Shipments ────────────────────────────────────────────────────────────
def generate_shipments(lanes, carriers):
    shipments = []
    commodities_config = {
        "electronics": {"value_per_kg": 500, "fragility": "high", "temp_sensitive": False, "urgency_bias": 0.7},
        "pharmaceuticals": {"value_per_kg": 800, "fragility": "medium", "temp_sensitive": True, "urgency_bias": 0.8},
        "textiles": {"value_per_kg": 50, "fragility": "low", "temp_sensitive": False, "urgency_bias": 0.3},
        "auto_parts": {"value_per_kg": 150, "fragility": "medium", "temp_sensitive": False, "urgency_bias": 0.5},
        "fmcg": {"value_per_kg": 80, "fragility": "low", "temp_sensitive": False, "urgency_bias": 0.5},
        "chemicals": {"value_per_kg": 120, "fragility": "high", "temp_sensitive": True, "urgency_bias": 0.4},
        "steel": {"value_per_kg": 40, "fragility": "low", "temp_sensitive": False, "urgency_bias": 0.2},
        "agri_products": {"value_per_kg": 30, "fragility": "low", "temp_sensitive": True, "urgency_bias": 0.4},
        "gems_jewelry": {"value_per_kg": 5000, "fragility": "high", "temp_sensitive": False, "urgency_bias": 0.9},
        "machinery": {"value_per_kg": 200, "fragility": "medium", "temp_sensitive": False, "urgency_bias": 0.3},
        "coal": {"value_per_kg": 5, "fragility": "low", "temp_sensitive": False, "urgency_bias": 0.1},
        "cement": {"value_per_kg": 8, "fragility": "low", "temp_sensitive": False, "urgency_bias": 0.1},
        "food_grains": {"value_per_kg": 25, "fragility": "low", "temp_sensitive": False, "urgency_bias": 0.3},
        "containers": {"value_per_kg": 100, "fragility": "medium", "temp_sensitive": False, "urgency_bias": 0.4},
        "fertilizer": {"value_per_kg": 15, "fragility": "low", "temp_sensitive": False, "urgency_bias": 0.2},
        "automobiles": {"value_per_kg": 300, "fragility": "high", "temp_sensitive": False, "urgency_bias": 0.5},
    }

    base_date = datetime(2025, 1, 1)
    for i in range(200):
        lane = random.choice(lanes)
        commodity = random.choice(lane["commodity_types"])
        cfg = commodities_config.get(commodity, {"value_per_kg": 100, "fragility": "medium", "temp_sensitive": False, "urgency_bias": 0.5})
        weight = round(random.uniform(1, 500) if lane["route_type"] == "domestic" else random.uniform(5, 2000), 1)
        urgency = "express" if random.random() < cfg["urgency_bias"] * 0.4 else ("standard" if random.random() < 0.6 else "economy")
        
        deadline_days = {"express": random.randint(2, 7), "standard": random.randint(7, 21), "economy": random.randint(21, 45)}
        ship_date = base_date + timedelta(days=random.randint(0, 365))

        mode_used = random.choice(lane["modes_available"])
        eligible_carriers = [c for c in carriers if c["mode"] == mode_used]
        carrier = random.choice(eligible_carriers) if eligible_carriers else random.choice(carriers)

        # Calculate realistic cost
        if mode_used == "road":
            cost = weight * lane["distance_km"] * carrier.get("cost_per_ton_km", 3.5) / 1000
        elif mode_used == "ocean":
            teus = max(1, weight / 20)
            cost = teus * carrier.get("rate_per_teu_usd", 1500) * 83  # USD to INR
        elif mode_used == "air":
            cost = weight * carrier.get("rate_per_kg_usd", 4.0) * 83
        else:  # rail
            cost = weight * lane["distance_km"] * carrier.get("cost_per_ton_km_inr", 2.0) / 1000

        # Delivery performance
        was_on_time = random.random() < (carrier.get("otd_rate", 0.85) if mode_used == "road" 
                                          else carrier.get("schedule_reliability", 0.70) if mode_used == "ocean"
                                          else carrier.get("cutoff_reliability", 0.90) if mode_used == "air"
                                          else 0.80)
        delay_days = 0 if was_on_time else random.randint(1, 7)

        shipments.append({
            "id": f"SHIP-{i+1:04d}",
            "lane_id": lane["id"],
            "origin": lane["origin"],
            "destination": lane["destination"],
            "distance_km": lane["distance_km"],
            "commodity": commodity,
            "weight_tons": weight,
            "value_inr": round(weight * 1000 * cfg["value_per_kg"]),
            "fragility": cfg["fragility"],
            "temp_sensitive": cfg["temp_sensitive"],
            "urgency": urgency,
            "deadline_days": deadline_days[urgency],
            "carbon_budget_kg": round(weight * lane["distance_km"] * random.uniform(0.05, 0.15), 1),
            "ship_date": ship_date.strftime("%Y-%m-%d"),
            "mode_used": mode_used,
            "carrier_id": carrier["id"],
            "carrier_name": carrier["name"],
            "cost_inr": round(cost, 2),
            "on_time": was_on_time,
            "delay_days": delay_days,
            "damage_reported": random.random() < 0.02,
        })

    return shipments


# ─── Bids ─────────────────────────────────────────────────────────────────
def generate_bids(lanes, carriers):
    bids = []
    bid_date = datetime(2025, 10, 1)
    
    for i in range(300):
        lane = random.choice(lanes)
        mode = random.choice(lane["modes_available"])
        eligible = [c for c in carriers if c["mode"] == mode]
        if not eligible:
            continue
        carrier = random.choice(eligible)
        
        base_bid = {
            "id": f"BID-{i+1:04d}",
            "carrier_id": carrier["id"],
            "carrier_name": carrier["name"],
            "lane_id": lane["id"],
            "origin": lane["origin"],
            "destination": lane["destination"],
            "distance_km": lane["distance_km"],
            "mode": mode,
            "bid_date": (bid_date + timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d"),
            "valid_until": (bid_date + timedelta(days=random.randint(30, 90))).strftime("%Y-%m-%d"),
            "currency": "INR" if mode in ["road", "rail"] else "USD",
        }

        if mode == "road":
            rate = round(random.uniform(2.0, 6.0), 2)
            base_bid.update({
                "rate_per_ton_km": rate,
                "min_weight_tons": random.choice([1, 5, 10]),
                "fuel_surcharge_pct": round(random.uniform(5, 15), 1),
                "transit_days": round(lane["distance_km"] / random.uniform(400, 700)),
                "vehicle_type": random.choice(["FTL_20ft", "FTL_32ft", "LTL", "Container_20ft"]),
                "total_cost_inr": round(rate * lane["distance_km"] * random.uniform(8, 25), 0),
                "normalized_cost_per_ton_km": rate,
            })
        elif mode == "ocean":
            base_rate = round(random.uniform(600, 4000), 0)
            baf = round(base_rate * random.uniform(0.05, 0.15), 0)
            thc = round(random.uniform(100, 350), 0)
            base_bid.update({
                "rate_per_teu_usd": base_rate,
                "baf_usd": baf,
                "thc_origin_usd": thc,
                "thc_dest_usd": round(random.uniform(100, 400), 0),
                "isps_usd": round(random.uniform(5, 25), 0),
                "transit_days": round(lane["distance_km"] / random.uniform(400, 650)),
                "transshipment": random.choice(["direct", "one_ts", "two_ts"]),
                "container_type": random.choice(["20GP", "40GP", "40HC", "20RF"]),
                "free_days_demurrage": random.choice([7, 10, 14]),
                "all_in_rate_per_teu_usd": round(base_rate + baf + thc * 2 + random.uniform(10, 50), 0),
            })
        elif mode == "air":
            rate_45 = round(random.uniform(1.5, 9.0), 2)
            base_bid.update({
                "rate_per_kg_usd_45": rate_45,
                "rate_per_kg_usd_100": round(rate_45 * 0.90, 2),
                "rate_per_kg_usd_300": round(rate_45 * 0.80, 2),
                "rate_per_kg_usd_500": round(rate_45 * 0.72, 2),
                "rate_per_kg_usd_1000": round(rate_45 * 0.65, 2),
                "fuel_surcharge_per_kg_usd": round(random.uniform(0.3, 1.2), 2),
                "security_surcharge_usd": round(random.uniform(0.05, 0.20), 2),
                "transit_hours": round(lane["distance_km"] / random.uniform(600, 900) + random.uniform(4, 24), 1),
                "min_weight_kg": random.choice([45, 100]),
                "dim_factor": random.choice([5000, 6000]),
            })
        else:  # rail
            rate = round(random.uniform(0.8, 3.5), 2)
            base_bid.update({
                "rate_per_ton_km_inr": rate,
                "wagon_type": random.choice(["BOXN", "BCN", "BTPN", "container_flat"]),
                "min_wagons": random.choice([1, 5, 10, 42]),
                "capacity_per_wagon_tons": random.choice([58, 61, 65]),
                "transit_days": round(lane["distance_km"] / random.uniform(250, 450)),
                "terminal_handling_inr": round(random.uniform(2000, 8000), 0),
                "last_mile_included": random.choice([True, False]),
                "total_cost_inr": round(rate * lane["distance_km"] * random.uniform(50, 200), 0),
                "normalized_cost_per_ton_km": rate,
            })

        bids.append(base_bid)
    
    return bids


# ─── Performance History ──────────────────────────────────────────────────
def generate_performance_history(carriers, lanes):
    history = []
    for carrier in carriers:
        mode = carrier["mode"]
        relevant_lanes = [l for l in lanes if mode in l["modes_available"]]
        sample_lanes = random.sample(relevant_lanes, min(5, len(relevant_lanes)))
        
        for lane in sample_lanes:
            for month_offset in range(12):
                month_date = datetime(2025, 1, 1) + timedelta(days=30 * month_offset)
                num_shipments = random.randint(3, 30)
                
                if mode == "road":
                    otd = round(random.uniform(0.80, 0.98), 3)
                    avg_cost = round(random.uniform(2.0, 5.5) * (1 + month_offset * random.uniform(-0.01, 0.02)), 2)
                elif mode == "ocean":
                    otd = round(random.uniform(0.50, 0.85), 3)
                    avg_cost = round(random.uniform(800, 3500) * (1 + month_offset * random.uniform(-0.03, 0.05)), 0)
                elif mode == "air":
                    otd = round(random.uniform(0.85, 0.97), 3)
                    avg_cost = round(random.uniform(1.5, 8.0) * (1 + month_offset * random.uniform(-0.01, 0.03)), 2)
                else:
                    otd = round(random.uniform(0.70, 0.90), 3)
                    avg_cost = round(random.uniform(1.0, 3.0) * (1 + month_offset * random.uniform(-0.01, 0.02)), 2)
                
                history.append({
                    "carrier_id": carrier["id"],
                    "carrier_name": carrier["name"],
                    "mode": mode,
                    "lane_id": lane["id"],
                    "origin": lane["origin"],
                    "destination": lane["destination"],
                    "month": month_date.strftime("%Y-%m"),
                    "num_shipments": num_shipments,
                    "otd_rate": otd,
                    "avg_cost": avg_cost,
                    "damage_rate": round(random.uniform(0.0, 0.03), 4),
                    "avg_delay_days": round(random.uniform(0, 3), 1) if otd < 0.90 else round(random.uniform(0, 1), 1),
                    "claims_count": random.randint(0, max(1, int(num_shipments * 0.05))),
                })
    
    return history


# ─── Main ─────────────────────────────────────────────────────────────────
def main():
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("🚛 Generating carriers...")
    carriers = generate_carriers()
    
    print("🗺️  Generating lanes (Indian geography)...")
    lanes = generate_lanes()
    
    print("📦 Generating shipments...")
    shipments = generate_shipments(lanes, carriers)
    
    print("💰 Generating bids...")
    bids = generate_bids(lanes, carriers)
    
    print("📊 Generating performance history...")
    perf_history = generate_performance_history(carriers, lanes)
    
    # Save all data
    datasets = {
        "carriers.json": carriers,
        "lanes.json": lanes,
        "shipments.json": shipments,
        "bids.json": bids,
        "performance_history.json": perf_history,
    }
    
    for filename, data in datasets.items():
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"  ✅ {filename}: {len(data)} records")
    
    # Summary
    print(f"\n🎉 Data generation complete!")
    print(f"   Carriers: {len(carriers)} (Road: {len([c for c in carriers if c['mode']=='road'])}, Ocean: {len([c for c in carriers if c['mode']=='ocean'])}, Air: {len([c for c in carriers if c['mode']=='air'])}, Rail: {len([c for c in carriers if c['mode']=='rail'])})")
    print(f"   Lanes: {len(lanes)} ({len([l for l in lanes if l['route_type']=='domestic'])} domestic, {len([l for l in lanes if l['route_type']=='international'])} international, {len([l for l in lanes if l['route_type']=='dfc_corridor'])} DFC corridor)")
    print(f"   Shipments: {len(shipments)}")
    print(f"   Bids: {len(bids)}")
    print(f"   Performance records: {len(perf_history)}")


if __name__ == "__main__":
    main()

"""
PlantRoute carbon calculation app for Modal.
Deterministic CO2 calculation using Haversine distance and fixed emission factors.
No LLMs or external API calls.
"""
import json
import math
import copy
import modal

# ---------------------------------------------------------------------------
# Emission factor constants (kg CO₂e per passenger-km for transport)
# ---------------------------------------------------------------------------
FLIGHT_SHORT_KM = 1500
FLIGHT_FACTOR_SHORT = 0.15   # under 1500 km
FLIGHT_FACTOR_LONG = 0.11    # 1500 km and over
RADIATIVE_FORCING = 1.9       # multiplier for all flights
TRAIN_FACTOR = 0.04
BUS_FACTOR = 0.08
CAR_FACTOR = 0.20
FERRY_FACTOR = 0.12

# Per-activity fixed intensities (kg CO₂e per visit)
ACTIVITY_FACTORS = {
    "museum": 2.5,
    "restaurant": 4.0,
    "outdoor": 0.5,
    "ski": 18.0,
    "beach": 0.8,
    "nightlife": 3.0,
    "wellness": 2.0,
    "shopping": 5.0,
}
ACTIVITY_DEFAULT = 3.0

# Hotel: kg CO₂e per room-night
HOTEL_KG_PER_NIGHT = 15.0

# Threshold for "short" flight → replace with train in optimize_alternatives (km)
SHORT_FLIGHT_REPLACE_KM = 800

app = modal.App("plantroute-carbon")


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in km. Inline implementation, no geo libraries."""
    R = 6371.0  # Earth radius km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _get_point(obj: dict, key: str) -> tuple[float, float, str]:
    """Get (lat, lng, name) from origin/destination dict. Handles camelCase."""
    if not obj:
        return (0.0, 0.0, "")
    lat = obj.get("lat") or obj.get("latitude") or 0.0
    lng = obj.get("lng") or obj.get("longitude") or 0.0
    name = obj.get("name") or ""
    return (float(lat), float(lng), str(name))


def _get_activity_emission(category: str) -> float:
    """Return kg CO₂e for one activity visit by category."""
    cat = (category or "default").lower().strip()
    return ACTIVITY_FACTORS.get(cat, ACTIVITY_DEFAULT)


@app.function()
def carbon_predictor(itinerary_json: dict) -> dict:
    """
    Calculate CO₂ deterministically from itinerary using Haversine and fixed factors.
    Returns { "items": [{ "id", "type", "description", "distance_km", "emission_kg" }], "total_kg" }.
    """
    items = []
    days = itinerary_json.get("days") or []

    for day in days:
        # Transport segments
        for seg in day.get("transport") or []:
            seg_id = seg.get("id") or ""
            mode = (seg.get("mode") or "car").lower()
            origin = seg.get("origin") or {}
            dest = seg.get("destination") or {}
            lat1, lng1, name1 = _get_point(origin, "origin")
            lat2, lng2, name2 = _get_point(dest, "destination")
            dist_km = seg.get("distance_km")
            if dist_km is None and (lat1 or lat2 or lng1 or lng2):
                dist_km = haversine_km(lat1, lng1, lat2, lng2)
            dist_km = float(dist_km or 0.0)
            dist_km = round(dist_km, 2)

            if mode.startswith("flight"):
                factor = FLIGHT_FACTOR_SHORT if dist_km < FLIGHT_SHORT_KM else FLIGHT_FACTOR_LONG
                emission_kg = dist_km * factor * RADIATIVE_FORCING
            else:
                factors = {
                    "train": TRAIN_FACTOR,
                    "bus": BUS_FACTOR,
                    "car": CAR_FACTOR,
                    "ferry": FERRY_FACTOR,
                }
                factor = factors.get(mode, CAR_FACTOR)
                emission_kg = dist_km * factor

            emission_kg = round(emission_kg, 3)
            desc = f"{mode} {name1} -> {name2}".strip()
            items.append({
                "id": seg_id,
                "type": "transport",
                "description": desc,
                "distance_km": dist_km,
                "emission_kg": emission_kg,
            })

        # Activities
        for act in day.get("activities") or []:
            act_id = act.get("id") or ""
            name = act.get("name") or "Activity"
            category = act.get("category") or "default"
            emission_kg = round(_get_activity_emission(category), 3)
            items.append({
                "id": act_id,
                "type": "activity",
                "description": name,
                "distance_km": None,
                "emission_kg": emission_kg,
            })

        # Hotel (per night)
        hotel = day.get("hotel")
        if hotel:
            hotel_id = hotel.get("id") or ""
            hotel_name = hotel.get("name") or "Hotel"
            items.append({
                "id": hotel_id,
                "type": "hotel",
                "description": hotel_name,
                "distance_km": None,
                "emission_kg": round(HOTEL_KG_PER_NIGHT, 3),
            })

    total_kg = round(sum(i["emission_kg"] for i in items), 3)
    return {"items": items, "total_kg": total_kg}


def _segment_distance_km(seg: dict) -> float:
    """Get distance for a transport segment (Haversine or stored)."""
    origin = seg.get("origin") or {}
    dest = seg.get("destination") or {}
    dist_km = seg.get("distance_km")
    if dist_km is not None:
        return float(dist_km)
    lat1, lng1, _ = _get_point(origin, "origin")
    lat2, lng2, _ = _get_point(dest, "dest")
    return haversine_km(lat1, lng1, lat2, lng2)


@app.function()
def optimize_alternatives(itinerary_json: dict, user_prefs: dict) -> dict:
    """
    Return a lower-carbon version: replace flights under 800 km with train,
    replace ski activities with outdoor. Compares both with carbon_predictor.
    Returns {
      "original_total_kg", "alternative_total_kg", "alternative_itinerary",
      "savings_kg", "regret_score"
    } with regret_score = (original - alternative) / original clamped 0–1.
    """
    original_total_kg = carbon_predictor.local(itinerary_json)["total_kg"]
    alt = copy.deepcopy(itinerary_json)

    for day in alt.get("days") or []:
        for seg in day.get("transport") or []:
            mode = (seg.get("mode") or "").lower()
            if mode.startswith("flight"):
                dist = _segment_distance_km(seg)
                if dist < SHORT_FLIGHT_REPLACE_KM:
                    seg["mode"] = "train"
        for act in day.get("activities") or []:
            cat = (act.get("category") or "").lower()
            if cat == "ski":
                act["category"] = "outdoor"

    alt_result = carbon_predictor.local(alt)
    alternative_total_kg = alt_result["total_kg"]
    savings_kg = round(original_total_kg - alternative_total_kg, 3)
    if original_total_kg <= 0:
        regret_score = 0.0
    else:
        regret_score = (original_total_kg - alternative_total_kg) / original_total_kg
        regret_score = max(0.0, min(1.0, regret_score))
    regret_score = round(regret_score, 4)

    return {
        "original_total_kg": original_total_kg,
        "alternative_total_kg": alternative_total_kg,
        "alternative_itinerary": alt,
        "savings_kg": savings_kg,
        "regret_score": regret_score,
    }


if __name__ == "__main__":
    # Sample: Paris to Rome — one flight, one museum, one hotel night
    sample = {
        "id": "test-1",
        "city": "Rome",
        "start_date": "2025-06-01",
        "end_date": "2025-06-02",
        "days": [
            {
                "date": "2025-06-01",
                "transport": [
                    {
                        "id": "seg-1",
                        "mode": "flight_short",
                        "origin": {"lat": 48.8566, "lng": 2.3522, "name": "Paris"},
                        "destination": {"lat": 41.9028, "lng": 12.4964, "name": "Rome"},
                        "price_usd": 120,
                        "duration_minutes": 130,
                    }
                ],
                "activities": [
                    {
                        "id": "act-1",
                        "name": "Vatican Museums",
                        "category": "museum",
                        "location": {"lat": 41.9065, "lng": 12.4536, "name": "Vatican City"},
                        "price_usd": 20,
                        "duration_hours": 3,
                    }
                ],
                "hotel": {
                    "id": "hotel-1",
                    "name": "Hotel Test",
                    "location": {"lat": 41.9, "lng": 12.5, "name": "Rome"},
                    "price_per_night_usd": 150,
                    "stars": 4,
                },
            }
        ],
        "total_price_usd": 290,
        "total_emission_kg": 0,
        "interest_match_score": 0,
        "regret_score": 0,
    }

    print("=== carbon_predictor ===")
    result = carbon_predictor.local(sample)
    print(json.dumps(result, indent=2))
    print()

    print("=== optimize_alternatives ===")
    opt = optimize_alternatives.local(sample, {})
    print("original_total_kg:", opt["original_total_kg"])
    print("alternative_total_kg:", opt["alternative_total_kg"])
    print("savings_kg:", opt["savings_kg"])
    print("regret_score:", opt["regret_score"])
    print("alternative_itinerary (first day transport mode):", opt["alternative_itinerary"]["days"][0]["transport"][0]["mode"])

# Feature extraction: travel + interests + activity -> fixed vector

from typing import Optional

from .schemas import ActivityInput, TravelPreferencesInput

# Same set as app ATTRACTION_TYPES (museum, culture, outdoor, nature, food, nightlife, wellness, beach, ski)
ATTRACTION_TYPES = [
    "museum", "culture", "outdoor", "nature", "food",
    "nightlife", "wellness", "beach", "ski",
]

# Feature names in fixed order for training and inference
FEATURE_NAMES = [
    "interest_match",
    "trip_pace",
    "crowd_comfort",
    "morning_tolerance",
    "late_night_tolerance",
    "walking_effort",
    "budget_level",
    "planning_vs_spontaneity",
    "noise_sensitivity",
    "duration_norm",
    "emission_norm",
    "price_norm",
    "crowd_mismatch",
    "early_start_mismatch",
    "late_night_mismatch",
    "budget_mismatch",
    "pace_duration_mismatch",
]


def interest_match(interests: list[str], category: str) -> float:
    """1.0 if category in interests (or interests empty), else 0.0."""
    cat = (category or "").strip().lower()
    if not interests:
        return 0.5  # neutral when no interests specified
    normalized = [s.strip().lower() for s in interests if s]
    return 1.0 if cat in normalized else 0.0


def build_features(
    travel: TravelPreferencesInput,
    interests: list[str],
    activity: ActivityInput,
) -> dict[str, float]:
    cat = (activity.category or "outdoor").strip().lower()
    crowd = activity.typical_crowd_level if activity.typical_crowd_level is not None else 0.5
    start = activity.typical_start_hour if activity.typical_start_hour is not None else 12.0
    duration_norm = min(1.0, (activity.duration_hours or 1.0) / 8.0)
    emission_norm = min(1.0, (activity.emission_kg or 0.0) / 50.0)
    price_norm = min(1.0, (activity.price_usd or 0.0) / 200.0)

    crowd_mismatch = crowd * (1.0 - travel.crowd_comfort)
    early_start_mismatch = (1.0 - travel.morning_tolerance) * max(0.0, 9.0 - start) / 9.0
    early_start_mismatch = min(1.0, early_start_mismatch)
    late_night_mismatch = (1.0 - travel.late_night_tolerance) * max(0.0, start - 21.0) / 3.0
    late_night_mismatch = min(1.0, late_night_mismatch)
    budget_mismatch = max(0.0, price_norm - travel.budget_level)
    pace_duration_mismatch = max(0.0, duration_norm - travel.trip_pace)

    out = {
        "interest_match": interest_match(interests, cat),
        "trip_pace": travel.trip_pace,
        "crowd_comfort": travel.crowd_comfort,
        "morning_tolerance": travel.morning_tolerance,
        "late_night_tolerance": travel.late_night_tolerance,
        "walking_effort": travel.walking_effort,
        "budget_level": travel.budget_level,
        "planning_vs_spontaneity": travel.planning_vs_spontaneity,
        "noise_sensitivity": travel.noise_sensitivity,
        "duration_norm": round(duration_norm, 6),
        "emission_norm": round(emission_norm, 6),
        "price_norm": round(price_norm, 6),
        "crowd_mismatch": round(crowd_mismatch, 6),
        "early_start_mismatch": round(early_start_mismatch, 6),
        "late_night_mismatch": round(late_night_mismatch, 6),
        "budget_mismatch": round(budget_mismatch, 6),
        "pace_duration_mismatch": round(min(1.0, pace_duration_mismatch), 6),
    }
    return out


def features_to_vector(feats: dict[str, float]) -> list[float]:
    return [feats.get(name, 0.0) for name in FEATURE_NAMES]

# Feature extraction: travel + interests + activity -> fixed vector

from typing import Optional

from .schemas import ActivityInput, TravelPreferencesInput

# Same set as app ATTRACTION_TYPES (museum, culture, outdoor, nature, food, nightlife, wellness, beach, ski)
ATTRACTION_TYPES = [
    "museum", "culture", "outdoor", "nature", "food",
    "nightlife", "wellness", "beach", "ski",
]

# Continuous similarity between categories [0, 1]. Same=1.0, related=0.6–0.85, weak=0.2–0.4, unrelated=0.
# Keys (a, b) with a <= b; lookup with (min(a,b), max(a,b)).
def _sim_key(a: str, b: str) -> tuple[str, str]:
    return (min(a, b), max(a, b))

_CAT_SIM: dict[tuple[str, str], float] = {}
for c in ATTRACTION_TYPES:
    _CAT_SIM[_sim_key(c, c)] = 1.0
# Close pairs (many distinct values for continuous training)
for (a, b), s in [
    (("museum", "culture"), 0.88),
    (("nature", "outdoor"), 0.85),
    (("culture", "outdoor"), 0.52),
    (("museum", "nature"), 0.48),
    (("outdoor", "wellness"), 0.58),
    (("nature", "wellness"), 0.55),
    (("food", "wellness"), 0.42),
    (("beach", "outdoor"), 0.72),
    (("beach", "nature"), 0.65),
    (("ski", "outdoor"), 0.70),
    (("ski", "nature"), 0.62),
    (("nightlife", "food"), 0.45),
    (("culture", "museum"), 0.88),  # already set via (museum, culture)
]:
    _CAT_SIM[_sim_key(a, b)] = s
# Weaker links so we get more spread in [0.2, 0.5]
for (a, b), s in [
    (("museum", "food"), 0.28),
    (("culture", "food"), 0.32),
    (("outdoor", "food"), 0.35),
    (("nightlife", "culture"), 0.38),
    (("wellness", "beach"), 0.50),
    (("wellness", "ski"), 0.45),
]:
    _CAT_SIM[_sim_key(a, b)] = s

NEUTRAL_NO_INTERESTS = 0.5

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
    "eco_preference",
    "duration_norm",
    "emission_norm",
    "price_norm",
    "emission_fit",
    "crowd_mismatch",
    "early_start_mismatch",
    "late_night_mismatch",
    "budget_mismatch",
    "pace_duration_mismatch",
]


def category_similarity(interest: str, category: str) -> float:
    """Continuous similarity in [0, 1] from predefined matrix; 0 if either not in ATTRACTION_TYPES."""
    a, b = interest.strip().lower(), (category or "").strip().lower()
    if a not in ATTRACTION_TYPES or b not in ATTRACTION_TYPES:
        return 1.0 if a == b else 0.0
    return _CAT_SIM.get(_sim_key(a, b), 0.0)


def interest_match(interests: list[str], category: str) -> float:
    """Continuous match in [0, 1]: max similarity between activity category and any user interest."""
    cat = (category or "").strip().lower()
    if not interests:
        return NEUTRAL_NO_INTERESTS
    normalized = [s.strip().lower() for s in interests if s]
    return max(category_similarity(i, cat) for i in normalized)


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

    eco = getattr(travel, "eco_preference", 0.5)
    emission_fit = 1.0 - min(1.0, (eco * emission_norm * 1.15))

    out = {
        "interest_match": round(interest_match(interests, cat), 6),
        "trip_pace": travel.trip_pace,
        "crowd_comfort": travel.crowd_comfort,
        "morning_tolerance": travel.morning_tolerance,
        "late_night_tolerance": travel.late_night_tolerance,
        "walking_effort": travel.walking_effort,
        "budget_level": travel.budget_level,
        "planning_vs_spontaneity": travel.planning_vs_spontaneity,
        "noise_sensitivity": travel.noise_sensitivity,
        "eco_preference": eco,
        "duration_norm": round(duration_norm, 6),
        "emission_norm": round(emission_norm, 6),
        "price_norm": round(price_norm, 6),
        "emission_fit": round(emission_fit, 6),
        "crowd_mismatch": round(crowd_mismatch, 6),
        "early_start_mismatch": round(early_start_mismatch, 6),
        "late_night_mismatch": round(late_night_mismatch, 6),
        "budget_mismatch": round(budget_mismatch, 6),
        "pace_duration_mismatch": round(min(1.0, pace_duration_mismatch), 6),
    }
    return out


def features_to_vector(feats: dict[str, float]) -> list[float]:
    return [feats.get(name, 0.0) for name in FEATURE_NAMES]

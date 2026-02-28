# Feature extraction; same logic as preference_engine.

from typing import Optional

from .config.defaults import (
    EARLY_START_HOUR,
    LATE_NIGHT_HOUR,
    WALK_COMFORT_KM_MAX,
    WALK_COMFORT_KM_MIN,
)
from .schemas import Context, ItineraryItem, UserPreferences


def _walk_comfort_km(prefs: UserPreferences) -> float:
    t = prefs.walking_effort
    return WALK_COMFORT_KM_MIN + t * (WALK_COMFORT_KM_MAX - WALK_COMFORT_KM_MIN)


def build_features(
    prefs: UserPreferences,
    item: ItineraryItem,
    ctx: Optional[Context] = None,
) -> dict[str, float]:
    ctx = ctx or Context()
    start_norm = item.start_hour / 24.0
    walk_km = item.walking_km_cumulative_day if item.walking_km_cumulative_day is not None else item.walking_km
    walk_norm = min(1.0, walk_km / 15.0)
    activities_norm = min(1.0, item.activity_count_today / 10.0)

    pace_overage = max(0.0, activities_norm - prefs.pace)
    comfort_km = _walk_comfort_km(prefs)
    walk_over = max(0.0, walk_km - comfort_km)
    walk_over_tolerance_km = min(1.0, walk_over / 10.0)
    early_penalty = (1.0 - prefs.morning_tolerance) * max(0.0, EARLY_START_HOUR - item.start_hour) / 4.0
    early_start_violation = min(1.0, early_penalty)
    crowd_mismatch = item.crowd_level * (1.0 - prefs.crowd_comfort)
    budget_overrun = max(0.0, item.cost_level - prefs.budget_comfort)
    bad_weather = (
        (prefs.dislike_heat or prefs.dislike_cold or prefs.dislike_rain)
        and (item.bad_weather_today is True)
    )
    outdoor_bad_weather = (1.0 if bad_weather else 0.0) * item.outdoor_fraction
    prev_early = ctx.previous_day_end_hour is not None and ctx.previous_day_end_hour >= LATE_NIGHT_HOUR
    early_today = item.start_hour < EARLY_START_HOUR + 1.0
    late_night_after_early = 1.0 if (item.is_late_night and (early_today or prev_early)) else 0.0
    noise_mismatch = item.crowd_level * (1.0 - prefs.noise_sensitivity)
    spontaneity_mismatch = max(0.0, activities_norm - (1.0 - prefs.planning_vs_spontaneity))

    out = {
        "pace_overage": round(pace_overage, 6),
        "walk_over_tolerance_km": round(walk_over_tolerance_km, 6),
        "early_start_violation": round(early_start_violation, 6),
        "crowd_mismatch": round(crowd_mismatch, 6),
        "budget_overrun": round(budget_overrun, 6),
        "outdoor_bad_weather": round(outdoor_bad_weather, 6),
        "late_night_after_early": round(late_night_after_early, 6),
        "noise_mismatch": round(noise_mismatch, 6),
        "spontaneity_mismatch": round(min(1.0, spontaneity_mismatch), 6),
    }
    out["_start_hour_norm"] = start_norm
    out["_walk_km_norm"] = walk_norm
    out["_activities_norm"] = activities_norm
    out["_pace"] = prefs.pace
    out["_crowd_comfort"] = prefs.crowd_comfort
    out["_morning_tolerance"] = prefs.morning_tolerance
    out["_budget_comfort"] = prefs.budget_comfort
    return out

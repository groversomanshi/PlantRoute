# Thresholds, feature config, and reason code → message mapping.

RISK_LOW_MAX = 0.33
RISK_MEDIUM_MAX = 0.66

FEATURE_NAMES_MISMATCH = [
    "pace_overage",
    "walk_over_tolerance_km",
    "early_start_violation",
    "crowd_mismatch",
    "budget_overrun",
    "outdoor_bad_weather",
    "late_night_after_early",
    "noise_mismatch",
    "spontaneity_mismatch",
]

REASON_MESSAGES = {
    "pace_overage": ("too_packed", "This plan is more packed than you usually like."),
    "walk_over_tolerance_km": ("too_much_walking", "This plan has more walking than you said is comfortable."),
    "early_start_violation": ("too_early", "This activity starts earlier than you usually like."),
    "crowd_mismatch": ("too_crowded", "This is expected to be very crowded, and you said crowds bother you."),
    "budget_overrun": ("over_budget", "This is pricier than your comfort zone."),
    "outdoor_bad_weather": ("outdoor_bad_weather", "This is mostly outdoors and the weather may not suit you."),
    "late_night_after_early": ("late_after_early", "Late night after an early start may be tiring."),
    "noise_mismatch": ("too_noisy", "This tends to be noisy and you prefer quieter spots."),
    "spontaneity_mismatch": ("too_structured", "This day is very structured; you said you like more free time."),
}

WALK_COMFORT_KM_MIN = 1.0
WALK_COMFORT_KM_MAX = 12.0
EARLY_START_HOUR = 8.0
LATE_NIGHT_HOUR = 22.0
DEFAULT_MODEL_PATH = "data/model.pkl"
MAX_REASONS = 4

FEATURE_COLUMNS = [
    "pace_overage",
    "walk_over_tolerance_km",
    "early_start_violation",
    "crowd_mismatch",
    "budget_overrun",
    "outdoor_bad_weather",
    "late_night_after_early",
    "noise_mismatch",
    "spontaneity_mismatch",
    "_start_hour_norm",
    "_walk_km_norm",
    "_activities_norm",
    "_pace",
    "_crowd_comfort",
    "_morning_tolerance",
    "_budget_comfort",
]

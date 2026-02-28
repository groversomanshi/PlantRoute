# Synthetic data with stricter labelling.

import random
from pathlib import Path

import numpy as np
import pandas as pd

from .config.defaults import FEATURE_COLUMNS
from .features import build_features
from .schemas import Context, ItineraryItem, UserPreferences

TRAVEL_VIBES = ["Chill", "Adventure", "Family", "Romantic", "Nightlife"]
SEED = 42


def _set_seed() -> None:
    random.seed(SEED)
    np.random.seed(SEED)


def sample_user_preferences(n: int = 1) -> list[UserPreferences]:
    _set_seed()
    users = []
    for _ in range(n):
        vibe = random.choice(TRAVEL_VIBES)
        pace_bias = 0.3 if vibe in ("Chill", "Family") else (-0.2 if vibe in ("Adventure", "Nightlife") else 0)
        pace = np.clip(np.random.beta(2, 2) + pace_bias * 0.3, 0.05, 0.95)
        users.append(
            UserPreferences(
                pace=float(pace),
                crowd_comfort=float(np.random.beta(2, 2)),
                morning_tolerance=float(np.random.beta(2, 2)),
                late_night_tolerance=float(np.random.beta(2, 2)),
                walking_effort=float(np.random.beta(2, 2)),
                budget_comfort=float(np.random.beta(2, 2)),
                planning_vs_spontaneity=float(np.random.beta(2, 2)),
                noise_sensitivity=float(np.random.beta(2, 2)),
                dislike_heat=random.random() < 0.25,
                dislike_cold=random.random() < 0.2,
                dislike_rain=random.random() < 0.3,
                travel_vibe=vibe,
            )
        )
    return users


def sample_itinerary_item() -> ItineraryItem:
    _set_seed()
    start = float(np.random.uniform(6, 22))
    dur = float(np.random.uniform(0.5, 4.0))
    end = min(24.0, start + dur)
    walking = float(np.random.uniform(0, 14))
    cumul = walking + float(np.random.uniform(0, 8))
    return ItineraryItem(
        start_hour=start,
        end_hour=end,
        duration_hours=dur,
        walking_km=walking,
        walking_km_cumulative_day=min(25.0, cumul),
        crowd_level=float(np.random.beta(1.5, 1.5)),
        outdoor_fraction=float(np.random.beta(2, 2)),
        activity_count_today=int(np.random.randint(1, 12)),
        cost_level=float(np.random.beta(2, 2)),
        day_number=int(np.random.randint(1, 8)),
        is_late_night=end >= 22.0,
        is_must_see=random.random() < 0.2,
        bad_weather_today=random.choice([True, False, None]),
    )


def heuristic_regret_score(prefs: UserPreferences, item: ItineraryItem, ctx: Context | None = None) -> float:
    ctx = ctx or Context()
    feats = build_features(prefs, item, ctx)
    w = {
        "pace_overage": 0.22,
        "walk_over_tolerance_km": 0.25,
        "early_start_violation": 0.22,
        "crowd_mismatch": 0.12,
        "budget_overrun": 0.08,
        "outdoor_bad_weather": 0.18,
        "late_night_after_early": 0.12,
        "noise_mismatch": 0.04,
        "spontaneity_mismatch": 0.03,
    }
    raw = sum(feats.get(k, 0.0) * w.get(k, 0) for k in w)
    p = 1.0 - np.exp(-2.8 * raw)
    return float(np.clip(p, 0.0, 1.0))


def sample_low_regret_item(prefs: UserPreferences) -> ItineraryItem:
    return ItineraryItem(
        start_hour=float(np.random.uniform(9, 11)),
        walking_km=float(np.random.uniform(0, 2)),
        walking_km_cumulative_day=float(np.random.uniform(1, 4)),
        crowd_level=float(np.random.uniform(0, 0.3)),
        outdoor_fraction=0.3 if (prefs.dislike_heat or prefs.dislike_cold or prefs.dislike_rain) else 0.5,
        activity_count_today=int(np.random.randint(1, 4)),
        cost_level=float(np.clip(prefs.budget_comfort + np.random.uniform(-0.2, 0), 0, 1)),
        day_number=1,
        is_late_night=False,
        bad_weather_today=False,
    )


def sample_high_regret_item(prefs: UserPreferences) -> ItineraryItem:
    return ItineraryItem(
        start_hour=float(np.random.uniform(5, 6.5)),
        walking_km=float(np.random.uniform(10, 16)),
        walking_km_cumulative_day=float(np.random.uniform(14, 20)),
        crowd_level=float(np.random.uniform(0.8, 1.0)),
        outdoor_fraction=0.95 if (prefs.dislike_heat or prefs.dislike_cold or prefs.dislike_rain) else 0.7,
        activity_count_today=int(np.random.randint(8, 12)),
        cost_level=float(np.clip(prefs.budget_comfort + np.random.uniform(0.4, 0.7), 0, 1)),
        day_number=1,
        is_late_night=True,
        bad_weather_today=True if (prefs.dislike_rain or prefs.dislike_heat or prefs.dislike_cold) else False,
    )


def generate_dataset(
    n_samples: int = 2000,
    include_context: bool = True,
) -> pd.DataFrame:
    _set_seed()
    rows = []
    n_half = n_samples // 2
    for i in range(n_samples):
        prefs = sample_user_preferences(1)[0]
        if i < n_half:
            item = sample_low_regret_item(prefs)
            label = 0
        else:
            item = sample_high_regret_item(prefs)
            label = 1
        ctx = None
        if include_context and random.random() < 0.5:
            ctx = Context(
                previous_day_walking_km=float(np.random.uniform(0, 12)),
                previous_day_end_hour=float(np.random.uniform(18, 24)),
            )
        score = heuristic_regret_score(prefs, item, ctx)
        feats = build_features(prefs, item, ctx)
        row = {c: feats.get(c, 0.0) for c in FEATURE_COLUMNS}
        row["regret_score"] = score
        row["regret"] = label
        rows.append(row)
    return pd.DataFrame(rows)


def save_dataset(df: pd.DataFrame, path: Path | str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)


def load_dataset(path: Path | str) -> pd.DataFrame:
    return pd.read_csv(path)

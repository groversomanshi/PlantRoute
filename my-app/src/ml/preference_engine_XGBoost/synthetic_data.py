# Synthetic (travel, interests, activity) -> regret label for training.

import random
from pathlib import Path

import numpy as np
import pandas as pd

from .config.defaults import DEFAULT_RANDOM_STATE
from .features import FEATURE_NAMES, build_features, interest_match
from .schemas import ActivityInput, TravelPreferencesInput

ATTRACTION_TYPES = [
    "museum", "culture", "outdoor", "nature", "food",
    "nightlife", "wellness", "beach", "ski",
]


def _set_seed() -> None:
    random.seed(DEFAULT_RANDOM_STATE)
    np.random.seed(DEFAULT_RANDOM_STATE)


def sample_travel(n: int = 1) -> list[TravelPreferencesInput]:
    _set_seed()
    out = []
    for _ in range(n):
        out.append(
            TravelPreferencesInput(
                trip_pace=float(np.clip(np.random.beta(2, 2), 0.05, 0.95)),
                crowd_comfort=float(np.clip(np.random.beta(2, 2), 0.05, 0.95)),
                morning_tolerance=float(np.clip(np.random.beta(2, 2), 0.05, 0.95)),
                late_night_tolerance=float(np.clip(np.random.beta(2, 2), 0.05, 0.95)),
                walking_effort=float(np.clip(np.random.beta(2, 2), 0.05, 0.95)),
                budget_level=float(np.clip(np.random.beta(2, 2), 0.05, 0.95)),
                planning_vs_spontaneity=float(np.clip(np.random.beta(2, 2), 0.05, 0.95)),
                noise_sensitivity=float(np.clip(np.random.beta(2, 2), 0.05, 0.95)),
            )
        )
    return out


def sample_interests(max_size: int = 5) -> list[str]:
    _set_seed()
    k = random.randint(0, min(max_size, len(ATTRACTION_TYPES)))
    return list(random.sample(ATTRACTION_TYPES, k))


def sample_activity(category: str | None = None) -> ActivityInput:
    _set_seed()
    cat = category or random.choice(ATTRACTION_TYPES)
    start = float(np.random.uniform(6, 23))
    duration = float(np.random.uniform(0.5, 6.0))
    return ActivityInput(
        id=None,
        name=None,
        category=cat,
        duration_hours=duration,
        emission_kg=float(np.random.uniform(0, 80)),
        price_usd=float(np.random.uniform(0, 300)),
        activity_density=float(np.random.beta(1.5, 1.5)),
        typical_start_hour=start,
        typical_crowd_level=float(np.random.beta(1.5, 1.5)),
    )


def heuristic_regret(
    travel: TravelPreferencesInput,
    interests: list[str],
    activity: ActivityInput,
) -> float:
    """Heuristic regret score in [0,1]; used to label synthetic data."""
    feats = build_features(travel, interests, activity)
    im = feats["interest_match"]
    crowd = feats["crowd_mismatch"]
    early = feats["early_start_mismatch"]
    late = feats["late_night_mismatch"]
    budget = feats["budget_mismatch"]
    pace = feats["pace_duration_mismatch"]
    regret = (1.0 - im) * 0.35 + crowd * 0.15 + early * 0.15 + late * 0.1 + budget * 0.15 + pace * 0.1
    return float(np.clip(regret, 0.0, 1.0))


def generate_dataset(n_samples: int = 10_000) -> pd.DataFrame:
    _set_seed()
    rows = []
    for i in range(n_samples):
        travel = sample_travel(1)[0]
        # Force 50/50: alternate target label and generate matching features
        target_regret = i % 2
        if target_regret == 1:
            interests = sample_interests()
            cat = random.choice([c for c in ATTRACTION_TYPES if c not in interests]) if interests else random.choice(ATTRACTION_TYPES)
            activity = sample_activity(category=cat)
        else:
            interests = sample_interests()
            activity = sample_activity(category=random.choice(interests) if interests else random.choice(ATTRACTION_TYPES))
        feats = build_features(travel, interests, activity)
        # Use heuristic + noise so some overlap; final label still balanced by flipping ~10%
        regret_score = heuristic_regret(travel, interests, activity)
        flip = np.random.uniform(0, 1) < 0.1
        label = (1 - target_regret) if flip else target_regret
        row = {**feats, "regret": label}
        rows.append(row)
    return pd.DataFrame(rows)


def save_dataset(df: pd.DataFrame, path: Path | str) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    cols = [c for c in FEATURE_NAMES if c in df.columns] + ["regret"]
    df[cols].to_csv(path, index=False)


def load_dataset(path: Path | str) -> pd.DataFrame:
    return pd.read_csv(path)

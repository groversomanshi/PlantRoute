# XGBoost model: load, predict regret_probability, fit_score = 1 - regret.

from pathlib import Path
from typing import Any, Optional

import numpy as np

from .config.defaults import DEFAULT_MODEL_PATH
from .explanations import get_explanation
from .features import FEATURE_NAMES, build_features, features_to_vector
from .schemas import ActivityInput, ScoreResponse, TravelPreferencesInput

PACKAGE_DIR = Path(__file__).resolve().parent


def _resolve_model_path(path: Optional[Path | str] = None) -> Path:
    if path is None:
        path = DEFAULT_MODEL_PATH
    return Path(path).resolve()


def load_model(path: Optional[Path | str] = None) -> Any:
    return _load_joblib_model(path)


def _load_joblib_model(path: Optional[Path | str] = None) -> Any:
    """Load sklearn-style pipeline (e.g. CalibratedClassifierCV wrapping XGBClassifier) from joblib."""
    try:
        import joblib
    except ImportError:
        raise ImportError("joblib required for loading trained model. pip install joblib")
    p = _resolve_model_path(path)
    if not p.exists():
        raise FileNotFoundError(
            f"Model not found: {p}. Run: python -m ml.preference_engine_XGBoost.train"
        )
    return joblib.load(p)


def predict_regret_probability(
    travel: TravelPreferencesInput,
    interests: list[str],
    activity: ActivityInput,
    model: Optional[Any] = None,
    model_path: Optional[Path | str] = None,
) -> tuple[float, dict[str, float], list[str]]:
    """Returns (regret_probability, features_dict, explanation_list)."""
    if model is None:
        model = _load_joblib_model(model_path)
    feats = build_features(travel, interests, activity)
    vec = features_to_vector(feats)
    X = np.array([vec], dtype=np.float32)
    # sklearn API
    proba = model.predict_proba(X)[0, 1]
    proba = float(np.clip(proba, 0.0, 1.0))
    explanation = get_explanation(model, feats, FEATURE_NAMES)
    return round(proba, 4), feats, explanation


def predict_batch(
    travel: TravelPreferencesInput,
    interests: list[str],
    activities: list[ActivityInput],
    model: Optional[Any] = None,
    model_path: Optional[Path | str] = None,
) -> list[ScoreResponse]:
    if model is None:
        model = _load_joblib_model(model_path)
    if not activities:
        return []
    rows = [
        features_to_vector(build_features(travel, interests, a))
        for a in activities
    ]
    X = np.array(rows, dtype=np.float32)
    proba = model.predict_proba(X)[:, 1]
    out = []
    for i, act in enumerate(activities):
        reg = float(np.clip(proba[i], 0.0, 1.0))
        fit = round(1.0 - reg, 4)
        feats = build_features(travel, interests, act)
        explanation = get_explanation(model, feats, FEATURE_NAMES)
        out.append(
            ScoreResponse(
                fit_score=fit,
                regret_probability=round(reg, 4),
                explanation=explanation or None,
            )
        )
    return out

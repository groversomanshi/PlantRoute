# Load model and predict.

import pickle
from pathlib import Path
from typing import Any, Optional

import pandas as pd

from .config.defaults import (
    DEFAULT_MODEL_PATH,
    FEATURE_COLUMNS,
    RISK_LOW_MAX,
    RISK_MEDIUM_MAX,
)
from .explanations import get_reasons
from .features import build_features
from .schemas import Context, ItineraryItem, RegretPrediction, UserPreferences

PACKAGE_DIR = Path(__file__).resolve().parent


def _resolve_model_path(path: Optional[Path | str] = None) -> Path:
    if path is None:
        path = PACKAGE_DIR / DEFAULT_MODEL_PATH
    return Path(path).resolve()


def load_model(path: Optional[Path | str] = None) -> Any:
    p = _resolve_model_path(path)
    if not p.exists():
        raise FileNotFoundError(f"Model not found: {p}. Run: python -m ml.preference_engine.train")
    with open(p, "rb") as f:
        return pickle.load(f)


def _probability_to_bucket(prob: float) -> str:
    if prob <= RISK_LOW_MAX:
        return "low"
    if prob <= RISK_MEDIUM_MAX:
        return "medium"
    return "high"


def predict(
    prefs: UserPreferences,
    item: ItineraryItem,
    ctx: Optional[Context] = None,
    model: Optional[Any] = None,
    model_path: Optional[Path | str] = None,
) -> RegretPrediction:
    if model is None:
        model = load_model(model_path)
    feats = build_features(prefs, item, ctx)
    X = pd.DataFrame([[feats.get(c, 0.0) for c in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)
    proba = model.predict_proba(X)[0, 1]
    proba = float(max(0.0, min(1.0, proba)))
    risk_bucket = _probability_to_bucket(proba)
    reasons = get_reasons(model, feats, FEATURE_COLUMNS)
    return RegretPrediction(
        regret_probability=round(proba, 4),
        risk_bucket=risk_bucket,
        reasons=reasons,
    )

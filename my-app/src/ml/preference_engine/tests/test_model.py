# Tests for model behavior.

from pathlib import Path

import pytest

from ml.preference_engine.model import load_model, predict
from ml.preference_engine.schemas import ItineraryItem, UserPreferences

PACKAGE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = PACKAGE_DIR / "data" / "model.pkl"


@pytest.fixture(scope="module")
def model():
    if not MODEL_PATH.exists():
        pytest.skip("Model not trained. Run: python -m ml.preference_engine.train")
    return load_model(MODEL_PATH)


def test_predict_returns_valid_shape(model) -> None:
    prefs = UserPreferences()
    item = ItineraryItem()
    pred = predict(prefs, item, model=model)
    assert 0 <= pred.regret_probability <= 1
    assert pred.risk_bucket in ("low", "medium", "high")
    assert isinstance(pred.reasons, list)


def test_extreme_overpacked_higher_risk_than_chill(model) -> None:
    low_pace_user = UserPreferences(pace=0.2, morning_tolerance=0.2, walking_effort=0.2, crowd_comfort=0.2)
    chill_item = ItineraryItem(
        start_hour=10.0,
        walking_km=1.0,
        walking_km_cumulative_day=2.0,
        crowd_level=0.2,
        activity_count_today=2,
        cost_level=0.3,
    )
    packed_item = ItineraryItem(
        start_hour=6.0,
        walking_km=8.0,
        walking_km_cumulative_day=14.0,
        crowd_level=0.9,
        activity_count_today=8,
        cost_level=0.9,
    )
    pred_chill = predict(low_pace_user, chill_item, model=model)
    pred_packed = predict(low_pace_user, packed_item, model=model)
    assert pred_packed.regret_probability >= pred_chill.regret_probability - 0.01

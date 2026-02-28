# Tests for feature extraction and monotonicity.

from ml.regret_protection_engine.config.defaults import FEATURE_COLUMNS
from ml.regret_protection_engine.features import build_features
from ml.regret_protection_engine.schemas import Context, ItineraryItem, UserPreferences


def test_build_features_returns_all_columns() -> None:
    prefs = UserPreferences()
    item = ItineraryItem()
    feats = build_features(prefs, item, None)
    for c in FEATURE_COLUMNS:
        assert c in feats, f"Missing feature {c}"


def test_more_walking_increases_walk_over_tolerance() -> None:
    prefs = UserPreferences(walking_effort=0.3)
    item_lo = ItineraryItem(walking_km=2.0, walking_km_cumulative_day=2.0)
    item_hi = ItineraryItem(walking_km=10.0, walking_km_cumulative_day=10.0)
    f_lo = build_features(prefs, item_lo, None)
    f_hi = build_features(prefs, item_hi, None)
    assert f_hi["walk_over_tolerance_km"] >= f_lo["walk_over_tolerance_km"]


def test_earlier_start_increases_early_start_violation() -> None:
    prefs = UserPreferences(morning_tolerance=0.2)
    item_late = ItineraryItem(start_hour=10.0)
    item_early = ItineraryItem(start_hour=6.0)
    f_late = build_features(prefs, item_late, None)
    f_early = build_features(prefs, item_early, None)
    assert f_early["early_start_violation"] >= f_late["early_start_violation"]


def test_higher_crowd_increases_crowd_mismatch() -> None:
    prefs = UserPreferences(crowd_comfort=0.2)
    item_lo = ItineraryItem(crowd_level=0.2)
    item_hi = ItineraryItem(crowd_level=0.9)
    f_lo = build_features(prefs, item_lo, None)
    f_hi = build_features(prefs, item_hi, None)
    assert f_hi["crowd_mismatch"] >= f_lo["crowd_mismatch"]

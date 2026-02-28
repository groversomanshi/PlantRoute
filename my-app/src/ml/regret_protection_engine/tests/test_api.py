# Tests for API contract.

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

PACKAGE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = PACKAGE_DIR / "data" / "model.pkl"


@pytest.fixture
def client():
    if not MODEL_PATH.exists():
        pytest.skip("Model not trained. Run: python -m ml.regret_protection_engine.train")
    from ml.regret_protection_engine.api import app
    return TestClient(app)


def test_health(client: TestClient) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["engine"] == "regret_protection"


def test_predict_request_response(client: TestClient) -> None:
    body = {
        "user_preferences": {
            "pace": 0.5,
            "crowd_comfort": 0.5,
            "morning_tolerance": 0.5,
            "late_night_tolerance": 0.5,
            "walking_effort": 0.5,
            "budget_comfort": 0.5,
            "planning_vs_spontaneity": 0.5,
            "noise_sensitivity": 0.5,
            "dislike_heat": False,
            "dislike_cold": False,
            "dislike_rain": False,
            "travel_vibe": "Chill",
        },
        "itinerary_item": {
            "start_hour": 12.0,
            "walking_km": 2.0,
            "crowd_level": 0.4,
            "outdoor_fraction": 0.5,
            "activity_count_today": 3,
            "cost_level": 0.5,
            "day_number": 1,
        },
        "context": None,
    }
    r = client.post("/predict", json=body)
    assert r.status_code == 200
    data = r.json()
    assert "prediction" in data
    p = data["prediction"]
    assert "regret_probability" in p
    assert "risk_bucket" in p
    assert "reasons" in p
    assert 0 <= p["regret_probability"] <= 1
    assert p["risk_bucket"] in ("low", "medium", "high")
    assert isinstance(p["reasons"], list)

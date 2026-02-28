"""
PlantRoute regret protection engine on Modal.
Safety-first regret-risk prediction; same request/response as preference_engine.
Deploy from my-app: modal deploy modal_apps/regret_protection_engine.py
Ensure src/ml/regret_protection_engine/data/model.pkl exists (run: python -m ml.regret_protection_engine.train from src/).
"""

import sys
from pathlib import Path

import modal

MOUNT_PATH = Path(__file__).resolve().parent.parent / "src"
REMOTE_WORKSPACE = "/workspace/src"

app = modal.App("plantroute-regret-protection-engine")
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("numpy", "pandas", "scikit-learn", "pydantic", "fastapi[standard]")
    .add_local_dir(str(MOUNT_PATH), remote_path=REMOTE_WORKSPACE)
)

_model_cache = None


def _get_model():
    global _model_cache
    if _model_cache is None:
        sys.path.insert(0, REMOTE_WORKSPACE)
        from ml.regret_protection_engine.model import load_model

        model_path = f"{REMOTE_WORKSPACE}/ml/regret_protection_engine/data/model.pkl"
        _model_cache = load_model(model_path)
    return _model_cache


@app.function(
    image=image,
    allow_concurrent_inputs=50,
)
@modal.web_endpoint(method="POST")
def predict(body: dict) -> dict:
    """POST with JSON body: { user_preferences, itinerary_item, context? }. Returns { prediction }."""
    sys.path.insert(0, REMOTE_WORKSPACE)
    from ml.regret_protection_engine.model import predict as run_predict
    from ml.regret_protection_engine.schemas import PredictRequest, PredictResponse

    model = _get_model()
    req = PredictRequest(**body)
    ctx = req.context if req.context is not None else None
    pred = run_predict(
        prefs=req.user_preferences,
        item=req.itinerary_item,
        ctx=ctx,
        model=model,
    )
    return PredictResponse(prediction=pred).model_dump()


@app.function(image=image)
@modal.web_endpoint(method="GET")
def health() -> dict:
    return {"status": "ok", "engine": "regret_protection"}

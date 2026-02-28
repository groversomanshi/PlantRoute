# FastAPI app for local testing; can be wrapped with Modal later.

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI

from .model import load_model, predict
from .schemas import PredictRequest, PredictResponse

_model: Optional[object] = None


def get_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        get_model()
        yield
    finally:
        pass


app = FastAPI(title="Preference Engine", description="Regret-risk prediction", lifespan=lifespan)


@app.post("/predict", response_model=PredictResponse)
def predict_endpoint(body: PredictRequest) -> PredictResponse:
    model = get_model()
    ctx = body.context if body.context is not None else None
    pred = predict(prefs=body.user_preferences, item=body.itinerary_item, ctx=ctx, model=model)
    return PredictResponse(prediction=pred)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

# FastAPI: /score, /batch_score, /health

from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI

from .model import load_model, predict_batch, predict_regret_probability
from .schemas import BatchScoreRequest, BatchScoreResponse, ScoreRequest, ScoreResponse

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


app = FastAPI(
    title="Preference Engine (XGBoost)",
    description="Fit score and regret risk for activities (travel sliders + liked attraction types)",
    lifespan=lifespan,
)


@app.post("/score", response_model=ScoreResponse)
def score(body: ScoreRequest) -> ScoreResponse:
    model = get_model()
    reg, _, explanation = predict_regret_probability(
        travel=body.travel,
        interests=body.interests,
        activity=body.activity,
        model=model,
    )
    return ScoreResponse(
        fit_score=round(1.0 - reg, 4),
        regret_probability=reg,
        explanation=explanation or None,
    )


@app.post("/batch_score", response_model=BatchScoreResponse)
def batch_score(body: BatchScoreRequest) -> BatchScoreResponse:
    model = get_model()
    scores = predict_batch(
        travel=body.travel,
        interests=body.interests,
        activities=body.activities,
        model=model,
    )
    return BatchScoreResponse(scores=scores)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine": "preference_engine_XGBoost"}

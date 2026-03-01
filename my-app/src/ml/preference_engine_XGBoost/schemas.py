# Request/response schemas (aligned with app: travel sliders + interests)

from typing import Optional
from pydantic import BaseModel, Field


class TravelPreferencesInput(BaseModel):
    trip_pace: float = Field(0.5, ge=0.0, le=1.0)
    crowd_comfort: float = Field(0.5, ge=0.0, le=1.0)
    morning_tolerance: float = Field(0.5, ge=0.0, le=1.0)
    late_night_tolerance: float = Field(0.5, ge=0.0, le=1.0)
    walking_effort: float = Field(0.5, ge=0.0, le=1.0)
    budget_level: float = Field(0.5, ge=0.0, le=1.0)
    planning_vs_spontaneity: float = Field(0.5, ge=0.0, le=1.0)
    noise_sensitivity: float = Field(0.5, ge=0.0, le=1.0)


class ActivityInput(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    category: str = Field("outdoor")
    duration_hours: float = Field(1.0, gt=0.0, le=24.0)
    emission_kg: float = Field(0.0, ge=0.0)
    price_usd: float = Field(0.0, ge=0.0)
    activity_density: Optional[float] = Field(None, ge=0.0, le=1.0)
    typical_start_hour: Optional[float] = Field(None, ge=0.0, le=24.0)
    typical_crowd_level: Optional[float] = Field(None, ge=0.0, le=1.0)


class ScoreRequest(BaseModel):
    travel: TravelPreferencesInput = Field(default_factory=TravelPreferencesInput)
    interests: list[str] = Field(default_factory=list)
    activity: ActivityInput


class ScoreResponse(BaseModel):
    fit_score: float = Field(..., ge=0.0, le=1.0)
    regret_probability: float = Field(..., ge=0.0, le=1.0)
    explanation: Optional[list[str]] = None


class BatchScoreRequest(BaseModel):
    travel: TravelPreferencesInput = Field(default_factory=TravelPreferencesInput)
    interests: list[str] = Field(default_factory=list)
    activities: list[ActivityInput]


class BatchScoreResponse(BaseModel):
    scores: list[ScoreResponse]

# Request/response schemas for the regret protection engine API.
# Identical to preference_engine for same input/output contract.

from typing import Literal, Optional

from pydantic import BaseModel, Field


TRAVEL_VIBES = ("Chill", "Adventure", "Family", "Romantic", "Nightlife")
TravelVibe = Literal["Chill", "Adventure", "Family", "Romantic", "Nightlife"]


class UserPreferences(BaseModel):
    pace: float = Field(0.5, ge=0.0, le=1.0)
    crowd_comfort: float = Field(0.5, ge=0.0, le=1.0)
    morning_tolerance: float = Field(0.5, ge=0.0, le=1.0)
    late_night_tolerance: float = Field(0.5, ge=0.0, le=1.0)
    walking_effort: float = Field(0.5, ge=0.0, le=1.0)
    budget_comfort: float = Field(0.5, ge=0.0, le=1.0)
    planning_vs_spontaneity: float = Field(0.5, ge=0.0, le=1.0)
    noise_sensitivity: float = Field(0.5, ge=0.0, le=1.0)
    dislike_heat: bool = False
    dislike_cold: bool = False
    dislike_rain: bool = False
    travel_vibe: TravelVibe = "Chill"
    additional_notes: Optional[str] = None


class ItineraryItem(BaseModel):
    start_hour: float = Field(12.0, ge=0.0, le=24.0)
    end_hour: Optional[float] = Field(None, ge=0.0, le=24.0)
    duration_hours: Optional[float] = Field(None, ge=0.0, le=24.0)
    walking_km: float = Field(0.0, ge=0.0, le=50.0)
    walking_km_cumulative_day: Optional[float] = Field(None, ge=0.0, le=50.0)
    crowd_level: float = Field(0.5, ge=0.0, le=1.0)
    outdoor_fraction: float = Field(0.5, ge=0.0, le=1.0)
    activity_count_today: int = Field(1, ge=0, le=20)
    cost_level: float = Field(0.5, ge=0.0, le=1.0)
    day_number: int = Field(1, ge=1, le=30)
    is_late_night: bool = False
    is_must_see: bool = False
    bad_weather_today: Optional[bool] = None


class Context(BaseModel):
    previous_day_walking_km: Optional[float] = Field(None, ge=0.0, le=50.0)
    previous_day_end_hour: Optional[float] = Field(None, ge=0.0, le=24.0)
    sleep_window_start_hour: Optional[float] = Field(None, ge=0.0, le=24.0)
    sleep_window_end_hour: Optional[float] = Field(None, ge=0.0, le=24.0)
    recent_pace_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class RegretReason(BaseModel):
    code: str
    message: str
    strength: Optional[float] = Field(None, ge=0.0, le=1.0)


RiskBucket = Literal["low", "medium", "high"]


class RegretPrediction(BaseModel):
    regret_probability: float = Field(..., ge=0.0, le=1.0)
    risk_bucket: RiskBucket
    reasons: list[RegretReason] = Field(default_factory=list)


class PredictRequest(BaseModel):
    user_preferences: UserPreferences
    itinerary_item: ItineraryItem
    context: Optional[Context] = None


class PredictResponse(BaseModel):
    prediction: RegretPrediction

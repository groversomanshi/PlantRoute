# Preference Engine (XGBoost)

Ranks attractions by **fit score** (travel sliders + liked attraction types) and **low CO2e**.

## Inputs

- **Travel sliders** (0–1): `trip_pace`, `crowd_comfort`, `morning_tolerance`, `late_night_tolerance`, `walking_effort`, `budget_level`, `planning_vs_spontaneity`, `noise_sensitivity`
- **Interests**: list of liked attraction types (e.g. `museum`, `culture`, `outdoor`, `nature`, `food`, `nightlife`, `wellness`, `beach`, `ski`)
- **Per activity**: `category`, `duration_hours`, `emission_kg`, `price_usd`, optional `typical_start_hour`, `typical_crowd_level`

## Outputs

- **fit_score** (0–1), **regret_probability** (0–1), optional **explanation** list

## Train

From `my-app/src`:

```bash
pip install -r ml/preference_engine_XGBoost/requirements.txt
python -m ml.preference_engine_XGBoost.train
```

Model and metadata are written to `src/ml/preference_engine_XGBoost/artifacts/`.

## API (FastAPI)

```bash
uvicorn ml.preference_engine_XGBoost.api:app --reload
```

- `POST /score` — single activity
- `POST /batch_score` — list of activities
- `GET /health`

## Use from Next.js

- **Ranked activities API:** `GET /api/recommendations/activities?city=...&limit=...`  
  Fetches activities for the city, loads user preferences (travel + `likedAttractionTypes` → `interests`), calls this engine when `PREFERENCE_ENGINE_XGBOOST_URL` is set, otherwise ranks by interest match + emission. Returns `{ activities: RankedActivity[] }` (each with `fit_score`, optional `regret_probability`, `explanation`).

- **Env:** Set `PREFERENCE_ENGINE_XGBOOST_URL` (e.g. `http://localhost:8000`) to use the XGBoost engine; if unset, the app uses fallback ranking.

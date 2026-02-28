# Preference Engine

Regret-risk prediction for travel itineraries. Given user preferences and an itinerary item, estimates the probability that the user will regret this choice.

## Setup

```bash
cd src
python -m venv venv
source venv/bin/activate   # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

## Train

```bash
cd src
python -m ml.preference_engine.train
```

## Run API locally

```bash
cd src
uvicorn ml.preference_engine.api:app --reload
```

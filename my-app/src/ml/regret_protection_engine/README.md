# Regret Protection Engine

Second model for travel itineraries.

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
python -m ml.regret_protection_engine.train
```

## Run API locally

```bash
cd src
uvicorn ml.regret_protection_engine.api:app --reload
```

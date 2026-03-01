"""
PlantRoute XGBoost preference engine on Modal.
Serves /score, /batch_score, /health for ranking attractions by fit + low CO2e.

Deploy from my-app (directory that contains both modal_apps/ and src/):
  modal deploy modal_apps/preference_engine_xgboost.py

Ensure src/ml/preference_engine_XGBoost/artifacts/model.joblib exists (run train first).
Then set PREFERENCE_ENGINE_XGBOOST_URL to the deployed Modal URL.
"""

import sys
from pathlib import Path

import modal

# Paths: run "modal deploy" from the directory that contains modal_apps/ and src/
ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "src"
REMOTE_WORKSPACE = "/workspace/src"
MODEL_REL = "ml/preference_engine_XGBoost/artifacts/model.joblib"
MODEL_LOCAL = SRC_DIR / "ml" / "preference_engine_XGBoost" / "artifacts" / "model.joblib"
MODEL_REMOTE = f"{REMOTE_WORKSPACE}/{MODEL_REL}"

app = modal.App("plantroute-preference-engine-xgboost")

# Build image: dependencies + full src tree + explicit model file so it's always included
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "numpy",
        "pandas",
        "pydantic",
        "scikit-learn",
        "xgboost",
        "joblib",
        "fastapi[standard]",
    )
    .add_local_dir(str(SRC_DIR), remote_path=REMOTE_WORKSPACE)
)

# Ensure model is in the image (in case it was gitignored or missing from dir sync)
if MODEL_LOCAL.exists():
    image = image.add_local_file(str(MODEL_LOCAL), remote_path=MODEL_REMOTE)


@app.function(
    image=image,
    env={"PREFERENCE_ENGINE_XGBOOST_MODEL_PATH": MODEL_REMOTE},
)
@modal.asgi_app(label="preference-engine-xgboost")
def create_asgi():
    sys.path.insert(0, REMOTE_WORKSPACE)
    try:
        from ml.preference_engine_XGBoost.api import app as fastapi_app
        from ml.preference_engine_XGBoost.model import load_model

        # Load model now so any missing file / joblib error is caught here (not in lifespan on first request)
        load_model()
        return fastapi_app
    except Exception as e:
        # Return a minimal ASGI app that surfaces the error so Modal logs and /health show why it failed
        from fastapi import FastAPI
        from fastapi.responses import JSONResponse

        fail_app = FastAPI()
        err_body = {"error": "Startup failed", "detail": str(e)}

        @fail_app.api_route("/health", methods=["GET"])
        @fail_app.api_route("/score", methods=["POST"])
        @fail_app.api_route("/batch_score", methods=["POST"])
        def _err():
            return JSONResponse(status_code=503, content=err_body)

        @fail_app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
        def _catch_all(path: str):
            return JSONResponse(status_code=503, content=err_body)

        return fail_app

# Train XGBoost preference model and save to artifacts/model.joblib.
# Usage: from src/ run: python -m ml.preference_engine_XGBoost.train

import json
import sys
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import train_test_split
import xgboost as xgb

if __name__ == "__main__":
    src = Path(__file__).resolve().parents[2]
    if str(src) not in sys.path:
        sys.path.insert(0, str(src))

from ml.preference_engine_XGBoost.config.defaults import (
    DEFAULT_MODEL_PATH,
    DEFAULT_RANDOM_STATE,
    DEFAULT_TRAIN_SAMPLES,
    XGBOOST_COLSAMPLE_BYTREE,
    XGBOOST_LEARNING_RATE,
    XGBOOST_MAX_DEPTH,
    XGBOOST_N_ESTIMATORS,
    XGBOOST_REG_ALPHA,
    XGBOOST_REG_LAMBDA,
    XGBOOST_SUBSAMPLE,
)
from ml.preference_engine_XGBoost.features import FEATURE_NAMES
from ml.preference_engine_XGBoost.synthetic_data import generate_dataset, save_dataset

ARTIFACTS_DIR = Path(DEFAULT_MODEL_PATH).parent
DATASET_PATH = ARTIFACTS_DIR / "synthetic_data.csv"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"
TEST_SIZE = 0.2
VAL_SIZE = 0.1


def main() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    n_samples = DEFAULT_TRAIN_SAMPLES
    print(f"Generating {n_samples} synthetic samples...")
    df = generate_dataset(n_samples=n_samples)
    save_dataset(df, DATASET_PATH)
    print(f"Saved to {DATASET_PATH}")

    X = df[FEATURE_NAMES].astype(np.float64)
    y = df["regret"].astype(np.int32)
    if y.nunique() < 2:
        raise ValueError(
            "Synthetic data has only one class. Adjust synthetic_data labeling so both 0 and 1 appear."
        )
    X_train, X_hold, y_train, y_hold = train_test_split(
        X, y, test_size=TEST_SIZE + VAL_SIZE, random_state=DEFAULT_RANDOM_STATE, stratify=y
    )
    if np.unique(y_train).size < 2:
        # Fallback: train on full dataset, use last 20% as val
        n = len(X)
        n_hold = int(n * (TEST_SIZE + VAL_SIZE))
        X_train, X_hold = X.iloc[: n - n_hold], X.iloc[-n_hold:]
        y_train, y_hold = y.iloc[: n - n_hold], y.iloc[-n_hold:]
    X_val, X_test, y_val, y_test = train_test_split(
        X_hold, y_hold,
        test_size=TEST_SIZE / (TEST_SIZE + VAL_SIZE),
        random_state=DEFAULT_RANDOM_STATE,
        stratify=y_hold if y_hold.nunique() >= 2 else None,
    )

    print("Training XGBoost classifier...")
    model = xgb.XGBClassifier(
        n_estimators=XGBOOST_N_ESTIMATORS,
        max_depth=XGBOOST_MAX_DEPTH,
        learning_rate=XGBOOST_LEARNING_RATE,
        subsample=XGBOOST_SUBSAMPLE,
        colsample_bytree=XGBOOST_COLSAMPLE_BYTREE,
        reg_alpha=XGBOOST_REG_ALPHA,
        reg_lambda=XGBOOST_REG_LAMBDA,
        random_state=DEFAULT_RANDOM_STATE,
        use_label_encoder=False,
        eval_metric="logloss",
    )
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_val)[:, 1]
    acc = accuracy_score(y_val, (proba >= 0.5).astype(int))
    auc = roc_auc_score(y_val, proba)
    print(f"Val accuracy: {acc:.3f}, Val ROC-AUC: {auc:.3f}")

    try:
        import joblib
    except ImportError:
        raise SystemExit("joblib required: pip install joblib")
    with open(DEFAULT_MODEL_PATH, "wb") as f:
        joblib.dump(model, f)
    metadata = {
        "feature_names": FEATURE_NAMES,
        "n_samples": n_samples,
        "val_accuracy": float(acc),
        "val_roc_auc": float(auc),
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved model to {DEFAULT_MODEL_PATH}, metadata to {METADATA_PATH}")


if __name__ == "__main__":
    main()

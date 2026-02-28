# Train model and save artifact.
# Usage: from src/ run: python -m ml.preference_engine.train

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

if __name__ == "__main__":
    src = Path(__file__).resolve().parents[2]
    if str(src) not in sys.path:
        sys.path.insert(0, str(src))

from ml.preference_engine.config.defaults import FEATURE_COLUMNS
from ml.preference_engine.synthetic_data import generate_dataset, save_dataset

PACKAGE_DIR = Path(__file__).resolve().parent
DATA_DIR = PACKAGE_DIR / "data"
MODEL_PATH = DATA_DIR / "model.pkl"
METADATA_PATH = DATA_DIR / "model_metadata.json"
DATASET_PATH = DATA_DIR / "synthetic_data.csv"

N_SAMPLES = 3000
TEST_SIZE = 0.2
VAL_SIZE = 0.1
RANDOM_STATE = 42


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print("Generating synthetic data...")
    df = generate_dataset(n_samples=N_SAMPLES, include_context=True)
    save_dataset(df, DATASET_PATH)
    print(f"Saved {len(df)} rows to {DATASET_PATH}")

    X = df[FEATURE_COLUMNS].astype(np.float64)
    y = df["regret"].astype(np.int32)
    X_train, X_hold, y_train, y_hold = train_test_split(
        X, y, test_size=TEST_SIZE + VAL_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_hold, y_hold, test_size=TEST_SIZE / (TEST_SIZE + VAL_SIZE), random_state=RANDOM_STATE, stratify=y_hold
    )

    print("Training logistic regression...")
    model = LogisticRegression(max_iter=500, random_state=RANDOM_STATE, C=0.5)
    model.fit(X_train, y_train)

    from sklearn.metrics import accuracy_score, roc_auc_score
    proba = model.predict_proba(X_val)[:, 1]
    acc = accuracy_score(y_val, (proba >= 0.5).astype(int))
    auc = roc_auc_score(y_val, proba)
    print(f"Val accuracy: {acc:.3f}, Val ROC-AUC: {auc:.3f}")

    import pickle
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    metadata = {
        "feature_columns": FEATURE_COLUMNS,
        "n_samples": N_SAMPLES,
        "val_accuracy": float(acc),
        "val_roc_auc": float(auc),
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved model to {MODEL_PATH}, metadata to {METADATA_PATH}")


if __name__ == "__main__":
    main()

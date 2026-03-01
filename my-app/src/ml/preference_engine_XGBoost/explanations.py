# Explain scores using XGBoost feature importances (top features for this prediction).

from typing import Any

MAX_REASONS = 3


def get_explanation(
    model: Any,
    features: dict[str, float],
    feature_columns: list[str],
    top_k: int = MAX_REASONS,
) -> list[str]:
    """Return a short list of human-readable explanation strings from top feature contributions."""
    base = model
    if hasattr(model, "calibrated_classifiers_"):
        base = model.calibrated_classifiers_[0].estimator
    if not hasattr(base, "feature_importances_"):
        return []
    importances = base.feature_importances_
    try:
        idx = {c: i for i, c in enumerate(feature_columns)}
    except Exception:
        return []
    # Weight importance by feature value so we highlight what mattered for this instance
    contributions: list[tuple[str, float]] = []
    for name, i in idx.items():
        if i >= len(importances):
            continue
        val = features.get(name, 0.0)
        imp = float(importances[i])
        contrib = imp * (1.0 + abs(val))
        contributions.append((name, contrib))
    contributions.sort(key=lambda x: -x[1])
    top = contributions[:top_k]
    return [_format(name) for name, _ in top if name]


def _format(name: str) -> str:
    """Turn feature name into a short readable line."""
    return name.replace("_", " ").strip()

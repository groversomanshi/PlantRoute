# Map feature contributions to human-readable reasons.

from typing import Any

from .config.defaults import FEATURE_NAMES_MISMATCH, MAX_REASONS, REASON_MESSAGES
from .schemas import RegretReason


def get_reasons(
    model: Any,
    features: dict[str, float],
    feature_columns: list[str],
    top_k: int = MAX_REASONS,
) -> list[RegretReason]:
    base = model
    if hasattr(model, "calibrated_classifiers_"):
        base = model.calibrated_classifiers_[0].estimator
    if not hasattr(base, "coef_"):
        return []
    coef = base.coef_[0]
    try:
        idx = {c: i for i, c in enumerate(feature_columns)}
    except Exception:
        return []
    contributions: list[tuple[str, float]] = []
    for name in FEATURE_NAMES_MISMATCH:
        if name not in idx:
            continue
        val = features.get(name, 0.0)
        c = coef[idx[name]]
        contrib = val * c
        if contrib > 1e-6:
            contributions.append((name, contrib))
    contributions.sort(key=lambda x: -x[1])
    top = contributions[:top_k]
    reasons = []
    for name, strength in top:
        if name not in REASON_MESSAGES:
            continue
        code, message = REASON_MESSAGES[name]
        reasons.append(
            RegretReason(code=code, message=message, strength=round(min(1.0, strength), 4))
        )
    return reasons

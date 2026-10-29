"""
Confidence score module.

Combines the Computer Vision similarity score and the NLP similarity score
into a single confidence score that the Backend can use to decide whether
two reports (lost item / found item) are likely a match.

The CV score is optional: if either report has no photo, pass cv_score=None
and the confidence is computed from the NLP score only.
"""

from typing import Optional

# Penalti kecil karena tanpa foto buktinya lebih lemah. Sesuaikan bersama tim.
NLP_ONLY_PENALTY = 0.9


def _clamp(value: float) -> float:
    return round(max(0.0, min(1.0, value)), 4)


def confidence_score(
    cv_score: Optional[float],
    nlp_score: float,
    cv_weight: float = 0.6,
    nlp_weight: float = 0.4,
) -> float:
    """
    Weighted combination of CV and NLP similarity scores.

    With a CV score: cv * cv_weight + nlp * nlp_weight (unchanged behaviour).
    Without one (None): NLP score only, multiplied by NLP_ONLY_PENALTY.
    """
    if cv_score is None:
        return _clamp(nlp_score * NLP_ONLY_PENALTY)

    combined = (cv_score * cv_weight) + (nlp_score * nlp_weight)
    return _clamp(combined)


def match_method(cv_score: Optional[float]) -> str:
    return "nlp_only" if cv_score is None else "cv+nlp"
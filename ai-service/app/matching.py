"""
Confidence score module.

Combines the Computer Vision similarity score and the NLP similarity score
into a single confidence score that the Backend can use to decide whether
two reports (lost item / found item) are likely a match.
"""


def confidence_score(
    cv_score: float,
    nlp_score: float,
    cv_weight: float = 0.6,
    nlp_weight: float = 0.4,
) -> float:
    """
    Weighted combination of CV and NLP similarity scores.

    Default weights favor the image comparison (0.6) slightly over the
    text comparison (0.4), since photos are usually more reliable than
    free-text descriptions for identifying a physical item. Adjust the
    weights as needed once you evaluate real data from your users.
    """
    combined = (cv_score * cv_weight) + (nlp_score * nlp_weight)
    return round(max(0.0, min(1.0, combined)), 4)

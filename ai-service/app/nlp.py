"""
NLP similarity module.

MVP implementation: uses TF-IDF vectorization + cosine similarity to compare
two pieces of text (e.g. item descriptions, locations). This has no external
model download and runs fast in CI.

This can later be swapped for sentence embeddings (e.g. the
sentence-transformers library) for better semantic matching -- the rest of
the app only depends on the text_similarity() function signature below.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def text_similarity(text1: str, text2: str) -> float:
    """
    Compare two strings and return a similarity score in [0, 1].

    1.0 means identical text, 0.0 means no shared vocabulary at all.
    """
    text1 = (text1 or "").strip()
    text2 = (text2 or "").strip()

    if not text1 or not text2:
        return 0.0

    vectorizer = TfidfVectorizer().fit([text1, text2])
    vectors = vectorizer.transform([text1, text2])
    score = cosine_similarity(vectors[0], vectors[1])[0][0]
    return round(float(score), 4)

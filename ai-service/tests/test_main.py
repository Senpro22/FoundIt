import io

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def make_image_bytes(color):
    img = Image.new("RGB", (50, 50), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_nlp_similarity_identical_text():
    response = client.post(
        "/api/nlp/similarity",
        json={"text1": "dompet hitam hilang di kantin", "text2": "dompet hitam hilang di kantin"},
    )
    assert response.status_code == 200
    assert response.json()["similarity"] == 1.0


def test_nlp_similarity_different_text():
    response = client.post(
        "/api/nlp/similarity",
        json={"text1": "dompet hitam hilang", "text2": "payung biru ditemukan"},
    )
    assert response.status_code == 200
    assert response.json()["similarity"] < 1.0


def test_cv_similarity_identical_images():
    img1 = make_image_bytes((255, 0, 0))
    img2 = make_image_bytes((255, 0, 0))
    response = client.post(
        "/api/cv/similarity",
        files={
            "image1": ("img1.png", img1, "image/png"),
            "image2": ("img2.png", img2, "image/png"),
        },
    )
    assert response.status_code == 200
    assert response.json()["similarity"] == 1.0


def test_cv_similarity_different_images():
    img1 = make_image_bytes((255, 0, 0))
    img2 = make_image_bytes((0, 0, 255))
    response = client.post(
        "/api/cv/similarity",
        files={
            "image1": ("img1.png", img1, "image/png"),
            "image2": ("img2.png", img2, "image/png"),
        },
    )
    assert response.status_code == 200
    assert 0.0 <= response.json()["similarity"] <= 1.0


def test_confidence_score():
    response = client.post(
        "/api/match/confidence",
        json={"cv_score": 0.8, "nlp_score": 0.6},
    )
    assert response.status_code == 200
    data = response.json()
    assert "confidence_score" in data
    assert 0.0 <= data["confidence_score"] <= 1.0

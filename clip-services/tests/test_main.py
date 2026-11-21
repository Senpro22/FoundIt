import io

from fastapi.testclient import TestClient
from PIL import Image

from app import clip_model
from app.main import app

client = TestClient(app)


def png(color):
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), color).save(buf, format="PNG")
    buf.seek(0)
    return buf


def kirim(a, b):
    return client.post(
        "/api/clip/similarity",
        files={
            "image1": ("a.png", a, "image/png"),
            "image2": ("b.png", b, "image/png"),
        },
    )


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_similarity_dengan_model_palsu(monkeypatch):
    monkeypatch.setattr(clip_model, "clip_similarity", lambda a, b: 0.8765)
    r = kirim(png((255, 0, 0)), png((255, 0, 0)))
    assert r.status_code == 200
    assert r.json() == {"similarity": 0.8765}


def test_file_bukan_gambar():
    r = kirim(io.BytesIO(b"bukan gambar"), png((0, 0, 255)))
    assert r.status_code == 400


def test_field_hilang():
    r = client.post("/api/clip/similarity", files={"image1": ("a.png", png((1, 2, 3)), "image/png")})
    assert r.status_code == 422
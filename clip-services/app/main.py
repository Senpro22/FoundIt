import io

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app import clip_model

app = FastAPI(
    title="FoundIt CLIP Service",
    description="Skor kemiripan visual berbasis CLIP (ViT-B/32).",
    version="0.1.0",
)


def _open(data: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(data))
        return ImageOps.exif_transpose(img).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="File bukan gambar yang valid")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/clip/similarity")
async def clip_similarity(
    image1: UploadFile = File(...),
    image2: UploadFile = File(...),
):
    img1 = _open(await image1.read())
    img2 = _open(await image2.read())
    return {"similarity": clip_model.clip_similarity(img1, img2)}
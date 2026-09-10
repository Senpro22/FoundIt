import io

from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from PIL import Image

from app.cv import image_similarity
from app.nlp import text_similarity
from app.matching import confidence_score

app = FastAPI(
    title="FoundIt AI Matching Service",
    description="AI Matching Engine (Computer Vision + NLP) for the FoundIt lost & found platform.",
    version="0.1.0",
)


class TextCompareRequest(BaseModel):
    text1: str
    text2: str


class ConfidenceRequest(BaseModel):
    cv_score: float
    nlp_score: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/cv/similarity")
async def cv_similarity(
    image1: UploadFile = File(...),
    image2: UploadFile = File(...),
):
    """Compare two uploaded images and return a visual similarity score."""
    img1 = Image.open(io.BytesIO(await image1.read())).convert("RGB")
    img2 = Image.open(io.BytesIO(await image2.read())).convert("RGB")
    score = image_similarity(img1, img2)
    return {"similarity": score}


@app.post("/api/nlp/similarity")
def nlp_similarity(payload: TextCompareRequest):
    """Compare two text descriptions and return a text similarity score."""
    score = text_similarity(payload.text1, payload.text2)
    return {"similarity": score}


@app.post("/api/match/confidence")
def match_confidence(payload: ConfidenceRequest):
    """
    Combine a CV similarity score and an NLP similarity score into a single
    confidence score. Call /api/cv/similarity and /api/nlp/similarity first,
    then pass their results here.
    """
    score = confidence_score(payload.cv_score, payload.nlp_score)
    return {"confidence_score": score}

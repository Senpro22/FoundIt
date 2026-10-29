import io
from typing import Optional

from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel, Field
from PIL import Image

from app.cv import image_similarity
from app.nlp import text_similarity
from app.matching import confidence_score, match_method

app = FastAPI(
    title="FoundIt AI Matching Service",
    description="AI Matching Engine (Computer Vision + NLP) for the FoundIt lost & found platform.",
    version="0.1.0",
)


class TextCompareRequest(BaseModel):
    text1: str
    text2: str


class ConfidenceRequest(BaseModel):
    cv_score: Optional[float] = Field(default=None, ge=0, le=1)
    nlp_score: float = Field(ge=0, le=1)


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
    confidence score. cv_score is optional: omit it (or send null) when a
    report has no photo, and the NLP score alone is used.
    """
    score = confidence_score(payload.cv_score, payload.nlp_score)
    return {
        "confidence_score": score,
        "method": match_method(payload.cv_score),
    }
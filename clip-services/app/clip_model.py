"""CLIP image similarity. Model dimuat sekali, saat pertama dipakai."""
import numpy as np
from PIL import Image

_model = None
_preprocess = None
_device = "cpu"


def _load():
    global _model, _preprocess, _device
    if _model is None:
        import open_clip
        import torch

        _device = "cuda" if torch.cuda.is_available() else "cpu"
        _model, _, _preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained="openai"
        )
        _model = _model.to(_device).eval()
    return _model, _preprocess


def embed(image: Image.Image) -> np.ndarray:
    import torch

    model, preprocess = _load()
    x = preprocess(image).unsqueeze(0).to(_device)
    with torch.no_grad():
        v = model.encode_image(x)
        v = v / v.norm(dim=-1, keepdim=True)
    return v.cpu().numpy()[0]


def clip_similarity(img1: Image.Image, img2: Image.Image) -> float:
    """Cosine similarity dua gambar, dibatasi ke [0, 1]."""
    score = float(np.dot(embed(img1), embed(img2)))
    return round(max(0.0, min(1.0, score)), 4)
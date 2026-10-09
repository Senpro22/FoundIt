"""
CLIP Similarity Service - HTTP API kecil untuk dipanggil backend Node
FoundIt - Issue #12

Kenapa HTTP API (bukan child_process)?
1. Model CLIP butuh waktu beberapa detik untuk di-load ke memori. Kalau
   dipanggil lewat child_process setiap ada request, model akan di-load
   ULANG setiap kali -> lambat banget (bisa 5-10 detik per request).
   Dengan HTTP service, model di-load SEKALI saat service start, lalu
   siap dipakai berkali-kali dengan cepat (<1 detik per request).
2. Tim sudah punya folder "ai-service" terpisah berbasis Python (dari
   kendala Node vs Python di Laporan 1) -> pola ini konsisten dengan
   arsitektur yang sudah disepakati: backend Node untuk business logic,
   ai-service Python untuk model ML, saling terhubung lewat HTTP.
3. Lebih gampang di-scale/restart terpisah dari backend utama kalau
   suatu saat modelnya diganti/di-upgrade.

Install:
    pip install flask torch transformers pillow --break-system-packages

Jalankan:
    python clip_service.py
    -> service akan jalan di http://localhost:5001

Endpoint:
    POST /compare
    Body (multipart/form-data): image1=<file>, image2=<file>
    Response: {"score": 85.3, "similarity": 0.853}

Cara backend Node manggil (contoh pakai fetch/axios dengan FormData):
    const form = new FormData();
    form.append('image1', fs.createReadStream(path1));
    form.append('image2', fs.createReadStream(path2));
    const res = await axios.post('http://localhost:5001/compare', form, {
        headers: form.getHeaders(),
    });
    console.log(res.data.score);
"""

from flask import Flask, request, jsonify
from PIL import Image
import torch
from transformers import CLIPVisionModelWithProjection, CLIPImageProcessor
import io

app = Flask(__name__)

MODEL_NAME = "openai/clip-vit-base-patch32"

print(f"Loading model {MODEL_NAME}...")
# Pakai CLIPVisionModelWithProjection: selalu mengembalikan `.image_embeds`
# secara konsisten lintas versi transformers (lebih stabil dari get_image_features)
model = CLIPVisionModelWithProjection.from_pretrained(MODEL_NAME)
processor = CLIPImageProcessor.from_pretrained(MODEL_NAME)
model.eval()
print("Model siap. Service berjalan.")


def get_embedding(image: Image.Image):
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        output = model(**inputs)
    embedding = output.image_embeds
    return embedding / embedding.norm(p=2, dim=-1, keepdim=True)


@app.route("/compare", methods=["POST"])
def compare():
    if "image1" not in request.files or "image2" not in request.files:
        return jsonify({"error": "Butuh 2 file: image1 dan image2"}), 400

    try:
        img1 = Image.open(io.BytesIO(request.files["image1"].read())).convert("RGB")
        img2 = Image.open(io.BytesIO(request.files["image2"].read())).convert("RGB")
    except Exception as e:
        return jsonify({"error": f"Gagal membaca gambar: {e}"}), 400

    emb1 = get_embedding(img1)
    emb2 = get_embedding(img2)

    similarity = torch.nn.functional.cosine_similarity(emb1, emb2).item()
    score = max(0, similarity) * 100

    return jsonify({"score": round(score, 1), "similarity": round(similarity, 3)})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)

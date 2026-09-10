# FoundIt AI Matching Service

AI Matching Engine (Computer Vision + NLP) untuk platform lost & found FoundIt.
Service ini dijalankan terpisah dari Backend utama dan dipanggil lewat HTTP API.

## Cara menjalankan lokal

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Buka `http://127.0.0.1:8000/docs` untuk lihat dokumentasi API interaktif (Swagger).

## Menjalankan test

```bash
cd ai-service
pytest -v
```

## Endpoint

| Endpoint | Method | Deskripsi |
|---|---|---|
| `/health` | GET | Cek service hidup atau tidak |
| `/api/cv/similarity` | POST | Upload 2 gambar, dapat skor kemiripan visual (0-1) |
| `/api/nlp/similarity` | POST | Kirim 2 teks deskripsi, dapat skor kemiripan teks (0-1) |
| `/api/match/confidence` | POST | Gabungkan skor CV + NLP jadi satu confidence score |

## Alur pemakaian oleh Backend

1. Backend kirim foto barang hilang + foto barang temuan ke `/api/cv/similarity`
2. Backend kirim deskripsi barang hilang + deskripsi barang temuan ke `/api/nlp/similarity`
3. Backend kirim kedua skor tadi ke `/api/match/confidence` untuk dapat confidence score akhir
4. Backend pakai confidence score itu untuk memutuskan apakah dua laporan kemungkinan cocok

## Catatan implementasi (MVP)

Implementasi saat ini sengaja dibuat ringan supaya cepat di-develop dan cepat
di-test di CI (tanpa download model besar):

- **CV**: pakai *perceptual image hashing* (`imagehash`), bukan model deep learning.
- **NLP**: pakai TF-IDF + cosine similarity (`scikit-learn`), bukan sentence embeddings.

Kalau nanti butuh akurasi lebih baik untuk foto/teks asli dari pengguna, kedua
modul ini (`app/cv.py` dan `app/nlp.py`) bisa diganti ke model pretrained
seperti **CLIP**/**ResNet** untuk gambar atau **sentence-transformers** untuk
teks, tanpa perlu mengubah `app/main.py` karena keduanya dipanggil lewat satu
fungsi (`image_similarity()` dan `text_similarity()`).
<!-- trigger CI test -->
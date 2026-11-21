# clip-services

Service skor kemiripan visual berbasis CLIP (ViT-B/32). Dipanggil backend lewat HTTP.

## Menjalankan (lokal)
Butuh Python 3.11 (torch belum mendukung 3.14).

```bash
cd clip-services
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --port 8002
```
Dokumentasi: http://127.0.0.1:8002/docs. Request pertama mengunduh model (±600 MB).

## Endpoint
| Endpoint | Method | Deskripsi |
|---|---|---|
| `/health` | GET | Cek service hidup |
| `/api/clip/similarity` | POST | Dua gambar (`image1`, `image2`), respons `{"similarity": 0-1}` |

## Tes
```bash
python -m pytest -v
```
Tes memakai model palsu, jadi tidak mengunduh torch/model.
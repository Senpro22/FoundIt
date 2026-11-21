
# Kontrak API: FoundIt AI Matching Service

Base URL (lokal): `http://127.0.0.1:8001` (usulan; backend memakai 8000)
Dokumentasi interaktif: `/docs` (Swagger)

## Alur untuk Backend

1. Ambil dua laporan: satu `tipe = "hilang"`, satu `tipe = "ditemukan"`.
2. `text_score`: kirim `deskripsi` keduanya ke `/api/nlp/similarity`.
3. `visual_score`: hanya jika KEDUA laporan punya `foto_url`, ambil gambarnya
   lalu kirim ke `/api/cv/similarity`. Jika salah satu kosong, lewati langkah ini.
4. `confidence_score`: kirim skor ke `/api/match/confidence`.
   Jika tidak ada foto, jangan kirim `cv_score` (atau kirim `null`). Jangan kirim 0.
5. Simpan ke tabel `matches`.

| Hasil AI | Kolom di tabel `matches` |
|---|---|
| `/api/cv/similarity` -> `similarity` | `visual_score` |
| `/api/nlp/similarity` -> `similarity` | `text_score` |
| `/api/match/confidence` -> `confidence_score` | `confidence_score` |

## GET /health
Respons 200: `{"status": "ok"}`

## POST /api/nlp/similarity
Body JSON:
```json
{"text1": "dompet kulit hitam hilang di kantin", "text2": "ditemukan dompet hitam bahan kulit"}
```
Respons 200:
```json
{"similarity": 0.5031}
```
Catatan: teks kosong menghasilkan 0.0. Metode TF-IDF hanya mencocokkan kata yang
sama persis, jadi sinonim dan beda bahasa tidak terdeteksi.

## POST /api/cv/similarity
Body `multipart/form-data`: dua file gambar, field `image1` dan `image2`.
Respons 200:
```json
{"similarity": 0.4688}
```
Catatan: foto benda yang sama dengan latar berbeda bisa bernilai rendah.
File yang bukan gambar saat ini menyebabkan error 500 (batasan yang diketahui).

## POST /api/match/confidence
Body JSON (`cv_score` opsional, nilai 0 sampai 1):
```json
{"cv_score": 0.8, "nlp_score": 0.6}
```
Respons 200:
```json
{"confidence_score": 0.72, "method": "cv+nlp"}
```
Tanpa foto:
```json
{"nlp_score": 0.8}
```
```json
{"confidence_score": 0.72, "method": "nlp_only"}
```

Aturan:
- Dengan `cv_score`: `0.6 * cv + 0.4 * nlp`.
- Tanpa `cv_score`: `nlp * 0.9` (penalti karena bukti lebih lemah, bisa diubah).
- Nilai di luar 0 sampai 1 ditolak dengan status 422.
- `nlp_score` wajib; jika hilang, status 422.

## Service CLIP (clip-services, port 8002)

### POST /api/clip/similarity
Body `multipart/form-data`: `image1`, `image2` (sama seperti ai-service).
Respons 200: `{"similarity": 0.8693}`
File bukan gambar: 400. Field hilang: 422.

Alur visual untuk Backend: jika kedua laporan punya foto, panggil endpoint ini
(bukan /api/cv/similarity, yang memakai hash dan kurang akurat), simpan ke `visual_score`.

## Port
| Service | Port |
|---|---|
| backend | 8000 |
| ai-service | 8001 |
| clip-services | 8002 |

## Batasan yang diketahui
- /api/cv/similarity memakai hash (AUC sekitar 0.5); gunakan /api/clip/similarity untuk skor visual
- Skor lokasi, waktu, dan kategori belum dihitung di AI service.
- Penanganan gambar rusak belum ada (500).


# AI Service — Dokumentasi API

Layanan pembanding kemiripan visual foto barang (FoundIt, Issue #12).
Memakai model **CLIP** (`openai/clip-vit-base-patch32`) lewat HTTP API kecil berbasis Flask.

| | |
|---|---|
| File | `clip_service.py` |
| Base URL (lokal) | `http://localhost:5001` |
| Format respons | JSON |
| Autentikasi | Tidak ada (lihat bagian *Catatan keamanan*) |

## 1. Menjalankan service

```bash
pip install flask torch transformers pillow
python clip_service.py
```

- Run pertama mengunduh model sekitar 600 MB dari Hugging Face (sekali saja, lalu tersimpan di cache).
- Service siap setelah muncul `Model siap. Service berjalan.`
- Daftar panjang `UNEXPECTED` saat loading **normal**: hanya bagian *vision* CLIP yang dipakai, bagian *text*-nya diabaikan.
- Peringatan `This is a development server` berasal dari Flask; cukup untuk pengembangan.

## 2. Endpoint

### `GET /health`

Mengecek service hidup.

**Respons `200`**
```json
{ "model": "openai/clip-vit-base-patch32", "status": "ok" }
```

### `POST /compare`

Membandingkan dua foto dan mengembalikan skor kemiripan visual.

**Request** — `multipart/form-data`

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `image1` | file | ya | Foto pertama (JPG/PNG/WEBP, apa pun yang bisa dibaca Pillow) |
| `image2` | file | ya | Foto kedua |

**Respons `200`**
```json
{ "score": 85.9, "similarity": 0.859 }
```

| Field | Arti |
|---|---|
| `score` | Skor 0–100 (1 desimal). Dihitung `max(0, similarity) × 100`. Ini nilai yang disimpan sebagai `visual_score`. |
| `similarity` | Cosine similarity mentah antar embedding CLIP (3 desimal). |

**Respons error `400`**
```json
{ "error": "Butuh 2 file: image1 dan image2" }
```
```json
{ "error": "Gagal membaca gambar: <detail>" }
```

**Contoh (Windows PowerShell — pakai `curl.exe`, bukan `curl`)**
```powershell
curl.exe http://localhost:5001/health
curl.exe -X POST http://localhost:5001/compare -F "image1=@foto1.jpg" -F "image2=@foto2.jpg"
```

### Catatan membaca skor

- Skor **bukan probabilitas**. 85.9 tidak berarti "85.9% pasti barang yang sama".
- Skor dibandingkan dengan *threshold hasil kalibrasi*, bukan dibaca mentah (lihat bagian 4).
- CLIP bisa memberi skor tinggi untuk dua barang **berbeda tapi sejenis** (mis. dua HP hitam). Karena itu keputusan akhir tidak hanya memakai skor visual.

## 3. Pemanggilan dari backend Node

Modul `clipCompareService.js`:

```js
const { compareImages, isClipServiceHealthy } = require('./clipCompareService');

if (await isClipServiceHealthy()) {
  const { score, similarity } = await compareImages('a.jpg', 'b.jpg');
}
```

| Pengaturan | Default | Keterangan |
|---|---|---|
| `CLIP_SERVICE_URL` (env) | `http://localhost:5001` | Alamat CLIP service |
| Timeout request | 15 detik | Di dalam `clipCompareService.js` |

## 4. Pencocokan otomatis & skor

Setiap laporan baru dibandingkan dengan laporan bertipe **berlawanan** (`hilang` ↔ `ditemukan`):

```
laporan baru
   └─ ambil kandidat (tipe berlawanan, kategori sama, bukan milik user yang sama, maks 50 terbaru)
        └─ untuk tiap kandidat:
             visual_score     = CLIP /compare (foto vs foto)
             text_score       = 50% lokasi + 30% waktu + 20% kategori
             confidence_score = 50% visual_score + 50% text_score
             └─ keputusan: buang / simpan ke `matches` / simpan + kandidat notifikasi
```

**Skor teks**

| Komponen | Aturan |
|---|---|
| Lokasi | sama = 100, berdekatan (daftar di config) = 60, beda = 20 |
| Waktu | `100 × e^(−selisih jam / 72)` dihitung dari waktu hilang ke waktu ditemukan; ditemukan >6 jam *sebelum* waktu hilang = 0 |
| Kategori | sama = 100, beda = 0 |
| Data kosong/tidak valid | skor netral 50 |

**Tabel `matches`** (skema final disepakati dengan Mayra)

| Kolom | Diisi oleh |
|---|---|
| `lost_report_id`, `found_report_id` | laporan bertipe `hilang` / `ditemukan` |
| `visual_score` | hasil `/compare` |
| `text_score` | gabungan lokasi/waktu/kategori |
| `confidence_score` | gabungan final (dipakai untuk sorting & notifikasi) |
| `status` | `pending` → `notified` / `confirmed` / `rejected` |

### Threshold keputusan

> **Status: indikasi awal.** Batas `visual_score` dikalibrasi dengan 7 dompet (7 pasang sama, 7 pasang berbeda tapi mirip): skor dompet sama 73–87,6, dompet beda 59,5–78,5, jadi **tumpang tindih**. Batas `confidence_score` belum dikalibrasi (menunggu data lokasi/waktu dari laporan asli). Ulangi dengan `node calibrate_threshold.js pairs.csv` bila data bertambah, lalu isi hasilnya ke `matchingConfig.js`.

Dua syarat harus terpenuhi **sekaligus** (gerbang visual mencegah laporan yang hanya cocok lokasi/waktunya lolos padahal fotonya berbeda).

| Keputusan | `visual_score` ≥ | `confidence_score` ≥ |
|---|---|---|
| Simpan ke `matches` | 70 | 60 |
| Kandidat notifikasi (FR 8) | 80 | 80 |
| Di bawah itu | dibuang (tidak disimpan) | |

Semua nilai ada di `matchingConfig.js`; tidak perlu mengubah logika untuk mengganti threshold.

## 5. Mengaktifkan di backend

Di route `POST /api/reports`, setelah laporan berhasil dibuat:

```js
const { createMatchingService } = require('../services/matching/matchingService');
const { createSequelizeRepo }   = require('../services/matching/sequelizeRepo');
const Report = require('../models/report');
const Match  = require('../models/match');

const matching = createMatchingService({
  repo: createSequelizeRepo({ Report, Match }),
  // notifier: async (match, { lost, found }) => { ... }   // diisi modul notifikasi (FR 8)
});

// di dalam handler, setelah Report.create(...):
res.status(201).json(report);
matching.processNewReport(report)            // jangan di-await, supaya respons ke user tidak lambat
  .catch((err) => console.error('[matching]', err.message));
```

- `foto_url` di database berupa `/uploads/nama.jpg`; folder fisiknya diatur lewat `UPLOADS_DIR` (env) atau `UPLOADS_DIR` di `matchingConfig.js`.
- `processNewReport` mengembalikan ringkasan: `compared`, `saved`, `notifyEligible`, `notified`, `discarded`, `errors`, `skipped`.
- Jika CLIP service mati, laporan dilewati (`skipped: 'clip_service_mati'`) dan **tidak** mengganggu pembuatan laporan.
- Pemrosesan ulang laporan yang sama aman: pasangan yang sudah ada diperbarui skornya, tidak diduplikasi, dan tidak memicu notifikasi dua kali.

## 6. Batasan & catatan keamanan

- **Tanpa autentikasi** dan Flask berjalan di `0.0.0.0`, jadi bisa diakses dari jaringan yang sama. Jangan diekspos ke internet. Jika backend dan service di satu mesin, ganti `host="0.0.0.0"` menjadi `host="127.0.0.1"` di `clip_service.py`.
- Belum ada batas ukuran file upload.
- Setiap perbandingan menghitung ulang embedding kedua foto. Dengan batas 50 kandidat per laporan ini cukup; bila data membesar, simpan embedding per laporan agar tidak dihitung ulang.
- Flask development server; untuk deployment gunakan WSGI server (mis. `waitress` di Windows, `gunicorn` di Linux).
- Inferensi berjalan di CPU. Waktu per perbandingan belum diukur; ukur dulu sebelum menentukan `MAX_CANDIDATES`.

## 7. Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| `CLIP service tidak merespon` | `python clip_service.py` belum jalan / terminalnya tertutup |
| `405 Method Not Allowed` di `/health` | `/health` hanya menerima `GET`, jangan pakai `-X POST` |
| `curl` error di PowerShell | Gunakan `curl.exe` (alias `curl` di PowerShell bukan curl asli) |
| `AttributeError ... 'norm'` | Versi `transformers` baru; pakai `clip_service.py` versi terbaru (`CLIPVisionModelWithProjection`) |

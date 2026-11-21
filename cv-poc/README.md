# cv-poc: image hash vs CLIP

Percobaan untuk memilih metode skor visual. Hasil lengkap: [hasil.md](hasil.md).

## Cara menjalankan
1. Buka `hash_vs_clip.ipynb` di Google Colab.
2. Unggah foto uji ke folder `foto-uji/` dengan nama `01_a.jpg`, `01_b.jpg`, dst.
   (foto tidak disimpan di repo).
3. Jalankan semua sel.

## Keputusan
CLIP (ViT-B/32) dipilih sebagai skor visual, dijalankan sebagai service terpisah
(`clip-services`). `ai-service` tetap ringan. Threshold dikalibrasi di langkah berikutnya.


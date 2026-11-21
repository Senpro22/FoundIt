# Hasil CV-PoC: average hash vs perceptual hash vs CLIP

## Tujuan
Menguji apakah CLIP (ViT-B/32) lebih baik dari image hash (metode ai-service saat ini)
untuk mencocokkan foto benda yang sama dari sisi berbeda.

## Data
- 19 benda (12 beragam jenis, 7 dompet), masing-masing 2 foto dari sisi berbeda.
- 361 pasangan: 19 cocok (benda sama), 342 tidak cocok (benda beda).
- Foto tidak disertakan di repo.

## Hasil (semua benda)
| Metode | Rata cocok | Rata beda | Selisih | AUC |
|---|---|---|---|---|
| average hash | 0.585 | 0.543 | 0.041 | 0.575 |
| phash | 0.535 | 0.516 | 0.018 | 0.492 |
| CLIP | 0.835 | 0.646 | 0.189 | 0.972 |

## Hasil (dompet vs dompet, 7 cocok, 42 tidak cocok)
| Metode | Rata cocok | Rata beda | AUC |
|---|---|---|---|
| average hash | 0.516 | 0.484 | 0.493 |
| phash | 0.522 | 0.507 | 0.486 |
| CLIP | 0.804 | 0.684 | 0.881 |

Catatan: akurasi tidak dipakai karena data sangat tidak seimbang (94.7% tidak cocok).

## Kesimpulan
- Image hash tidak membedakan benda yang sama dari sisi berbeda (AUC sekitar 0.5).
- CLIP membedakan dengan baik (AUC 0.97 semua benda, 0.88 untuk benda sejenis).
- Untuk benda sejenis CLIP sebaiknya digabung dengan skor teks dan atribut.

## Keterbatasan
- Sampel kecil (19 pasang cocok); angka bersifat indikasi.
- Pasangan tidak cocok memakai ulang foto yang sama (tidak independen).
- Threshold (CLIP ~0.80) dicari di data yang sama; perlu validasi di data terpisah.
- Foto diambil dalam kondisi relatif terkendali.

## Rekomendasi
Usulkan CLIP sebagai pengganti skor visual, sebagai service terpisah karena
ketergantungan torch yang berat. Kalibrasi threshold dengan data lebih banyak.
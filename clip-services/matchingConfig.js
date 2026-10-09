/**
 * matchingConfig.js
 * FoundIt - Issue #12 (lanjutan)
 *
 * SEMUA angka yang bisa di-tuning ada di sini (satu tempat), supaya
 * ngubah threshold nggak perlu bongkar logika.
 *
 * Threshold VISUAL (VISUAL_MIN_*) sudah dikalibrasi dengan 7 dompet
 * (7 pasang "same", 7 pasang "different"). Hasilnya masih indikasi awal:
 * skor barang sama (73-87,6) dan beda-tapi-mirip (59,5-78,5) tumpang tindih.
 * Threshold CONFIDENCE (SAVE_/NOTIFY_THRESHOLD) belum dikalibrasi (masih tebakan),
 * karena belum ada data skor lokasi/waktu dari laporan asli.
 * Ulangi kalibrasi kalau datanya bertambah:
 *   node calibrate_threshold.js pairs.csv
 */
const path = require('path');

module.exports = {
  // ------------------------------------------------------------------
  // 1. Kandidat: laporan mana saja yang dibandingkan dengan laporan baru
  // ------------------------------------------------------------------
  // Hanya bandingkan dengan laporan yang kategorinya sama. Ini ngurangin
  // jumlah panggilan CLIP secara drastis. Konsekuensi: categoryScore jadi
  // selalu 100 untuk kandidat yang lolos filter. Set false untuk matikan filter.
  REQUIRE_SAME_CATEGORY: true,

  // Jangan cocokkan laporan "hilang" dan "ditemukan" milik user yang sama.
  EXCLUDE_SAME_USER: true,

  // Batas jumlah kandidat per laporan baru (diambil dari yang terbaru).
  MAX_CANDIDATES: 50,

  // Status laporan yang boleh jadi kandidat, mis. ['approved'].
  // null = tidak difilter. TANYA MAYRA: nilai status laporan apa saja yang
  // ada, dan apakah laporan yang belum dimoderasi boleh ikut dicocokkan.
  ELIGIBLE_STATUSES: null,

  // Folder tempat foto upload disimpan (foto_url di DB hanya nama file
  // relatif, mis. "/uploads/178956.jpg"). Sesuaikan dengan backend.
  UPLOADS_DIR: process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'),

  // ------------------------------------------------------------------
  // 2. Threshold keputusan
  // ------------------------------------------------------------------
  // Dua syarat harus terpenuhi sekaligus: confidence_score DAN visual_score.
  // Gerbang visual penting supaya laporan yang cuma cocok lokasi/waktunya
  // (tapi fotonya beda jauh) tidak lolos cuma karena skor teksnya tinggi.
  //
  //   SIMPAN  (masuk tabel matches, tampil di halaman detail/hasil matching)
  //   NOTIFIKASI (kandidat kuat, dasar FR 8)
  VISUAL_MIN_SAVE: 70,    // hasil kalibrasi: di bawah skor dompet-sama terendah (73)
  SAVE_THRESHOLD: 60,
  VISUAL_MIN_NOTIFY: 80,  // hasil kalibrasi: di atas dompet-beda tertinggi (78,5), tanpa false positive
  NOTIFY_THRESHOLD: 80,

  // ------------------------------------------------------------------
  // 3. Skor teks (lokasi / waktu / kategori)
  // ------------------------------------------------------------------
  LOCATION_SCORES: { same: 100, nearby: 60, different: 20 },

  // Grup lokasi yang berdekatan (isi sesuai daftar gedung di dropdown form).
  // Contoh: [['SGLC', 'Perpustakaan'], ['Kantin', 'Masjid Kampus']]
  NEARBY_LOCATIONS: [],

  // Skor waktu turun eksponensial: 100 * exp(-selisihJam / TIME_DECAY_HOURS)
  // 72 jam -> skor jatuh ke ~37. Barang ditemukan SEBELUM waktu hilang
  // ditoleransi sampai TIME_TOLERANCE_HOURS (karena waktu hilang itu estimasi),
  // lebih dari itu skornya 0.
  TIME_DECAY_HOURS: 72,
  TIME_TOLERANCE_HOURS: 6,

  // Skor netral kalau data lokasi/waktu kosong atau tidak valid.
  NEUTRAL_SCORE: 50,
};

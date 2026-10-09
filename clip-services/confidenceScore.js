/**
 * confidenceScore.js
 * FoundIt - Issue #12 (lanjutan)
 *
 * Menggabungkan skor kemiripan visual (dari CLIP) dengan kemiripan
 * lokasi/waktu/kategori menjadi satu confidence_score akhir.
 *
 * Disesuaikan dengan skema tabel `matches` FINAL dari Mayra:
 *   visual_score      FLOAT, nullable  -- skor dari CLIP (0-100)
 *   text_score        FLOAT, nullable  -- skor gabungan lokasi/waktu/kategori (0-100)
 *   confidence_score  FLOAT            -- skor gabungan final (visual + text)
 *   status            STRING default 'pending'
 *
 * Beda dari draft awal: lokasi/waktu/kategori TIDAK disimpan sebagai 3
 * field terpisah, tapi digabung dulu jadi satu `text_score` sebelum
 * disimpan ke DB. Jadi ada 2 tahap penggabungan:
 *   1. computeTextScore()       : location + time + category -> text_score
 *   2. computeConfidenceScore() : visual_score + text_score   -> confidence_score
 */

// Bobot internal buat gabungin location/time/category jadi 1 text_score
// (jumlahnya harus 1.0)
const TEXT_WEIGHTS = {
  location: 0.5,
  time: 0.3,
  category: 0.2,
};

// Bobot gabungan akhir: visual vs text
// (visual 50% karena paling susah "dipalsukan" dibanding data teks)
const FINAL_WEIGHTS = {
  visual: 0.5,
  text: 0.5,
};

function clamp(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * Tahap 1: gabungkan skor lokasi, waktu, dan kategori jadi satu angka
 * (ini yang nanti disimpan sebagai field `text_score` di tabel matches).
 *
 * @param {number} locationScore - 0-100
 * @param {number} timeScore     - 0-100
 * @param {number} categoryScore - 0-100 (100 kalau kategori sama persis)
 * @returns {number} text_score (0-100)
 */
function computeTextScore(locationScore, timeScore, categoryScore) {
  const score =
    clamp(locationScore) * TEXT_WEIGHTS.location +
    clamp(timeScore) * TEXT_WEIGHTS.time +
    clamp(categoryScore) * TEXT_WEIGHTS.category;
  return Math.round(score * 10) / 10;
}

/**
 * Tahap 2: gabungkan visual_score (dari CLIP) dengan text_score jadi
 * confidence_score akhir (field utama buat sorting/threshold notifikasi).
 *
 * @param {number} visualScore - 0-100, bisa null kalau belum ada foto
 * @param {number} textScore   - 0-100, bisa null kalau lokasi/waktu/kategori
 *                                belum dihitung
 * @returns {number} confidence_score (0-100)
 */
function computeConfidenceScore(visualScore, textScore) {
  // Kalau salah satu null (sesuai skema yang nullable), jangan anggap 0 --
  // lebih baik pakai yang ada aja dulu, daripada confidence_score jadi
  // rendah cuma karena salah satu komponen belum sempat dihitung.
  const hasVisual = typeof visualScore === 'number';
  const hasText = typeof textScore === 'number';

  if (!hasVisual && !hasText) return null;
  if (hasVisual && !hasText) return Math.round(clamp(visualScore) * 10) / 10;
  if (!hasVisual && hasText) return Math.round(clamp(textScore) * 10) / 10;

  const score =
    clamp(visualScore) * FINAL_WEIGHTS.visual +
    clamp(textScore) * FINAL_WEIGHTS.text;
  return Math.round(score * 10) / 10;
}

/**
 * Helper gabungan: dari visual_score + 3 komponen teks mentah, langsung
 * hasilin text_score DAN confidence_score sekaligus -- siap disimpan
 * langsung ke baris tabel `matches`.
 *
 * @returns {{text_score: number, confidence_score: number}}
 */
function buildMatchScores({ visualScore, locationScore, timeScore, categoryScore }) {
  const text_score = computeTextScore(locationScore, timeScore, categoryScore);
  const confidence_score = computeConfidenceScore(visualScore, text_score);
  return { text_score, confidence_score };
}

module.exports = {
  computeTextScore,
  computeConfidenceScore,
  buildMatchScores,
  TEXT_WEIGHTS,
  FINAL_WEIGHTS,
};

/**
 * CATATAN:
 * - Field `status` ('pending' / 'notified' / 'confirmed' / 'rejected') di
 *   luar tanggung jawab file ini -- itu state machine terpisah yang
 *   diupdate oleh business logic backend (misal: jadi 'notified' kalau
 *   confidence_score lewat threshold tertentu, dan diupdate manual oleh
 *   user/petugas untuk 'confirmed'/'rejected').
 * - Bobot di atas (TEXT_WEIGHTS, FINAL_WEIGHTS) masih perkiraan awal,
 *   sama seperti draft sebelumnya, perlu di-tuning pakai data asli nanti.
 */

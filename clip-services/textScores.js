/**
 * textScores.js
 * FoundIt - Issue #12 (lanjutan)
 *
 * Menghitung skor kemiripan lokasi, waktu, dan kategori (0-100) dari
 * dua laporan. Hasilnya dimasukkan ke buildMatchScores() di
 * confidenceScore.js untuk jadi text_score.
 *
 * Semua parameter diambil dari matchingConfig.js.
 */

function normalize(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Lokasi sama = 100, berdekatan = 60, beda = 20 (default). */
function locationScore(lostLocation, foundLocation, cfg) {
  if (!lostLocation || !foundLocation) return cfg.NEUTRAL_SCORE;
  const a = normalize(lostLocation);
  const b = normalize(foundLocation);
  if (a === b) return cfg.LOCATION_SCORES.same;

  const nearby = (cfg.NEARBY_LOCATIONS || []).some((group) => {
    const g = group.map(normalize);
    return g.includes(a) && g.includes(b);
  });
  return nearby ? cfg.LOCATION_SCORES.nearby : cfg.LOCATION_SCORES.different;
}

/**
 * Makin dekat waktu ditemukan setelah waktu hilang, makin tinggi.
 * Ditemukan sebelum hilang (lewat toleransi) = 0.
 */
function timeScore(lostTime, foundTime, cfg) {
  const lost = toDate(lostTime);
  const found = toDate(foundTime);
  if (!lost || !found) return cfg.NEUTRAL_SCORE;

  const diffHours = (found.getTime() - lost.getTime()) / 3600000;
  if (diffHours < -cfg.TIME_TOLERANCE_HOURS) return 0;

  const hours = Math.max(0, diffHours);
  return round1(100 * Math.exp(-hours / cfg.TIME_DECAY_HOURS));
}

/** Kategori sama persis = 100, beda = 0. */
function categoryScore(lostCategory, foundCategory) {
  if (!lostCategory || !foundCategory) return 0;
  return normalize(lostCategory) === normalize(foundCategory) ? 100 : 0;
}

module.exports = { locationScore, timeScore, categoryScore };

/**
 * matchingService.js
 * FoundIt - Issue #12 (lanjutan)
 *
 * Alur untuk SETIAP laporan baru:
 *   1. Ambil kandidat: laporan bertipe BERLAWANAN (hilang <-> ditemukan)
 *   2. Bandingkan foto laporan baru vs foto tiap kandidat lewat CLIP service
 *   3. Hitung text_score (lokasi/waktu/kategori) lalu confidence_score
 *   4. Putuskan: buang / simpan ke tabel matches / simpan + kandidat notifikasi
 *
 * Service ini TIDAK tahu soal Sequelize. Akses database lewat `repo`
 * (lihat sequelizeRepo.js) dan pengiriman notifikasi lewat `notifier`
 * (opsional, nanti diisi modul notifikasi FR 8).
 */

const path = require('path');
const defaultClip = require('./clipCompareService');
const { buildMatchScores } = require('./confidenceScore');
const { locationScore, timeScore, categoryScore } = require('./textScores');
const defaultConfig = require('./matchingConfig');

/**
 * Keputusan berdasarkan threshold di config.
 * @returns {'discard'|'save'|'notify'}
 */
function decide({ visual, confidence }, cfg) {
  if (typeof visual !== 'number' || typeof confidence !== 'number') return 'discard';
  if (visual >= cfg.VISUAL_MIN_NOTIFY && confidence >= cfg.NOTIFY_THRESHOLD) return 'notify';
  if (visual >= cfg.VISUAL_MIN_SAVE && confidence >= cfg.SAVE_THRESHOLD) return 'save';
  return 'discard';
}

/**
 * @param {Object}   deps
 * @param {Object}   deps.repo      - { findCandidates, upsertMatch, markNotified }
 * @param {Object}   [deps.clip]    - { compareImages, isClipServiceHealthy }
 * @param {Function} [deps.notifier] - async (match, {lost, found}) => void
 * @param {Object}   [deps.config]  - override sebagian nilai matchingConfig
 * @param {Object}   [deps.logger]
 */
function createMatchingService({
  repo,
  clip = defaultClip,
  notifier = null,
  config = {},
  logger = console,
}) {
  const cfg = { ...defaultConfig, ...config };

  // foto_url di DB berupa "/uploads/nama.jpg"; ambil nama file saja
  // (basename mencegah path traversal) lalu gabung dengan folder upload.
  function photoPath(fotoUrl) {
    return path.join(cfg.UPLOADS_DIR, path.basename(fotoUrl));
  }

  async function processNewReport(report) {
    const summary = {
      reportId: report.id,
      compared: 0,
      saved: 0,
      notifyEligible: 0,
      notified: 0,
      discarded: 0,
      errors: 0,
      skipped: null,
    };

    if (report.tipe !== 'hilang' && report.tipe !== 'ditemukan') {
      summary.skipped = 'tipe_tidak_dikenal';
      return summary;
    }
    if (!report.foto_url) {
      summary.skipped = 'tanpa_foto';
      return summary;
    }
    if (!(await clip.isClipServiceHealthy())) {
      logger.warn(`[matching] CLIP service tidak aktif, laporan #${report.id} dilewati`);
      summary.skipped = 'clip_service_mati';
      return summary;
    }

    const isLost = report.tipe === 'hilang';
    const candidates = await repo.findCandidates({
      tipe: isLost ? 'ditemukan' : 'hilang',
      kategori: cfg.REQUIRE_SAME_CATEGORY ? report.kategori : undefined,
      excludeReportId: report.id,
      excludeUserId: cfg.EXCLUDE_SAME_USER ? report.user_id : undefined,
      eligibleStatuses: cfg.ELIGIBLE_STATUSES,
      limit: cfg.MAX_CANDIDATES,
    });

    for (const candidate of candidates) {
      if (!candidate.foto_url) continue;
      try {
        const { score: visual } = await clip.compareImages(
          photoPath(report.foto_url),
          photoPath(candidate.foto_url)
        );
        summary.compared++;

        const lost = isLost ? report : candidate;
        const found = isLost ? candidate : report;

        const { text_score, confidence_score } = buildMatchScores({
          visualScore: visual,
          locationScore: locationScore(lost.lokasi, found.lokasi, cfg),
          timeScore: timeScore(lost.waktu_kejadian, found.waktu_kejadian, cfg),
          categoryScore: categoryScore(lost.kategori, found.kategori),
        });

        const decision = decide({ visual, confidence: confidence_score }, cfg);
        if (decision === 'discard') {
          summary.discarded++;
          continue;
        }

        const { match } = await repo.upsertMatch({
          lost_report_id: lost.id,
          found_report_id: found.id,
          visual_score: visual,
          text_score,
          confidence_score,
        });
        summary.saved++;

        if (decision === 'notify') {
          summary.notifyEligible++;
          // Hanya notifikasi match yang belum pernah diproses (status masih 'pending')
          if (notifier && match.status === 'pending') {
            await notifier(match, { lost, found });
            await repo.markNotified(match);
            summary.notified++;
          }
        }
      } catch (err) {
        summary.errors++;
        logger.error(`[matching] gagal memproses kandidat #${candidate.id}: ${err.message}`);
      }
    }

    logger.log(
      `[matching] laporan #${report.id}: dibandingkan ${summary.compared}, ` +
      `disimpan ${summary.saved}, kandidat notifikasi ${summary.notifyEligible}, ` +
      `dibuang ${summary.discarded}, error ${summary.errors}`
    );
    return summary;
  }

  return { processNewReport, config: cfg };
}

module.exports = { createMatchingService, decide };

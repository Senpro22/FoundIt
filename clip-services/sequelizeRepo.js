/**
 * sequelizeRepo.js
 * FoundIt - Issue #12 (lanjutan)
 *
 * Implementasi akses database (Sequelize) untuk matchingService.
 *
 * ASUMSI (cocok dengan skema yang sudah dibagikan):
 *   Report: id, user_id, tipe ('hilang'|'ditemukan'), kategori, lokasi,
 *           waktu_kejadian, foto_url, status, createdAt
 *   Match : id, lost_report_id, found_report_id, visual_score, text_score,
 *           confidence_score, status (default 'pending')
 *
 * Kalau nama model/kolom di backend beda, cukup ubah di file ini.
 */
const { Op } = require('sequelize');

function createSequelizeRepo({ Report, Match }) {
  return {
    async findCandidates({ tipe, kategori, excludeReportId, excludeUserId, eligibleStatuses, limit }) {
      const where = {
        tipe,
        id: { [Op.ne]: excludeReportId },
        foto_url: { [Op.ne]: null },
      };
      if (kategori) where.kategori = kategori;
      if (excludeUserId !== undefined && excludeUserId !== null) {
        where.user_id = { [Op.ne]: excludeUserId };
      }
      if (eligibleStatuses && eligibleStatuses.length) {
        where.status = { [Op.in]: eligibleStatuses };
      }
      return Report.findAll({ where, order: [['createdAt', 'DESC']], limit });
    },

    /**
     * Insert baris match baru, atau update skor kalau pasangan yang sama
     * sudah ada. Status TIDAK di-reset (jangan menimpa 'notified'/'confirmed').
     */
    async upsertMatch(row) {
      const existing = await Match.findOne({
        where: { lost_report_id: row.lost_report_id, found_report_id: row.found_report_id },
      });
      if (existing) {
        await existing.update({
          visual_score: row.visual_score,
          text_score: row.text_score,
          confidence_score: row.confidence_score,
        });
        return { match: existing, created: false };
      }
      const match = await Match.create(row);
      return { match, created: true };
    },

    async markNotified(match) {
      await match.update({ status: 'notified' });
    },
  };
}

module.exports = { createSequelizeRepo };

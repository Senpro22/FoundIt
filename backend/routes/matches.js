const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const Match = require('../models/match');
const Report = require('../models/report');
const hitungTextScore = require('../utils/textSimilarity');
// const hitungConfidence = require('../utils/confidenceScore'); // punya Sri, aktifkan nanti

// POST dasar (buat tes manual)
router.post('/', async (req, res) => {
  try {
    const match = await Match.create(req.body);
    res.status(201).json(match);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET semua match
router.get('/', async (req, res) => {
  const matches = await Match.findAll();
  res.json(matches);
});

// GET match untuk 1 laporan (ini yang nanti dipanggil Farrel)
router.get('/report/:reportId', async (req, res) => {
  const { reportId } = req.params;
  const matches = await Match.findAll({
    where: {
      [Op.or]: [{ lost_report_id: reportId }, { found_report_id: reportId }],
    },
    order: [['confidence_score', 'DESC']],
  });
  res.json(matches);
});

// Jalankan matching untuk 1 laporan
router.post('/compute/:reportId', async (req, res) => {
  try {
    const sumber = await Report.findByPk(req.params.reportId);
    if (!sumber) return res.status(404).json({ error: 'Laporan tidak ditemukan' });

    const tipeLawan = sumber.tipe === 'hilang' ? 'ditemukan' : 'hilang';
    const kandidat = await Report.findAll({ where: { tipe: tipeLawan, status: 'approved' } });

    const hasil = [];
    for (const target of kandidat) {
      const t = hitungTextScore(sumber, target);
      const textScore = Math.round((t.kategori_score + t.lokasi_score + t.waktu_score) / 3);

      const [match] = await Match.findOrCreate({
        where: {
          lost_report_id: sumber.tipe === 'hilang' ? sumber.id : target.id,
          found_report_id: sumber.tipe === 'hilang' ? target.id : sumber.id,
        },
        defaults: { text_score: textScore, status: 'pending' },
      });
      hasil.push(match);
    }

    res.json({ pesan: `${hasil.length} kandidat match diproses`, data: hasil });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
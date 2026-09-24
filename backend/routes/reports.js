const express = require('express');
const router = express.Router();
const Report = require('../models/report');
const upload = require('../middleware/upload');
const { cekPerubahanStatus, ringkasStatistik } = require('../moderation');

router.post('/', upload.single('foto'), async (req, res) => {
  try {
    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
    const report = await Report.create({ ...req.body, foto_url });
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Statistik untuk dashboard admin. Harus di atas rute "/:id".
router.get('/stats', async (req, res) => {
  const rows = await Report.findAll({ attributes: ['status', 'tipe', 'kategori'], raw: true });
  res.json(ringkasStatistik(rows));
});

router.get('/', async (req, res) => {
  const { status, tipe } = req.query;
  const where = {};
  if (status) where.status = status;
  if (tipe) where.tipe = tipe;
  const reports = await Report.findAll({ where, order: [['createdAt', 'DESC']] });
  res.json(reports);
});

// Moderasi: setujui atau tolak satu laporan.
router.patch('/:id/status', async (req, res) => {
  const pesan = cekPerubahanStatus(req.body);
  if (pesan) return res.status(400).json({ error: pesan });

  const report = await Report.findByPk(req.params.id);
  if (!report) return res.status(404).json({ error: 'Laporan tidak ditemukan.' });

  const { status, alasan_tolak } = req.body;
  await report.update({ status, alasan_tolak: status === 'ditolak' ? alasan_tolak.trim() : null });
  res.json(report);
});

module.exports = router;

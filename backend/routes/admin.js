const express = require('express');
const router = express.Router();
const Report = require('../models/report');

// Lihat semua laporan yang masih pending (perlu dimoderasi)
router.get('/reports/pending', async (req, res) => {
  const reports = await Report.findAll({ where: { status: 'pending' } });
  res.json(reports);
});

// Setujui laporan
router.patch('/reports/:id/approve', async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    report.status = 'approved';
    await report.save();
    res.json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Tolak laporan
router.patch('/reports/:id/reject', async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    report.status = 'rejected';
    await report.save();
    res.json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Statistik dasar untuk dashboard
router.get('/stats', async (req, res) => {
  const total = await Report.count();
  const pending = await Report.count({ where: { status: 'pending' } });
  const approved = await Report.count({ where: { status: 'approved' } });
  const rejected = await Report.count({ where: { status: 'rejected' } });
  res.json({ total, pending, approved, rejected });
});

module.exports = router;
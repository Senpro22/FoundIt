const express = require('express');
const router = express.Router();
const Report = require('../models/report');

// Buat laporan baru
router.post('/', async (req, res) => {
  try {
    const report = await Report.create(req.body);
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Lihat semua laporan
router.get('/', async (req, res) => {
  const reports = await Report.findAll();
  res.json(reports);
});

module.exports = router;
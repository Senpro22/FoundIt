const express = require('express');
const router = express.Router();
const Report = require('../models/report');
const upload = require('../middleware/upload');

router.post('/', upload.single('foto'), async (req, res) => {
  try {
    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
    const report = await Report.create({ ...req.body, foto_url });
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const reports = await Report.findAll();
  res.json(reports);
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Match = require('../models/match');

router.post('/', async (req, res) => {
  try {
    const match = await Match.create(req.body);
    res.status(201).json(match);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const matches = await Match.findAll();
  res.json(matches);
});

module.exports = router;
const express = require('express');

const router = express.Router();

const adminAuth = require('../middleware/adminAuth');
const Report = require('../models/report');

const {
  STATUS,
  cekPerubahanStatus,
  ringkasStatistik,
} = require('../moderation');

const {
  validId,
} = require('../claimValidation');

// Seluruh endpoint memerlukan JWT admin
router.use(adminAuth);

router.param('id', (req, res, next, id) => {
  if (!validId(id)) {
    return res.status(400).json({
      error: 'ID laporan tidak valid.',
    });
  }

  next();
});

// GET semua laporan untuk admin
// Filter status bersifat opsional
router.get('/reports', async (req, res) => {
  const { status, tipe } = req.query;

  const where = {};

  if (status) {
    if (!STATUS.includes(status)) {
      return res.status(400).json({
        error: 'Status laporan tidak valid.',
      });
    }

    where.status = status;
  }

  if (tipe) {
    if (!['hilang', 'ditemukan'].includes(tipe)) {
      return res.status(400).json({
        error: 'Tipe laporan tidak valid.',
      });
    }

    where.tipe = tipe;
  }

  const reports = await Report.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });

  res.json(reports);
});

// GET laporan pending
router.get('/reports/pending', async (req, res) => {
  const reports = await Report.findAll({
    where: {
      status: 'pending',
    },
    order: [['createdAt', 'DESC']],
  });

  res.json(reports);
});

// Fungsi bersama untuk moderasi
async function moderasi(req, res, status, alasan_tolak) {
  const pesan = cekPerubahanStatus({
    status,
    alasan_tolak,
  });

  if (pesan) {
    return res.status(400).json({
      error: pesan,
    });
  }

  // Hanya laporan pending yang dapat dimoderasi
  const [updated] = await Report.update(
    {
      status,
      alasan_tolak:
        status === 'ditolak'
          ? alasan_tolak.trim()
          : null,
    },
    {
      where: {
        id: Number(req.params.id),
        status: 'pending',
      },
    }
  );

  if (!updated) {
    const report = await Report.findByPk(req.params.id);

    if (!report) {
      return res.status(404).json({
        error: 'Laporan tidak ditemukan.',
      });
    }

    return res.status(409).json({
      error: 'Laporan sudah dimoderasi.',
    });
  }

  const report = await Report.findByPk(req.params.id);

  res.json(report);
}

// PATCH setujui laporan
router.patch('/reports/:id/approve', async (req, res) => {
  return moderasi(
    req,
    res,
    'disetujui',
    null
  );
});

// PATCH tolak laporan
router.patch('/reports/:id/reject', async (req, res) => {
  return moderasi(
    req,
    res,
    'ditolak',
    req.body?.alasan_tolak
  );
});

// PATCH status laporan
router.patch('/reports/:id/status', async (req, res) => {
  const {
    status,
    alasan_tolak,
  } = req.body || {};

  if (!['disetujui', 'ditolak'].includes(status)) {
    return res.status(400).json({
      error: 'Status harus disetujui atau ditolak.',
    });
  }

  return moderasi(
    req,
    res,
    status,
    alasan_tolak
  );
});

// GET statistik dashboard admin
router.get('/stats', async (req, res) => {
  const rows = await Report.findAll({
    attributes: [
      'status',
      'tipe',
      'kategori',
    ],
    raw: true,
  });

  res.json(ringkasStatistik(rows));
});

module.exports = router;
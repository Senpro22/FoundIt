const express = require('express');

const router = express.Router();

const Report = require('../models/report');
const upload = require('../middleware/upload');
const adminAuth = require('../middleware/adminAuth');

const {
  cekPerubahanStatus,
  ringkasStatistik,
} = require('../moderation');

const {
  validId,
} = require('../claimValidation');

// POST laporan baru
router.post('/', upload.single('foto'), async (req, res) => {
  try {
    const foto_url = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const {
      tipe,
      kategori,
      lokasi,
      waktu_kejadian,
      deskripsi,
    } = req.body;

    const report = await Report.create({
      tipe,
      kategori,
      lokasi,
      waktu_kejadian,
      deskripsi,
      foto_url,

      // Tidak boleh ditentukan oleh pengguna
      status: 'pending',
      alasan_tolak: null,
    });

    res.status(201).json(report);

  } catch (err) {
    res.status(400).json({
      error: 'Laporan gagal disimpan.',
    });
  }
});

// GET statistik — khusus admin
router.get('/stats', adminAuth, async (req, res) => {
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

// GET katalog laporan publik
router.get('/', async (req, res) => {
  const { status, tipe } = req.query;

  // Laporan pending dan ditolak
  // tidak boleh ditampilkan ke publik
  if (status && status !== 'disetujui') {
    return res.status(400).json({
      error: 'Katalog hanya menampilkan laporan yang disetujui.',
    });
  }

  const where = {
    status: 'disetujui',
  };

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
    attributes: {
      exclude: [
        'user_id',
        'alasan_tolak',
      ],
    },
    order: [['createdAt', 'DESC']],
  });

  res.json(reports);
});

// PATCH moderasi lama — tetap tersedia,
// tetapi sekarang khusus admin
router.patch('/:id/status', adminAuth, async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({
      error: 'ID laporan tidak valid.',
    });
  }

  const {
    status,
    alasan_tolak,
  } = req.body || {};

  if (!['disetujui', 'ditolak'].includes(status)) {
    return res.status(400).json({
      error: 'Status harus disetujui atau ditolak.',
    });
  }

  const pesan = cekPerubahanStatus({
    status,
    alasan_tolak,
  });

  if (pesan) {
    return res.status(400).json({
      error: pesan,
    });
  }

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
});

module.exports = router;
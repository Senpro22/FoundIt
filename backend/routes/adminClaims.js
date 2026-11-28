const express = require('express');
const crypto = require('crypto');
const path = require('path');

const Claim = require('../models/claim');
const Report = require('../models/report');
const sequelize = require('../config/database');

const adminAuth = require('../middleware/adminAuth');
const { validId } = require('../claimValidation');

const router = express.Router();

router.use(adminAuth);

const PRIVATE_DIR = path.resolve(
  __dirname,
  '../private_uploads'
);

router.param('id', (req, res, next, id) => {
  if (!validId(id)) {
    return res.status(400).json({
      error: 'ID klaim tidak valid.',
    });
  }

  next();
});

// Daftar klaim
router.get('/', async (req, res) => {
  const where = {};

  if (req.query.status) {
    const status = req.query.status;

    if (!['menunggu', 'diterima', 'ditolak'].includes(status)) {
      return res.status(400).json({
        error: 'Status tidak valid.',
      });
    }

    where.status = status;
  }

  const claims = await Claim.findAll({
    where,
    attributes: {
      exclude: [
        'access_token_hash',
        'bukti_kepemilikan_url',
        'bukti_tambahan',
        'jawaban_verifikasi',
        'kode_serah_terima',
      ],
    },
    order: [['createdAt', 'DESC']],
  });

  res.json(claims);
});

// Detail klaim
router.get('/:id', async (req, res) => {
  const claim = await Claim.findByPk(req.params.id);

  if (!claim) {
    return res.status(404).json({
      error: 'Klaim tidak ditemukan.',
    });
  }

  const data = claim.toJSON();

  delete data.access_token_hash;
  delete data.bukti_kepemilikan_url;
  delete data.bukti_tambahan;

  res.json({
    ...data,
    jumlah_bukti: 1 + (claim.bukti_tambahan || []).length,
  });
});

// Akses bukti secara privat.
// Index 0 = KTM, index 1-3 = bukti tambahan.
router.get('/:id/evidence/:index', async (req, res) => {
  const claim = await Claim.findByPk(req.params.id);

  if (!claim) {
    return res.status(404).json({
      error: 'Klaim tidak ditemukan.',
    });
  }

  const files = [
    claim.bukti_kepemilikan_url,
    ...(claim.bukti_tambahan || []),
  ];

  const index = Number(req.params.index);
  const filename = files[index];

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    !filename ||
    path.basename(filename) !== filename
  ) {
    return res.status(404).json({
      error: 'Bukti tidak ditemukan.',
    });
  }

  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');

  res.sendFile(filename, {
    root: PRIVATE_DIR,
  });
});

// Menyetujui klaim
router.patch('/:id/approve', async (req, res) => {
  const lokasi = req.body?.lokasi_pengambilan;

  if (
    typeof lokasi !== 'string' ||
    !lokasi.trim() ||
    lokasi.length > 300
  ) {
    return res.status(400).json({
      error: 'Lokasi pengambilan wajib diisi.',
    });
  }

  const result = await sequelize.transaction(async (t) => {
    const initial = await Claim.findByPk(
      req.params.id,
      { transaction: t }
    );

    if (!initial) return { status: 404 };

    // Kunci barang untuk mencegah dua klaim diterima
    // secara bersamaan pada barang yang sama.
    const report = await Report.findByPk(
      initial.found_report_id,
      {
        transaction: t,
        lock: t.LOCK.UPDATE,
      }
    );

    if (!report || report.status !== 'disetujui') {
      return { status: 409 };
    }

    const claim = await Claim.findByPk(
      req.params.id,
      {
        transaction: t,
        lock: t.LOCK.UPDATE,
      }
    );

    if (claim.status !== 'menunggu') {
      return { status: 409 };
    }

    const accepted = await Claim.findOne({
      where: {
        found_report_id: claim.found_report_id,
        status: 'diterima',
      },
      transaction: t,
    });

    if (accepted) return { status: 409 };

    await claim.update({
      status: 'diterima',
      alasan_tolak: null,
      lokasi_pengambilan: lokasi.trim(),
      kode_serah_terima:
        crypto.randomBytes(8)
          .toString('hex')
          .toUpperCase(),
    }, { transaction: t });

    return {
      status: 200,
      id: claim.id,
    };
  });

  if (result.status === 404) {
    return res.status(404).json({
      error: 'Klaim tidak ditemukan.',
    });
  }

  if (result.status === 409) {
    return res.status(409).json({
      error: 'Klaim tidak dapat disetujui.',
    });
  }

  res.json({
    id: result.id,
    status: 'diterima',
  });
});

// Menolak klaim
router.patch('/:id/reject', async (req, res) => {
  const alasan = req.body?.alasan_tolak;

  if (
    typeof alasan !== 'string' ||
    !alasan.trim() ||
    alasan.length > 1000
  ) {
    return res.status(400).json({
      error: 'Alasan penolakan wajib diisi.',
    });
  }

  const [updated] = await Claim.update({
    status: 'ditolak',
    alasan_tolak: alasan.trim(),
  }, {
    where: {
      id: Number(req.params.id),
      status: 'menunggu',
    },
  });

  if (!updated) {
    return res.status(409).json({
      error: 'Klaim tidak tersedia atau sudah diproses.',
    });
  }

  res.json({
    id: Number(req.params.id),
    status: 'ditolak',
  });
});

// Konfirmasi serah terima
router.patch('/:id/handover', async (req, res) => {
  const kode = req.body?.kode_serah_terima;

  if (typeof kode !== 'string' || !kode.trim()) {
    return res.status(400).json({
      error: 'Kode serah terima wajib diisi.',
    });
  }

  const [updated] = await Claim.update({
    diserahkan_at: new Date(),
  }, {
    where: {
      id: Number(req.params.id),
      status: 'diterima',
      kode_serah_terima: kode.trim(),
      diserahkan_at: null,
    },
  });

  if (!updated) {
    return res.status(409).json({
      error: 'Kode salah atau barang sudah diserahkan.',
    });
  }

  res.json({
    id: Number(req.params.id),
    message: 'Serah terima berhasil dikonfirmasi.',
  });
});

module.exports = router;
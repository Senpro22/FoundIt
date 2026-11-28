const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const Claim = require('../models/claim');
const Report = require('../models/report');
const Match = require('../models/match');

const claimUpload = require('../middleware/claimUpload');

const {
  validId,
  validateClaim,
  imageExtension,
} = require('../claimValidation');

const router = express.Router();

const PRIVATE_DIR = path.resolve(
  __dirname,
  '../private_uploads'
);

const hashToken = (token) =>
  crypto.createHash('sha256')
    .update(token)
    .digest('hex');

function publicClaim(claim) {
  return {
    id: claim.id,
    match_id: claim.match_id,
    found_report_id: claim.found_report_id,
    status: claim.status,
    alasan_tolak: claim.alasan_tolak,
    kode_serah_terima: claim.kode_serah_terima,
    lokasi_pengambilan: claim.lokasi_pengambilan,
    diserahkan_at: claim.diserahkan_at,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  };
}

// POST /api/claims
router.post('/', claimUpload, async (req, res) => {
  const savedFiles = [];

  try {
    const error = validateClaim(
      req.body,
      req.files
    );

    if (error) {
      return res.status(400).json({ error });
    }

    const foundId = Number(req.body.found_report_id);

    const matchId = req.body.match_id
      ? Number(req.body.match_id)
      : null;

    const report = await Report.findByPk(foundId);

    if (!report) {
      return res.status(404).json({
        error: 'Barang temuan tidak ditemukan.',
      });
    }

    if (report.tipe !== 'ditemukan') {
      return res.status(400).json({
        error: 'Klaim hanya untuk barang temuan.',
      });
    }

    if (report.status !== 'disetujui') {
      return res.status(400).json({
        error: 'Laporan belum disetujui petugas.',
      });
    }

    if (matchId !== null) {
      const match = await Match.findByPk(matchId);

      if (!match) {
        return res.status(404).json({
          error: 'Matching tidak ditemukan.',
        });
      }

      if (match.found_report_id !== foundId) {
        return res.status(400).json({
          error: 'Matching dan barang temuan tidak sesuai.',
        });
      }
    }

    const files = [
      req.files.ktm[0],
      ...(req.files.bukti || []),
    ];

    for (const file of files) {
      if (!imageExtension(file.buffer)) {
        return res.status(400).json({
          error: 'Isi file bukan gambar yang didukung.',
        });
      }
    }

    await fs.mkdir(PRIVATE_DIR, {
      recursive: true,
      mode: 0o700,
    });

    for (const file of files) {
      const filename =
        crypto.randomUUID() +
        imageExtension(file.buffer);

      await fs.writeFile(
        path.join(PRIVATE_DIR, filename),
        file.buffer,
        { flag: 'wx', mode: 0o600 }
      );

      savedFiles.push(filename);
    }

    const accessToken =
      crypto.randomBytes(32).toString('hex');

    const claim = await Claim.create({
      match_id: matchId,
      found_report_id: foundId,
      bukti_kepemilikan_url: savedFiles[0],
      bukti_tambahan: savedFiles.slice(1),
      jawaban_verifikasi:
        req.body.jawaban_verifikasi,
      access_token_hash: hashToken(accessToken),
      status: 'menunggu',
    });

    return res.status(201).json({
      ...publicClaim(claim),
      access_token: accessToken,
    });

  } catch (err) {
    await Promise.allSettled(
      savedFiles.map((filename) =>
        fs.unlink(path.join(PRIVATE_DIR, filename))
      )
    );

    console.error('Create claim failed:', err.message);

    return res.status(500).json({
      error: 'Gagal menyimpan klaim.',
    });
  }
});

// GET /api/claims/:id
router.get('/:id', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        error: 'ID klaim tidak valid.',
      });
    }

    const token = req.get('x-claim-token');

    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(401).json({
        error: 'Token akses klaim diperlukan.',
      });
    }

    const claim = await Claim.findOne({
      where: {
        id: Number(req.params.id),
        access_token_hash: hashToken(token),
      },
    });

    if (!claim) {
      return res.status(404).json({
        error: 'Klaim tidak ditemukan.',
      });
    }

    return res.json(publicClaim(claim));

  } catch (err) {
    console.error('Get claim failed:', err.message);

    return res.status(500).json({
      error: 'Gagal mengambil status klaim.',
    });
  }
});

module.exports = router;
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const { UniqueConstraintError } = require('sequelize');

const User = require('../models/user');
const { auth } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Terlalu banyak percobaan. Coba lagi nanti.',
  },
});

function userResponse(user) {
  return {
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role,
  };
}

function createToken(user) {
  return jwt.sign(
    { sub: String(user.id) },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    }
  );
}

// REGISTER
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { nama, email, password } = req.body || {};

    if (
      typeof nama !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !nama.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: 'Nama, email, dan password wajib diisi.',
      });
    }

    if (nama.trim().length > 100) {
      return res.status(400).json({
        error: 'Nama maksimal 100 karakter.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        error: 'Format email tidak valid.',
      });
    }

    if (
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        error: 'Password minimal 8 karakter dan maksimal 72 byte.',
      });
    }

    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email sudah terdaftar.',
      });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      nama: nama.trim(),
      email: normalizedEmail,
      password_hash,
      role: 'user',
    });

    return res.status(201).json({
      message: 'Registrasi berhasil.',
      user: userResponse(user),
    });

  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      return res.status(409).json({
        error: 'Email sudah terdaftar.',
      });
    }

    console.error(err.message);

    return res.status(500).json({
      error: 'Registrasi gagal.',
    });
  }
});

// LOGIN
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        error: 'Email dan password tidak valid.',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(503).json({
        error: 'Autentikasi belum dikonfigurasi.',
      });
    }

    const user = await User.findOne({
      where: {
        email: email.trim().toLowerCase(),
      },
    });

    const valid = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!valid) {
      return res.status(401).json({
        error: 'Email atau password salah.',
      });
    }

    const token = createToken(user);

    return res.json({
      message: 'Login berhasil.',
      token,
      user: userResponse(user),
    });

  } catch (err) {
    console.error(err.message);

    return res.status(500).json({
      error: 'Login gagal.',
    });
  }
});

// PROFIL PENGGUNA
router.get('/me', auth, (req, res) => {
  return res.json({
    user: userResponse(req.user),
  });
});

module.exports = router;
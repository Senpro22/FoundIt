const jwt = require('jsonwebtoken');
const User = require('../models/user');

async function auth(req, res, next) {
  const authorization = req.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Silakan login terlebih dahulu.',
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({
      error: 'Autentikasi belum dikonfigurasi.',
    });
  }

  const token = authorization.slice(7);
  let decoded;

  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ['HS256'] }
    );
  } catch {
    return res.status(401).json({
      error: 'Token tidak valid atau sudah kedaluwarsa.',
    });
  }

  try {
    const user = await User.findByPk(decoded.sub, {
      attributes: ['id', 'nama', 'email', 'role'],
    });

    if (!user) {
      return res.status(401).json({
        error: 'Akun tidak ditemukan.',
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(500).json({
      error: 'Gagal memeriksa akun pengguna.',
    });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      error: 'Akses khusus admin.',
    });
  }

  next();
}

module.exports = { auth, requireAdmin };
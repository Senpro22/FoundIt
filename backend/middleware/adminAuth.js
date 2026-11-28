const crypto = require('crypto');

function adminAuth(req, res, next) {
  const configuredKey = process.env.ADMIN_KEY;
  const suppliedKey = req.get('x-admin-key');

  if (!configuredKey) {
    return res.status(503).json({
      error: 'Autentikasi admin belum dikonfigurasi.',
    });
  }

  if (!suppliedKey) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  const expected = Buffer.from(configuredKey);
  const received = Buffer.from(suppliedKey);

  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  ) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  next();
}

module.exports = adminAuth;
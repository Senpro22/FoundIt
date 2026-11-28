const { auth, requireAdmin } = require('./auth');

function adminAuth(req, res, next) {
  return auth(req, res, () => {
    requireAdmin(req, res, next);
  });
}

module.exports = adminAuth;
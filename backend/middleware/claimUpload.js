const multer = require('multer');

const allowedTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 4,
    fields: 6,
    fieldSize: 10000,
  },

  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Format gambar tidak didukung.'));
    }

    cb(null, true);
  },
}).fields([
  { name: 'ktm', maxCount: 1 },
  { name: 'bukti', maxCount: 3 },
]);

module.exports = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        error: err.message,
      });
    }

    next();
  });
};
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Report = sequelize.define('Report', {
  user_id: { type: DataTypes.INTEGER },
  tipe: { type: DataTypes.STRING },        // "hilang" atau "ditemukan"
  kategori: { type: DataTypes.STRING },
  lokasi: { type: DataTypes.STRING },
  waktu_kejadian: { type: DataTypes.DATE },
  deskripsi: { type: DataTypes.TEXT },
  foto_url: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
}, {
  tableName: 'reports',
  timestamps: true,
});

module.exports = Report;
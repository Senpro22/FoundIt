const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Claim = sequelize.define('Claim', {
  match_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  found_report_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  bukti_kepemilikan_url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bukti_tambahan: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  jawaban_verifikasi: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  access_token_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(
      'menunggu',
      'diterima',
      'ditolak'
    ),
    defaultValue: 'menunggu',
    allowNull: false,
  },
  alasan_tolak: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  kode_serah_terima: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lokasi_pengambilan: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  diserahkan_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'claims',
  timestamps: true,
});

module.exports = Claim;
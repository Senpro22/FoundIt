const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Match = sequelize.define('Match', {
  lost_report_id: { type: DataTypes.INTEGER, allowNull: false },
  found_report_id: { type: DataTypes.INTEGER, allowNull: false },
  visual_score: { type: DataTypes.FLOAT, allowNull: true },
  text_score: { type: DataTypes.FLOAT, allowNull: true },
  confidence_score: { type: DataTypes.FLOAT, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
}, {
  tableName: 'matches',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['lost_report_id', 'found_report_id'] },
    { fields: ['confidence_score'] },
  ],
});

module.exports = Match;
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Webhook = sequelize.define('Webhook', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING, allowNull: false },
  url:         { type: DataTypes.STRING(500), allowNull: false },
  events:      { type: DataTypes.JSON, defaultValue: [] },
  secret:      { type: DataTypes.STRING, defaultValue: '' },
  isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },
  lastStatus:  { type: DataTypes.INTEGER, allowNull: true },
  lastError:   { type: DataTypes.TEXT, allowNull: true },
  lastSentAt:  { type: DataTypes.DATE, allowNull: true },
  createdById: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'webhooks',
  timestamps: true,
  indexes: [
    { fields: ['isActive'] },
  ]
});

module.exports = Webhook;

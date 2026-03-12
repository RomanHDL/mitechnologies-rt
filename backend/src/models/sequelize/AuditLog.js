const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const AuditLog = sequelize.define('AuditLog_v2', {
  id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  entity:   { type: DataTypes.STRING, allowNull: false },
  entityId: { type: DataTypes.STRING, allowNull: false },
  action:   { type: DataTypes.ENUM('CREATE','UPDATE','DELETE','STATUS_CHANGE'), allowNull: false },
  changes:  { type: DataTypes.JSON, defaultValue: {} },
  userId:   { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  ip:       { type: DataTypes.STRING, defaultValue: '' },
  ua:       { type: DataTypes.STRING, defaultValue: '' },
}, {
  tableName: 'audit_logs_v2',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['entity','entityId'] },
    { fields: ['userId'] },
    { fields: ['createdAt'] },
  ]
});

module.exports = AuditLog;

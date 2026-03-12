const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const ReturnOrder = sequelize.define('ReturnOrder', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  rmaNumber:       { type: DataTypes.STRING, allowNull: false, unique: true },
  originalOrderId: { type: DataTypes.UUID, allowNull: true },
  reason:          { type: DataTypes.ENUM('DEFECTIVE','WRONG_ITEM','DAMAGED','OVERSTOCK','OTHER'), defaultValue: 'OTHER' },
  status:          { type: DataTypes.ENUM('PENDING','INSPECTING','APPROVED','RESTOCKED','QUARANTINED','DISPOSED','CANCELLED'), defaultValue: 'PENDING' },
  items:           { type: DataTypes.JSON, defaultValue: [] },
  qcResult:        { type: DataTypes.ENUM('PASS','FAIL','PARTIAL'), allowNull: true },
  qcNotes:         { type: DataTypes.TEXT, defaultValue: '' },
  disposition:     { type: DataTypes.ENUM('RESTOCK','QUARANTINE','DISPOSE'), allowNull: true },
  notes:           { type: DataTypes.TEXT, defaultValue: '' },
  createdById:     { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  inspectedById:   { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
  inspectedAt:     { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'return_orders',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['rmaNumber'] },
    { fields: ['status'] },
    { fields: ['createdById'] },
  ]
});

module.exports = ReturnOrder;

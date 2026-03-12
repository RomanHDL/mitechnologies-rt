const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const PickTask = sequelize.define('PickTask', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId:       { type: DataTypes.UUID, allowNull: false, references: { model: 'outbound_orders', key: 'id' } },
  palletId:      { type: DataTypes.UUID, allowNull: false, references: { model: 'pallets', key: 'id' } },
  locationId:    { type: DataTypes.UUID, allowNull: false, references: { model: 'locations', key: 'id' } },
  sku:           { type: DataTypes.STRING, allowNull: false },
  qtyRequested:  { type: DataTypes.INTEGER, allowNull: false },
  qtyPicked:     { type: DataTypes.INTEGER, defaultValue: 0 },
  status:        { type: DataTypes.ENUM('PENDING','ASSIGNED','PICKED','SHORT','CANCELLED'), defaultValue: 'PENDING' },
  assignedToId:  { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
  pickedAt:      { type: DataTypes.DATE, allowNull: true },
  scanConfirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
  sequence:      { type: DataTypes.INTEGER, defaultValue: 0 },
  notes:         { type: DataTypes.TEXT, defaultValue: '' },
}, {
  tableName: 'pick_tasks',
  timestamps: true,
  indexes: [
    { fields: ['orderId'] },
    { fields: ['status'] },
    { fields: ['assignedToId'] },
    { fields: ['palletId'] },
  ]
});

module.exports = PickTask;

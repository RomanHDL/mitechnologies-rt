const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const WarehouseTask = sequelize.define('WarehouseTask', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type:            { type: DataTypes.ENUM('PUTAWAY','PICK','TRANSFER','COUNT','INSPECT','CUSTOM'), allowNull: false },
  priority:        { type: DataTypes.ENUM('URGENT','HIGH','NORMAL','LOW'), defaultValue: 'NORMAL' },
  status:          { type: DataTypes.ENUM('PENDING','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED'), defaultValue: 'PENDING' },
  title:           { type: DataTypes.STRING, allowNull: false },
  description:     { type: DataTypes.TEXT, defaultValue: '' },
  referenceId:     { type: DataTypes.STRING, allowNull: true },
  referenceType:   { type: DataTypes.STRING, allowNull: true },
  palletId:        { type: DataTypes.UUID, allowNull: true },
  locationId:      { type: DataTypes.UUID, allowNull: true },
  targetLocationId:{ type: DataTypes.UUID, allowNull: true },
  assignedToId:    { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
  createdById:     { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  startedAt:       { type: DataTypes.DATE, allowNull: true },
  completedAt:     { type: DataTypes.DATE, allowNull: true },
  notes:           { type: DataTypes.TEXT, defaultValue: '' },
}, {
  tableName: 'warehouse_tasks',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['assignedToId'] },
    { fields: ['priority'] },
    { fields: ['assignedToId','status'] },
  ]
});

module.exports = WarehouseTask;

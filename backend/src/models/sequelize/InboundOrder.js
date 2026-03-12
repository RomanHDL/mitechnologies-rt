const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const InboundOrder = sequelize.define('InboundOrder', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderNumber:     { type: DataTypes.STRING, allowNull: false, unique: true },
  supplier:        { type: DataTypes.STRING, defaultValue: '' },
  poNumber:        { type: DataTypes.STRING, defaultValue: '' },
  truckPlate:      { type: DataTypes.STRING, defaultValue: '' },
  status:          { type: DataTypes.ENUM('ESPERADA','EN_DESCARGA','EN_INSPECCION','RECIBIDA','ALMACENADA','CANCELADA'), defaultValue: 'ESPERADA' },
  expectedItems:   { type: DataTypes.JSON, defaultValue: [] },
  receivedItems:   { type: DataTypes.JSON, defaultValue: [] },
  discrepancies:   { type: DataTypes.JSON, defaultValue: [] },
  notes:           { type: DataTypes.TEXT, defaultValue: '' },
  expectedAt:      { type: DataTypes.DATE, allowNull: true },
  receivedAt:      { type: DataTypes.DATE, allowNull: true },
  createdById:     { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  receivedById:    { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'inbound_orders',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['orderNumber'] },
    { fields: ['status'] },
    { fields: ['createdById'] },
    { fields: ['supplier'] },
    { fields: ['createdAt'] },
  ]
});

module.exports = InboundOrder;

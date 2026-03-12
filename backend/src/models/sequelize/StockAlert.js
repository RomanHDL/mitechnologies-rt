const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const StockAlert = sequelize.define('StockAlert', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sku:        { type: DataTypes.STRING, allowNull: false },
  productId:  { type: DataTypes.UUID, allowNull: false, references: { model: 'products', key: 'id' } },
  alertType:  { type: DataTypes.ENUM('LOW_STOCK','OUT_OF_STOCK','EXPIRING_SOON','EXPIRED','NO_MOVEMENT'), defaultValue: 'LOW_STOCK' },
  currentQty: { type: DataTypes.INTEGER, defaultValue: 0 },
  minStock:   { type: DataTypes.INTEGER, defaultValue: 0 },
  status:     { type: DataTypes.ENUM('ACTIVE','ACKNOWLEDGED','RESOLVED'), defaultValue: 'ACTIVE' },
  resolvedAt: { type: DataTypes.DATE, allowNull: true },
  resolvedById: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'stock_alerts',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['sku'] },
    { fields: ['alertType'] },
  ]
});

module.exports = StockAlert;

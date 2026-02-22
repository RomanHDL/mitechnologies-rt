const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Pallet = sequelize.define('Pallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  lot: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  supplier: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  receivedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  items: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  locationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'locations',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('IN_STOCK', 'OUT', 'QUARANTINE', 'DAMAGED', 'RETURNED', 'ADJUSTED'),
    defaultValue: 'IN_STOCK'
  }
}, {
  tableName: 'pallets',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['code']
    },
    {
      fields: ['locationId']
    }
  ]
});

module.exports = Pallet;

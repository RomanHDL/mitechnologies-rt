const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const OutboundOrder = sequelize.define('OutboundOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  destinationType: {
    type: DataTypes.ENUM('CLIENT', 'PRODUCTION', 'OTHER'),
    defaultValue: 'OTHER'
  },
  destinationRef: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PENDING_PICK', 'PICKED', 'SHIPPED', 'CANCELLED'),
    defaultValue: 'PENDING_PICK'
  },
  lines: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  authorizedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  fulfilledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  pallets: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  tableName: 'outbound_orders',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['orderNumber']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdById']
    }
  ]
});

module.exports = OutboundOrder;

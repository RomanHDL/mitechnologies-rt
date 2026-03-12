const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  brand: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  model: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  unit: {
    type: DataTypes.STRING,
    defaultValue: 'pz'
  },
  minStock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['sku']
    }
  ]
});

module.exports = Product;

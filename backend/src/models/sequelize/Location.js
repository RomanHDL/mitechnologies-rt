const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  area: {
    type: DataTypes.ENUM('A1', 'A2', 'A3', 'A4'),
    allowNull: false
  },
  level: {
    type: DataTypes.ENUM('A', 'B', 'C'),
    allowNull: false
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12
    }
  },
  type: {
    type: DataTypes.ENUM('RACK', 'FLOOR', 'QUARANTINE', 'RETURNS'),
    defaultValue: 'RACK'
  },
  maxPallets: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  blocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  blockedReason: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  tableName: 'locations',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['area', 'level', 'position']
    }
  ]
});

module.exports = Location;

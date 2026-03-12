const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const CycleCount = sequelize.define('CycleCount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  scope: {
    type: DataTypes.ENUM('AREA', 'LEVEL', 'CUSTOM'),
    defaultValue: 'AREA'
  },
  area: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  level: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'REVIEW', 'APPROVED', 'CLOSED', 'CANCELLED'),
    defaultValue: 'OPEN'
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
  approvedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'cycle_counts',
  timestamps: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['createdById']
    }
  ]
});

module.exports = CycleCount;

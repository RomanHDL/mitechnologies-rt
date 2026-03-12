const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const AuthLog = sequelize.define('AuthLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  event: {
    type: DataTypes.ENUM('LOGIN_SUCCESS', 'LOGIN_FAIL', 'LOGOUT'),
    allowNull: false
  },
  ip: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  ua: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  tableName: 'auth_logs',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['event']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = AuthLog;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    employeeNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fullName: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    role: {
        type: DataTypes.ENUM('ADMIN', 'SUPERVISOR', 'OPERADOR'),
        defaultValue: 'OPERADOR'
    },
    position: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    shift: {
        type: DataTypes.ENUM('DAY', 'NIGHT'),
        allowNull: true,
    },
    deviceId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    pinHash: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    pinMustChange: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    pinFailedCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    pinLockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'users',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['email'] },
        { unique: true, fields: ['employeeNumber'] }
    ]
});

module.exports = User;
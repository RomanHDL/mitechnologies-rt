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
        validate: { isEmail: true }
    },

    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
    },

    employeeNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // ✅ importante para que no haya duplicados por empleado
    },

    fullName: {
        type: DataTypes.STRING,
        defaultValue: ''
    },

    role: {
        type: DataTypes.ENUM('ADMIN', 'SUPERVISOR', 'OPERADOR'),
        defaultValue: 'OPERADOR'
    },

    // Idealmente esto será dropdown fijo después (Paso 6)
    position: {
        type: DataTypes.STRING,
        defaultValue: ''
    },

    // ✅ Turno (Paso 6/8)
    shift: {
        type: DataTypes.ENUM('DAY', 'NIGHT'),
        allowNull: true
    },

    // ✅ Dispositivo asignado (Paso 6/9)
    deviceId: {
        type: DataTypes.UUID,
        allowNull: true
    },

    // ✅ PIN login (Paso 7)
    pinHash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mustChangePin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    pinAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    pinLockedUntil: {
        type: DataTypes.DATE,
        allowNull: true
    },

    // ✅ i18n por usuario (Paso 16)
    locale: {
        type: DataTypes.STRING,
        allowNull: true
    },

    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['email'] },
        { unique: true, fields: ['employeeNumber'] }
    ]
});

module.exports = User;
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
        allowNull: true
    },

    deviceId: {
        type: DataTypes.UUID,
        allowNull: true
    },

    pinHash: {
        type: DataTypes.STRING,
        allowNull: true
    },

    // ✅ COLUMNA REAL (en tu DB existe como mustChangePin)
    mustChangePin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },

    // ✅ ALIAS para compatibilidad (NO DB)
    pinMustChange: {
        type: DataTypes.VIRTUAL,
        get() {
            return Boolean(this.getDataValue('mustChangePin'));
        },
        set(v) {
            this.setDataValue('mustChangePin', Boolean(v));
        }
    },

    // ✅ COLUMNA REAL para intentos (usa SOLO esta)
    pinAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    // ✅ ALIAS para compatibilidad (NO DB)
    pinFailedCount: {
        type: DataTypes.VIRTUAL,
        get() {
            return Number(this.getDataValue('pinAttempts') || 0);
        },
        set(v) {
            this.setDataValue('pinAttempts', Number(v || 0));
        }
    },

    pinLockedUntil: {
        type: DataTypes.DATE,
        allowNull: true
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
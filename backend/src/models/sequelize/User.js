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
    }
}, {
    tableName: 'users',
    timestamps: true,
    indexes: [{
        unique: true,
        fields: ['email']
    }]
});

module.exports = User;
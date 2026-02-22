const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const ProductionRequest = sequelize.define('ProductionRequest', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },

    area: {
        type: DataTypes.ENUM('P1', 'P2', 'P3', 'P4'),
        allowNull: false,
    },

    // Guardamos items como JSON (MySQL soporta JSON)
    items: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },

    note: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    },

    status: {
        type: DataTypes.ENUM('OPEN', 'FULFILLED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'OPEN',
    },

    requestedByUserId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
}, {
    tableName: 'production_requests',
    timestamps: true,
});

module.exports = ProductionRequest;
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const ProductionRequest = sequelize.define('ProductionRequest', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },

    area: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'P1',
    },

    subarea: {
        type: DataTypes.STRING(60),
        allowNull: true,
        defaultValue: null,
    },

    items: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },

    note: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '',
    },

    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PENDIENTE',
    },

    requestedByUserId: {
        type: DataTypes.STRING(36),
        allowNull: false,
    },
}, {
    tableName: 'production_requests',
    underscored: false,
    timestamps: true,
});

module.exports = ProductionRequest;
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

    // ✅ NUEVO: Sub-área (FFT ahora incluye Paletizado)
    subarea: {
        type: DataTypes.ENUM('Accesorios', 'Produccion', 'Paletizado', 'Sorting', 'Shipping', 'OpenCell', 'Technical'),
        allowNull: false,
        defaultValue: 'Accesorios',
    },

    items: {
        type: DataTypes.JSON,
        allowNull: false,
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

    // 🔥 CLAVE: debe ser CHAR(36) porque users.id es char(36)
    requestedByUserId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
    },
}, {
    tableName: 'production_requests',
    underscored: false,
});

module.exports = ProductionRequest;
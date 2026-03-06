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

    // ✅ Sub-área
    subarea: {
        type: DataTypes.ENUM(
            'Accesorios',
            'Produccion',
            'Paletizado',
            'Sorting',
            'Shipping',
            'OpenCell',
            'Technical'
        ),
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

    /**
     * ✅ FIX DEFINITIVO:
     * - Ahora el modelo soporta los 4 status que usa tu UI (PENDIENTE/EN PROCESO/COMPLETADA/CANCELADA)
     * - Y ADEMÁS soporta los legacy (OPEN/FULFILLED/CANCELLED) para NO romper datos viejos si existen.
     */
    status: {
        type: DataTypes.ENUM(
            'PENDIENTE',
            'EN PROCESO',
            'COMPLETADA',
            'CANCELADA',
            'OPEN',
            'FULFILLED',
            'CANCELLED'
        ),
        allowNull: false,
        defaultValue: 'PENDIENTE',
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
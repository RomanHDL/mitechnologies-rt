const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const PalletDashboardItem = sequelize.define('PalletDashboardItem', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },

    // Fecha del control (día)
    day: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },

    // PalletID del excel
    palletId: {
        type: DataTypes.STRING(80),
        allowNull: false,
    },

    // Estado del control diario
    status: {
        type: DataTypes.ENUM('PENDIENTE', 'PROCESADO'),
        allowNull: false,
        defaultValue: 'PENDIENTE',
    },

    // opcional: de qué hoja vino
    sourceSheet: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: '',
    },
}, {
    tableName: 'pallet_dashboard_items',
    underscored: false,
    indexes: [
        { unique: true, fields: ['day', 'palletId'] }, // para no duplicar al importar
    ],
});

module.exports = PalletDashboardItem;
const { DataTypes } = require('sequelize')
const { sequelize } = require('../../config/mysql')

const PalletDashboardDetail = sequelize.define('PalletDashboardDetail', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    day: { type: DataTypes.DATEONLY, allowNull: false },
    palletId: { type: DataTypes.STRING(100), allowNull: false },
    sku: { type: DataTypes.STRING(120), allowNull: true },
    qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'pallet_dashboard_details',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
})

module.exports = PalletDashboardDetail
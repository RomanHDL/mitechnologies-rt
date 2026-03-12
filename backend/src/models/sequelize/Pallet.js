const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Pallet = sequelize.define('Pallet', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    lot: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    supplier: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    receivedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    items: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    locationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'locations',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('IN_STOCK', 'OUT', 'QUARANTINE', 'DAMAGED', 'RETURNED', 'ADJUSTED'),
        defaultValue: 'IN_STOCK'
    }
}, {
    tableName: 'pallets',
    timestamps: true,
    indexes: [
        // ✅ LOS QUE YA TENÍAS
        {
            unique: true,
            fields: ['code']
        },
        {
            fields: ['locationId']
        },

        // ✅ NUEVOS (NO rompen nada): aceleran filtros/reportes
        { fields: ['status'] },
        { fields: ['lot'] },
        { fields: ['expiryDate'] },
        { fields: ['supplier'] },
        { fields: ['receivedAt'] },
        { fields: ['createdAt'] },
        { fields: ['updatedAt'] },
        // útil cuando filtras “estatus por ubicación”
        { fields: ['locationId', 'status'] }
    ]
});

module.exports = Pallet;
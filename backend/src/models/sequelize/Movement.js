const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Movement = sequelize.define('Movement', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    type: {
        type: DataTypes.ENUM('IN', 'OUT', 'TRANSFER', 'ADJUST'),
        allowNull: false
    },
    palletId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'pallets',
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    fromLocationId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'locations',
            key: 'id'
        }
    },
    toLocationId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'locations',
            key: 'id'
        }
    },
    note: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },
    itemsSnapshot: {
        type: DataTypes.JSON,
        defaultValue: []
    }
}, {
    tableName: 'movements',
    timestamps: true,
    indexes: [
        // ✅ LOS QUE YA TENÍAS
        { fields: ['palletId'] },
        { fields: ['userId'] },
        { fields: ['type'] },

        // ✅ NUEVOS (NO rompen nada): aceleran historial/alertas “no move”
        { fields: ['createdAt'] },
        { fields: ['fromLocationId'] },
        { fields: ['toLocationId'] },

        // rápido para “último movimiento por tarima”
        { fields: ['palletId', 'createdAt'] },

        // rápido para consultas por tipo por fecha
        { fields: ['type', 'createdAt'] },

        // rápido para auditoría por usuario
        { fields: ['userId', 'createdAt'] }
    ]
});

module.exports = Movement;
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Location = sequelize.define('Location', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    area: {
        type: DataTypes.ENUM('A1', 'A2', 'A3', 'A4'),
        allowNull: false
    },

    // ✅ NUEVO (para racks): F001..F125
    // NO rompe nada: si ya existe columna rack en DB, Sequelize la usará.
    // Si no existe, tendrás que hacer ALTER TABLE (te lo pongo abajo).
    rack: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },

    level: {
        type: DataTypes.ENUM('A', 'B', 'C'),
        allowNull: false
    },
    position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 12
        }
    },
    type: {
        type: DataTypes.ENUM('RACK', 'FLOOR', 'QUARANTINE', 'RETURNS'),
        defaultValue: 'RACK'
    },
    maxPallets: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: {
            min: 1
        }
    },
    notes: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },
    blocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    blockedReason: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },

    // ✅ opcional: si tu DB ya tiene code tipo A01-F059-012 lo respeta.
    // si no existe columna, NO pasa nada mientras no la uses en inserts.
    code: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'locations',
    timestamps: true,
    indexes: [
        // ✅ YA NO puede ser unique (porque se repite por rack)
        { fields: ['area', 'level', 'position'] },

        // ✅ ÚNICO correcto (rack + level + position) y opcionalmente area
        { unique: true, name: 'uniq_locations_area_rack_level_pos', fields: ['area', 'rack', 'level', 'position'] },

        // ✅ útil para búsquedas por rack
        { name: 'idx_locations_rack', fields: ['rack'] }
    ]
});

module.exports = Location;
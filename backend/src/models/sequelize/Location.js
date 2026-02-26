const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Location = sequelize.define('Location', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    // Área del almacén
    area: {
        type: DataTypes.ENUM('A1', 'A2', 'A3', 'A4', 'B2', 'C3'),
        allowNull: false
    },

    // Nivel (estante)
    level: {
        type: DataTypes.ENUM('A', 'B', 'C'),
        allowNull: false
    },

    // Posición (1..12)
    position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 12 }
    },

    // Tipo de ubicación
    type: {
        type: DataTypes.ENUM('RACK', 'FLOOR', 'QUARANTINE', 'RETURNS'),
        defaultValue: 'RACK'
    },

    // Capacidad
    maxPallets: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: { min: 1 }
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

    /**
     * ================================
     * ✅ CAMPOS PRO (NO ROMPEN NADA)
     * ================================
     * Estos campos te ayudan a:
     * - filtrar racks rápido desde DB
     * - generar/guardar code tipo A01-F059-012
     *
     * IMPORTANTE:
     * - Si NO existen en tu tabla MySQL aún, NO truena el backend,
     *   pero cuando intente leer/escribir esas columnas sí necesitarás migración.
     */
    rack: {
        type: DataTypes.STRING(4), // ej: F059
        defaultValue: '',
        allowNull: false
    },

    code: {
        type: DataTypes.STRING, // ej: A01-F059-012
        defaultValue: '',
        allowNull: false
    }

}, {
    tableName: 'locations',
    timestamps: true,
    indexes: [{
            unique: true,
            fields: ['area', 'level', 'position']
        },
        // ✅ acelera /api/locations/racks/:rackCode si usas columna rack
        {
            fields: ['rack']
        },
        // ✅ si usas búsqueda por code
        {
            fields: ['code']
        }
    ],

    hooks: {
        /**
         * ✅ Auto-calcular rack y code si vienen vacíos.
         * No rompe tu app: si ya vienen, los respeta.
         */
        beforeValidate: (loc) => {
            const level = String(loc.level || '').toUpperCase();
            const area = String(loc.area || '').toUpperCase();
            const position = Number(loc.position || 0);

            // Si no hay datos mínimos, no hacemos nada
            if (!level || !area || !position) return;

            // Si rack está vacío, intenta inferirlo desde notes/code existentes (si aplica)
            // (Si tú ya lo guardas desde seed/migración, mejor)
            if (!loc.rack) {
                // Si ya hay code tipo A01-F059-012, extraemos rack
                const c = String(loc.code || '').toUpperCase();
                const m = c.match(/-(F\d{3})-/);
                if (m) loc.rack = m[1];
            }

            // Si code está vacío y sí hay rack, lo generamos
            if (!loc.code && loc.rack) {
                const pos2 = String(position).padStart(2, '0');
                const pos3 = String(position).padStart(3, '0');
                loc.code = `${level}${pos2}-${String(loc.rack).toUpperCase()}-${pos3}`;
            }
        }
    }
});

module.exports = Location;
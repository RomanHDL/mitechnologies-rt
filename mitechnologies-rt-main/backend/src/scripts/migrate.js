require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { sequelize } = require('../models/sequelize');

async function columnExists(table, column) {
    const [rows] = await sequelize.query(
        `SELECT COUNT(*) as cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`, { replacements: [table, column] }
    );
    return rows[0].cnt > 0;
}

async function addColumnIfMissing(sql, table, column) {
    const exists = await columnExists(table, column);
    if (exists) {
        console.log(`ℹ️  Columna ya existe: ${table}.${column}`);
        return;
    }
    await sequelize.query(sql);
    console.log(`✅ Columna agregada: ${table}.${column}`);
}

async function migrate() {
    try {
        await sequelize.authenticate();

        // users.shift
        await addColumnIfMissing(
            `ALTER TABLE users ADD COLUMN shift ENUM('DAY','NIGHT') NULL AFTER position`,
            'users',
            'shift'
        );

        // users.deviceId
        await addColumnIfMissing(
            `ALTER TABLE users ADD COLUMN deviceId VARCHAR(36) NULL AFTER shift`,
            'users',
            'deviceId'
        );

        // users.pinHash
        await addColumnIfMissing(
            `ALTER TABLE users ADD COLUMN pinHash VARCHAR(255) NULL AFTER passwordHash`,
            'users',
            'pinHash'
        );

        // users.pinMustChange
        await addColumnIfMissing(
            `ALTER TABLE users ADD COLUMN pinMustChange TINYINT(1) NOT NULL DEFAULT 1 AFTER pinHash`,
            'users',
            'pinMustChange'
        );

        // users.pinFailedCount
        await addColumnIfMissing(
            `ALTER TABLE users ADD COLUMN pinFailedCount INT NOT NULL DEFAULT 0 AFTER pinMustChange`,
            'users',
            'pinFailedCount'
        );

        // users.pinLockedUntil
        await addColumnIfMissing(
            `ALTER TABLE users ADD COLUMN pinLockedUntil DATETIME NULL AFTER pinFailedCount`,
            'users',
            'pinLockedUntil'
        );

        // users.mustChangePin
        await addColumnIfMissing(
            `ALTER TABLE users ADD COLUMN mustChangePin TINYINT(1) NOT NULL DEFAULT 0 AFTER passwordHash`,
            'users',
            'mustChangePin'
        );

        // users.pinAttempts
        await addColumnIfMissing(
            `ALTER TABLE users ADD COLUMN pinAttempts INT NOT NULL DEFAULT 0 AFTER mustChangePin`,
            'users',
            'pinAttempts'
        );

        console.log("✅ Migración completada");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error en migración:", err.message);
        process.exit(1);
    }
}

migrate();
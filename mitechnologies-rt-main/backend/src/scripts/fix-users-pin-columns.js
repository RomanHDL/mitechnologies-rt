require('dotenv').config();
const { sequelize } = require('../config/mysql');

async function run() {
    try {
        console.log('🔧 Running DB fix for users table...');

        await sequelize.authenticate();
        console.log('✅ Connected to MySQL');

        // 1) Agregar pinMustChange si no existe
        await sequelize.query(`
      ALTER TABLE users
      ADD COLUMN pinMustChange TINYINT(1) NOT NULL DEFAULT 0
    `).catch((e) => {
            // Si ya existe, MySQL dará error. Lo ignoramos.
            console.log('ℹ️ pinMustChange already exists (or cannot add):', e?.message || e);
        });

        // 2) Agregar pinFailedCount si no existe (por si también falta)
        await sequelize.query(`
      ALTER TABLE users
      ADD COLUMN pinFailedCount INT NOT NULL DEFAULT 0
    `).catch((e) => {
            console.log('ℹ️ pinFailedCount already exists (or cannot add):', e?.message || e);
        });

        // 3) Agregar pinLockedUntil si no existe (por si falta)
        await sequelize.query(`
      ALTER TABLE users
      ADD COLUMN pinLockedUntil DATETIME NULL
    `).catch((e) => {
            console.log('ℹ️ pinLockedUntil already exists (or cannot add):', e?.message || e);
        });

        console.log('✅ DB fix completed');
        process.exit(0);
    } catch (err) {
        console.error('❌ DB fix failed:', err);
        process.exit(1);
    }
}

run();
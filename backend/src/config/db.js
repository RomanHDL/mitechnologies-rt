const { sequelize } = require('./mysql');

const shouldAutoSync = () => {
    // ✅ En producción NO debe correr alter automáticamente (solo si tú lo fuerzas)
    // Actívalo con DB_SYNC=1 cuando realmente quieras alterar tablas.
    if (process.env.DB_SYNC === '1') return true;

    // ✅ En development sí lo permitimos por comodidad
    return process.env.NODE_ENV === 'development';
};

const connectDB = async() => {
    try {
        await sequelize.authenticate();
        console.log('✓ MySQL connected via Sequelize');

        // ✅ Sync CONTROLADO (no rompe nada)
        if (shouldAutoSync()) {
            console.log('↻ Sequelize sync alter ENABLED (DB_SYNC=1 or NODE_ENV=development)');
            await sequelize.sync({ alter: true });
        } else {
            console.log('✓ Sequelize sync skipped (production safe)');
        }

    } catch (error) {
        console.error('DB connection failed:', error);
        process.exit(1);
    }
};

module.exports = {
    connectDB,
    sequelize
};
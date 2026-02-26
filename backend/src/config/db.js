const { sequelize } = require('./mysql');

const connectDB = async() => {
    try {
        await sequelize.authenticate();
        console.log('✓ MySQL connected via Sequelize');

        // sincroniza modelos sin borrar datos
        await sequelize.sync({
            alter: true
        });

    } catch (error) {
        console.error('DB connection failed:', error);
        process.exit(1);
    }
};

module.exports = {
    connectDB,
    sequelize
};
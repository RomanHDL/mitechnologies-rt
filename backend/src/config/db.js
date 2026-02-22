const { sequelize } = require('./mysql');

async function connectDB() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw Object.assign(new Error('Missing DATABASE_URL'), { status: 500 });

  // Import models to register them with Sequelize
  require('../models/sequelize');

  await sequelize.authenticate();
  console.log('✓ MySQL connected via Sequelize');

  // Sync models - create tables if they don't exist
  // Use alter: false to avoid modifying existing tables
  await sequelize.sync({ alter: false });
  console.log('✓ Database synced (tables created if needed)');
}

module.exports = { connectDB, sequelize };

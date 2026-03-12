const { Sequelize } = require('sequelize');

// Read DATABASE_URL from environment (Railway)
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable');
}

// Create Sequelize instance with DATABASE_URL
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    connectTimeout: 60000
  }
});

module.exports = { sequelize };

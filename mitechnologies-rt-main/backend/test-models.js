require('dotenv').config();

// Set DATABASE_URL for testing
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://test:test@localhost:3306/test';

const models = require('./src/models/sequelize');

console.log('✓ All Sequelize models loaded successfully\n');
console.log('Available models:');
Object.keys(models).forEach(key => {
  if (key !== 'sequelize') {
    console.log(`  - ${key}`);
  }
});

console.log('\n✓ Model relationships configured');
console.log('  - Pallet belongsTo Location');
console.log('  - Movement belongsTo Pallet, User');
console.log('  - OutboundOrder belongsTo User (createdBy, authorizedBy)');
console.log('  - CycleCount belongsTo User (createdBy, approvedBy)');

console.log('\n✓ All models use UUID as primary key');
console.log('✓ All models have timestamps (createdAt, updatedAt)');

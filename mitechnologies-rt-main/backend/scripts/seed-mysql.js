const bcrypt = require('bcryptjs');
require('dotenv').config();

const { sequelize } = require('../src/config/mysql');
const { User } = require('../src/models/sequelize');

async function seed() {
  try {
    console.log('🌱 Starting MySQL seed...');

    await sequelize.authenticate();
    console.log('✓ Connected to MySQL');

    await sequelize.sync();
    console.log('✓ Database synced');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mitechnologies.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const adminEmployeeNumber = process.env.ADMIN_EMPLOYEE_NUMBER || '00001';

    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (existingAdmin) {
      console.log(`ℹ Admin user already exists: ${adminEmail}`);
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      const admin = await User.create({
        email: adminEmail,
        passwordHash,
        employeeNumber: adminEmployeeNumber,
        fullName: 'Administrator',
        role: 'ADMIN',
        position: 'System Administrator',
        isActive: true
      });

      console.log(`✓ Admin user created: ${admin.email}`);
      console.log(`  Employee Number: ${admin.employeeNumber}`);
      console.log(`  Password: ${adminPassword}`);
      console.log(`  ⚠ Change this password after first login!`);
    }

    console.log('');
    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('Admin credentials:');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Employee Number: ${adminEmployeeNumber}`);
    console.log(`  Password: ${adminPassword}`);
    console.log('');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();

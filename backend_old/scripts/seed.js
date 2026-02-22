require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Location = require('../src/models/Location');
const Pallet = require('../src/models/Pallet');
const Product = require('../src/models/Product');
const Movement = require('../src/models/Movement');
const { makePalletCode } = require('../src/utils/code');

async function seed() {
  await connectDB();

  console.log('Cleaning collections...');
  await Promise.all([
    User.deleteMany({}),
    Location.deleteMany({}),
    Product.deleteMany({}),
    Pallet.deleteMany({}),
    Movement.deleteMany({})
  ]);

  console.log('Creating users...');
  const users = await User.insertMany([
    {
      email: 'admin@demo.com',
      passwordHash: await bcrypt.hash('Admin123!', 10),
      employeeNumber: '0001',
      fullName: 'Admin Demo',
      role: 'ADMIN',
      position: 'Gerente',
      isActive: true
    },
    {
      email: 'supervisor@demo.com',
      passwordHash: await bcrypt.hash('Supervisor123!', 10),
      employeeNumber: '0002',
      fullName: 'Supervisor Demo',
      role: 'SUPERVISOR',
      position: 'Supervisor',
      isActive: true
    },
    {
      email: 'operador@demo.com',
      passwordHash: await bcrypt.hash('Operador123!', 10),
      employeeNumber: '0003',
      fullName: 'Operador Demo',
      role: 'OPERADOR',
      position: 'Montacargista',
      isActive: true
    }
  ]);

  console.log('Creating products master (SKU catálogo)...');
  await Product.insertMany([
    { sku:'TV-55-4K', description:'Televisión 55" 4K', brand:'Demo', model:'55U', category:'TV', minStock: 10 },
    { sku:'TV-65-4K', description:'Televisión 65" 4K', brand:'Demo', model:'65U', category:'TV' },
    { sku:'SND-BAR', description:'Soundbar', brand:'Demo', model:'SB1', category:'Audio' },
    { sku:'CON-PS', description:'Consola', brand:'Demo', model:'G1', category:'Gaming' },
    { sku:'CTRL-PS', description:'Control', brand:'Demo', model:'C1', category:'Gaming' },
    { sku:'LAP-15', description:'Laptop 15"', brand:'Demo', model:'L15', category:'Computo' },
    { sku:'MON-27', description:'Monitor 27"', brand:'Demo', model:'M27', category:'Computo' },
    { sku:'TEL-AND', description:'Teléfono Android', brand:'Demo', model:'A1', category:'Telefonía' },
    { sku:'CAM-IP', description:'Cámara IP', brand:'Demo', model:'IP1', category:'Seguridad' },
    { sku:'ROU-WIFI6', description:'Router WiFi 6', brand:'Demo', model:'R6', category:'Redes' }
  ]);

  console.log('Creating locations A1-A4 / A-C / 1-12...');
  const areas = ['A1','A2','A3','A4'];
  const levels = ['A','B','C'];
  const locations = [];
  for (const area of areas) {
    for (const level of levels) {
      for (let pos = 1; pos <= 12; pos++) {
        locations.push({ area, level, position: pos, blocked: false });
      }
    }
  }
  const locDocs = await Location.insertMany(locations);

  console.log('Creating sample pallets...');
  // pick 8 random locations
  const sampleLocs = locDocs.slice(0, 8);
  const sampleItems = [
    [{ sku:'TV-55-4K', description:'Televisión 55" 4K', qty: 6 }, { sku:'SND-BAR', description:'Soundbar', qty: 6 }],
    [{ sku:'TV-65-4K', description:'Televisión 65" 4K', qty: 4 }],
    [{ sku:'CON-PS', description:'Consola', qty: 10 }, { sku:'CTRL-PS', description:'Control', qty: 20 }],
    [{ sku:'LAP-15', description:'Laptop 15"', qty: 8 }],
    [{ sku:'MON-27', description:'Monitor 27"', qty: 12 }],
    [{ sku:'TEL-AND', description:'Teléfono Android', qty: 30 }],
    [{ sku:'CAM-IP', description:'Cámara IP', qty: 16 }],
    [{ sku:'ROU-WIFI6', description:'Router WiFi 6', qty: 14 }]
  ];

  const pallets = [];
  for (let i=0; i<8; i++) {
    pallets.push({
      code: makePalletCode(),
      lot: `LOT-${String(i+1).padStart(3,'0')}`,
      supplier: 'Proveedor Demo',
      receivedAt: new Date(),
      items: sampleItems[i],
      location: sampleLocs[i]._id,
      status: 'IN_STOCK'
    });
  }
  const palletDocs = await Pallet.insertMany(pallets);

  console.log('Creating movements for pallets...');
  await Movement.insertMany(palletDocs.map((p, idx) => ({
    type: 'IN',
    pallet: p._id,
    user: users[1]._id, // supervisor
    fromLocation: null,
    toLocation: p.location,
    itemsSnapshot: p.items,
    note: 'Entrada (seed)'
  })));

  console.log('✓ Seed complete');
  await mongoose.connection.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

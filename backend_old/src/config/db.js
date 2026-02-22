const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw Object.assign(new Error('Missing MONGODB_URI'), { status: 500 });

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('✓ MongoDB connected');
}

module.exports = { connectDB };

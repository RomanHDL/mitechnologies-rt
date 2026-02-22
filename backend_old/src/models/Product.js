const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  brand: { type: String, default: '' },
  model: { type: String, default: '' },
  category: { type: String, default: '' },
  unit: { type: String, default: 'pz' },
  minStock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);

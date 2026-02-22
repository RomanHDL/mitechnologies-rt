const mongoose = require('mongoose');

const PalletItemSchema = new mongoose.Schema({
  sku: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  qty: { type: Number, required: true, min: 0 },
  serials: { type: [String], default: [] }
}, { _id: false });

const PalletSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  lot: { type: String, default: '' },
  supplier: { type: String, default: '' },
  receivedAt: { type: Date, default: Date.now },
  items: { type: [PalletItemSchema], default: [] },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  status: { type: String, enum: ['IN_STOCK','OUT','QUARANTINE','DAMAGED','RETURNED','ADJUSTED'], default: 'IN_STOCK' }
}, { timestamps: true });

module.exports = mongoose.model('Pallet', PalletSchema);

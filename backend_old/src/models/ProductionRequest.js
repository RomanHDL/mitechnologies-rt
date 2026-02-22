const mongoose = require('mongoose');

const ProductionRequestSchema = new mongoose.Schema({
  area: { type: String, enum: ['P1','P2','P3','P4'], required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['OPEN','FULFILLED','CANCELLED'], default: 'OPEN' },
  items: { type: Array, default: [] }, // [{sku, qty}]
  note: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ProductionRequest', ProductionRequestSchema);

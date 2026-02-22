const mongoose = require('mongoose');

const MovementSchema = new mongoose.Schema({
  type: { type: String, enum: ['IN','OUT','TRANSFER','ADJUST'], required: true },
  pallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pallet', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  fromLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
  toLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },

  note: { type: String, default: '' },

  // snapshot de items (para auditoría)
  itemsSnapshot: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Movement', MovementSchema);

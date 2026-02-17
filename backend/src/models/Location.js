const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  area: { type: String, required: true, enum: ['A1','A2','A3','A4'] },
  level: { type: String, required: true, enum: ['A','B','C'] },
  position: { type: Number, required: true, min: 1, max: 12 },

  type: { type: String, enum: ['RACK','FLOOR','QUARANTINE','RETURNS'], default: 'RACK' },
  maxPallets: { type: Number, default: 1, min: 1 },
  notes: { type: String, default: '' },

  blocked: { type: Boolean, default: false },
  blockedReason: { type: String, default: '' }
}, { timestamps: true });

LocationSchema.index({ area: 1, level: 1, position: 1 }, { unique: true });

module.exports = mongoose.model('Location', LocationSchema);

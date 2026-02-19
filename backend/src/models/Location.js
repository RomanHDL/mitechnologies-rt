const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
    rackCode: { type: String, required: true }, // F001..F125
    level: { type: String, required: true, enum: ['A', 'B', 'C'] },
    position: { type: Number, required: true }, // 01 (si usas)
    slot: { type: Number, required: true }, // 001..012

    code: { type: String, required: true, unique: true }, // A01-F059-012

    type: { type: String, enum: ['RACK', 'FLOOR', 'QUARANTINE', 'RETURNS'], default: 'RACK' },
    maxPallets: { type: Number, default: 1 },
    notes: { type: String, default: '' },

    blocked: { type: Boolean, default: false },
    blockedReason: { type: String, default: '' }

}, { timestamps: true });

LocationSchema.index({ rackCode: 1, level: 1, position: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('Location', LocationSchema);
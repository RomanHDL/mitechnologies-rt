const mongoose = require('mongoose');

const CountLineSchema = new mongoose.Schema({
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  countedItems: { type: Array, default: [] },
  systemItems: { type: Array, default: [] },
  difference: { type: Array, default: [] }
}, { _id: false });

const CycleCountSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  scope: { type: String, enum: ['AREA','LEVEL','CUSTOM'], default: 'AREA' },
  area: { type: String, default: '' },
  level: { type: String, default: '' },
  status: { type: String, enum: ['OPEN','REVIEW','APPROVED','CLOSED','CANCELLED'], default: 'OPEN' },
  lines: { type: [CountLineSchema], default: [] },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('CycleCount', CycleCountSchema);

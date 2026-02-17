const mongoose = require('mongoose');

const OrderLineSchema = new mongoose.Schema({
  sku: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  qty: { type: Number, required: true, min: 1 }
}, { _id: false });

const OutboundOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, required: true },
  destinationType: { type: String, enum: ['CLIENT','PRODUCTION','OTHER'], default: 'OTHER' },
  destinationRef: { type: String, default: '' },
  status: { type: String, enum: ['DRAFT','PENDING_PICK','PICKED','SHIPPED','CANCELLED'], default: 'PENDING_PICK' },
  lines: { type: [OrderLineSchema], default: [] },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fulfilledAt: { type: Date, default: null },
  pallets: { type: [mongoose.Schema.Types.ObjectId], ref: 'Pallet', default: [] }
}, { timestamps: true });

module.exports = mongoose.model('OutboundOrder', OutboundOrderSchema);

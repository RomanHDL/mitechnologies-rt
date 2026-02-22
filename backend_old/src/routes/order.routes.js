const express = require('express');
const OutboundOrder = require('../models/OutboundOrder');
const Pallet = require('../models/Pallet');
const Location = require('../models/Location');
const Movement = require('../models/Movement');
const { requireAuth, requireOutboundAuthorization } = require('../middleware/auth');

const router = express.Router();

function emitRT(req, payload){
  const io = req.app.get('io');
  if (!io) return;
  io.emit('movement:new', payload);
  io.emit('dashboard:update', { at: new Date().toISOString() });
}


function makeOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = Math.floor(Math.random()*9000)+1000;
  return `SO-${ymd}-${rand}`;
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await OutboundOrder.find({})
      .populate('createdBy', 'email')
      .populate('authorizedBy', 'email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', requireAuth, requireOutboundAuthorization, async (req, res, next) => {
  try {
    const { destinationType, destinationRef, lines, notes } = req.body || {};
    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ message: 'Líneas requeridas' });

    const row = await OutboundOrder.create({
      orderNumber: makeOrderNumber(),
      destinationType: destinationType || 'OTHER',
      destinationRef: destinationRef || '',
      status: 'PENDING_PICK',
      lines,
      notes: notes || '',
      createdBy: req.user._id,
      authorizedBy: req.user._id
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.post('/:id/fulfill', requireAuth, requireOutboundAuthorization, async (req, res, next) => {
  try {
    const { palletIds, note } = req.body || {};
    if (!Array.isArray(palletIds) || palletIds.length === 0) return res.status(400).json({ message: 'palletIds requerido' });

    const order = await OutboundOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
    if (['CANCELLED','SHIPPED'].includes(order.status)) return res.status(400).json({ message: 'Orden no editable' });

    const pallets = await Pallet.find({ _id: { $in: palletIds } });
    for (const p of pallets) {
      if (p.status !== 'IN_STOCK') return res.status(400).json({ message: `Tarima ${p.code} no está disponible` });
    }

    for (const p of pallets) {
      const fromLoc = await Location.findById(p.location);
      p.status = 'OUT';
      await p.save();

      const mv = await Movement.create({
        type: 'OUT',
        pallet: p._id,
        user: req.user._id,
        fromLocation: fromLoc?._id || null,
        toLocation: null,
        itemsSnapshot: p.items,
        note: `Salida por orden ${order.orderNumber}. ${note || ''}`.trim()
      });
      emitRT(req, mv);
    }

    order.status = 'PICKED';
    order.pallets = palletIds;
    order.fulfilledAt = new Date();
    await order.save();

    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.patch('/:id/status', requireAuth, requireOutboundAuthorization, async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['DRAFT','PENDING_PICK','PICKED','SHIPPED','CANCELLED'].includes(status)) return res.status(400).json({ message: 'Status inválido' });
    const row = await OutboundOrder.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!row) return res.status(404).json({ message: 'No encontrado' });
    res.json(row);
  } catch (e) { next(e); }
});

module.exports = router;

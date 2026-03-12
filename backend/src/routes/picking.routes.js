// Módulo 6: Picking guiado con confirmación QR
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { PickTask, OutboundOrder, Pallet, Location, User, Movement } = require('../models/sequelize');
const { Op } = require('sequelize');

// POST /api/picking/generate/:orderId — generate pick list from order
router.post('/generate/:orderId', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const order = await OutboundOrder.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const lines = Array.isArray(order.lines) ? order.lines : [];
    if (!lines.length) return res.status(400).json({ message: 'Order has no lines' });

    const created = [];
    let seq = 1;

    for (const line of lines) {
      const sku = line.sku;
      const qtyNeeded = line.qty || 0;
      if (!sku || qtyNeeded <= 0) continue;

      // find pallets with this SKU: FEFO (expiry first), then FIFO fallback
      const pallets = await Pallet.findAll({
        where: { status: 'IN_STOCK' },
        include: [{ model: Location, as: 'location' }],
        order: [['expiryDate','ASC','NULLS LAST'],['receivedAt','ASC']],
      });

      let remaining = qtyNeeded;
      for (const p of pallets) {
        if (remaining <= 0) break;
        const items = Array.isArray(p.items) ? p.items : [];
        const match = items.find(i => String(i.sku).toUpperCase() === String(sku).toUpperCase());
        if (!match || !match.qty) continue;

        const pickQty = Math.min(remaining, match.qty);
        const task = await PickTask.create({
          orderId: order.id,
          palletId: p.id,
          locationId: p.locationId,
          sku,
          qtyRequested: pickQty,
          sequence: seq++,
          assignedToId: req.body.assignedToId || null,
          status: req.body.assignedToId ? 'ASSIGNED' : 'PENDING',
        });
        created.push(task);
        remaining -= pickQty;
      }

      // if still remaining, create a SHORT task
      if (remaining > 0) {
        created.push({ sku, shortage: remaining, message: 'Insufficient stock' });
      }
    }

    res.locals.emit = [{ event: 'picking:update', data: { orderId: order.id } }];
    res.status(201).json({ orderId: order.id, tasks: created });
  } catch(e) { next(e); }
});

// GET /api/picking/order/:orderId — get pick tasks for an order
router.get('/order/:orderId', requireAuth, async (req, res, next) => {
  try {
    const tasks = await PickTask.findAll({
      where: { orderId: req.params.orderId },
      order: [['sequence','ASC']],
      include: [
        { model: Pallet, as: 'pallet', attributes: ['id','code','lot','items'] },
        { model: Location, as: 'location' },
        { model: User, as: 'assignedTo', attributes: ['id','fullName','employeeNumber'] },
      ]
    });
    res.json(tasks);
  } catch(e) { next(e); }
});

// GET /api/picking/my — my assigned pick tasks
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const tasks = await PickTask.findAll({
      where: { assignedToId: req.user.id, status: { [Op.in]: ['ASSIGNED','PENDING'] } },
      order: [['sequence','ASC']],
      include: [
        { model: Pallet, as: 'pallet', attributes: ['id','code','lot','items'] },
        { model: Location, as: 'location' },
        { model: OutboundOrder, as: 'order', attributes: ['id','orderNumber','destinationRef'] },
      ]
    });
    res.json(tasks);
  } catch(e) { next(e); }
});

// PATCH /api/picking/:id/confirm — confirm pick via QR scan
router.patch('/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const task = await PickTask.findByPk(req.params.id, {
      include: [{ model: Pallet, as: 'pallet' }]
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const { scannedCode, qtyPicked } = req.body;

    // validate QR matches
    if (scannedCode && task.pallet && task.pallet.code !== scannedCode) {
      return res.status(400).json({ message: 'Scanned code does not match expected pallet', expected: task.pallet.code, scanned: scannedCode });
    }

    task.qtyPicked = qtyPicked || task.qtyRequested;
    task.status = task.qtyPicked >= task.qtyRequested ? 'PICKED' : 'SHORT';
    task.scanConfirmed = !!scannedCode;
    task.pickedAt = new Date();
    await task.save();

    res.locals.emit = [{ event: 'picking:update', data: { id: task.id, orderId: task.orderId } }];
    res.json(task);
  } catch(e) { next(e); }
});

module.exports = router;

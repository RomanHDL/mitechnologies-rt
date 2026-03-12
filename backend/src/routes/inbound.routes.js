const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { InboundOrder, User } = require('../models/sequelize');
const { Op } = require('sequelize');
const crypto = require('crypto');

function makeInboundNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `REC-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// GET /api/inbound — list all
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const where = {};
    if (status) where.status = status;
    if (q) {
      where[Op.or] = [
        { orderNumber: { [Op.like]: `%${q}%` } },
        { supplier: { [Op.like]: `%${q}%` } },
        { poNumber: { [Op.like]: `%${q}%` } },
      ];
    }
    const rows = await InboundOrder.findAll({
      where, order: [['createdAt','DESC']],
      include: [
        { model: User, as: 'createdBy', attributes: ['id','fullName','employeeNumber'] },
        { model: User, as: 'receivedBy', attributes: ['id','fullName','employeeNumber'] },
      ]
    });
    res.json(rows);
  } catch(e) { next(e); }
});

// GET /api/inbound/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const row = await InboundOrder.findByPk(req.params.id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id','fullName','employeeNumber'] },
        { model: User, as: 'receivedBy', attributes: ['id','fullName','employeeNumber'] },
      ]
    });
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(row);
  } catch(e) { next(e); }
});

// POST /api/inbound — create
router.post('/', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const { supplier, poNumber, truckPlate, expectedItems, notes, expectedAt } = req.body;
    const order = await InboundOrder.create({
      orderNumber: makeInboundNumber(),
      supplier: supplier || '',
      poNumber: poNumber || '',
      truckPlate: truckPlate || '',
      expectedItems: expectedItems || [],
      notes: notes || '',
      expectedAt: expectedAt || null,
      createdById: req.user.id,
    });
    res.locals.emit = [{ event: 'inbound:update', data: { id: order.id } }];
    res.status(201).json(order);
  } catch(e) { next(e); }
});

// PATCH /api/inbound/:id/status — advance status
router.patch('/:id/status', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const order = await InboundOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    const { status } = req.body;
    const allowed = ['ESPERADA','EN_DESCARGA','EN_INSPECCION','RECIBIDA','ALMACENADA','CANCELADA'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    order.status = status;
    if (status === 'RECIBIDA') {
      order.receivedAt = new Date();
      order.receivedById = req.user.id;
    }
    await order.save();
    res.locals.emit = [{ event: 'inbound:update', data: { id: order.id } }];
    res.json(order);
  } catch(e) { next(e); }
});

// PATCH /api/inbound/:id/receive — register received items + auto-discrepancy
router.patch('/:id/receive', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const order = await InboundOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    const { receivedItems } = req.body;
    if (!Array.isArray(receivedItems)) return res.status(400).json({ message: 'receivedItems required' });

    order.receivedItems = receivedItems;

    // auto-calculate discrepancies
    const expected = Array.isArray(order.expectedItems) ? order.expectedItems : [];
    const discrepancies = [];
    const recMap = {};
    receivedItems.forEach(r => { recMap[r.sku] = (recMap[r.sku] || 0) + (r.qty || 0); });
    const expMap = {};
    expected.forEach(e => { expMap[e.sku] = (expMap[e.sku] || 0) + (e.qty || 0); });
    const allSkus = new Set([...Object.keys(expMap), ...Object.keys(recMap)]);
    allSkus.forEach(sku => {
      const exp = expMap[sku] || 0;
      const rec = recMap[sku] || 0;
      if (exp !== rec) discrepancies.push({ sku, expected: exp, received: rec, diff: rec - exp });
    });
    order.discrepancies = discrepancies;
    order.receivedAt = new Date();
    order.receivedById = req.user.id;
    if (order.status === 'ESPERADA' || order.status === 'EN_DESCARGA' || order.status === 'EN_INSPECCION') {
      order.status = 'RECIBIDA';
    }
    await order.save();
    res.locals.emit = [{ event: 'inbound:update', data: { id: order.id } }];
    res.json(order);
  } catch(e) { next(e); }
});

// DELETE /api/inbound/:id
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const order = await InboundOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    await order.destroy();
    res.json({ ok: true });
  } catch(e) { next(e); }
});

module.exports = router;

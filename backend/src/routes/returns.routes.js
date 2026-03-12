// Módulo 11: Devoluciones (RMA)
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { ReturnOrder, User } = require('../models/sequelize');
const crypto = require('crypto');

function makeRmaNumber() {
  const d = new Date();
  const ymd = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  return 'RMA-' + ymd + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// GET /api/returns
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const rows = await ReturnOrder.findAll({
      where, order: [['createdAt','DESC']],
      include: [
        { model: User, as: 'createdBy', attributes: ['id','fullName','employeeNumber'] },
        { model: User, as: 'inspectedBy', attributes: ['id','fullName','employeeNumber'] },
      ]
    });
    res.json(rows);
  } catch(e) { next(e); }
});

// POST /api/returns
router.post('/', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const { originalOrderId, reason, items, notes } = req.body;
    const rma = await ReturnOrder.create({
      rmaNumber: makeRmaNumber(),
      originalOrderId: originalOrderId || null,
      reason: reason || 'OTHER',
      items: items || [],
      notes: notes || '',
      createdById: req.user.id,
    });
    res.locals.emit = [{ event: 'returns:update', data: { id: rma.id } }];
    res.status(201).json(rma);
  } catch(e) { next(e); }
});

// PATCH /api/returns/:id/inspect — QC inspection
router.patch('/:id/inspect', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const rma = await ReturnOrder.findByPk(req.params.id);
    if (!rma) return res.status(404).json({ message: 'Not found' });
    const { qcResult, qcNotes, disposition } = req.body;
    rma.status = 'INSPECTING';
    rma.qcResult = qcResult || null;
    rma.qcNotes = qcNotes || '';
    rma.disposition = disposition || null;
    rma.inspectedById = req.user.id;
    rma.inspectedAt = new Date();
    await rma.save();
    res.locals.emit = [{ event: 'returns:update', data: { id: rma.id } }];
    res.json(rma);
  } catch(e) { next(e); }
});

// PATCH /api/returns/:id/status
router.patch('/:id/status', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const rma = await ReturnOrder.findByPk(req.params.id);
    if (!rma) return res.status(404).json({ message: 'Not found' });
    const { status } = req.body;
    const allowed = ['PENDING','INSPECTING','APPROVED','RESTOCKED','QUARANTINED','DISPOSED','CANCELLED'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    rma.status = status;
    await rma.save();
    res.locals.emit = [{ event: 'returns:update', data: { id: rma.id } }];
    res.json(rma);
  } catch(e) { next(e); }
});

module.exports = router;

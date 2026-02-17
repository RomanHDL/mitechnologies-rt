const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ProductionRequest = require('../models/ProductionRequest');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await ProductionRequest.find({})
      .populate('requestedBy', 'email fullName')
      .sort({ createdAt: -1 })
      .lean();
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { area, items, note } = req.body || {};
    if (!['P1','P2','P3','P4'].includes(area)) return res.status(400).json({ message: 'Área de producción inválida' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Items requeridos' });

    const row = await ProductionRequest.create({
      area,
      requestedBy: req.user._id,
      items,
      note: note || ''
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['OPEN','FULFILLED','CANCELLED'].includes(status)) return res.status(400).json({ message: 'Status inválido' });
    const row = await ProductionRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!row) return res.status(404).json({ message: 'No encontrado' });
    res.json(row);
  } catch (e) { next(e); }
});

module.exports = router;

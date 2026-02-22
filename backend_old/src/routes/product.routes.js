const express = require('express');
const Product = require('../models/Product');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { q } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { sku: new RegExp(String(q), 'i') },
        { description: new RegExp(String(q), 'i') },
        { brand: new RegExp(String(q), 'i') },
        { model: new RegExp(String(q), 'i') }
      ];
    }
    const rows = await Product.find(filter).sort({ sku: 1 }).lean();
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const { sku, description, brand, model, category, unit, isActive } = req.body || {};
    if (!sku) return res.status(400).json({ message: 'SKU requerido' });

    const row = await Product.create({
      sku: String(sku).trim(),
      description: description || '',
      brand: brand || '',
      model: model || '',
      category: category || '',
      unit: unit || 'pz',
      isActive: isActive ?? true
    });
    res.status(201).json(row);
  } catch (e) {
    if (String(e).includes('E11000')) return res.status(409).json({ message: 'SKU ya existe' });
    next(e);
  }
});

router.patch('/:id', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const row = await Product.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
    if (!row) return res.status(404).json({ message: 'No encontrado' });
    res.json(row);
  } catch (e) { next(e); }
});

module.exports = router;

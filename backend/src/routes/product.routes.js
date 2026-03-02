const express = require('express');
const { Product } = require('../models/sequelize');
const { Op } = require('sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { q } = req.query;
    const where = {};
    if (q) {
      where[Op.or] = [
        { sku: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
        { brand: { [Op.like]: `%${q}%` } },
        { model: { [Op.like]: `%${q}%` } }
      ];
    }
    const rows = await Product.findAll({ where, order: [['sku', 'ASC']], raw: true });
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
    res.status(201).json(row.toJSON());
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'SKU ya existe' });
    }
    next(e);
  }
});

router.patch('/:id', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const [updated] = await Product.update(req.body || {}, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'No encontrado' });

    const row = await Product.findByPk(req.params.id, { raw: true });
    res.json(row);
  } catch (e) { next(e); }
});

/**
 * ✅ NUEVO: PATCH /api/products/:id/active
 * (Tu frontend ya lo llama)
 */
router.patch('/:id/active', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const { isActive } = req.body || {};
    const [updated] = await Product.update(
      { isActive: !!isActive },
      { where: { id: req.params.id } }
    );
    if (!updated) return res.status(404).json({ message: 'No encontrado' });

    const row = await Product.findByPk(req.params.id, { raw: true });
    res.json(row);
  } catch (e) { next(e); }
});

/**
 * ✅ NUEVO: DELETE /api/products/:id
 * (Tu frontend ya lo llama)
 */
router.delete('/:id', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const deleted = await Product.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
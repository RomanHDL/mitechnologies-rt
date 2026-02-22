const express = require('express');
const { Location, Pallet } = require('../models/sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { area } = req.query;
    const where = {};
    if (area) where.area = area;

    const locations = await Location.findAll({ where, raw: true });
    const locIds = locations.map(l => l.id);

    const pallets = await Pallet.findAll({
      where: {
        locationId: locIds,
        status: ['IN_STOCK', 'QUARANTINE', 'DAMAGED', 'RETURNED', 'ADJUSTED']
      },
      attributes: ['locationId'],
      raw: true
    });

    const occupied = new Set(pallets.map(p => p.locationId));

    res.json(locations.map(l => ({
      ...l,
      state: l.blocked ? 'BLOQUEADO' : (occupied.has(l.id) ? 'OCUPADO' : 'VACIO')
    })));
  } catch (e) { next(e); }
});

router.patch('/:id', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const allowed = {};
    for (const k of ['type','maxPallets','notes']) if (req.body?.[k] !== undefined) allowed[k] = req.body[k];

    const [updated] = await Location.update(allowed, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'Ubicación no encontrada' });

    const loc = await Location.findByPk(req.params.id, { raw: true });
    res.json(loc);
  } catch (e) { next(e); }
});

router.patch('/:id/block', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const reason = req.body?.reason || 'Mantenimiento';
    const [updated] = await Location.update(
      { blocked: true, blockedReason: reason },
      { where: { id: req.params.id } }
    );
    if (!updated) return res.status(404).json({ message: 'Ubicación no encontrada' });

    const loc = await Location.findByPk(req.params.id, { raw: true });
    res.json(loc);
  } catch (e) { next(e); }
});

router.patch('/:id/unblock', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const [updated] = await Location.update(
      { blocked: false, blockedReason: '' },
      { where: { id: req.params.id } }
    );
    if (!updated) return res.status(404).json({ message: 'Ubicación no encontrada' });

    const loc = await Location.findByPk(req.params.id, { raw: true });
    res.json(loc);
  } catch (e) { next(e); }
});

module.exports = router;

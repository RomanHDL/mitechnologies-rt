const express = require('express');
const Location = require('../models/Location');
const Pallet = require('../models/Pallet');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { area } = req.query;
    const filter = {};
    if (area) filter.area = area;

    const locations = await Location.find(filter).lean();
    const locIds = locations.map(l => l._id);

    const pallets = await Pallet.find({
      location: { $in: locIds },
      status: { $in: ['IN_STOCK','QUARANTINE','DAMAGED','RETURNED','ADJUSTED'] }
    }).select('location').lean();

    const occupied = new Set(pallets.map(p => String(p.location)));

    res.json(locations.map(l => ({
      ...l,
      state: l.blocked ? 'BLOQUEADO' : (occupied.has(String(l._id)) ? 'OCUPADO' : 'VACIO')
    })));
  } catch (e) { next(e); }
});

router.patch('/:id', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const allowed = {};
    for (const k of ['type','maxPallets','notes']) if (req.body?.[k] !== undefined) allowed[k] = req.body[k];
    const loc = await Location.findByIdAndUpdate(req.params.id, allowed, { new: true });
    if (!loc) return res.status(404).json({ message: 'Ubicación no encontrada' });
    res.json(loc);
  } catch (e) { next(e); }
});

router.patch('/:id/block', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const reason = req.body?.reason || 'Mantenimiento';
    const loc = await Location.findByIdAndUpdate(req.params.id, { blocked: true, blockedReason: reason }, { new: true });
    if (!loc) return res.status(404).json({ message: 'Ubicación no encontrada' });
    res.json(loc);
  } catch (e) { next(e); }
});

router.patch('/:id/unblock', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const loc = await Location.findByIdAndUpdate(req.params.id, { blocked: false, blockedReason: '' }, { new: true });
    if (!loc) return res.status(404).json({ message: 'Ubicación no encontrada' });
    res.json(loc);
  } catch (e) { next(e); }
});

module.exports = router;

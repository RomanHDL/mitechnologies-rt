const express = require('express');
const CycleCount = require('../models/CycleCount');
const Location = require('../models/Location');
const Pallet = require('../models/Pallet');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

async function systemSnapshotForLocation(locationId) {
  const pallet = await Pallet.findOne({ location: locationId, status: { $in: ['IN_STOCK','QUARANTINE','DAMAGED','RETURNED','ADJUSTED'] } }).lean();
  return pallet?.items || [];
}

function diff(systemItems, countedItems) {
  const mapSys = new Map();
  for (const it of (systemItems||[])) mapSys.set(it.sku, (mapSys.get(it.sku)||0) + (it.qty||0));
  const mapCnt = new Map();
  for (const it of (countedItems||[])) mapCnt.set(it.sku, (mapCnt.get(it.sku)||0) + (it.qty||0));
  const skus = new Set([...mapSys.keys(), ...mapCnt.keys()]);
  const out = [];
  for (const sku of skus) {
    const s = mapSys.get(sku)||0;
    const c = mapCnt.get(sku)||0;
    if (s != c) out.push({ sku, systemQty: s, countedQty: c, diff: c - s });
  }
  return out;
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await CycleCount.find({})
      .populate('createdBy', 'email')
      .populate('approvedBy', 'email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const { name, scope, area, level, notes } = req.body || {};
    const sc = scope || 'AREA';
    let filter = {};
    if (sc === 'AREA') filter = { area };
    if (sc === 'LEVEL') filter = { area, level };
    if (!filter.area) return res.status(400).json({ message: 'Área requerida' });

    const locs = await Location.find(filter).lean();
    const lines = [];
    for (const l of locs) {
      const sys = await systemSnapshotForLocation(l._id);
      lines.push({ location: l._id, countedItems: [], systemItems: sys, difference: [] });
    }

    const row = await CycleCount.create({
      name: name || `Conteo ${filter.area}${filter.level ? '-' + filter.level : ''}`,
      scope: sc,
      area: filter.area,
      level: filter.level || '',
      status: 'OPEN',
      lines,
      notes: notes || '',
      createdBy: req.user._id
    });

    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.post('/:id/line/:locationId', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const { countedItems } = req.body || {};
    if (!Array.isArray(countedItems)) return res.status(400).json({ message: 'countedItems requerido' });

    const cc = await CycleCount.findById(req.params.id);
    if (!cc) return res.status(404).json({ message: 'Conteo no encontrado' });
    if (!['OPEN','REVIEW'].includes(cc.status)) return res.status(400).json({ message: 'Conteo no editable' });

    const line = cc.lines.find(l => String(l.location) === String(req.params.locationId));
    if (!line) return res.status(404).json({ message: 'Ubicación fuera del conteo' });

    line.countedItems = countedItems;
    line.difference = diff(line.systemItems, line.countedItems);
    cc.status = 'REVIEW';
    await cc.save();

    res.json({ ok: true, difference: line.difference });
  } catch (e) { next(e); }
});

router.post('/:id/approve', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const cc = await CycleCount.findById(req.params.id);
    if (!cc) return res.status(404).json({ message: 'Conteo no encontrado' });
    if (['APPROVED','CLOSED'].includes(cc.status)) return res.status(400).json({ message: 'Conteo ya aprobado/cerrado' });

    cc.status = 'APPROVED';
    cc.approvedBy = req.user._id;
    cc.approvedAt = new Date();
    await cc.save();

    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
